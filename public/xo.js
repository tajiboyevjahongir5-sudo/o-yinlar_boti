// X va O (tic-tac-toe) rules: shared by the server (authoritative) and the client (bot mode).
// The player who starts plays X. winner: 0/1 = that player, -1 = draw.
(function () {
  const CLOCK_MS = 60 * 1000;
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

  // minutes: the time control (each player's clock); defaults to CLOCK_MS
  function newGame(starter, minutes) {
    const ms = minutes ? minutes * 60000 : CLOCK_MS;
    return {
      kind: 'xo', board: Array(9).fill(null), turn: starter || 0, starter: starter || 0,
      winner: null, reason: null, line: null, log: [], hist: [], base: ms,
      clock: [ms, ms], turnStart: null,
    };
  }

  const symbol = (g, p) => (p === g.starter ? 'X' : 'O');
  function start(g, now) { if (g.turnStart === null) g.turnStart = now; }

  function checkTimeout(g, now) {
    if (g.winner !== null || g.turnStart === null) return false;
    if (g.clock[g.turn] - (now - g.turnStart) > 0) return false;
    g.clock[g.turn] = 0;
    g.winner = 1 - g.turn; g.reason = 'time';
    return true;
  }

  function resign(g, p) {
    if (g.winner !== null || g.turnStart === null) return false;
    g.winner = 1 - p; g.reason = 'resign';
    return true;
  }

  const lineOf = (b, p) => LINES.find(l => l.every(k => b[k] === p)) || null;

  function apply(g, p, a, now) {
    if (checkTimeout(g, now)) return 'Vaqt tugadi';
    if (g.winner !== null) return "O'yin tugagan";
    if (g.turnStart === null) return "O'yin hali boshlanmadi";
    if (g.turn !== p) return 'Hozir sizning navbatingiz emas';
    if (a.t !== 'move') return "Noma'lum harakat";
    const i = a.i | 0;
    if (i < 0 || i > 8 || g.board[i] !== null) return 'Bu katak band';
    g.board[i] = p;
    g.clock[p] -= now - g.turnStart;
    g.turnStart = now;
    g.last = { p, t: 'move', i };
    g.hist.push({ t: 'move', i });
    g.log.push(symbol(g, p) + ':' + 'abc'[i % 3] + (3 - Math.floor(i / 3)));
    const ln = lineOf(g.board, p);
    if (ln) { g.winner = p; g.reason = 'line'; g.line = ln; }
    else if (g.board.every(v => v !== null)) { g.winner = -1; g.reason = 'draw'; }
    else g.turn = 1 - p;
    return null;
  }

  // score of the board for `me` with `who` to move (+1 win, 0 draw, -1 loss), preferring quick wins
  function minimax(b, me, who, depth) {
    if (lineOf(b, me)) return 10 - depth;
    if (lineOf(b, 1 - me)) return depth - 10;
    if (b.every(v => v !== null)) return 0;
    let best = who === me ? -99 : 99;
    for (let i = 0; i < 9; i++) if (b[i] === null) {
      b[i] = who;
      const v = minimax(b, me, 1 - who, depth + 1);
      b[i] = null;
      best = who === me ? Math.max(best, v) : Math.min(best, v);
    }
    return best;
  }

  // plays the best move, but slips now and then so it can be beaten
  // level: 0 easy, 1 normal, 2 hard (never slips)
  function botAction(g, p, level = 1) {
    const mistake = [0.5, 0.22, 0][level] ?? 0.22;
    const free = g.board.map((v, i) => (v === null ? i : -1)).filter(i => i >= 0);
    if (Math.random() < mistake) return { t: 'move', i: free[Math.floor(Math.random() * free.length)] };
    let best = -99, picks = [];
    for (const i of free) {
      const b = g.board.slice(); b[i] = p;
      const v = minimax(b, p, 1 - p, 1);
      if (v > best) { best = v; picks = [i]; } else if (v === best) picks.push(i);
    }
    return { t: 'move', i: picks[Math.floor(Math.random() * picks.length)] };
  }

  const api = { CLOCK_MS, LINES, newGame, symbol, start, checkTimeout, resign, apply, botAction };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.XO = api;
})();
