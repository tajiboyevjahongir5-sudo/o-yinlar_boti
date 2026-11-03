// Static file server + WebSocket game rooms and a realtime room list for the Telegram Web App.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
// every game kind has the same rules API: newGame, start, apply, checkTimeout, resign
const GAMES = { tosiq: require('./public/game.js'), xo: require('./public/xo.js'),
  shashka: require('./public/checkers.js'), shaxmat: require('./public/chess.js') };
const kindOf = (k) => (GAMES[k] ? k : 'tosiq');
const rulesOf = (room) => GAMES[room.kind];

const crypto = require('crypto');
const Rewards = require('./public/rewards.js');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const BOT_TOKEN = process.env.BOT_TOKEN || '';
// the bot's username without "@" (people often paste it as "@MyBot", which breaks t.me links)
const BOT_NAME = String(process.env.BOT_USERNAME || '').trim().replace(/^@+/, '').replace(/^https?:\/\/t\.me\//, '');

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

// rate a finished online game once; both players must be verified (see verifyInitData).
// Every online game counts for achievements; only rated games change ELO and the weekly table.
function rateGame(room) {
  const g = room.game, [a, b] = room.players;
  if (g.winner === null || room.rated) return;
  room.rated = true;
  if (!a || !b || !a.verified || !b.verified || a.uid === b.uid) return;
  recordOnline(room);
  if (!room.ranked) return; // games in open/private rooms are casual
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
  [[a.uid, pa, dA], [b.uid, pb, -dA]].forEach(([uid, st, d]) => {
    const p = players[uid], w = weekOf(p);
    w.gain[room.kind] = (w.gain[room.kind] || 0) + d; w.games[room.kind] = (w.games[room.kind] || 0) + 1;
    if (st.peak >= 1200) award(uid, 'elo1200');
    if (st.peak >= 1500) award(uid, 'elo1500');
  });
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

// who sent this request: a verified Telegram user, or (only without BOT_TOKEN, for local testing) the uid it claims
function whoIs(m) {
  const v = verifyInitData(m && m.initData);
  if (v) return v;
  if (BOT_TOKEN || !m || !m.uid) return null;
  return { uid: String(m.uid).slice(0, 64), name: String(m.name || "O'yinchi").slice(0, 24), photo: cleanPhoto(m.photo) };
}

// ---------- public ids, achievements, rewards, weekly table ----------
// other players never see a uid (it carries the Telegram id), only this short hash of it
const pidOf = (uid) => crypto.createHash('sha256').update('pid:' + uid).digest('base64url').slice(0, 12);
const pidIndex = new Map();
// a private friend-invite code (only its owner sees it): whoever opens the link becomes a friend both ways
const inviteOf = (uid) => 'fr' + crypto.createHash('sha256').update('inv:' + uid + (BOT_TOKEN || '')).digest('hex').slice(0, 12);
function uidOfInvite(code) {
  for (const u of Object.keys(players)) if (inviteOf(u) === code) return u;
  return null;
}
function uidOfPid(pid) {
  if (!pidIndex.has(pid)) for (const u of Object.keys(players)) pidIndex.set(pidOf(u), u);
  return pidIndex.get(pid) || null;
}
function playerRec(uid, name, photo) {
  const p = players[uid] || (players[uid] = { name: name || "O'yinchi", stats: {}, created: Date.now() });
  if (name) p.name = name;
  if (photo !== undefined && photo !== null) p.photo = photo;
  p.ach = p.ach || {}; p.friends = p.friends || []; p.requests = p.requests || []; p.equip = p.equip || { frame: null, skin: {} };
  p.counters = p.counters || { wins: 0, streak: 0, best: 0, won: {} };
  pidIndex.set(pidOf(uid), uid);
  return p;
}
function award(uid, id) {
  const p = playerRec(uid);
  if (p.ach[id]) return;
  p.ach[id] = Date.now();
  notify(uid, { t: 'ach', id });
  savePlayers();
}
// what the player shows to others: the frame, and the skin for this game (only if still unlocked)
function looksOf(uid, kind) {
  const p = players[uid];
  if (!p || !p.equip) return { frame: null, skin: null };
  const frame = p.equip.frame && Rewards.frameUnlocked(p, p.equip.frame) ? p.equip.frame : null;
  const sk = kind && p.equip.skin && p.equip.skin[kind];
  return { frame, skin: sk && Rewards.skinUnlocked(p, kind, sk) ? sk : null };
}
const champOf = (uid) => Object.keys(meta.champs || {}).filter(k => meta.champs[k].uid === uid);

// the week starts on Monday 00:00 Tashkent time (UTC+5); the key is that Monday's date
function weekKey(t = Date.now()) {
  const d = new Date(t + 5 * 3600 * 1000), day = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)).toISOString().slice(0, 10);
}
function weekOf(p) {
  if (!p.week || p.week.key !== weekKey()) p.week = { key: weekKey(), gain: {}, games: {} };
  return p.week;
}
const META_FILE = path.join(DATA_DIR, 'meta.json');
let meta = { week: weekKey(), champs: {} };
try { meta = Object.assign(meta, JSON.parse(fs.readFileSync(META_FILE, 'utf8'))); } catch (e) {}
const saveMeta = () => fs.writeFile(META_FILE, JSON.stringify(meta), () => {});
// when a new week begins, last week's best ELO gain in each game becomes that game's "Hafta qiroli"
function rollWeek() {
  const cur = weekKey();
  if (meta.week === cur) return;
  const champs = {};
  for (const kind of Object.keys(GAMES)) {
    let best = null;
    for (const [uid, p] of Object.entries(players)) {
      if (!p.week || p.week.key !== meta.week || !p.week.games[kind]) continue;
      const gain = p.week.gain[kind] || 0;
      if (gain > 0 && (!best || gain > best.gain)) best = { uid, name: p.name, photo: p.photo || null, gain, week: meta.week };
    }
    if (best) { champs[kind] = best; award(best.uid, 'weekly'); }
  }
  meta.champs = champs; meta.week = cur;
  saveMeta();
}
setInterval(rollWeek, 10 * 60 * 1000); // also run once when the server starts listening

// counters and badges after every online game between two verified players
function recordOnline(room) {
  const g = room.game, kind = room.kind;
  const uids = room.players.map(x => x.uid);
  room.players.forEach((pl, i) => {
    const p = playerRec(pl.uid, pl.name, pl.photo), c = p.counters, won = g.winner === i;
    if (won) {
      c.wins++; c.streak++; c.best = Math.max(c.best, c.streak); c.won[kind] = 1;
      award(pl.uid, 'first_win');
      if (c.wins >= 10) award(pl.uid, 'wins10');
      if (c.wins >= 50) award(pl.uid, 'wins50');
      if (c.streak >= 5) award(pl.uid, 'streak5');
      if (Object.keys(GAMES).every(k => c.won[k])) award(pl.uid, 'all4');
      if (room.minutes === 1) award(pl.uid, 'blitz');
      if (kind === 'shaxmat' && g.reason === 'mate') award(pl.uid, 'mate');
      if (kind === 'shashka' && g.board.includes(GAMES.shashka.colorOf(g, i) === 'w' ? 'W' : 'B')) award(pl.uid, 'damka');
      if (kind === 'tosiq' && g.reason === 'goal' && g.left[i] === 0) award(pl.uid, 'wall');
      if (kind === 'xo' && g.reason === 'line') award(pl.uid, 'xo3');
      if (room.prevWinner === uids[1 - i]) award(pl.uid, 'revansh');
    } else if (g.winner !== -1) c.streak = 0;
  });
  room.prevWinner = g.winner >= 0 ? uids[g.winner] : null;
  savePlayers();
}

function makeFriends(me, uid) {
  const p = playerRec(me.uid, me.name, me.photo), o = playerRec(uid);
  p.requests = p.requests.filter(x => x !== uid); o.requests = o.requests.filter(x => x !== me.uid);
  if (!p.friends.includes(uid)) p.friends.unshift(uid);
  if (!o.friends.includes(me.uid)) o.friends.unshift(me.uid);
  award(me.uid, 'friend'); award(uid, 'friend');
  notify(uid, { t: 'faccept', name: me.name });
  savePlayers();
  return { ok: true, friend: true, name: o.name };
}

// ---------- presence: every open app keeps one socket, so friends can see each other and be challenged ----------
const presence = new Map(); // uid -> Set of sockets
function notify(uid, msg) {
  const set = presence.get(uid);
  if (!set) return;
  const s = JSON.stringify(msg);
  for (const w of set) if (w.readyState === 1) w.send(s);
}
function statusOf(uid) {
  for (const r of rooms.values()) {
    if (!r.players.some(p => p && p.uid === uid && p.ws)) continue;
    if (r.game.winner === null && r.game.turnStart !== null) return { state: 'playing', kind: r.kind, room: r.id };
  }
  return { state: presence.has(uid) ? 'online' : 'offline' };
}
function cardOf(uid, me) {
  const p = players[uid] || {}, l = looksOf(uid);
  const elo = {};
  for (const k of Object.keys(GAMES)) if (p.stats && p.stats[k]) elo[k] = { elo: p.stats[k].elo, games: p.stats[k].games, wins: p.stats[k].wins };
  return { pid: pidOf(uid), name: p.name || "O'yinchi", photo: p.photo || null, frame: l.frame, elo, status: statusOf(uid),
    ach: Object.keys(p.ach || {}), champ: champOf(uid), friend: !!(me && players[me] && (players[me].friends || []).includes(uid)), me: uid === me,
    pending: !!(me && (p.requests || []).includes(me)), incoming: !!(me && players[me] && (players[me].requests || []).includes(uid)) };
}

