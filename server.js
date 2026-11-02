// Static file server + WebSocket game rooms and a realtime room list for the Telegram Web App.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
// every game kind has the same rules API: newGame, start, apply, checkTimeout, resign
const GAMES = { tosiq: require('./public/game.js'), xo: require('./public/xo.js') };
const kindOf = (k) => (GAMES[k] ? k : 'tosiq');
const rulesOf = (room) => GAMES[room.kind];

const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const BOT_TOKEN = process.env.BOT_TOKEN || '';

// ---------- players & ELO (persisted to a JSON file) ----------
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
fs.mkdirSync(DATA_DIR, { recursive: true });
let players = {};
try { players = JSON.parse(fs.readFileSync(PLAYERS_FILE, 'utf8')); } catch (e) {}
for (const p of Object.values(players)) if (!p.stats) {
  p.stats = { tosiq: { elo: p.elo, peak: p.peak, games: p.games, wins: p.wins, losses: p.losses, draws: 0, history: p.history || [] } };
  for (const k of ['elo', 'peak', 'games', 'wins', 'losses', 'history']) delete p[k];
}
let saveTimer = null;
function savePlayers() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = PLAYERS_FILE + '.tmp';
    fs.writeFile(tmp, JSON.stringify(players), (err) => { if (!err) fs.rename(tmp, PLAYERS_FILE, () => {}); });
  }, 500);
}
const START_ELO = 1000, K = 32;
// only Telegram's own avatar URLs are shown to other players
const cleanPhoto = (u) => (typeof u === 'string' && /^https:\/\/t\.me\/i\/userpic\/[\w/.-]+$/.test(u) ? u : null);
const freshStats = () => ({ elo: START_ELO, peak: START_ELO, games: 0, wins: 0, losses: 0, draws: 0, history: [] });
function statsOf(uid, kind, name, photo) {
  const p = players[uid] || (players[uid] = { name, stats: {} });
  if (name) p.name = name;
  if (photo !== undefined) p.photo = photo || null;
  return p.stats[kind] || (p.stats[kind] = freshStats());
}
const eloOf = (uid, kind) => (players[uid] && players[uid].stats[kind] ? players[uid].stats[kind].elo : START_ELO);
// [uid, name, stats] for everyone who played rated games of this kind, best first
const ranked = (kind) => Object.entries(players).filter(([, p]) => p.stats[kind] && p.stats[kind].games > 0)
  .map(([id, p]) => [id, p.name, p.stats[kind], p.photo || null])
  .sort((a, b) => b[2].elo - a[2].elo || b[2].wins - a[2].wins);

// rate a finished online game once; both players must be verified (see verifyInitData)
function rateGame(room) {
  const g = room.game, [a, b] = room.players;
  if (g.winner === null || room.rated) return;
  room.rated = true;
  if (!room.ranked) return; // games in open/private rooms are casual
  if (!a || !b || !a.verified || !b.verified || a.uid === b.uid) return;
  const pa = statsOf(a.uid, room.kind, a.name, a.photo), pb = statsOf(b.uid, room.kind, b.name, b.photo);
  // winner -1 is a draw (X va O), worth half a point
  const expA = 1 / (1 + Math.pow(10, (pb.elo - pa.elo) / 400)), scoreA = g.winner === -1 ? 0.5 : g.winner === 0 ? 1 : 0;
  let dA = Math.round(K * (scoreA - expA));
  if (dA === 0 && scoreA !== 0.5) dA = scoreA ? 1 : -1; // a decisive result always moves the rating a little
  const at = Date.now();
  [[pa, dA, b.name, 0], [pb, -dA, a.name, 1]].forEach(([p, d, oppName, i]) => {
    const won = g.winner === i, draw = g.winner === -1;
    p.elo += d; p.peak = Math.max(p.peak, p.elo); p.games++;
    if (draw) p.draws = (p.draws || 0) + 1; else if (won) p.wins++; else p.losses++;
    p.history.unshift({ vs: oppName, won, draw, delta: d, elo: p.elo, reason: g.reason, at });
    p.history = p.history.slice(0, 20);
  });
  room.elo = { delta: [dA, -dA], now: [pa.elo, pb.elo] };
  savePlayers();
}

