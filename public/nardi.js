// Nardi (long nardy). 24 points (absolute 0..23); each player has 15 checkers on their "head" and moves them the same
// way round: player 0 from point 0 (0 -> 23), player 1 from point 12 (12 -> 23 -> 0 -> 11). Own index i = points
// travelled from the head; home is own 18..23. No hitting: a checker may not land on a point the opponent holds.
// - the dice are rolled by the rules at the start of each turn; a double gives four moves;
// - only one checker may leave the head per turn (on the very first turn 6-6, 4-4 or 3-3 may take two);
// - six own points in a row are allowed only if an opponent checker is already past them;
// - as many dice as possible must be used (if only one can be, the larger one);
// - bearing off when all 15 are home: exact die, or a bigger die from the furthest checker.
// First to bear off all 15 wins. A move is one die: { t:'move', from: ownIndex, die } (from 0..23, to 24 = off).
(function () {
  const CLOCK_MS = 10 * 60 * 1000, HOME = 18;
  const abs = (p, i) => (p === 0 ? i : (i + 12) % 24);
  const rel = (p, a) => (p === 0 ? a : (a + 12) % 24);
  const roll = () => 1 + Math.floor(Math.random() * 6);

  function newGame(starter, minutes) {
    const ms = minutes ? minutes * 60000 : CLOCK_MS;
    const pts = Array(24).fill(null).map(() => ({ p: null, n: 0 }));
    pts[0] = { p: 0, n: 15 }; pts[12] = { p: 1, n: 15 };
    const g = { kind: 'nardi', pts, off: [0, 0], turn: starter || 0, starter: starter || 0, dice: null, left: [], headUsed: 0, firstTurn: [true, true],
      winner: null, reason: null, log: [], hist: [], n: 0, last: null, base: ms, clock: [ms, ms], turnStart: null };
    return g;
  }
  const own = (g, p, i) => { const x = g.pts[abs(p, i)]; return x.p === p ? x.n : 0; };
  const allHome = (g, p) => { let n = g.off[p]; for (let i = HOME; i < 24; i++) n += own(g, p, i); return n === 15; };
  const clone = (g) => ({ pts: g.pts.map(x => ({ p: x.p, n: x.n })), off: g.off.slice(), headUsed: g.headUsed, firstTurn: g.firstTurn.slice(), dice: g.dice, left: g.left.slice() });

  // no wall of six own points unless an opponent checker is already past it
  function blockOk(g, p) {
    let run = 0;
    for (let i = 0; i < 24 + 5; i++) {
      const a = i % 24, x = g.pts[a];
      run = x.p === p ? run + 1 : 0;
      if (run >= 6) {
        const end = a; // the wall ends at absolute `end`; the opponent must have a checker beyond it on its path
        const q = 1 - p, endRel = rel(q, end);
        let ahead = false;
        for (let j = endRel + 1; j < 24; j++) if (own(g, q, j)) { ahead = true; break; }
        if (g.off[q]) ahead = true;
        if (!ahead) return false;
      }
    }
    return true;
  }
  // can p move a checker from own index `from` by `die`? returns the target own index (24 = off) or -1
  function target(g, p, from, die) {
    if (from < 0 || from > 23 || !own(g, p, from)) return -1;
    if (from === 0) {
      const dbl = g.dice && g.dice[0] === g.dice[1] && [6, 4, 3].includes(g.dice[0]);
      if (g.headUsed >= (g.firstTurn[p] && dbl ? 2 : 1)) return -1;
    }
    const to = from + die;
    if (to < 24) {
      const x = g.pts[abs(p, to)];
      if (x.p !== null && x.p !== p) return -1;
      return to;
    }
    if (!allHome(g, p)) return -1;
    if (to === 24) return 24;
    for (let i = HOME; i < from; i++) if (own(g, p, i)) return -1; // a bigger die only from the furthest checker
    return 24;
  }
  function step(g, p, from, die) { // no checks
    const to = target(g, p, from, die), a = abs(p, from);
    g.pts[a].n--; if (!g.pts[a].n) g.pts[a].p = null;
    if (to === 24) g.off[p]++;
    else { const b = abs(p, to); g.pts[b].p = p; g.pts[b].n++; }
    if (from === 0) g.headUsed++;
    g.left.splice(g.left.indexOf(die), 1);
    return to;
  }
  // every way to play the dice: full sequences (positions reached twice are explored once)
  function allSequences(g, p) {
    const leaves = [], seen = new Set();
    const key = (h) => h.pts.map(x => (x.p === null ? '' : x.p + ':' + x.n)).join(',') + '|' + h.off + '|' + h.left.join('') + '|' + h.headUsed;
    const walk = (h, seq) => {
      const k = key(h);
      if (seen.has(k)) return;
      seen.add(k);
      let moved = false;
      for (const d of [...new Set(h.left)]) for (let i = 0; i < 24; i++) {
        const to = target(h, p, i, d);
        if (to < 0) continue;
        const x = clone(h); step(x, p, i, d);
        if (!blockOk(x, p)) continue;
        moved = true;
        walk(x, seq.concat([{ from: i, die: d, to }]));
      }
      if (!moved) leaves.push({ seq, h });
    };
    walk(Object.assign(clone(g), { dice: g.dice }), []);
    const max = Math.max(0, ...leaves.map(l => l.seq.length));
    let best = leaves.filter(l => l.seq.length === max && max > 0);
    // only one die can be used: it must be the larger one when possible
    if (max === 1 && g.left.length === 2 && g.left[0] !== g.left[1]) {
      const big = Math.max(...g.left);
      if (best.some(l => l.seq[0].die === big)) best = best.filter(l => l.seq[0].die === big);
    }
    return best;
  }
  function legalSteps(g, p) {
    if (g.winner !== null || g.turn !== p || !g.left.length) return [];
    const out = [], seen = new Set();
    for (const l of allSequences(g, p)) { const m = l.seq[0], k = m.from + ':' + m.die; if (!seen.has(k)) { seen.add(k); out.push(m); } }
    return out;
  }
  function newTurn(g, p, now) {
    g.turn = p; g.headUsed = 0;
    g.dice = [roll(), roll()];
    g.left = g.dice[0] === g.dice[1] ? [g.dice[0], g.dice[0], g.dice[0], g.dice[0]] : g.dice.slice();
    g.turnStart = now;
    g.log.push(`${g.dice[0]}-${g.dice[1]}:`);
    // nothing to play: the turn passes (shown for a moment by the app)
    for (let k = 0; k < 4 && !legalSteps(g, g.turn).length; k++) {
      g.log[g.log.length - 1] += ' —';
      g.firstTurn[g.turn] = false;
      g.turn = 1 - g.turn; g.headUsed = 0; g.dice = [roll(), roll()];
      g.left = g.dice[0] === g.dice[1] ? [g.dice[0], g.dice[0], g.dice[0], g.dice[0]] : g.dice.slice();
      g.log.push(`${g.dice[0]}-${g.dice[1]}:`);
      g.passed = true;
    }
  }
  function start(g, now) { if (g.turnStart === null) { g.turnStart = now; newTurn(g, g.turn, now); } }
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
    if (a.t !== 'move') return "Noma'lum harakat";
    const from = a.from | 0, die = a.die | 0;
    const ok = legalSteps(g, p).find(m => m.from === from && m.die === die);
    if (!ok) {
      if (from === 0 && own(g, p, 0) && target(g, p, 0, die) < 0 && g.headUsed) return "Boshdan bu navbatda faqat bitta tosh olinadi";
      return "Bu yurish mumkin emas";
    }
    g.passed = false;
    const to = step(g, p, from, die);
    g.n++;
    g.last = { p, t: 'move', from: abs(p, from), to: to === 24 ? 'off' : abs(p, to), die };
    g.log[g.log.length - 1] += ` ${from + 1}/${to === 24 ? 'off' : to + 1}`;
    g.hist.push({ t: 'move', from, die });
    if (g.off[p] === 15) { g.winner = p; g.reason = 'off'; g.mars = g.off[1 - p] === 0; return null; }
    if (!g.left.length || !legalSteps(g, p).length) {
      g.firstTurn[p] = false;
      g.clock[p] -= now - g.turnStart;
      newTurn(g, 1 - p, now);
    }
    return null;
  }
  const view = (g) => Object.assign({}, g, { hist: g.winner !== null ? g.hist : [] });

  // ---------- bot: tries every way to play the dice and keeps the best position ----------
  function evalPos(g, p) {
    let s = g.off[p] * 30;
    for (let i = 0; i < 24; i++) {
      const n = own(g, p, i);
      if (!n) continue;
      s += n * i * 1.2; // progress
      if (i === 0) s -= n * 2; // still on the head
      if (n > 4) s -= (n - 4) * 1.5; // tall stacks block nothing useful
    }
    // points held just in front of opponent checkers block them (no hitting in nardi, so blocking is the fight)
    const q = 1 - p;
    for (let i = 0; i < 24; i++) {
      if (!own(g, p, i)) continue;
      const r = rel(q, abs(p, i));
      let behind = 0; for (let j = Math.max(0, r - 6); j < r; j++) behind += own(g, q, j);
      s += Math.min(6, behind) * 0.8 + (r < 12 ? 1.5 : 0);
    }
    return s;
  }
  function bestSequence(g, p, level) {
    let best = null;
    for (const l of allSequences(g, p)) {
      const v = evalPos(l.h, p) + Math.random() * (level === 0 ? 40 : level === 1 ? 6 : 1);
      if (!best || v > best.v) best = { v, seq: l.seq };
    }
    return best ? best.seq : [];
  }
  function botAction(g, p, level = 1) {
    const seq = bestSequence(g, p, level);
    const m = seq[0] || legalSteps(g, p)[0];
    return m ? { t: 'move', from: m.from, die: m.die } : null;
  }
  const api = { CLOCK_MS, HOME, abs, rel, newGame, start, own, legalSteps, target, checkTimeout, resign, apply, view, botAction };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.Nardi = api;
})();