const MINUTES = [1, 3, 5, 10];
const DEFAULT_MIN = { tosiq: 5, xo: 1, shashka: 5, shaxmat: 10 };
const minutesOf = (kind, m) => (MINUTES.includes(Number(m)) ? Number(m) : DEFAULT_MIN[kind]);

const readJson = (req) => new Promise((res) => {
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 20000) req.destroy(); });
  req.on('end', () => { try { res(JSON.parse(body || '{}')); } catch (e) { res({}); } });
});

// POST /api/<name>: small authenticated actions
const ACTIONS = {
  // add or remove a friend (by public id)
  friend(me, m) {
    if (m.invite) { // opened a friend's invite link: both become friends
      const uid = uidOfInvite(String(m.invite));
      if (!uid) return { ok: false, msg: 'Havola eskirgan' };
      if (uid === me.uid) return { ok: false, msg: "Bu o'zingizning havolangiz" };
      const p = playerRec(me.uid, me.name, me.photo), o = playerRec(uid);
      if (!p.friends.includes(uid)) p.friends.unshift(uid);
      if (!o.friends.includes(me.uid)) o.friends.unshift(me.uid);
      award(me.uid, 'friend'); award(uid, 'friend');
      notify(uid, { t: 'toast', msg: `${me.name} do'stlaringiz ro'yxatiga qo'shildi` });
      savePlayers();
      return { ok: true, friend: true, name: o.name };
    }
    const uid = uidOfPid(String(m.pid || ''));
    if (!uid || uid === me.uid || !players[uid]) return { ok: false, msg: "O'yinchi topilmadi" };
    const p = playerRec(me.uid, me.name, me.photo), o = playerRec(uid);
    if (m.remove) { // unfriend both ways, and drop any pending request
      p.friends = p.friends.filter(x => x !== uid); o.friends = o.friends.filter(x => x !== me.uid);
      o.requests = o.requests.filter(x => x !== me.uid); p.requests = p.requests.filter(x => x !== uid);
      savePlayers();
      return { ok: true, friend: false };
    }
    if (p.friends.includes(uid) && o.friends.includes(me.uid)) return { ok: true, friend: true };
    // they already asked me: accept it right away
    if (p.requests.includes(uid)) return makeFriends(me, uid);
    if (p.friends.length >= 100) return { ok: false, msg: "Do'stlar ro'yxati to'la" };
    // otherwise a request; the other player confirms it
    if (!o.requests.includes(me.uid)) {
      o.requests.unshift(me.uid); o.requests = o.requests.slice(0, 50);
      notify(uid, { t: 'freq', from: cardOf(me.uid, uid), count: o.requests.length });
      if (BOT_TOKEN && uid.startsWith('tg')) {
        tgApi('sendMessage', { chat_id: Number(uid.slice(2)), parse_mode: 'HTML',
          text: `🤝 <b>${esc(me.name)}</b> sizga do'stlik so'rovi yubordi!\n\nQabul qilsangiz, bir-biringizni o'yinga chaqirib, o'yinlaringizni tomosha qila olasiz.\n\n👇 Ilovada <b>Do'stlar</b> bo'limini oching`,
          reply_markup: keyboard([playButton()]) }).catch(() => {});
      }
      savePlayers();
    }
    return { ok: true, friend: false, pending: true };
  },
  // answer a friend request
  freply(me, m) {
    const uid = uidOfPid(String(m.pid || ''));
    const p = playerRec(me.uid, me.name, me.photo);
    if (!uid || !p.requests.includes(uid)) return { ok: false, msg: "So'rov topilmadi" };
    if (m.accept) return makeFriends(me, uid);
    p.requests = p.requests.filter(x => x !== uid);
    savePlayers();
    return { ok: true, friend: false };
  },
  // challenge a friend: a private room is made for both; the friend gets an in-app card and a bot message
  async challenge(me, m) {
    const uid = uidOfPid(String(m.pid || ''));
    if (!uid || uid === me.uid) return { ok: false, msg: "O'yinchi topilmadi" };
    const kind = kindOf(m.kind), minutes = minutesOf(kind, m.minutes);
    const r = { id: freshCode(), kind, pub: false, created: Date.now(), game: GAMES[kind].newGame(0, minutes), starter: 0, minutes,
      players: [null, null], reserved: [me.uid, uid], code: null, watchers: new Set() };
    r.code = freshCode();
    rooms.set(r.id, r);
    r.cleanup = setTimeout(() => { if (r.players.every(x => !x || !x.ws)) { rooms.delete(r.id); lobbyChanged(); } }, 10 * 60 * 1000);
    const from = cardOf(me.uid);
    notify(uid, { t: 'challenge', from, kind, minutes, room: r.id, code: r.code });
    if (BOT_TOKEN && uid.startsWith('tg')) {
      const g = GAME_INFO[kind];
      tgApi('sendMessage', { chat_id: Number(uid.slice(2)), parse_mode: 'HTML',
        text: `⚔️ <b>${esc(me.name)}</b> sizni <b>${g.title}</b> o'yiniga chaqiryapti! (${minutes} daqiqa)\n\n👇 Qabul qilish uchun tugmani bosing`,
        reply_markup: keyboard([playButton(r.code)]) }).catch(() => {});
    }
    return { ok: true, room: r.id, code: r.code };
  },
  decline(me, m) {
    const r = rooms.get(clean(m.room));
    if (r && r.reserved && r.reserved[1] === me.uid) { notify(r.reserved[0], { t: 'declined', name: me.name }); rooms.delete(r.id); }
    return { ok: true };
  },
  equip(me, m) {
    const p = playerRec(me.uid, me.name, me.photo);
    if ('frame' in m) {
      if (m.frame && !Rewards.frameUnlocked(p, m.frame)) return { ok: false, msg: 'Bu ramka hali ochilmagan' };
      p.equip.frame = m.frame || null;
    }
    if (m.kind) {
      const kind = kindOf(m.kind);
      if (m.skin && !Rewards.skinUnlocked(p, kind, m.skin)) return { ok: false, msg: 'Bu skin hali ochilmagan' };
      p.equip.skin[kind] = m.skin || null;
    }
    savePlayers();
    return { ok: true, equip: p.equip };
  },
  // a win against the bot on "Qiyin" (reported by the app; only unlocks a badge)
  botwin(me, m) { if (Number(m.level) === 2) award(me.uid, 'bothard'); return { ok: true }; },
};

