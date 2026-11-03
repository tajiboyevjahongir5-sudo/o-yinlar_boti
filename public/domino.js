// Domino (double-six, 2 players): 7 tiles each, 14 left in the "bozor" (boneyard). Play a tile matching an end of
// the line; with no tile that fits, draw from the bozor (one at a time) or pass when it is empty. The first to empty
// the hand wins; if nobody can move, the lower pip total wins (equal = draw). The player with the highest double
// (or tile) starts. Hidden information: view(g, p) hides the opponent's hand and the bozor. Shared by server and client.
(function () {
  const CLOCK_MS = 5 * 60 * 1000;
  const ALL = []; for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) ALL.push([a, b]);
  const pips = (t) => t[0] + t[1];

  function newGame(starter, minutes) {
    const ms = minutes ? minutes * 60000 : CLOCK_MS;
    const deck = ALL.map(t => t.slice());
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    const hands = [deck.slice(0, 7), deck.slice(7, 14)], bazar = deck.slice(14);
    // the highest double starts (or the heaviest tile), so the deal decides
    const best = (h) => Math.max(...h.map(t => (t[0] === t[1] ? 100 + t[0] : pips(t))));
    const first = best(hands[0]) >= best(hands[1]) ? 0 : 1;
    return { kind: 'domino', hands, bazar, line: [], ends: null, turn: first, starter: starter || 0, first, passes: 0,
      winner: null, reason: null, log: [], hist: [], n: 0, last: null, base: ms, clock: [ms, ms], turnStart: null };
  }
  function start(g, now) { if (g.turnStart === null) g.turnStart = now; }
  const fits = (g, t) => !g.ends ? ['L'] : [t[0] === g.ends[0] || t[1] === g.ends[0] ? 'L' : null, t[0] === g.ends[1] || t[1] === g.ends[1] ? 'R' : null].filter(Boolean);
  const canPlay = (g, p) => g.hands[p].some(t => fits(g, t).length);
  function checkTimeout(g, now) {
    if (g.winner !== null || g.turnStart === null) return false;
    if (g.clock[g.turn] - (now - g.turnStart) > 0) return false;
    g.clock[g.turn] = 0; g.winner = 1 - g.turn; g.reason = 'time';
    return true;
  }
  function resign(g, p) { if (g.winner !== null || g.turnStart === null) return false; g.winner = 1 - p; g.reason = 'resign'; return true; }
  function endTurn(g, p, now) { g.clock[p] -= now - g.turnStart; g.turnStart = now; g.turn = 1 - p; }
  function apply(g, p, a, now) {
    if (checkTimeout(g, now)) return 'Vaqt tugadi';
    if (g.winner !== null) return "O'yin tugagan";
    if (g.turnStart === null) return "O'yin hali boshlanmadi";
    if (g.turn !== p) return 'Hozir sizning navbatingiz emas';
    const hand = g.hands[p];
    if (a.t === 'draw') {
      if (canPlay(g, p)) return "Qo'lingizda mos tosh bor";
      if (!g.bazar.length) return "Bozor bo'sh — o'tkazing";
      hand.push(g.bazar.pop()); g.n++;
      g.last = { p, t: 'draw' }; g.hist.push({ t: 'draw' });
      return null;
    }
    if (a.t === 'pass') {
      if (canPlay(g, p) || g.bazar.length) return "O'tkazib bo'lmaydi";
      g.passes++; g.n++; g.last = { p, t: 'pass' }; g.log.push('—'); g.hist.push({ t: 'pass' });
      if (g.passes >= 2) { // blocked: lighter hand wins
        const s0 = g.hands[0].reduce((n, t) => n + pips(t), 0), s1 = g.hands[1].reduce((n, t) => n + pips(t), 0);
        g.winner = s0 === s1 ? -1 : s0 < s1 ? 0 : 1; g.reason = 'blocked';
      } else endTurn(g, p, now);
      return null;
    }
    if (a.t !== 'move') return "Noma'lum harakat";
    const i = hand.findIndex(t => t[0] === (a.a | 0) && t[1] === (a.b | 0));
    if (i < 0) return "Bu tosh sizda yo'q";
    const t = hand[i], sides = fits(g, t);
    const side = sides.includes(a.side) ? a.side : sides.length === 1 ? sides[0] : null;
    if (!side) return sides.length ? 'Qaysi tomonga?' : "Bu tosh mos kelmaydi";
    hand.splice(i, 1);
    if (!g.ends) { g.line.push({ t: t.slice(), flip: false, p }); g.ends = [t[0], t[1]]; }
    else if (side === 'L') { const flip = t[0] === g.ends[0]; g.line.unshift({ t: t.slice(), flip, p }); g.ends[0] = flip ? t[1] : t[0]; }
    else { const flip = t[1] === g.ends[1]; g.line.push({ t: t.slice(), flip, p }); g.ends[1] = flip ? t[0] : t[1]; }
    g.passes = 0; g.n++;
    g.last = { p, t: 'move', tile: t.slice(), side };
    g.log.push(`${t[0]}|${t[1]}`); g.hist.push({ t: 'move', a: t[0], b: t[1], side });
    if (!hand.length) { g.winner = p; g.reason = 'empty'; }
    else endTurn(g, p, now);
    return null;
  }
  function view(g, p) {
    const v = Object.assign({}, g);
    v.handCount = [g.hands[0].length, g.hands[1].length];
    v.hands = [0, 1].map(q => (q === p || g.winner !== null ? g.hands[q] : g.hands[q].map(() => null)));
    v.bazar = g.bazar.map(() => null); v.hist = [];
    return v;
  }
  // ---------- bot: play the heaviest fitting tile (doubles first); otherwise draw / pass ----------
  function botAction(g, p, level = 1) {
    const hand = g.hands[p], ok = hand.filter(t => fits(g, t).length);
    if (!ok.length) return g.bazar.length ? { t: 'draw' } : { t: 'pass' };
    let pick;
    if (level === 0 && Math.random() < 0.6) pick = ok[Math.floor(Math.random() * ok.length)];
    else {
      // keep variety: prefer tiles whose numbers I hold many of (fewer blocks), then weight
      const count = (n) => hand.filter(t => t[0] === n || t[1] === n).length;
      pick = ok.slice().sort((x, y) => ((y[0] === y[1]) * 20 + pips(y) + (level === 2 ? count(y[0]) + count(y[1]) : 0))
        - ((x[0] === x[1]) * 20 + pips(x) + (level === 2 ? count(x[0]) + count(x[1]) : 0)))[0];
    }
    const sides = fits(g, pick);
    return { t: 'move', a: pick[0], b: pick[1], side: sides[Math.floor(Math.random() * sides.length)] };
  }
  const api = { CLOCK_MS, ALL, pips, newGame, start, fits, canPlay, checkTimeout, resign, apply, view, botAction };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.Domino = api;
})();
