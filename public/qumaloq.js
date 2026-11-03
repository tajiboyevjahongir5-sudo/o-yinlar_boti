// To'qqiz qumaloq (Uzbek mancala). Each player has 9 holes with 9 stones and a store (qozon).
// Holes 0..8 belong to player 0, 9..17 to player 1; sowing goes 0 -> 17 -> 0 (the same way for both).
// A move: take every stone from one of your holes, put the first back into it (a single stone simply moves on)
// and drop the rest one by one into the next holes. If the last stone falls into an opponent's hole and makes an
// even number there, you take them all. If it makes exactly 3 there, that hole becomes your "tuzdik" (one per game,
// not the opponent's 9th hole, not opposite your opponent's tuzdik): its stones and every stone landing in it later
// are yours. More than 81 stones wins (81-81 is a draw). A player with no stones to move ends the game: each side
// keeps what is left on its own holes.
(function () {
  const CLOCK_MS = 5 * 60 * 1000;
  const sideOf = (i) => (i < 9 ? 0 : 1);
  function newGame(starter, minutes) {
    const ms = minutes ? minutes * 60000 : CLOCK_MS;
    return { kind: 'qumaloq', holes: Array(18).fill(9), store: [0, 0], tuz: [-1, -1], turn: starter || 0, starter: starter || 0,
      winner: null, reason: null, log: [], hist: [], n: 0, last: null, base: ms, clock: [ms, ms], turnStart: null };
  }
  function start(g, now) { if (g.turnStart === null) g.turnStart = now; }
  const canMove = (g, p) => g.holes.some((v, i) => sideOf(i) === p && v > 0 && g.tuz[1 - p] !== i);
  // plays hole i for p on g (no checks); returns what happened
  function sow(g, p, i) {
    let n = g.holes[i], k = i;
    g.holes[i] = 0;
    if (n === 1) { k = (k + 1) % 18; g.holes[k]++; }
    else { g.holes[k]++; n--; while (n--) { k = (k + 1) % 18; g.holes[k]++; } }
    // stones that fall into a tuzdik belong to its owner
    for (let q = 0; q < 2; q++) if (g.tuz[q] >= 0 && g.holes[g.tuz[q]]) { g.store[q] += g.holes[g.tuz[q]]; g.holes[g.tuz[q]] = 0; }
    let got = 0, tuz = false;
    if (sideOf(k) !== p && g.tuz[p] !== k && g.tuz[1 - p] !== k) {
      const v = g.holes[k];
      if (v % 2 === 0 && v > 0) { got = v; g.store[p] += v; g.holes[k] = 0; }
      else if (v === 3 && g.tuz[p] < 0 && k % 9 !== 8 && !(g.tuz[1 - p] >= 0 && g.tuz[1 - p] % 9 === k % 9)) {
        g.tuz[p] = k; g.store[p] += 3; g.holes[k] = 0; tuz = true; got = 3;
      }
    }
    return { end: k, got, tuz };
  }
  function finish(g) {
    if (g.store[0] > 81 || g.store[1] > 81) { g.winner = g.store[0] > 81 ? 0 : 1; g.reason = 'stones'; return true; }
    if (!canMove(g, g.turn)) {
      for (let i = 0; i < 18; i++) { g.store[sideOf(i)] += g.holes[i]; g.holes[i] = 0; }
      g.winner = g.store[0] === g.store[1] ? -1 : g.store[0] > g.store[1] ? 0 : 1; g.reason = 'stones';
      return true;
    }
    if (g.store[0] === 81 && g.store[1] === 81) { g.winner = -1; g.reason = 'draw'; return true; }
    return false;
  }
  function checkTimeout(g, now) {
    if (g.winner !== null || g.turnStart === null) return false;
    if (g.clock[g.turn] - (now - g.turnStart) > 0) return false;
    g.clock[g.turn] = 0; g.winner = 1 - g.turn; g.reason = 'time';
    return true;
  }
  function resign(g, p) { if (g.winner !== null || g.turnStart === null) return false; g.winner = 1 - p; g.reason = 'resign'; return true; }
  function apply(g, p, a, now) {
    if (checkTimeout(g, now)) return 'Vaqt tugadi';
    if (g.winner !== null) return "O'yin tugagan";
    if (g.turnStart === null) return "O'yin hali boshlanmadi";
    if (g.turn !== p) return 'Hozir sizning navbatingiz emas';
    const i = a.i | 0;
    if (a.t !== 'move' || i < 0 || i > 17 || sideOf(i) !== p) return "Faqat o'z uyalaringizdan yuriladi";
    if (!g.holes[i]) return "Bu uya bo'sh";
    const r = sow(g, p, i);
    g.last = { p, t: 'move', i, end: r.end, got: r.got, tuz: r.tuz, cap: r.got ? r.end : null }; g.n++;
    g.log.push((i % 9 + 1) + (r.tuz ? '★' : r.got ? '+' + r.got : '')); g.hist.push({ t: 'move', i });
    g.clock[p] -= now - g.turnStart; g.turnStart = now;
    g.turn = 1 - p;
    finish(g);
    return null;
  }
  // ---------- bot: two moves ahead, store difference ----------
  const clone = (g) => ({ holes: g.holes.slice(), store: g.store.slice(), tuz: g.tuz.slice() });
  function search(g, me, who, depth) {
    const moves = []; for (let i = 0; i < 18; i++) if (sideOf(i) === who && g.holes[i]) moves.push(i);
    if (!depth || !moves.length) return g.store[me] - g.store[1 - me] + (g.tuz[me] >= 0 ? 6 : 0) - (g.tuz[1 - me] >= 0 ? 6 : 0);
    let best = who === me ? -1e9 : 1e9;
    for (const i of moves) { const h = clone(g); sow(h, who, i); const v = search(h, me, 1 - who, depth - 1); best = who === me ? Math.max(best, v) : Math.min(best, v); }
    return best;
  }
  function botAction(g, p, level = 1) {
    const moves = []; for (let i = 0; i < 18; i++) if (sideOf(i) === p && g.holes[i]) moves.push(i);
    if (level === 0 && Math.random() < 0.5) return { t: 'move', i: moves[Math.floor(Math.random() * moves.length)] };
    let best = -1e9, pick = moves[0];
    for (const i of moves) { const h = clone(g); sow(h, p, i); const v = search(h, p, 1 - p, level === 2 ? 3 : 1) + Math.random(); if (v > best) { best = v; pick = i; } }
    return { t: 'move', i: pick };
  }
  const api = { CLOCK_MS, sideOf, newGame, start, checkTimeout, resign, apply, botAction };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.Qumaloq = api;
})();