// Telegram signs initData with the bot token; when BOT_TOKEN is set only signed users are rated
function verifyInitData(initData) {
  if (!BOT_TOKEN || !initData) return null;
  try {
    const params = new URLSearchParams(initData), hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');
    const check = [...params.entries()].sort(([x], [y]) => (x < y ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
    const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const sig = crypto.createHmac('sha256', secret).update(check).digest('hex');
    if (sig.length !== hash.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(hash))) return null;
    if (Date.now() / 1000 - Number(params.get('auth_date')) > 7 * 86400) return null;
    const u = JSON.parse(params.get('user'));
    return { uid: 'tg' + u.id, name: String(u.username || u.first_name || "O'yinchi").slice(0, 24), photo: cleanPhoto(u.photo_url) };
  } catch (e) { return null; }
}

const GAME_INFO = {
  tosiq: { title: "To'siq Jangi", emoji: '🧱', line: "Raqib tomoniga birinchi yeting va uning yo'lini to'siqlar bilan to'sing!" },
  xo: { title: 'X va O', emoji: '❌⭕', line: "Uchta belgini bir qatorga birinchi bo'lib tering!" },
};
const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// the invite text (Telegram HTML); the same wording is shown as a preview inside the app
function inviteText(name, kind, code) {
  if (code) {
    const g = GAME_INFO[kind];
    return `🎮 <b>${esc(name)}</b> sizni o'yinga chaqirmoqda!\n\n${g.emoji} <b>${g.title}</b>\n${g.line}\n\n`
      + `🔑 Xona kodi: <code>${esc(code)}</code>\n⚔️ Kim kuchliroq — hozir bilib olamiz! 👇`;
  }
  return `🎮 <b>${esc(name)}</b> sizni <b>O'yinlar</b>ga taklif qilmoqda!\n\n`
    + `🧱 <b>To'siq Jangi</b> — raqib yo'lini to'siqlar bilan to'sing\n❌⭕ <b>X va O</b> — uchtasini bir qatorga tering\n\n`
    + `🏆 Reytingli o'yinlar · 👥 Do'stlar bilan xonalar · 🤖 Botga qarshi\n👇 Pastdagi tugmani bosing va o'ynang!`;
}

async function prepareInvite(body) {
  const v = verifyInitData(body.initData), bot = process.env.BOT_USERNAME, app = process.env.APP_NAME;
  if (!v || !bot || !app) return { ok: false, reason: 'unavailable' };
  const kind = kindOf(body.kind), code = clean(body.code);
  const link = `https://t.me/${bot}/${app}` + (code ? `?startapp=${code}` : '');
  const result = {
    type: 'article', id: crypto.randomBytes(8).toString('hex'),
    title: code ? `${GAME_INFO[kind].title} — o'yinga taklif` : "O'yinlar — do'stingizni taklif qiling",
    description: code ? `Xona kodi: ${code}` : "To'siq Jangi va X va O",
    input_message_content: { message_text: inviteText(v.name, kind, code), parse_mode: 'HTML', link_preview_options: { is_disabled: true } },
    reply_markup: { inline_keyboard: [[{ text: code ? '▶️ Xonaga kirish' : "🎮 O'ynash", url: link }]] },
  };
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/savePreparedInlineMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: Number(v.uid.slice(2)), result, allow_user_chats: true, allow_group_chats: true }),
  });
  const d = await r.json();
  return d.ok ? { ok: true, id: d.result.id } : { ok: false, reason: d.description || 'telegram' };
}

function sendJson(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon' };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/config.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ bot: process.env.BOT_USERNAME || '', app: process.env.APP_NAME || '' }));
  }
  if (url.pathname === '/healthz') return sendJson(res, { ok: true }); // Render's health check
  if (url.pathname === '/api/rooms') return sendJson(res, lobbyData()); // same data the lobby socket pushes
  if (url.pathname === '/api/invite' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 20000) req.destroy(); });
    req.on('end', async () => {
      try { sendJson(res, await prepareInvite(JSON.parse(body || '{}'))); }
      catch (e) { sendJson(res, { ok: false, reason: 'error' }); }
    });
    return;
  }
  if (url.pathname === '/api/leaderboard') {
    const me = url.searchParams.get('uid'), list = ranked(kindOf(url.searchParams.get('kind')));
    const row = ([id, name, p, photo], i) => ({ rank: i + 1, name, photo, elo: p.elo, wins: p.wins, losses: p.losses, draws: p.draws || 0, me: id === me });
    const mine = list.findIndex(([id]) => id === me);
    return sendJson(res, { top: list.slice(0, 50).map(row), me: mine >= 0 ? row(list[mine], mine) : null, total: list.length });
  }
  if (url.pathname === '/api/profile') {
    const id = url.searchParams.get('uid'), kind = kindOf(url.searchParams.get('kind'));
    const st = (players[id] && players[id].stats[kind]) || freshStats();
    const rank = ranked(kind).findIndex(([pid]) => pid === id);
    return sendJson(res, Object.assign({}, st, { rank: rank >= 0 ? rank + 1 : null }));
  }
  const file = path.normalize(path.join(PUBLIC, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname)));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

