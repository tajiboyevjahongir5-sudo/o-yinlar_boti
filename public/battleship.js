// "Dengiz jangi" (battleship): 10x10, fleet 4+3+3+2+2+2+1+1+1+1, ships may not touch (not even by a corner).
// Phase 'place': both players place their fleet (or ask for a random one) within 60 s; then 'battle': a hit or a
// sunk ship lets you shoot again, a miss passes the turn. Sinking all enemy ships wins.
// Hidden information: view(g, p) hides the opponent's ships (shown only when hit / sunk). Shared by server and client.
(function () {
  const N = 10, FLEET = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1], CLOCK_MS = 5 * 60 * 1000, PLACE_MS = 60 * 1000;
  const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
  const cellsOf = (s) => Array.from({ length: s.len }, (_, k) => s.dir === 'v' ? (s.r + k) * N + s.c : s.r * N + s.c + k);

  function newGame(starter, minutes) {
    const ms = minutes ? minutes * 60000 : CLOCK_MS;
    return { kind: 'dengiz', phase: 'place', ships: [null, null], shots: [Array(N * N).fill(0), Array(N * N).fill(0)], // shots[p] = p's shots at the enemy: 0 none, 1 miss, 2 hit
      sunk: [[], []], turn: starter || 0, starter: starter || 0, winner: null, reason: null, log: [], hist: [], n: 0, last: null,
      base: ms, clock: [ms, ms], turnStart: null, phaseStart: null };
  }
  function start(g, now) { if (g.turnStart === null) { g.turnStart = now; g.phaseStart = now; } }
  // a fleet is legal when it has the right ships, all inside, none touching
  function fleetError(ships) {
    if (!Array.isArray(ships) || ships.length !== FLEET.length) return "Kemalar soni noto'g'ri";
    const lens = ships.map(s => s.len | 0).sort((a, b) => b - a);
    if (lens.join() !== FLEET.join()) return "Kemalar to'plami noto'g'ri";
    const occ = new Set();
    for (const s of ships) {
      if (!['h', 'v'].includes(s.dir)) return "Yo'nalish noto'g'ri";
      const end = s.dir === 'v' ? [s.r + s.len - 1, s.c] : [s.r, s.c + s.len - 1];
      if (!inside(s.r, s.c) || !inside(end[0], end[1])) return "Kema maydondan chiqib ketgan";
      for (const k of cellsOf(s)) {
        const r = Math.floor(k / N), c = k % N;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (occ.has((r + dr) * N + c + dc) && inside(r + dr, c + dc)) return "Kemalar bir-biriga tegib turibdi";
      }
      for (const k of cellsOf(s)) occ.add(k);
    }
    return null;
  }
  function randomFleet() {
    for (;;) {
      const ships = [], occ = new Set();
      let ok = true;
      for (const len of FLEET) {
        let placed = false;
        for (let t = 0; t < 200 && !placed; t++) {
          const dir = Math.random() < 0.5 ? 'h' : 'v', r = Math.floor(Math.random() * (dir === 'v' ? N - len + 1 : N)), c = Math.floor(Math.random() * (dir === 'h' ? N - len + 1 : N));
          const s = { r, c, len, dir }, cells = cellsOf(s);
          if (cells.some(k => { const rr = Math.floor(k / N), cc = k % N; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (inside(rr + a, cc + b) && occ.has((rr + a) * N + cc + b)) return true; return false; })) continue;
          cells.forEach(k => occ.add(k)); ships.push(s); placed = true;
        }
        if (!placed) { ok = false; break; }
      }
      if (ok) return ships;
    }
  }
  const shipAt = (ships, k) => ships.findIndex(s => cellsOf(s).includes(k));
  function beginBattle(g, now) { g.phase = 'battle'; g.turn = g.starter; g.turnStart = now; }
  // placement: whoever is late after 60 s gets a random fleet; in battle the usual clock
  function checkTimeout(g, now) {
    if (g.winner !== null || g.turnStart === null) return false;
    if (g.phase === 'place') {
      if (now - g.phaseStart < PLACE_MS) return false;
      for (let p = 0; p < 2; p++) if (!g.ships[p]) g.ships[p] = randomFleet();
      beginBattle(g, now);
      return true;
    }
    if (g.clock[g.turn] - (now - g.turnStart) > 0) return false;
    g.clock[g.turn] = 0; g.winner = 1 - g.turn; g.reason = 'time';
    return true;
  }
  // ms until the server should call checkTimeout
  const deadline = (g, now) => (g.phase === 'place' ? PLACE_MS - (now - g.phaseStart) : g.clock[g.turn] - (now - g.turnStart));
  function resign(g, p) { if (g.winner !== null || g.turnStart === null) return false; g.winner = 1 - p; g.reason = 'resign'; return true; }
  function apply(g, p, a, now) {
    if (checkTimeout(g, now) && g.winner !== null) return 'Vaqt tugadi';
    if (g.winner !== null) return "O'yin tugagan";
    if (g.turnStart === null) return "O'yin hali boshlanmadi";
    if (a.t === 'place') {
      if (g.phase !== 'place') return 'Joylash vaqti tugagan';
      if (g.ships[p]) return 'Kemalaringiz joylangan';
      const ships = a.random ? randomFleet() : (a.ships || []).map(s => ({ r: s.r | 0, c: s.c | 0, len: s.len | 0, dir: s.dir === 'v' ? 'v' : 'h' }));
      const err = fleetError(ships);
      if (err) return err;
      g.ships[p] = ships; g.n++;
      g.hist.push({ t: 'place', p });
      if (g.ships[0] && g.ships[1]) beginBattle(g, now);
      return null;
    }
    if (a.t !== 'shot') return "Noma'lum harakat";
    if (g.phase !== 'battle') return 'Hali kemalar joylanmoqda';
    if (g.turn !== p) return 'Hozir sizning navbatingiz emas';
    const r = a.r | 0, c = a.c | 0, k = r * N + c;
    if (!inside(r, c)) return "Noto'g'ri katak";
    if (g.shots[p][k]) return 'Bu katakka otilgan';
    const enemy = g.ships[1 - p], si = shipAt(enemy, k);
    let res = 'miss';
    if (si >= 0) {
      g.shots[p][k] = 2; res = 'hit';
      const cells = cellsOf(enemy[si]);
      if (cells.every(x => g.shots[p][x] === 2)) { // sunk: the water around it is revealed
        res = 'sunk'; g.sunk[1 - p].push(si);
        for (const x of cells) { const rr = Math.floor(x / N), cc = x % N; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (inside(rr + dr, cc + dc) && !g.shots[p][(rr + dr) * N + cc + dc]) g.shots[p][(rr + dr) * N + cc + dc] = 1; }
        if (g.sunk[1 - p].length === FLEET.length) { g.winner = p; g.reason = 'fleet'; }
      }
    } else g.shots[p][k] = 1;
    g.last = { p, t: 'shot', r, c, res, cap: res !== 'miss' ? k : null }; g.n++;
    g.log.push('ABCDEFGHIK'[c] + (r + 1) + (res === 'sunk' ? '✖' : res === 'hit' ? '×' : '·'));
    g.hist.push({ t: 'shot', r, c });
    if (res === 'miss' && g.winner === null) { g.clock[p] -= now - g.turnStart; g.turnStart = now; g.turn = 1 - p; }
    return null;
  }
  // what player p may see (p = -1: a spectator sees no ships until they are hit)
  function view(g, p) {
    const v = Object.assign({}, g);
    v.ships = [0, 1].map(q => {
      if (g.winner !== null || q === p) return g.ships[q];
      if (!g.ships[q]) return null;
      return g.ships[q].map((s, i) => (g.sunk[q].includes(i) ? s : null)); // only sunk ships of the enemy
    });
    v.placed = [!!g.ships[0], !!g.ships[1]];
    v.hist = g.winner !== null ? g.hist : [];
    return v;
  }

  // ---------- bot: random fleet; hunt on a checkerboard, then finish the ship it hit ----------
  function botAction(g, p, level = 1) {
    if (g.phase === 'place') return { t: 'place', random: true };
    const shots = g.shots[p], enemy = g.ships[1 - p];
    const free = []; for (let k = 0; k < N * N; k++) if (!shots[k]) free.push(k);
    const rnd = (l) => l[Math.floor(Math.random() * l.length)];
    const shoot = (k) => ({ t: 'shot', r: Math.floor(k / N), c: k % N });
    if (level === 0 && Math.random() < 0.6) return shoot(rnd(free));
    // hits that belong to ships not sunk yet
    const open = []; for (let k = 0; k < N * N; k++) if (shots[k] === 2 && !g.sunk[1 - p].includes(shipAt(enemy, k))) open.push(k);
    if (open.length) {
      const cand = [];
      const line = open.length > 1 ? (Math.floor(open[0] / N) === Math.floor(open[1] / N) ? 'h' : 'v') : null;
      for (const k of open) {
        const r = Math.floor(k / N), c = k % N;
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          if (line === 'h' && dr) continue; if (line === 'v' && dc) continue;
          const rr = r + dr, cc = c + dc;
          if (inside(rr, cc) && !shots[rr * N + cc]) cand.push(rr * N + cc);
        }
      }
      if (cand.length) return shoot(rnd(cand));
    }
    const parity = free.filter(k => (Math.floor(k / N) + k % N) % 2 === 0);
    return shoot(rnd(level === 2 && parity.length ? parity : free));
  }
  const api = { N, FLEET, CLOCK_MS, PLACE_MS, cellsOf, newGame, start, fleetError, randomFleet, checkTimeout, deadline, resign, apply, view, botAction };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.Battleship = api;
})();
