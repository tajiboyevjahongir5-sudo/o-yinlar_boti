// "Nuqtalar va kataklar" (dots and boxes): 5x5 boxes. Players draw a line between two neighbouring dots;
// closing a box scores it and the same player moves again. Most boxes wins. Shared by server and client.
// Lines: 0..29 horizontal (row r 0..5, col c 0..4: r*5+c), 30..59 vertical (row r 0..4, col c 0..5: 30+r*6+c).
(function () {
  const N = 5, H = (N + 1) * N, E = H * 2, CLOCK_MS = 3 * 60 * 1000;
  const hIdx = (r, c) => r * N + c, vIdx = (r, c) => H + r * (N + 1) + c;
  // the four sides of box (r, c)
  const sides = (r, c) => [hIdx(r, c), hIdx(r + 1, c), vIdx(r, c), vIdx(r, c + 1)];
  // the boxes a line touches
  function boxesOf(e) {
    if (e < H) { const r = Math.floor(e / N), c = e % N; return [[r - 1, c], [r, c]].filter(([a]) => a >= 0 && a < N); }
    const k = e - H, r = Math.floor(k / (N + 1)), c = k % (N + 1);
    return [[r, c - 1], [r, c]].filter(([, b]) => b >= 0 && b < N);
  }
  function newGame(starter, minutes) {
    const ms = minutes ? minutes * 60000 : CLOCK_MS;
    return { kind: 'dots', lines: Array(E).fill(null), boxes: Array(N * N).fill(null), score: [0, 0], turn: starter || 0, starter: starter || 0,
      winner: null, reason: null, log: [], hist: [], n: 0, last: null, base: ms, clock: [ms, ms], turnStart: null };
  }
  function start(g, now) { if (g.turnStart === null) g.turnStart = now; }
  function checkTimeout(g, now) {
    if (g.winner !== null || g.turnStart === null) return false;
    if (g.clock[g.turn] - (now - g.turnStart) > 0) return false;
    g.clock[g.turn] = 0; g.winner = 1 - g.turn; g.reason = 'time';
    return true;
  }
  function resign(g, p) { if (g.winner !== null || g.turnStart === null) return false; g.winner = 1 - p; g.reason = 'resign'; return true; }
  // draw line e for p (no checks); returns how many boxes it closed
  function draw(g, p, e) {
    g.lines[e] = p;
    let got = 0;
    for (const [r, c] of boxesOf(e)) if (g.boxes[r * N + c] === null && sides(r, c).every(s => g.lines[s] !== null)) { g.boxes[r * N + c] = p; g.score[p]++; got++; }
    return got;
  }
  function apply(g, p, a, now) {
    if (checkTimeout(g, now)) return 'Vaqt tugadi';
    if (g.winner !== null) return "O'yin tugagan";
    if (g.turnStart === null) return "O'yin hali boshlanmadi";
    if (g.turn !== p) return 'Hozir sizning navbatingiz emas';
    const e = a.e | 0;
    if (a.t !== 'move' || e < 0 || e >= E) return "Noma'lum harakat";
    if (g.lines[e] !== null) return 'Bu chiziq chizilgan';
    const got = draw(g, p, e);
    g.last = { p, t: 'move', e, got }; g.n++; g.hist.push({ t: 'move', e });
    g.log.push((e < H ? '—' : '|') + (got ? '+' + got : ''));
    if (g.boxes.every(b => b !== null)) {
      g.winner = g.score[0] === g.score[1] ? -1 : g.score[0] > g.score[1] ? 0 : 1; g.reason = 'boxes';
    }
    // closing a box keeps the turn; the clock keeps running for this player
    if (!got && g.winner === null) { g.clock[p] -= now - g.turnStart; g.turnStart = now; g.turn = 1 - p; }
    return null;
  }

  // ---------- bot: take what is free, avoid giving a third side, then give away the shortest chain ----------
  const sidesDrawn = (g, r, c) => sides(r, c).filter(s => g.lines[s] !== null).length;
  const gives = (g, e) => boxesOf(e).some(([r, c]) => g.boxes[r * N + c] === null && sidesDrawn(g, r, c) === 2);
  const takes = (g, e) => boxesOf(e).some(([r, c]) => g.boxes[r * N + c] === null && sidesDrawn(g, r, c) === 3);
  function chainCost(g, e) { // boxes the opponent would collect after this move
    const t = { lines: g.lines.slice(), boxes: g.boxes.slice(), score: [0, 0] };
    t.lines[e] = 9; let total = 0;
    for (let loop = 0; loop < 30; loop++) {
      const nx = t.lines.findIndex((v, i) => v === null && takes(t, i));
      if (nx < 0) break;
      total += draw(t, 1, nx);
    }
    return total;
  }
  function botAction(g, p, level = 1) {
    const free = g.lines.map((v, i) => (v === null ? i : -1)).filter(i => i >= 0);
    const rnd = (l) => l[Math.floor(Math.random() * l.length)];
    if (Math.random() < [0.4, 0.05, 0][level]) return { t: 'move', e: rnd(free) };
    const take = free.filter(e => takes(g, e));
    if (take.length) return { t: 'move', e: rnd(take) };
    const safe = free.filter(e => !gives(g, e));
    if (safe.length) return { t: 'move', e: rnd(safe) };
    if (level === 0) return { t: 'move', e: rnd(free) };
    let best = Infinity, picks = [];
    for (const e of free) { const c = chainCost(g, e); if (c < best) { best = c; picks = [e]; } else if (c === best) picks.push(e); }
    return { t: 'move', e: rnd(picks) };
  }
  const api = { N, H, E, CLOCK_MS, hIdx, vIdx, sides, newGame, start, checkTimeout, resign, apply, botAction };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.Dots = api;
})();