// id -> { id, pub, code, created, game, starter, players: [{uid,name,ws}|null, ...], cleanup }
// Every room is listed in the lobby by its id. A private room also has a secret code that
// anyone who isn't already seated must give to join; the code is never sent to the lobby.
const rooms = new Map();
const lobby = new Set(); // sockets currently looking at the room list

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const clean = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
function freshCode() {
  for (;;) {
    const c = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
    if (!rooms.has(c) && ![...rooms.values()].some(r => r.code === c)) return c;
  }
}

function lobbyData() {
  const now = Date.now(), uids = new Set();
  for (const ws of lobby) if (ws.uid) uids.add(ws.uid);
  for (const r of rooms.values()) for (const p of r.players) if (p && p.ws) uids.add(p.uid);
  for (const q of queue) uids.add(q.uid);
  const list = [];
  for (const r of rooms.values()) {
    if (r.ranked) continue;
    const host = r.players.find(p => p && p.ws);
    if (!host) continue; // nobody is there right now
    const waiting = r.game.turnStart === null && r.players.filter(Boolean).length < 2;
    list.push({ id: r.id, kind: r.kind, pub: r.pub, name: host.name, status: waiting ? 'waiting' : 'playing',
      age: Math.round((now - r.created) / 1000) });
  }
  // joinable rooms first, newest first
  list.sort((a, b) => (a.status === b.status ? a.age - b.age : a.status === 'waiting' ? -1 : 1));
  return { rooms: list.slice(0, 60), online: uids.size };
}

// push the room list to everyone in the lobby, at most every 150 ms and only when it changed
let lobbyTimer = null, lastLobby = '';
function lobbyChanged() {
  if (lobbyTimer) return;
  lobbyTimer = setTimeout(() => {
    lobbyTimer = null;
    const msg = JSON.stringify(Object.assign({ t: 'rooms' }, lobbyData()));
    if (msg === lastLobby) return;
    lastLobby = msg;
    for (const ws of lobby) if (ws.readyState === 1) ws.send(msg);
  }, 150);
}

// ---------- matchmaking ----------
// Players searching for a rated game wait here. Two of them are paired when their ELO gap fits
// inside both search windows; a window starts at ±50 and widens by 10 per second of waiting (max ±400).
const queue = []; // { ws, uid, name, kind, elo, since }
const searchRange = (q, now) => Math.min(400, 50 + 10 * Math.floor((now - q.since) / 1000));
function leaveQueue(ws) {
  const i = queue.findIndex(q => q.ws === ws);
  if (i >= 0) { queue.splice(i, 1); lobbyChanged(); }
}
function matchTick() {
  const now = Date.now();
  for (let found = true; found;) {
    found = false;
    queue.sort((a, b) => a.since - b.since);
    outer: for (let i = 0; i < queue.length; i++) for (let j = i + 1; j < queue.length; j++) {
      const a = queue[i], b = queue[j];
      if (a.uid === b.uid || a.kind !== b.kind) continue;
      if (Math.abs(a.elo - b.elo) <= Math.min(searchRange(a, now), searchRange(b, now))) {
        queue.splice(j, 1); queue.splice(i, 1);
        startRanked(a, b);
        found = true;
        break outer;
      }
    }
  }
  for (const q of queue) if (q.ws.readyState === 1) {
    const r = searchRange(q, now);
    q.ws.send(JSON.stringify({ t: 'searching', elo: q.elo, range: r, waited: Math.round((now - q.since) / 1000),
      size: queue.filter(x => x.kind === q.kind).length }));
  }
}
setInterval(matchTick, 1000);

