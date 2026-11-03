// "4 ta qatorga" (connect four): 7 columns x 6 rows; a disc drops to the lowest free cell of a column.
// Four of your discs in a row (any direction) wins; a full board is a draw. Shared by server and client.
(function () {
  const C = 7, R = 6, CLOCK_MS = 3 * 60 * 1000;
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

  function newGame(starter, minutes) {
    const ms = minutes ? minutes * 60000 : CLOCK_MS;
    return { kind: 'c4', board: Array(C * R).fill(null), turn: starter || 0, starter: starter || 0, winner: null, reason: null,
      line: null, log: [], hist: [], n: 0, last: null, base: ms, clock: [ms, ms], turnStart: null };
  }
  function start(g, now) { if (g.turnStart === null) g.turnStart = now; }
  const dropRow = (b, c) => { for (let r = R - 1; r >= 0; r--) if (b[r * C + c] === null) return r; return -1; };
  function lineAt(b, r, c) {
    const p = b[r * C + c];
    for (const [dr, dc] of DIRS) {
      const cells = [[r, c]];
      for (const s of [1, -1]) {
        let rr = r + dr * s, cc = c + dc * s;
        while (rr >= 0 && rr < R && cc >= 0 && cc < C && b[rr * C + cc] === p) { cells.push([rr, cc]); rr += dr * s; cc += dc * s; }
      }
      if (cells.length >= 4) return cells.map(([a, z]) => a * C + z);
    }
    return null;
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
    if (a.t !== 'move') return "Noma'lum harakat";
    const c = a.c | 0;
    if (c < 0 || c >= C) return "Noto'g'ri ustun";
    const r = dropRow(g.board, c);
    if (r < 0) return "Bu ustun to'la";
    g.board[r * C + c] = p;
    g.clock[p] -= now - g.turnStart; g.turnStart = now;
    g.last = { p, t: 'move', c, r }; g.n++;
    g.log.push('abcdefg'[c] + (R - r)); g.hist.push({ t: 'move', c });
    const ln = lineAt(g.board, r, c);
    if (ln) { g.winner = p; g.reason = 'line'; g.line = ln; }
    else if (g.board.every(v => v !== null)) { g.winner = -1; g.reason = 'draw'; }
    else g.turn = 1 - p;
    return null;
  }

  // ---------- bot: alpha-beta over columns, scoring every window of four ----------
  function score(b, me) {
    let s = 0;
    for (let r = 0; r < R; r++) if (b[r * C + 3] === me) s += 3; else if (b[r * C + 3] === 1 - me) s -= 3;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const [dr, dc] of DIRS) {
      const r3 = r + dr * 3, c3 = c + dc * 3;
      if (r3 < 0 || r3 >= R || c3 < 0 || c3 >= C) continue;
      let m = 0, o = 0;
      for (let k = 0; k < 4; k++) { const v = b[(r + dr * k) * C + c + dc * k]; if (v === me) m++; else if (v === 1 - me) o++; }
      if (m && o) continue;
      s += m === 3 ? 6 : m === 2 ? 2 : 0;
      s -= o === 3 ? 8 : o === 2 ? 2 : 0;
    }
    return s;
  }
  const ORDER = [3, 2, 4, 1, 5, 0, 6];
  function search(b, me, who, depth, alpha, beta) {
    let any = false, best = who === me ? -Infinity : Infinity;
    for (const c of ORDER) {
      const r = dropRow(b, c); if (r < 0) continue;
      any = true; b[r * C + c] = who;
      let v;
      if (lineAt(b, r, c)) v = who === me ? 10000 + depth : -10000 - depth;
      else if (depth === 0) v = score(b, me);
      else v = search(b, me, 1 - who, depth - 1, alpha, beta);
      b[r * C + c] = null;
      if (who === me) { best = Math.max(best, v); alpha = Math.max(alpha, v); } else { best = Math.min(best, v); beta = Math.min(beta, v); }
      if (alpha >= beta) break;
    }
    return any ? best : 0;
  }
  function botAction(g, p, level = 1) {
    const free = ORDER.filter(c => dropRow(g.board, c) >= 0);
    if (Math.random() < [0.35, 0.08, 0][level]) return { t: 'move', c: free[Math.floor(Math.random() * free.length)] };
    const depth = [1, 4, 6][level] ?? 4, b = g.board.slice();
    let best = -Infinity, pick = free[0];
    for (const c of free) {
      const r = dropRow(b, c); b[r * C + c] = p;
      const v = lineAt(b, r, c) ? 100000 : search(b, p, 1 - p, depth - 1, -Infinity, Infinity) + Math.random();
      b[r * C + c] = null;
      if (v > best) { best = v; pick = c; }
    }
    return { t: 'move', c: pick };
  }
  const api = { C, R, CLOCK_MS, newGame, start, dropRow, checkTimeout, resign, apply, botAction };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.Connect4 = api;
})();