// ---------- admin panel (only for ADMIN_ID; with BOT_TOKEN the Telegram signature must check out) ----------
const isAdmin = (uid) => typeof uid === 'string' && uid.startsWith('tg') && String(process.env.ADMIN_ID || '').split(/[\s,]+/).includes(uid.slice(2));
function bannedMsg(uid) {
  const b = players[uid] && players[uid].ban;
  if (!b) return null;
  if (b.until && b.until < Date.now()) { delete players[uid].ban; savePlayers(); return null; }
  const till = b.until ? ` (${new Date(b.until + 5 * 3600000).toISOString().slice(0, 16).replace('T', ' ')} gacha)` : '';
  return `⛔ Siz bloklangansiz${till}` + (b.reason ? `: ${b.reason}` : '');
}
const dayKey = (t = Date.now()) => new Date(t + 5 * 3600 * 1000).toISOString().slice(0, 10); // Tashkent date
function countGame(kind) {
  meta.days = meta.days || {};
  const d = meta.days[dayKey()] || (meta.days[dayKey()] = {});
  d[kind] = (d[kind] || 0) + 1;
  // keep 60 days
  const keys = Object.keys(meta.days).sort();
  while (keys.length > 60) delete meta.days[keys.shift()];
  saveMeta();
}
// who to message in a broadcast: everyone who opened the app or pressed /start in the bot
function botAudience() {
  const ids = new Set((meta.botUsers || []).map(String));
  for (const u of Object.keys(players)) if (u.startsWith('tg')) ids.add(u.slice(2));
  return [...ids];
}
let broadcasting = null;
const adminRow = (uid) => {
  const p = players[uid] || {};
  const games = Object.values(p.stats || {}).reduce((n, st) => n + (st.games || 0), 0);
  const best = Object.entries(p.stats || {}).filter(([, st]) => st.games).sort((a, b) => b[1].elo - a[1].elo)[0];
  return { pid: pidOf(uid), tgId: uid.startsWith('tg') ? uid.slice(2) : null, name: p.name || "O'yinchi", photo: p.photo || null,
    games, best: best ? { kind: best[0], elo: best[1].elo } : null, seen: p.seen || null, created: p.created || null,
    online: presence.has(uid), ban: p.ban || null, admin: isAdmin(uid) };
};
const ADMIN = {
  stats() {
    const now = Date.now(), all = Object.keys(players), day = 86400000, today = dayKey();
    const days = [];
    for (let i = 6; i >= 0; i--) { const k = dayKey(now - i * day); const d = (meta.days || {})[k] || {}; days.push({ day: k, games: d }); }
    const on = onlineCounts();
    let live = 0, waiting = 0;
    for (const r of rooms.values()) { if (r.game.winner === null && r.game.turnStart !== null) live++; else if (r.game.turnStart === null) waiting++; }
    return { ok: true, players: all.length,
      newToday: all.filter(u => players[u].created && dayKey(players[u].created) === today).length,
      activeToday: all.filter(u => players[u].seen && dayKey(players[u].seen) === today).length,
      active7: all.filter(u => players[u].seen && now - players[u].seen < 7 * day).length,
      rated: Object.fromEntries(Object.keys(GAMES).map(k => [k, all.filter(u => players[u].stats[k] && players[u].stats[k].games).length])),
      online: on.counts, onlineTotal: on.total, liveGames: live, waitingRooms: waiting, queue: queue.length,
      tours: [...tours.values()].filter(t => t.status !== 'done').length, banned: all.filter(u => players[u].ban).length,
      botUsers: botAudience().length, days, broadcasting };
  },
  players(m) {
    const q = String(m.q || '').trim().replace(/^@/, '').toLowerCase();
    let list = Object.keys(players);
    if (q) list = list.filter(u => (players[u].name || '').toLowerCase().includes(q) || u.slice(2) === q || u.toLowerCase() === q || pidOf(u) === q);
    const sort = m.sort === 'new' ? (u) => -(players[u].created || 0) : m.sort === 'games' ? (u) => -adminRow(u).games
      : m.sort === 'banned' ? (u) => (players[u].ban ? 0 : 1) : (u) => -(players[u].seen || 0);
    list.sort((a, b) => sort(a) - sort(b));
    return { ok: true, total: list.length, list: list.slice(0, 50).map(adminRow) };
  },
  player(m) {
    const uid = uidOfPid(String(m.pid || ''));
    if (!uid) return { ok: false, msg: "O'yinchi topilmadi" };
    const p = players[uid];
    const stats = {};
    for (const k of Object.keys(GAMES)) { const st = p.stats[k]; stats[k] = st ? { elo: st.elo, peak: st.peak, games: st.games, wins: st.wins, losses: st.losses, draws: st.draws || 0 } : null; }
    return { ok: true, row: adminRow(uid), stats, ach: Object.keys(p.ach || {}), friends: (p.friends || []).length, counters: p.counters || null,
      status: statusOf(uid) };
  },
  setElo(m) {
    const uid = uidOfPid(String(m.pid || '')), kind = kindOf(m.kind), elo = Math.round(Number(m.elo));
    if (!uid || !(elo >= 100 && elo <= 3000)) return { ok: false, msg: "ELO 100–3000 oralig'ida bo'lishi kerak" };
    const st = statsOf(uid, kind);
    st.elo = elo; st.peak = Math.max(st.peak, elo);
    if (m.resetPeak) st.peak = elo;
    savePlayers();
    return { ok: true };
  },
  resetStats(m) {
    const uid = uidOfPid(String(m.pid || ''));
    if (!uid) return { ok: false, msg: "O'yinchi topilmadi" };
    const kind = m.kind ? kindOf(m.kind) : null;
    if (kind) delete players[uid].stats[kind]; else players[uid].stats = {};
    savePlayers();
    return { ok: true };
  },
  ban(m, me) {
    const uid = uidOfPid(String(m.pid || ''));
    if (!uid) return { ok: false, msg: "O'yinchi topilmadi" };
    if (isAdmin(uid)) return { ok: false, msg: "Adminni bloklab bo'lmaydi" };
    const days = Number(m.days) || 0;
    players[uid].ban = { until: days > 0 ? Date.now() + days * 86400000 : 0, reason: String(m.reason || '').slice(0, 120), by: me.name, at: Date.now() };
    leaveAll(uid);
    notify(uid, { t: 'banned', msg: bannedMsg(uid) });
    savePlayers();
    return { ok: true };
  },
  unban(m) {
    const uid = uidOfPid(String(m.pid || ''));
    if (!uid) return { ok: false, msg: "O'yinchi topilmadi" };
    delete players[uid].ban; savePlayers();
    notify(uid, { t: 'unbanned' });
    return { ok: true };
  },
  rooms() {
    const list = [...rooms.values()].map(r => ({ id: r.id, kind: r.kind, pub: r.pub, ranked: !!r.ranked, tour: !!r.tour, challenge: !!(r.reserved && !r.tour),
      minutes: r.minutes || DEFAULT_MIN[r.kind], names: r.players.map(x => x && x.name), online: r.players.map(x => !!(x && x.ws)),
      state: r.game.winner !== null ? 'done' : r.game.turnStart !== null ? 'playing' : 'waiting', moves: r.game.log.length,
      watchers: r.watchers ? r.watchers.size : 0, age: Math.round((Date.now() - r.created) / 60000) }));
    const tl = [...tours.values()].map(t => Object.assign(tourBrief(t), { players: t.players.map(p => p.name) }));
    return { ok: true, rooms: list, tours: tl };
  },
  closeRoom(m) {
    const r = rooms.get(clean(m.id));
    if (!r) return { ok: false, msg: 'Xona topilmadi' };
    closeRoom(r, "⛔ Xona admin tomonidan yopildi");
    return { ok: true };
  },
  cancelTour(m) {
    const t = tours.get(clean(m.id));
    if (!t) return { ok: false, msg: 'Turnir topilmadi' };
    for (const rd of t.rounds) for (const x of rd) if (x.room && rooms.get(x.room)) closeRoom(rooms.get(x.room), "⛔ Turnir admin tomonidan bekor qilindi");
    t.status = 'done'; t.ended = 0; clearTimeout(t.expire);
    for (const p of t.players) notify(p.uid, { t: 'toast', msg: "Turnir admin tomonidan bekor qilindi" });
    tourChanged(t); tours.delete(t.id); lobbyChanged();
    return { ok: true };
  },
  announce(m) { // a banner at the top of the games list for everyone (empty text removes it)
    const text = String(m.text || '').trim().slice(0, 300);
    meta.announce = text ? { text, at: Date.now() } : null;
    saveMeta();
    const msg = JSON.stringify({ t: 'announce', text: text || null, at: Date.now() });
    for (const set of presence.values()) for (const w of set) if (w.readyState === 1) w.send(msg);
    return { ok: true };
  },
  broadcast(m, me) { // a bot message to everyone, ~20 per second (Telegram's limit is 30)
    const text = String(m.text || '').trim().slice(0, 3500);
    if (!text) return { ok: false, msg: "Matn bo'sh" };
    if (!BOT_TOKEN) return { ok: false, msg: "BOT_TOKEN yo'q — xabar yuborib bo'lmaydi" };
    if (broadcasting && !broadcasting.done) return { ok: false, msg: "Oldingi xabar hali yuborilmoqda" };
    const ids = m.test ? [me.uid.slice(2)] : botAudience();
    broadcasting = { total: ids.length, sent: 0, failed: 0, done: false, test: !!m.test, at: Date.now() };
    const markup = m.button ? keyboard([playButton()]) : undefined;
    (async () => {
      for (const id of ids) {
        try {
          const r = await tgApi('sendMessage', { chat_id: Number(id), text, parse_mode: 'HTML', reply_markup: markup, link_preview_options: { is_disabled: true } });
          if (r.ok) broadcasting.sent++; else broadcasting.failed++;
        } catch (e) { broadcasting.failed++; }
        await sleep(50);
      }
      broadcasting.done = true;
      notify(me.uid, { t: 'toast', msg: `Xabar yuborildi: ${broadcasting.sent} ta, yetib bormadi: ${broadcasting.failed} ta` });
    })();
    return { ok: true, total: ids.length };
  },
};
// end a room for everyone in it (players and spectators are sent back to the lobby)
function closeRoom(r, msg) {
  clearTimeout(r.clockTimer); clearTimeout(r.noShow); clearTimeout(r.cleanup); clearTimeout(r.holdTimer);
  rooms.delete(r.id);
  const out = JSON.stringify({ t: 'err', code: 'notfound', msg });
  for (const p of r.players) if (p && p.ws && p.ws.readyState === 1) { p.ws.attach && p.ws.attach(null, -1); p.ws.send(out); }
  if (r.watchers) for (const w of r.watchers) if (w.readyState === 1) w.send(out);
  lobbyChanged();
}
// a banned player leaves the queue, waiting rooms and open tournaments
function leaveAll(uid) {
  for (const q of queue.filter(x => x.uid === uid)) { leaveQueue(q.ws); q.ws.send(JSON.stringify({ t: 'err', code: 'auth', msg: bannedMsg(uid) })); }
  for (const r of [...rooms.values()]) {
    const i = r.players.findIndex(p => p && p.uid === uid);
    if (i < 0) continue;
    if (r.game.winner === null && r.game.turnStart !== null) { rulesOf(r).resign(r.game, i); broadcast(r); }
    const p = r.players[i];
    if (p && p.ws) p.ws.send(JSON.stringify({ t: 'err', code: 'auth', msg: bannedMsg(uid) }));
  }
  for (const t of tours.values()) if (t.status === 'open') {
    const i = t.players.findIndex(p => p.uid === uid);
    if (i >= 0) { t.players.splice(i, 1); tourChanged(t); }
  }
}