function startRanked(a, b) {
  const starter = Math.random() < 0.5 ? 0 : 1;
  const r = { id: freshCode(), kind: a.kind, pub: false, ranked: true, created: Date.now(), game: GAMES[a.kind].newGame(starter), starter,
    players: [a, b].map(q => ({ uid: q.uid, name: q.name, photo: q.photo, ws: q.ws, verified: true })), hold: true };
  rooms.set(r.id, r);
  [a, b].forEach((q, i) => {
    const o = i ? a : b;
    q.ws.attach(r, i);
    q.ws.send(JSON.stringify({ t: 'matched', me: { name: q.name, elo: q.elo, photo: q.photo }, opp: { name: o.name, elo: o.elo, photo: o.photo },
      starter: starter === i }));
  });
  // a short "opponent found" screen; the clocks start when it ends
  r.holdTimer = setTimeout(() => { r.hold = false; broadcast(r); }, 3500);
  lobbyChanged();
}

function broadcast(room) {
  const g = room.game, G = rulesOf(room);
  // clocks start once both players are in the room
  if (!room.hold && room.players.every(p => p && p.ws)) G.start(g, Date.now());
  clearTimeout(room.clockTimer);
  if (g.winner === null && g.turnStart !== null) {
    const left = g.clock[g.turn] - (Date.now() - g.turnStart);
    room.clockTimer = setTimeout(() => { if (G.checkTimeout(room.game, Date.now())) broadcast(room); }, Math.max(0, left) + 50);
  }
  rateGame(room);
  const now = Date.now();
  room.players.forEach((pl, i) => {
    if (!pl || !pl.ws) return;
    pl.ws.send(JSON.stringify({
      t: 'state', game: g, kind: room.kind, you: i, now, room: room.id, pub: room.pub, code: room.code, ranked: !!room.ranked, elo: room.elo || null,
      names: room.players.map(x => x && x.name),
      photos: room.players.map(x => (x && x.photo) || null),
      online: room.players.map(x => !!(x && x.ws)),
    }));
  });
  lobbyChanged();
}

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => {
  let room = null, slot = -1;
  const send = (m) => ws.send(JSON.stringify(m));
  const fail = (code, msg) => send({ t: 'err', code, msg });
  ws.attach = (r, s) => { room = r; slot = s; }; // used when matchmaking seats this socket

  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }

    if (m.t === 'lobby') { // subscribe to the realtime room list
      ws.uid = String(m.uid || '').slice(0, 64);
      lobby.add(ws);
      send(Object.assign({ t: 'rooms' }, lobbyData()));
      return lobbyChanged();
    }

    if (m.t === 'queue') { // search for a rated opponent
      if (room) return;
      const v = verifyInitData(m.initData);
      if (BOT_TOKEN && !v) return fail('auth', "Reytingli o'yin faqat Telegram ichida ishlaydi");
      const uid = v ? v.uid : String(m.uid || '').slice(0, 64), name = v ? v.name : String(m.name || "O'yinchi").slice(0, 24);
      if (!uid) return fail('auth', "Foydalanuvchi aniqlanmadi");
      leaveQueue(ws);
      for (const q of queue.filter(x => x.uid === uid)) { leaveQueue(q.ws); q.ws.close(); } // one search per player
      const kind = kindOf(m.kind);
      queue.push({ ws, uid, name, kind, photo: v ? v.photo : cleanPhoto(m.photo), elo: eloOf(uid, kind), since: Date.now() });
      lobbyChanged();
      return matchTick();
    }
    if (m.t === 'unqueue') return leaveQueue(ws);

    if (m.t === 'join') {
      // a valid Telegram signature fixes who the player is; otherwise trust the client only without BOT_TOKEN
      const v = verifyInitData(m.initData);
      const uid = v ? v.uid : String(m.uid || '').slice(0, 64), name = v ? v.name : String(m.name || "O'yinchi").slice(0, 24);
      const verified = !!v || !BOT_TOKEN, photo = v ? v.photo : cleanPhoto(m.photo);
      let r;
      if (m.create) {                       // new room
        const pub = !!m.create.pub;
        const kind = kindOf(m.create.kind);
        r = { id: freshCode(), kind, pub, created: Date.now(), game: GAMES[kind].newGame(0), starter: 0, players: [null, null] };
        if (!pub) r.code = freshCode();
        rooms.set(r.id, r);
      } else if (m.room) {                  // a room picked from the list (or a reconnect)
        r = rooms.get(clean(m.room));
        if (!r) return fail('notfound', 'Xona topilmadi yoki yopilgan');
        const seated = r.players.some(p => p && p.uid === uid);
        if (!r.pub && !seated && clean(m.code) !== r.code) return fail('badcode', "Kod noto'g'ri");
      } else if (m.code) {                  // "join with a code"
        const c = clean(m.code);
        r = [...rooms.values()].find(x => x.code === c || (x.pub && x.id === c));
        if (!r) return fail('notfound', 'Bunday kodli xona topilmadi');
      } else return fail('notfound', 'Xona topilmadi');

      clearTimeout(r.cleanup);
      let s = r.players.findIndex(p => p && p.uid === uid);
      if (s < 0) s = r.players.findIndex(p => !p);
      if (s < 0) return send({ t: 'full' });
      room = r; slot = s;
      if (r.players[s] && r.players[s].ws && r.players[s].ws !== ws) r.players[s].ws.close();
      r.players[s] = { uid, name, photo, ws, verified };
      return broadcast(r);
    }
    if (!room) return;
    const G = rulesOf(room);

    if (m.t === 'move' || m.t === 'fence') {
      if (!room.players[1 - slot]) return send({ t: 'err', msg: 'Raqib hali qo\'shilmadi' });
      const err = G.apply(room.game, slot, m, Date.now());
      if (err) { send({ t: 'err', msg: err }); if (room.game.winner !== null) broadcast(room); return; }
      broadcast(room);
    } else if (m.t === 'resign') {
      if (G.resign(room.game, slot)) broadcast(room);
    } else if (m.t === 'rematch' && room.game.winner !== null && !room.ranked) { // rated games re-queue instead
      room.starter = 1 - room.starter;
      room.game = G.newGame(room.starter);
      room.rated = false; room.elo = null;
      broadcast(room);
    }
  });

  ws.on('close', () => {
    if (lobby.delete(ws)) lobbyChanged();
    leaveQueue(ws);
    if (!room || !room.players[slot] || room.players[slot].ws !== ws) return;
    room.players[slot].ws = null;
    if (room.ranked && room.game.turnStart === null) { // left during "opponent found": put the other one back in the queue
      clearTimeout(room.holdTimer);
      rooms.delete(room.id);
      const other = room.players[1 - slot];
      if (other && other.ws && other.ws.readyState === 1) { other.ws.attach(null, -1); other.ws.send(JSON.stringify({ t: 'requeue' })); }
      return lobbyChanged();
    }
    if (room.game.turnStart === null) { // nobody has played yet: free the seat, and close the room once empty
      room.players[slot] = null;
      if (room.players.every(p => !p)) { rooms.delete(room.id); return lobbyChanged(); }
    }
    broadcast(room);
    if (room.players.every(p => !p || !p.ws)) {
      const r = room;
      r.cleanup = setTimeout(() => { rooms.delete(r.id); lobbyChanged(); }, 30 * 60 * 1000);
    }
  });
});