const GAME_INFO = {
  tosiq: { title: "To'siq Jangi", emoji: '🧱', line: "Raqib tomoniga birinchi yeting va uning yo'lini to'siqlar bilan to'sing!" },
  xo: { title: 'X va O', emoji: '❌⭕', line: "Uchta belgini bir qatorga birinchi bo'lib tering!" },
  shashka: { title: 'Shashka', emoji: '⚫⚪', line: "Raqibning barcha donalarini urib oling yoki uni yurolmaydigan qiling!" },
  shaxmat: { title: 'Shaxmat', emoji: '♟️', line: "Raqib shohiga mot qo'ying!" },
};
// the emoji players can send each other during a game
const REACTIONS = ['👍', '😂', '😮', '😡', '🔥', '👏', '🤝', '😭'];
const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// the invite text (Telegram HTML); the same wording is shown as a preview inside the app
// elo: the inviter's rating in that game (shown on room invites when they have played rated games)
function inviteText(name, kind, code, elo) {
  if (code) {
    const g = GAME_INFO[kind];
    return `⚔️ <b>${esc(name)}</b> sizni <b>${g.title}</b> bellashuviga chaqirdi!\n\n`
      + `<blockquote>${g.emoji} ${g.line}</blockquote>\n`
      + (elo ? `🏆 Uning reytingi: <b>${elo} ELO</b> — yengib ko'rasizmi?\n` : '')
      + `🔑 Xona kodi: <code>${esc(code)}</code>\n⏳ Xona sizni kutyapti — kechikmang!\n\n`
      + `👇 <b>Xonaga kirish</b> tugmasini bosing`;
  }
  return `🎮 <b>${esc(name)}</b> sizni <b>RAQIB</b> o'yinlar markaziga chorlayapti!\n\n`
    + `<blockquote>⚔️ Kim aqlliroq — bellashib ko'ramizmi?</blockquote>\n`
    + `🧱 <b>To'siq Jangi</b> — yo'lni to'sib, marraga birinchi yet\n`
    + `❌⭕ <b>X va O</b> — uchtasini bir qatorga ter\n`
    + `⚫ <b>Shashka</b> — donalarni urib ol, damka qil\n`
    + `♟️ <b>Shaxmat</b> — raqib shohiga mot qo'y\n`
    + `✨ <i>…va yangi o'yinlar yo'lda!</i>\n\n`
    + `🏆 Reyting va ELO  •  👥 Do'stlar bilan xonalar  •  🤖 Botga qarshi\n\n`
    + `👇 <b>Tugmani bosing — o'yin boshlanadi!</b>`;
}

// "be my friend": the inviter's best result, what friends get, and a "Do'st bo'lish" button
function bestOf(uid) {
  const p = players[uid];
  let best = null;
  for (const [k, st] of Object.entries((p && p.stats) || {})) if (st.games && (!best || st.elo > best.elo)) best = { kind: k, elo: st.elo };
  return best;
}
function friendText(name, best) {
  return `🤝 <b>${esc(name)}</b> sizni do'stlar ro'yxatiga taklif qilyapti!\n\n`
    + `<blockquote>🎮 RAQIB — Telegram ichidagi o'yinlar markazi\n♟️ Shaxmat • ⚫ Shashka • 🧱 To'siq Jangi • ❌⭕ X va O</blockquote>\n`
    + (best ? `🏆 Uning eng yaxshi natijasi: <b>${GAME_INFO[best.kind].title} — ${best.elo} ELO</b>\n\n` : '')
    + `✨ <b>Do'st bo'lsangiz:</b>\n`
    + `⚔️ bir-biringizni bir bosishda o'yinga chaqirasiz\n`
    + `👀 do'stingizning o'yinlarini jonli tomosha qilasiz\n`
    + `🔔 kim onlayn ekanini ko'rib turasiz\n`
    + `🏆 reytingda kim kuchliroq — bilib olasiz\n\n`
    + `👇 <b>Do'st bo'lish</b> tugmasini bosing`;
}
async function prepareFriendInvite(v, bot, app) {
  const link = `https://t.me/${bot}/${app}?startapp=${inviteOf(v.uid)}`;
  const text = friendText(v.name, bestOf(v.uid));
  const button = { text: "🤝 Do'st bo'lish", style: 'success', url: link };
  const title = "Do'stlik taklifi — RAQIB", description = `${v.name} bilan do'st bo'ling va bellashing`;
  const photo = APP_URL ? `${APP_URL}/img/invite.png` : null;
  const result = photo
    ? { type: 'photo', id: crypto.randomBytes(8).toString('hex'), photo_url: photo, thumbnail_url: photo, photo_width: 640, photo_height: 360,
        title, description, caption: text, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[button]] } }
    : { type: 'article', id: crypto.randomBytes(8).toString('hex'), title, description,
        input_message_content: { message_text: text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } },
        reply_markup: { inline_keyboard: [[button]] } };
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/savePreparedInlineMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: Number(v.uid.slice(2)), result, allow_user_chats: true, allow_group_chats: true }),
  });
  const d = await r.json();
  return d.ok ? { ok: true, id: d.result.id } : { ok: false, reason: d.description || 'telegram' };
}

async function prepareInvite(body) {
  const v = verifyInitData(body.initData), bot = BOT_NAME, app = process.env.APP_NAME;
  if (!v || !bot || !app) return { ok: false, reason: 'unavailable' };
  if (body.friend) return prepareFriendInvite(v, bot, app);
  const kind = kindOf(body.kind), code = clean(body.code);
  const link = `https://t.me/${bot}/${app}` + (code ? `?startapp=${code}` : '');
  const st = players[v.uid] && players[v.uid].stats[kind];
  const text = inviteText(v.name, kind, code, st && st.games ? st.elo : null);
  const button = { text: code ? '▶️ Xonaga kirish' : "🎮 O'ynash", style: 'success', url: link };
  const title = code ? `${GAME_INFO[kind].title} — o'yinga taklif` : "RAQIB — do'stingizni taklif qiling";
  const description = code ? `Xona kodi: ${code}` : "O'yinlar markazi: Shaxmat, Shashka, To'siq Jangi, X va O";
  // with a public address the invite goes out as a photo (the neon banner) with the text as its caption
  const photo = APP_URL ? `${APP_URL}/img/invite.png` : null;
  const result = photo
    ? { type: 'photo', id: crypto.randomBytes(8).toString('hex'), photo_url: photo, thumbnail_url: photo, photo_width: 640, photo_height: 360,
        title, description, caption: text, parse_mode: 'HTML', reply_markup: { inline_keyboard: [[button]] } }
    : { type: 'article', id: crypto.randomBytes(8).toString('hex'), title, description,
        input_message_content: { message_text: text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } },
        reply_markup: { inline_keyboard: [[button]] } };
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
    return res.end(JSON.stringify({ bot: BOT_NAME, app: process.env.APP_NAME || '' }));
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
    const me = url.searchParams.get('uid'), kind = kindOf(url.searchParams.get('kind'));
    rollWeek();
    // period=week: this week's ELO gain in rated games; otherwise the overall ELO
    const week = url.searchParams.get('period') === 'week', wk = weekKey();
    const list = week
      ? Object.entries(players).filter(([, p]) => p.week && p.week.key === wk && p.week.games[kind])
        .map(([id, p]) => [id, p.name, Object.assign({}, p.stats[kind], { gain: p.week.gain[kind] || 0, wgames: p.week.games[kind] }), p.photo || null])
        .sort((a, b) => b[2].gain - a[2].gain || b[2].elo - a[2].elo)
      : ranked(kind);
    const row = ([id, name, p, photo], i) => ({ rank: i + 1, pid: pidOf(id), name, photo, frame: looksOf(id).frame, elo: p.elo, gain: p.gain,
      wgames: p.wgames, wins: p.wins, losses: p.losses, draws: p.draws || 0, me: id === me, champ: champOf(id).length > 0 });
    const mine = list.findIndex(([id]) => id === me);
    const c = meta.champs[kind];
    return sendJson(res, { top: list.slice(0, 50).map(row), me: mine >= 0 ? row(list[mine], mine) : null, total: list.length,
      champ: c ? { pid: pidOf(c.uid), name: c.name, photo: c.photo, gain: c.gain, week: c.week } : null,
      weekEnds: new Date(Date.parse(wk + 'T00:00:00Z') + 7 * 86400000 - 5 * 3600000).getTime() });
  }
  if (url.pathname === '/api/profile') {
    const id = url.searchParams.get('uid'), kind = kindOf(url.searchParams.get('kind'));
    const p = players[id] || { stats: {} };
    const st = p.stats[kind] || freshStats();
    const rank = ranked(kind).findIndex(([pid]) => pid === id);
    const skins = {};
    for (const k of Object.keys(GAMES)) skins[k] = Rewards.SKINS[k].filter(x => Rewards.skinUnlocked(p, k, x.id)).map(x => x.id);
    const w = p.week && p.week.key === weekKey() ? p.week : { gain: {}, games: {} };
    return sendJson(res, Object.assign({}, st, { rank: rank >= 0 ? rank + 1 : null, pid: pidOf(id || ''), invite: id ? inviteOf(id) : null,
      ach: p.ach || {}, equip: p.equip || { frame: null, skin: {} }, skins,
      frames: Rewards.FRAMES.filter(f => Rewards.frameUnlocked(p, f.id)).map(f => f.id),
      counters: p.counters || null, week: { gain: w.gain[kind] || 0, games: w.games[kind] || 0 }, champ: champOf(id),
      friends: (p.friends || []).length }));
  }
  if (url.pathname === '/api/player') { // someone else's public card
    const uid = uidOfPid(String(url.searchParams.get('pid') || ''));
    if (!uid || !players[uid]) return sendJson(res, { ok: false });
    return sendJson(res, Object.assign({ ok: true }, cardOf(uid, url.searchParams.get('uid'))));
  }
  if (url.pathname === '/api/search') { // find players by name to add as friends
    const me = url.searchParams.get('uid'), q = String(url.searchParams.get('q') || '').trim().replace(/^@/, '').toLowerCase();
    if (q.length < 2) return sendJson(res, { list: [] });
    const total = (p) => Object.values(p.stats || {}).reduce((n, st) => n + (st.games || 0), 0);
    const list = Object.entries(players).filter(([u, p]) => u !== me && p.name && p.name.toLowerCase().includes(q))
      .sort((a, b) => (b[1].name.toLowerCase().startsWith(q) - a[1].name.toLowerCase().startsWith(q)) || total(b[1]) - total(a[1]))
      .slice(0, 15).map(([u]) => cardOf(u, me));
    return sendJson(res, { list });
  }
  if (url.pathname === '/api/friends') {
    const p = players[url.searchParams.get('uid')];
    const list = (p && p.friends || []).filter(u => players[u]).map(u => cardOf(u));
    const order = { playing: 0, online: 1, offline: 2 };
    list.sort((a, b) => order[a.status.state] - order[b.status.state]);
    const requests = (p && p.requests || []).filter(u => players[u]).map(u => cardOf(u));
    return sendJson(res, { friends: list, requests });
  }
  if (url.pathname === '/api/admin' && req.method === 'POST') {
    readJson(req).then(async (body) => {
      const me = whoIs(body);
      if (!me || !isAdmin(me.uid)) return sendJson(res, { ok: false, msg: "Ruxsat yo'q" });
      const fn = ADMIN[body.op];
      if (!fn) return sendJson(res, { ok: false, msg: "Noma'lum amal" });
      try { sendJson(res, await fn(body, me)); } catch (e) { console.log('admin', body.op, e); sendJson(res, { ok: false, msg: 'Xato: ' + e.message }); }
    });
    return;
  }
  const act = url.pathname.match(/^\/api\/(friend|freply|challenge|decline|equip|botwin)$/);
  if (act && req.method === 'POST') {
    readJson(req).then(async (body) => {
      const me = whoIs(body);
      if (!me) return sendJson(res, { ok: false, msg: 'Faqat Telegram ichida ishlaydi' });
      try { sendJson(res, await ACTIONS[act[1]](me, body)); } catch (e) { sendJson(res, { ok: false, msg: 'Xato' }); }
    });
    return;
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
  for (const u of presence.keys()) uids.add(u);
  const list = [];
  for (const r of rooms.values()) {
    const host = r.players.find(p => p && p.ws);
    if (!host) continue; // nobody is there right now
    const waiting = r.game.turnStart === null && r.players.filter(Boolean).length < 2;
    if ((r.ranked || r.tour || r.reserved) && (waiting || r.game.turnStart === null)) continue; // not open to others
    if (r.reserved && !r.tour) continue; // a friend's challenge stays private
    const running = r.game.winner === null && r.game.turnStart !== null;
    list.push({ id: r.id, kind: r.kind, pub: r.pub, name: host.name, status: waiting ? 'waiting' : 'playing',
      names: r.players.map(x => x && x.name), ranked: !!r.ranked, tour: !!r.tour, minutes: r.minutes || DEFAULT_MIN[r.kind],
      // open rooms, rated and tournament games can be watched while they run
      watch: running && (r.pub || !!r.ranked || !!r.tour), watchers: r.watchers ? r.watchers.size : 0,
      age: Math.round((now - r.created) / 1000) });
  }
  // joinable rooms first, newest first
  list.sort((a, b) => (a.status === b.status ? a.age - b.age : a.status === 'waiting' ? -1 : 1));
  const tl = [...tours.values()].filter(t => t.status !== 'done' || now - t.ended < 10 * 60 * 1000).map(tourBrief);
  return { rooms: list.slice(0, 60), online: uids.size, tours: tl };
}

// push the room list to everyone in the lobby, at most every 150 ms and only when it changed
let lobbyTimer = null, lastLobby = '';
// how many people are in each game right now (its lobby, a room, the rated queue, or a bot game),
// pushed to every open app whenever it changes
function onlineCounts() {
  const by = {}, all = new Set();
  for (const k of Object.keys(GAMES)) by[k] = new Set();
  for (const [uid, set] of presence) { all.add(uid); for (const w of set) if (w.kind && by[w.kind]) by[w.kind].add(uid); }
  for (const r of rooms.values()) for (const p of r.players) if (p && p.ws) { by[r.kind].add(p.uid); all.add(p.uid); }
  for (const q of queue) { by[q.kind].add(q.uid); all.add(q.uid); }
  const counts = {};
  for (const k of Object.keys(by)) counts[k] = by[k].size;
  return { t: 'online', counts, total: all.size };
}
let onlineTimer = null, lastOnline = '';
function onlineChanged() {
  if (onlineTimer) return;
  onlineTimer = setTimeout(() => {
    onlineTimer = null;
    const msg = JSON.stringify(onlineCounts());
    if (msg === lastOnline) return;
    lastOnline = msg;
    for (const set of presence.values()) for (const w of set) if (w.readyState === 1) w.send(msg);
  }, 300);
}
function lobbyChanged() {
  onlineChanged();
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
      if (a.uid === b.uid || a.kind !== b.kind || a.minutes !== b.minutes) continue;
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
      size: queue.filter(x => x.kind === q.kind && x.minutes === q.minutes).length, minutes: q.minutes }));
  }
}
setInterval(matchTick, 1000);