// ---------- the Telegram bot itself: /start message, menu button, description ----------
// Uses long polling (getUpdates), so no webhook setup is needed. The Mini App address comes from
// WEB_URL, or from Railway's RAILWAY_PUBLIC_DOMAIN when a domain has been generated.
const BOT_USERNAME = process.env.BOT_USERNAME || '', APP_NAME = process.env.APP_NAME || '';
const APP_URL = (process.env.WEB_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? 'https://' + process.env.RAILWAY_PUBLIC_DOMAIN : ''))
  .replace(/\/+$/, '');
const tgApi = (method, body) => fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}),
}).then(r => r.json());
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// the button that opens the game; with a room code it opens straight into that room
function playButton(code) {
  const text = code ? '▶️ Xonaga kirish' : "🎮 O'ynash";
  if (APP_URL) return { text, web_app: { url: APP_URL + (code ? `/?room=${code}` : '/') } };
  if (BOT_USERNAME && APP_NAME) return { text, url: `https://t.me/${BOT_USERNAME}/${APP_NAME}` + (code ? `?startapp=${code}` : '') };
  return null;
}
function shareButton() {
  if (!BOT_USERNAME) return null;
  const text = "🎮 To'siq Jangi va X va O — men bilan bellashasanmi? Reytingda kim yuqori, ko'ramiz! 🏆";
  return { text: "👥 Do'stni taklif qilish", url: `https://t.me/share/url?url=${encodeURIComponent('https://t.me/' + BOT_USERNAME)}&text=${encodeURIComponent(text)}` };
}
const keyboard = (...rows) => ({ inline_keyboard: rows.map(r => r.filter(Boolean)).filter(r => r.length) });