function startRanked(a, b) {
  const starter = Math.random() < 0.5 ? 0 : 1;
  const r = { id: freshCode(), kind: a.kind, pub: false, ranked: true, created: Date.now(), game: GAMES[a.kind].newGame(starter, a.minutes), starter,
    minutes: a.minutes, watchers: new Set(),
    players: [a, b].map(q => ({ uid: q.uid, name: q.name, photo: q.photo, ws: q.ws, verified: true })), hold: true };
  rooms.set(r.id, r);
  [a, b].forEach((q, i) => {
    const o = i ? a : b;
    q.ws.attach(r, i);
    q.ws.send(JSON.stringify({ t: 'matched', me: { name: q.name, elo: q.elo, photo: q.photo, frame: looksOf(q.uid).frame },
      opp: { name: o.name, elo: o.elo, photo: o.photo, frame: looksOf(o.uid).frame }, starter: starter === i, minutes: a.minutes }));
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
  if (g.winner !== null && !room.counted) { room.counted = true; countGame(room.kind); }
  else if (g.winner === null) room.counted = false;
  if (g.winner !== null) room.drawOffer = null;
  if (room.tour) tourGameChanged(room);
  const now = Date.now();
  const base = {
    t: 'state', game: g, kind: room.kind, now, room: room.id, pub: room.pub, ranked: !!room.ranked, elo: room.elo || null,
    names: room.players.map(x => x && x.name), rematch: room.rematch || [false, false],
    photos: room.players.map(x => (x && x.photo) || null),
    online: room.players.map(x => !!(x && x.ws)),
    looks: room.players.map(x => (x ? looksOf(x.uid, room.kind) : { frame: null, skin: null })),
    pids: room.players.map(x => (x ? pidOf(x.uid) : null)),
    minutes: room.minutes || DEFAULT_MIN[room.kind], drawOffer: room.drawOffer == null ? null : room.drawOffer,
    watchers: room.watchers ? room.watchers.size : 0, tour: room.tour || null,
  };
  room.players.forEach((pl, i) => {
    if (!pl || !pl.ws) return;
    pl.ws.send(JSON.stringify(Object.assign({}, base, { you: i, code: room.code })));
  });
  if (room.watchers && room.watchers.size) {
    const msg = JSON.stringify(Object.assign({}, base, { you: -1 }));
    for (const w of room.watchers) if (w.readyState === 1) w.send(msg);
  }
  lobbyChanged();
}

// ---------- tournaments: single elimination, 4 / 8 / 16 players, games are not rated ----------
const tours = new Map();
const tourBrief = (t) => ({ id: t.id, kind: t.kind, minutes: t.minutes, size: t.size, count: t.players.length, host: t.players[0] ? t.players[0].name : '',
  status: t.status, winner: t.winner != null ? t.players[t.winner].name : null });
const tourPublic = (t) => Object.assign(tourBrief(t), {
  players: t.players.map(p => ({ pid: pidOf(p.uid), name: p.name, photo: p.photo || null, frame: looksOf(p.uid).frame })),
  rounds: t.rounds.map(r => r.map(m => ({ a: m.a, b: m.b, w: m.w, room: m.room || null,
    live: !!(m.room && rooms.get(m.room) && rooms.get(m.room).game.turnStart !== null && m.w == null) }))),
  hostPid: t.players[0] ? pidOf(t.players[0].uid) : null, winner: t.winner,
});
function tourChanged(t) {
  const msg = { t: 'tour', tour: tourPublic(t) };
  for (const p of t.players) notify(p.uid, msg);
  for (const p of t.left || []) notify(p, msg);
  lobbyChanged();
}
function tourOf(uid) { return [...tours.values()].find(t => t.status !== 'done' && t.players.some(p => p.uid === uid)); }
function startTour(t) {
  t.status = 'running'; clearTimeout(t.expire);
  for (let i = t.players.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [t.players[i], t.players[j]] = [t.players[j], t.players[i]]; }
  let size = 2; while (size < t.players.length) size *= 2;
  const seeds = t.players.map((_, i) => i).concat(Array(size - t.players.length).fill(-1));
  // pair the top half with the bottom half, so the empty seats (byes) never meet each other
  t.rounds = [Array.from({ length: size / 2 }, (_, i) => ({ a: seeds[i], b: seeds[size - 1 - i], w: null }))];
  playRound(t);
}
function playRound(t) {
  const round = t.rounds[t.rounds.length - 1];
  for (const m of round) {
    if (m.w != null) continue;
    if (m.b === -1 || m.a === -1) { m.w = m.b === -1 ? m.a : m.b; continue; }
    const A = t.players[m.a], B = t.players[m.b], starter = Math.random() < 0.5 ? 0 : 1;
    const r = { id: freshCode(), code: freshCode(), kind: t.kind, pub: false, tour: t.id, created: Date.now(), minutes: t.minutes,
      game: GAMES[t.kind].newGame(starter, t.minutes), starter, players: [null, null], reserved: [A.uid, B.uid], watchers: new Set() };
    rooms.set(r.id, r);
    m.room = r.id;
    for (const [P, O] of [[A, B], [B, A]]) notify(P.uid, { t: 'tmatch', tour: t.id, room: r.id, code: r.code, kind: t.kind, opp: O.name });
    // whoever doesn't come to the board within a minute loses that match
    r.noShow = setTimeout(() => {
      if (m.w != null || r.game.turnStart !== null) return;
      const here = r.players.map(x => !!(x && x.ws));
      endMatch(t, m, here[1] && !here[0] ? m.b : here[0] && !here[1] ? m.a : Math.random() < 0.5 ? m.a : m.b);
      rooms.delete(r.id);
    }, 60 * 1000);
  }
  tourChanged(t);
  checkRound(t);
}
function tourGameChanged(room) {
  const t = tours.get(room.tour), g = room.game;
  if (!t || g.winner === null || room.tourDone) return;
  const m = t.rounds[t.rounds.length - 1].find(x => x.room === room.id);
  if (!m) return;
  if (g.winner === -1) { // a draw is replayed (colours swap) until somebody wins
    if (room.replayTimer) return;
    room.replayTimer = setTimeout(() => {
      room.replayTimer = null; room.starter = 1 - room.starter; room.game = GAMES[room.kind].newGame(room.starter, room.minutes);
      room.rated = false; broadcast(room);
    }, 4000);
    return;
  }
  room.tourDone = true;
  const uid = room.players[g.winner].uid;
  endMatch(t, m, t.players.findIndex(p => p.uid === uid));
}
function endMatch(t, m, w) {
  if (m.w != null) return;
  m.w = w;
  tourChanged(t);
  checkRound(t);
}
function checkRound(t) {
  const round = t.rounds[t.rounds.length - 1];
  if (t.status !== 'running' || round.some(m => m.w == null)) return;
  if (round.length === 1) {
    t.status = 'done'; t.winner = round[0].w; t.ended = Date.now();
    const champ = t.players[t.winner];
    award(champ.uid, 'tour');
    const p = playerRec(champ.uid); p.tourWins = (p.tourWins || 0) + 1; savePlayers();
    tourChanged(t);
    setTimeout(() => { tours.delete(t.id); lobbyChanged(); }, 10 * 60 * 1000);
    return;
  }
  const next = [];
  for (let i = 0; i < round.length; i += 2) next.push({ a: round[i].w, b: round[i + 1].w, w: null });
  t.rounds.push(next);
  tourChanged(t);
  setTimeout(() => playRound(t), 6000); // a short break to look at the bracket
}
// tournament actions come over the presence socket (ws.user is the verified player)
function tourAction(ws, m) {
  const me = ws.user, say = (msg) => ws.send(JSON.stringify({ t: 'toast', msg }));
  if (!me) return say("Turnir faqat Telegram ichida ishlaydi");
  if (m.t === 'tcreate') {
    if (tourOf(me.uid)) return say("Siz allaqachon turnirdasiz");
    const kind = kindOf(m.kind), size = [4, 8, 16].includes(Number(m.size)) ? Number(m.size) : 8;
    const t = { id: freshCode(), kind, minutes: minutesOf(kind, m.minutes), size, status: 'open', created: Date.now(),
      players: [{ uid: me.uid, name: me.name, photo: me.photo }], rounds: [], left: [] };
    tours.set(t.id, t);
    // an unfilled tournament is dropped after 30 minutes
    t.expire = setTimeout(() => { if (t.status === 'open') { t.status = 'done'; t.ended = 0; tourChanged(t); tours.delete(t.id); lobbyChanged(); } }, 30 * 60 * 1000);
    return tourChanged(t);
  }
  const t = tours.get(clean(m.id));
  if (!t) return say('Turnir topilmadi');
  if (m.t === 'tview') return ws.send(JSON.stringify({ t: 'tour', tour: tourPublic(t) }));
  if (t.status !== 'open') return say('Turnir allaqachon boshlangan');
  const i = t.players.findIndex(p => p.uid === me.uid);
  if (m.t === 'tjoin') {
    if (i >= 0) return tourChanged(t);
    if (tourOf(me.uid)) return say("Siz boshqa turnirdasiz");
    if (t.players.length >= t.size) return say("Turnir to'lgan");
    t.players.push({ uid: me.uid, name: me.name, photo: me.photo });
    t.left = t.left.filter(u => u !== me.uid);
    if (t.players.length === t.size) startTour(t); else tourChanged(t);
  } else if (m.t === 'tleave' && i >= 0) {
    t.players.splice(i, 1); t.left.push(me.uid);
    if (!t.players.length) { t.status = 'done'; t.ended = 0; tourChanged(t); tours.delete(t.id); return lobbyChanged(); }
    tourChanged(t);
  } else if (m.t === 'tstart' && i === 0) { // the host may start early with at least 3 players
    if (t.players.length < 3) return say("Kamida 3 o'yinchi kerak");
    startTour(t);
  }
}

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => {
  let room = null, slot = -1, watching = null;
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

    if (m.t === 'hello') { // the app's presence socket
      const me = whoIs(m);
      if (!me) return;
      ws.user = me;
      const rec = playerRec(me.uid, me.name, me.photo);
      rec.seen = Date.now();
      if (meta.announce) send({ t: 'announce', text: meta.announce.text, at: meta.announce.at });
      if (bannedMsg(me.uid)) send({ t: 'banned', msg: bannedMsg(me.uid) });
      if (isAdmin(me.uid)) send({ t: 'admin' });
      if (!presence.has(me.uid)) presence.set(me.uid, new Set());
      presence.get(me.uid).add(ws);
      const t = tourOf(me.uid);
      ws.kind = GAMES[m.kind] ? m.kind : null;
      send({ t: 'hi', pid: pidOf(me.uid), tour: t ? tourPublic(t) : null, requests: (players[me.uid].requests || []).length });
      send(onlineCounts());
      return lobbyChanged();
    }
    if (m.t === 'where') { // which game this app is looking at (null = the games list)
      ws.kind = GAMES[m.kind] ? m.kind : null;
      return onlineChanged();
    }
    if (['tcreate', 'tjoin', 'tleave', 'tstart', 'tview'].includes(m.t)) {
      if (ws.user && bannedMsg(ws.user.uid)) return send({ t: 'toast', msg: bannedMsg(ws.user.uid) });
      return tourAction(ws, m);
    }

    if (m.t === 'watch') { // spectate a running game
      const r = rooms.get(clean(m.room));
      if (!r) return fail('notfound', "O'yin topilmadi yoki tugagan");
      const me = whoIs(m), friendOf = me && players[me.uid] && r.players.some(x => x && (players[me.uid].friends || []).includes(x.uid));
      if (!(r.pub || r.ranked || r.tour || friendOf)) return fail('notfound', "Bu o'yinni tomosha qilib bo'lmaydi");
      if (watching) watching.watchers.delete(ws);
      watching = r; r.watchers = r.watchers || new Set(); r.watchers.add(ws);
      if (me && !r.players.some(x => x && x.uid === me.uid)) award(me.uid, 'watcher');
      return broadcast(r);
    }

    if (m.t === 'queue') { // search for a rated opponent
      if (room) return;
      const v = verifyInitData(m.initData);
      if (BOT_TOKEN && !v) return fail('auth', "Reytingli o'yin faqat Telegram ichida ishlaydi");
      const uid = v ? v.uid : String(m.uid || '').slice(0, 64), name = v ? v.name : String(m.name || "O'yinchi").slice(0, 24);
      if (!uid) return fail('auth', "Foydalanuvchi aniqlanmadi");
      if (bannedMsg(uid)) return fail('auth', bannedMsg(uid));
      leaveQueue(ws);
      for (const q of queue.filter(x => x.uid === uid)) { leaveQueue(q.ws); q.ws.close(); } // one search per player
      const kind = kindOf(m.kind);
      queue.push({ ws, uid, name, kind, minutes: minutesOf(kind, m.minutes), photo: v ? v.photo : cleanPhoto(m.photo), elo: eloOf(uid, kind), since: Date.now() });
      lobbyChanged();
      return matchTick();
    }
    if (m.t === 'unqueue') return leaveQueue(ws);

    if (m.t === 'join') {
      // a valid Telegram signature fixes who the player is; otherwise trust the client only without BOT_TOKEN
      const v = verifyInitData(m.initData);
      const uid = v ? v.uid : String(m.uid || '').slice(0, 64), name = v ? v.name : String(m.name || "O'yinchi").slice(0, 24);
      const verified = !!v || !BOT_TOKEN, photo = v ? v.photo : cleanPhoto(m.photo);
      if (bannedMsg(uid)) return fail('auth', bannedMsg(uid));
      let r;
      if (m.create) {                       // new room
        const pub = !!m.create.pub;
        const kind = kindOf(m.create.kind), minutes = minutesOf(kind, m.create.minutes);
        r = { id: freshCode(), kind, pub, created: Date.now(), game: GAMES[kind].newGame(0, minutes), starter: 0, minutes,
          players: [null, null], watchers: new Set() };
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
      if (r.reserved) s = r.reserved.indexOf(uid); // a friend's challenge or a tournament match: fixed seats
      else if (s < 0) s = r.players.findIndex(p => !p);
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
      room.drawOffer = null; // making a move turns down a pending draw offer
      broadcast(room);
    } else if (m.t === 'drawoffer') { // shaxmat / shashka: offer a draw (3 times per game at most)
      const g = room.game;
      if (!['shaxmat', 'shashka'].includes(room.kind) || g.winner !== null || g.turnStart === null || room.drawOffer != null) return;
      room.drawCount = room.drawCount || [0, 0];
      if (room.drawCount[slot] >= 3) return send({ t: 'err', msg: "Durrang taklifi juda ko'p" });
      room.drawCount[slot]++; room.drawOffer = slot;
      broadcast(room);
    } else if (m.t === 'drawreply') {
      if (room.drawOffer !== 1 - slot) return;
      room.drawOffer = null;
      const g = room.game, now = Date.now();
      if (m.accept && g.winner === null && !G.checkTimeout(g, now)) { g.clock[g.turn] -= now - g.turnStart; g.turnStart = now; g.winner = -1; g.reason = 'agreed'; }
      else if (!m.accept) { const o = room.players[slot]; if (o) notify(room.players[1 - slot].uid, { t: 'toast', msg: "Raqib durrangni rad etdi" }); }
      broadcast(room);
    } else if (m.t === 'resign') {
      if (G.resign(room.game, slot)) broadcast(room);
    } else if (m.t === 'rematch' && room.game.winner !== null && !room.tour) {
      // a rematch needs both players: the first request is shown to the opponent, the second starts the game
      // (a rated game's rematch is rated too)
      const other = room.players[1 - slot];
      if (!other || !other.ws) return send({ t: 'err', msg: "Raqib o'yindan chiqib ketgan" });
      room.rematch = room.rematch || [false, false];
      room.rematch[slot] = true;
      if (room.rematch.every(Boolean)) {
        room.rematch = null;
        room.starter = 1 - room.starter;
        room.game = G.newGame(room.starter, room.minutes);
        room.rated = false; room.elo = null; room.drawOffer = null; room.drawCount = null;
      }
      broadcast(room);
    } else if (m.t === 'react') { // a quick emoji for both screens, at most one per 1.2 s
      if (!REACTIONS.includes(m.e) || !room.players[1 - slot]) return;
      const now = Date.now();
      if (now - (ws.lastReact || 0) < 1200) return;
      ws.lastReact = now;
      const msg = JSON.stringify({ t: 'react', e: m.e, from: slot });
      for (const pl of room.players) if (pl && pl.ws && pl.ws.readyState === 1) pl.ws.send(msg);
    }
  });

  ws.on('close', () => {
    if (lobby.delete(ws)) lobbyChanged();
    leaveQueue(ws);
    if (ws.user && presence.has(ws.user.uid)) {
      const set = presence.get(ws.user.uid); set.delete(ws);
      if (!set.size) presence.delete(ws.user.uid);
      lobbyChanged();
    }
    if (watching) { watching.watchers.delete(ws); if (rooms.has(watching.id)) broadcast(watching); }
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
      // (a challenge or a tournament match keeps its room until it is played or times out)
      if (room.players.every(p => !p) && !room.reserved) { rooms.delete(room.id); return lobbyChanged(); }
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
const BOT_USERNAME = BOT_NAME, APP_NAME = process.env.APP_NAME || '';
const APP_URL = (process.env.WEB_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? 'https://' + process.env.RAILWAY_PUBLIC_DOMAIN : ''))
  .replace(/\/+$/, '');
const tgApi = (method, body) => fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}),
}).then(r => r.json());
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// the button that opens the game; with a room code it opens straight into that room
function playButton(code) {
  const text = code ? '▶️ Xonaga kirish' : "🎮 O'ynash";
  if (APP_URL) return { text, style: 'success', web_app: { url: APP_URL + (code ? `/?room=${code}` : '/') } };
  if (BOT_USERNAME && APP_NAME) return { text, style: 'success', url: `https://t.me/${BOT_USERNAME}/${APP_NAME}` + (code ? `?startapp=${code}` : '') };
  return null;
}
function shareButton() {
  if (!BOT_USERNAME) return null;
  const text = "🎮 Shaxmat, Shashka, To'siq Jangi va X va O — men bilan bellashasanmi? Reytingda kim yuqori, ko'ramiz! 🏆";
  return { text: "👥 Do'stni taklif qilish", style: 'primary', url: `https://t.me/share/url?url=${encodeURIComponent('https://t.me/' + BOT_USERNAME)}&text=${encodeURIComponent(text)}` };
}
// ---------- premium (custom) emoji: the admin maps a plain emoji to a premium one with /emoji ----------
// Telegram shows custom emoji from a bot only if the bot's owner has Premium (or the bot has a Fragment
// username); if Telegram refuses, the message is sent again with plain emoji.
const ADMINS = String(process.env.ADMIN_ID || '').split(/[\s,]+/).filter(Boolean);
const EMOJI_FILE = path.join(DATA_DIR, 'emoji.json');
let emojiMap = {};
try { emojiMap = JSON.parse(fs.readFileSync(EMOJI_FILE, 'utf8')); } catch (e) {}
const saveEmoji = () => fs.writeFile(EMOJI_FILE, JSON.stringify(emojiMap, null, 1), () => {});
const bareEmoji = (e) => e.replace(/️/g, ''); // "▶️" and "▶" are the same key
const emojiKeys = () => Object.keys(emojiMap).sort((a, b) => b.length - a.length);
function premiumText(html) {
  for (const k of emojiKeys()) {
    const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '️?', 'gu');
    html = html.replace(re, (m) => `<tg-emoji emoji-id="${emojiMap[k]}">${m}</tg-emoji>`);
  }
  return html;
}
// a button whose label starts with a mapped emoji gets that premium emoji as its icon instead
function premiumButton(b) {
  for (const k of emojiKeys()) {
    const m = b.text.match(new RegExp('^' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '️?\\s*', 'u'));
    if (m) return Object.assign({}, b, { text: b.text.slice(m[0].length), icon_custom_emoji_id: emojiMap[k] });
  }
  return b;
}
const premiumMarkup = (mk) => mk && mk.inline_keyboard ? { inline_keyboard: mk.inline_keyboard.map(r => r.map(premiumButton)) } : mk;

// "/emoji 🎮=<premium> 🏆=<premium>": every custom_emoji entity is paired with the plain emoji typed before it
function readEmojiPairs(msg) {
  const ents = (msg.entities || []).filter(e => e.type === 'custom_emoji').sort((a, b) => a.offset - b.offset);
  const pairs = [];
  let from = 0;
  for (const e of ents) {
    const plain = msg.text.slice(from, e.offset).replace(/^\/emoji(@\w+)?/i, '').replace(/[=\s,:\-→>]+/g, '');
    if (plain) pairs.push([bareEmoji(plain), e.custom_emoji_id]);
    from = e.offset + e.length;
  }
  return pairs;
}

const keyboard = (...rows) => ({ inline_keyboard: rows.map(r => r.filter(Boolean)).filter(r => r.length) });

function welcomeText(firstName) {
  return `🎮 <b>Assalomu alaykum, ${esc(firstName || "do'stim")}!</b>\n\n`
    + `Bu yerda do'stlaring va butun O'zbekiston bilan <b>aql o'yinlari</b>da kuch sinashasan:\n\n`
    + `🧱 <b>To'siq Jangi</b> — raqib yo'lini to'siqlar bilan to'sib, birinchi bo'lib marraga yet\n`
    + `❌⭕ <b>X va O</b> — uchta belgini bir qatorga birinchi bo'lib ter\n`
    + `⚫ <b>Shashka</b> — raqib donalarini urib ol, damka bilan g'alaba qil\n`
    + `♟️ <b>Shaxmat</b> — klassik shaxmat, raqib shohiga mot qo'y\n\n`
    + `🏆 Reytingli o'yinlar, ELO va haftalik reyting\n⚔️ Turnirlar va do'stlarni chaqirish\n🎨 ELO uchun skinlar va ramkalar\n🤖 Botga qarshi mashq (3 daraja)\n\n`
    + `👇 Boshlash uchun <b>O'ynash</b> tugmasini bos!`;
}
const HELP_TEXT = `ℹ️ <b>Qanday o'ynaladi?</b>\n\n`
  + `1️⃣ <b>O'ynash</b> tugmasini bosing va o'yinni tanlang\n`
  + `2️⃣ <b>⭐ Reytingli o'yin</b> — sizga kuchi teng raqib topiladi, g'alaba uchun ELO beriladi\n`
  + `3️⃣ <b>Xona yaratish</b> — do'stingiz bilan o'ynang: ochiq xonaga istalgan kishi, maxfiy xonaga faqat kod bilan kiriladi\n`
  + `4️⃣ <b>🤖 Botga qarshi</b> — mashq qiling\n`
  + `5️⃣ O'yin tugagach <b>🔁 Revansh</b> — o'sha raqib bilan yana bir bor\n`
  + `6️⃣ <b>🏆 Turnirlar</b>, <b>👥 Do'stlar</b> (chaqirish va tomosha qilish), <b>👑 haftalik reyting</b>\n\n`
  + `🎨 Reytingda ELO oshgani sari personaj skinlari va profil ramkalari ochiladi!\n`
  + `O'yin paytida raqibga 👍😂🔥 emoji yuborishingiz mumkin.\n`
  + `Reyting va profilingiz ilovaning pastki menyusida.`;