function welcomeText(firstName) {
  return `🎮 <b>Assalomu alaykum, ${esc(firstName || "do'stim")}!</b>\n\n`
    + `Bu yerda do'stlaring va butun O'zbekiston bilan <b>aql o'yinlari</b>da kuch sinashasan:\n\n`
    + `🧱 <b>To'siq Jangi</b> — raqib yo'lini to'siqlar bilan to'sib, birinchi bo'lib marraga yet\n`
    + `❌⭕ <b>X va O</b> — uchta belgini bir qatorga birinchi bo'lib ter\n\n`
    + `🏆 Reytingli o'yinlar va ELO\n👥 Do'stlar bilan ochiq va maxfiy xonalar\n🤖 Botga qarshi mashq\n\n`
    + `👇 Boshlash uchun <b>O'ynash</b> tugmasini bos!`;
}
const HELP_TEXT = `ℹ️ <b>Qanday o'ynaladi?</b>\n\n`
  + `1️⃣ <b>O'ynash</b> tugmasini bosing va o'yinni tanlang\n`
  + `2️⃣ <b>⭐ Reytingli o'yin</b> — sizga kuchi teng raqib topiladi, g'alaba uchun ELO beriladi\n`
  + `3️⃣ <b>Xona yaratish</b> — do'stingiz bilan o'ynang: ochiq xonaga istalgan kishi, maxfiy xonaga faqat kod bilan kiriladi\n`
  + `4️⃣ <b>🤖 Botga qarshi</b> — mashq qiling\n\n`
  + `Reyting va profilingiz ilovaning pastki menyusida.`;

async function onMessage(msg) {
  if (!msg || !msg.chat || typeof msg.text !== 'string') return;
  const chat_id = msg.chat.id, [cmd, payload] = msg.text.trim().split(/\s+/);
  const send = (text, markup) => tgApi('sendMessage', { chat_id, text, parse_mode: 'HTML', reply_markup: markup, link_preview_options: { is_disabled: true } });
  if (cmd === '/start' || cmd.startsWith('/start@')) {
    const code = clean(payload);
    if (code) return send(`🔑 Sizni <code>${esc(code)}</code> xonasiga taklif qilishdi!\n\n👇 Tugmani bosing va o'yinga kiring.`, keyboard([playButton(code)]));
    return send(welcomeText(msg.from && msg.from.first_name), keyboard([playButton()], [shareButton()]));
  }
  if (cmd === '/help' || cmd.startsWith('/help@')) return send(HELP_TEXT, keyboard([playButton()]));
  if (msg.chat.type === 'private') return send("👇 O'ynash uchun tugmani bosing:", keyboard([playButton()]));
}

async function runBot() {
  if (!BOT_TOKEN) return console.log('BOT_TOKEN yo\'q — bot xabarlariga javob berilmaydi');
  try {
    await tgApi('deleteWebhook', {}); // polling and a webhook can't be used together
    if (APP_URL) await tgApi('setChatMenuButton', { menu_button: { type: 'web_app', text: "O'ynash", web_app: { url: APP_URL + '/' } } });
    await tgApi('setMyCommands', { commands: [{ command: 'start', description: "O'yinni boshlash" }, { command: 'help', description: "Qanday o'ynaladi" }] });
    await tgApi('setMyShortDescription', { short_description: "🎮 To'siq Jangi va X va O — do'stlar bilan onlayn aql o'yinlari, reyting va ELO" });
    await tgApi('setMyDescription', { description: "🎮 Aql o'yinlari: To'siq Jangi va X va O\n\n🏆 Reytingli o'yinlar — kuchi teng raqib\n👥 Do'stlar bilan xonalar\n🤖 Botga qarshi mashq\n\nBoshlash uchun START ni bosing 👇" });
    console.log('Bot ishga tushdi' + (APP_URL ? `, ilova: ${APP_URL}` : ' (WEB_URL yoki domen topilmadi — tugma t.me havolasini ishlatadi)'));
  } catch (e) { console.log('Bot sozlamalarida xato:', e.message); }
  let offset = 0;
  for (;;) {
    try {
      const r = await tgApi('getUpdates', { offset, timeout: 25, allowed_updates: ['message'] });
      if (!r.ok) { console.log('getUpdates:', r.description); await sleep(5000); continue; }
      for (const u of r.result) { offset = u.update_id + 1; onMessage(u.message).catch(e => console.log('sendMessage xato:', e.message)); }
    } catch (e) { await sleep(3000); }
  }
}

server.listen(PORT, () => { console.log(`O'yinlar serveri: http://localhost:${PORT}`); runBot(); });