async function onMessage(msg) {
  if (!msg || !msg.chat || typeof msg.text !== 'string') return;
  const chat_id = msg.chat.id, [cmd, payload] = msg.text.trim().split(/\s+/);
  const plain = (text, markup) => tgApi('sendMessage', { chat_id, text, parse_mode: 'HTML', reply_markup: markup, link_preview_options: { is_disabled: true } });
  const send = async (text, markup) => {
    if (!Object.keys(emojiMap).length) return plain(text, markup);
    const r = await plain(premiumText(text), premiumMarkup(markup));
    if (!r.ok) { console.log('Premium emoji rad etildi:', r.description); return plain(text, markup); }
    return r;
  };
  const isAdmin = msg.from && ADMINS.includes(String(msg.from.id));
  if (cmd === '/id') return plain(`🆔 Sizning Telegram ID: <code>${msg.from ? msg.from.id : '?'}</code>`);
  const isDel = /^\/emojidel/i.test(msg.text.trim()), isEmoji = !isDel && /^\/emoji/i.test(msg.text.trim());
  if (isEmoji || isDel) {
    if (!ADMINS.length) return plain("⚙️ Avval serverga <code>ADMIN_ID</code> o'zgaruvchisini qo'shing (ID'ingizni /id bilan bilib oling).");
    if (!isAdmin) return plain("⛔ Bu buyruq faqat admin uchun.");
    if (isDel) {
      const what = msg.text.replace(/^\/emojidel(@\w+)?/i, '').trim();
      if (what === 'all') emojiMap = {}; else for (const ch of [...what.replace(/\s+/g, '')]) delete emojiMap[bareEmoji(ch)];
      saveEmoji();
      return plain(what === 'all' ? "🗑 Barcha premium emojilar o'chirildi." : "🗑 O'chirildi. Qolgan: " + (Object.keys(emojiMap).join(' ') || "yo'q"));
    }
    const pairs = readEmojiPairs(msg);
    if (pairs.length) {
      for (const [k, id] of pairs) emojiMap[k] = id;
      saveEmoji();
      return send(`✅ Saqlandi (${pairs.length} ta): ` + pairs.map(([k]) => k).join(' ')
        + "\n\nEndi bot xabarlari va tugmalarida shu emojilar premium ko'rinishda chiqadi. Tekshirish: /start");
    }
    const list = Object.keys(emojiMap);
    return send(`✨ <b>Premium emoji</b>\n\nQo'shish: <code>/emoji 🎮=</code> va yoniga premium emojini yuboring.\n`
      + `Bir xabarda bir nechtasi: <code>/emoji 🎮=… 🏆=… 👥=…</code>\nO'chirish: <code>/emojidel 🎮</code> yoki <code>/emojidel all</code>\n\n`
      + (list.length ? `Hozirgi (${list.length}): ${list.join(' ')}` : "Hozircha premium emoji yo'q."));
  }
  if (msg.chat.type === 'private') {
    meta.botUsers = meta.botUsers || [];
    if (!meta.botUsers.includes(chat_id)) { meta.botUsers.push(chat_id); saveMeta(); }
  }
  if (cmd === '/start' || cmd.startsWith('/start@')) {
    const code = clean(payload);
    if (code) return send(`🔑 Sizni <code>${esc(code)}</code> xonasiga taklif qilishdi!\n\n👇 Tugmani bosing va o'yinga kiring.`, keyboard([playButton(code)]));
    return send(welcomeText(msg.from && msg.from.first_name), keyboard([playButton()], [shareButton()]));
  }
  if (cmd === '/help' || cmd.startsWith('/help@')) return send(HELP_TEXT, keyboard([playButton()]));
  if (msg.chat.type === 'private') return send("👇 O'ynash uchun tugmani bosing:", keyboard([playButton()]));
}

// shown on the bot's profile ("About", <=120 chars) and in an empty chat ("What can this bot do?", <=512 chars)
const BOT_ABOUT = "🎮 Raqib — o'yinlar markazi: do'stlar bilan onlayn o'yinlar, reyting va ELO. Yangi o'yinlar qo'shilib boradi!";
const BOT_DESCRIPTION = [
  "🎮 RAQIB — o'yinlar markazi Telegram'da!",
  "Bir botda — ko'plab o'yinlar:",
  "",
  "🧱 To'siq Jangi — raqib yo'lini to'siqlar bilan to'sib, birinchi bo'lib marraga yet",
  "❌⭕ X va O — uchta belgini bir qatorga ter",
  "⚫ Shashka — donalarni urib ol, damka qil",
  "♟️ Shaxmat — raqib shohiga mot qo'y",
  "",
  "⭐ Reytingli o'yin — kuchi teng raqib topiladi",
  "🏆 ELO reyting va g'oliblar jadvali",
  "👥 Do'stlar bilan ochiq va maxfiy xonalar",
  "🤖 Botga qarshi mashq",
  "✨ Yangi o'yinlar qo'shilib boradi",
  "",
  "Kim kuchliroq? Boshlash uchun START ni bosing 👇",
].join('\n');

async function runBot() {
  if (!BOT_TOKEN) return console.log('BOT_TOKEN yo\'q — bot xabarlariga javob berilmaydi');
  try {
    await tgApi('deleteWebhook', {}); // polling and a webhook can't be used together
    if (APP_URL) await tgApi('setChatMenuButton', { menu_button: { type: 'web_app', text: "O'ynash", web_app: { url: APP_URL + '/' } } });
    await tgApi('setMyCommands', { commands: [{ command: 'start', description: "O'yinni boshlash" }, { command: 'help', description: "Qanday o'ynaladi" }] });
    await tgApi('setMyShortDescription', { short_description: BOT_ABOUT });
    await tgApi('setMyDescription', { description: BOT_DESCRIPTION });
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

server.listen(PORT, () => { rollWeek(); console.log(`O'yinlar serveri: http://localhost:${PORT}`); runBot(); });
