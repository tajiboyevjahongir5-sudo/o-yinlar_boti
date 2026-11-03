// Shared rules: used by the server (authoritative) and by the client (bot mode + previews).
// Player 0 starts at the bottom and must reach row 0; player 1 starts at the top and must reach the bottom row.
(function () {
  const COLS = 9, ROWS = 9, FENCES = 10, CLOCK_MS = 5 * 60 * 1000;
  const DIRS = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
  const LETTERS = 'abcdefghi';
  const GOAL = [0, ROWS - 1];

  function newGame(starter, minutes) {
    const ms = minutes ? minutes * 60000 : CLOCK_MS;
    return {
      cols: COLS, rows: ROWS, turn: starter || 0, starter: starter || 0, winner: null, reason: null,
      pawns: [{ r: ROWS - 1, c: 4 }, { r: 0, c: 4 }],
      left: [FENCES, FENCES],
      fences: [], // {o:'h'|'v', r, c, p}
      log: [],    // move notation, e.g. "e2", "d3h"
      clock: [ms, ms], base: ms, hist: [],
      turnStart: null, // ms timestamp when the current turn began; null = clocks not running yet
    };
  }

  function start(g, now) { if (g.turnStart === null) g.turnStart = now; }

  // h[r][c]: top edge of cell (r,c) is blocked; v[r][c]: left edge of cell (r,c) is blocked.
  // Fence h(r,c) covers top edges of (r,c),(r,c+1); fence v(r,c) covers left edges of (r,c),(r+1,c).
  function edges(fences) {
    const h = Array.from({ length: ROWS + 1 }, () => Array(COLS).fill(false));
    const v = Array.from({ length: ROWS }, () => Array(COLS + 1).fill(false));
    for (const f of fences) {
      if (f.o === 'h') { h[f.r][f.c] = true; h[f.r][f.c + 1] = true; }
      else { v[f.r][f.c] = true; v[f.r + 1][f.c] = true; }
    }
    return { h, v };
  }

  function canStep(E, r, c, d) {
    if (d === 'up') return r > 0 && !E.h[r][c];
    if (d === 'down') return r < ROWS - 1 && !E.h[r + 1][c];
    if (d === 'left') return c > 0 && !E.v[r][c];
    if (d === 'right') return c < COLS - 1 && !E.v[r][c + 1];
    return false;
  }

  // distance from every cell to the given goal row (pawns ignored)
  function distMap(E, goalRow) {
    const dist = Array.from({ length: ROWS }, () => Array(COLS).fill(Infinity));
    const q = [];
    for (let c = 0; c < COLS; c++) { dist[goalRow][c] = 0; q.push([goalRow, c]); }
    for (let i = 0; i < q.length; i++) {
      const [r, c] = q[i];
      for (const d in DIRS) if (canStep(E, r, c, d)) {
        const nr = r + DIRS[d][0], nc = c + DIRS[d][1];
        if (dist[nr][nc] === Infinity) { dist[nr][nc] = dist[r][c] + 1; q.push([nr, nc]); }
      }
    }
    return dist;
  }

  // orthogonal steps, straight jump over an adjacent opponent, or diagonal when the jump is blocked
  function validMoves(g, p, E) {
    E = E || edges(g.fences);
    const me = g.pawns[p], op = g.pawns[1 - p], out = [];
    for (const d in DIRS) {
      if (!canStep(E, me.r, me.c, d)) continue;
      const r = me.r + DIRS[d][0], c = me.c + DIRS[d][1];
      if (r !== op.r || c !== op.c) { out.push({ r, c }); continue; }
      if (canStep(E, op.r, op.c, d)) { out.push({ r: op.r + DIRS[d][0], c: op.c + DIRS[d][1] }); continue; }
      for (const d2 in DIRS) {
        if (DIRS[d2][0] === DIRS[d][0] || DIRS[d2][1] === DIRS[d][1]) continue; // perpendicular only
        if (canStep(E, op.r, op.c, d2)) out.push({ r: op.r + DIRS[d2][0], c: op.c + DIRS[d2][1] });
      }
    }
    return out;
  }

  function fenceError(g, o, r, c) {
    if (o === 'h') { if (!(r >= 1 && r <= ROWS - 1 && c >= 0 && c <= COLS - 2)) return "Bu yerga to'siq qo'yib bo'lmaydi"; }
    else if (o === 'v') { if (!(c >= 1 && c <= COLS - 1 && r >= 0 && r <= ROWS - 2)) return "Bu yerga to'siq qo'yib bo'lmaydi"; }
    else return "Noto'g'ri to'siq";
    for (const f of g.fences) {
      if (f.o === o && f.r === r && f.c === c) return "Bu yerda to'siq bor";
      if (o === 'h' && f.o === 'h' && f.r === r && Math.abs(f.c - c) === 1) return "To'siqlar ustma-ust tushadi";
      if (o === 'v' && f.o === 'v' && f.c === c && Math.abs(f.r - r) === 1) return "To'siqlar ustma-ust tushadi";
      if (o === 'h' && f.o === 'v' && f.r === r - 1 && f.c === c + 1) return "To'siqlar kesishadi";
      if (o === 'v' && f.o === 'h' && f.r === r + 1 && f.c === c - 1) return "To'siqlar kesishadi";
    }
    const E = edges(g.fences.concat([{ o, r, c }]));
    for (let p = 0; p < 2; p++) if (distMap(E, GOAL[p])[g.pawns[p].r][g.pawns[p].c] === Infinity) return "Yo'lni butunlay yopib bo'lmaydi";
    return null;
  }

  function notation(a) {
    if (a.t === 'move') return LETTERS[a.c] + (ROWS - a.r);
    return a.o === 'h' ? LETTERS[a.c] + (ROWS - a.r + 1) + 'h' : LETTERS[a.c - 1] + (ROWS - a.r) + 'v';
  }

  // ends the game if the player to move has run out of time; returns true when it did
  function checkTimeout(g, now) {
    if (g.winner !== null || g.turnStart === null) return false;
    if (g.clock[g.turn] - (now - g.turnStart) > 0) return false;
    g.clock[g.turn] = 0;
    g.winner = 1 - g.turn; g.reason = 'time';
    return true;
  }

  // player p leaves a running game: the opponent wins
  function resign(g, p) {
    if (g.winner !== null || g.turnStart === null) return false;
    g.winner = 1 - p; g.reason = 'resign';
    return true;
  }

  // returns an error message, or null after applying the action
  function apply(g, p, a, now) {
    if (checkTimeout(g, now)) return 'Vaqt tugadi';
    if (g.winner !== null) return "O'yin tugagan";
    if (g.turnStart === null) return "O'yin hali boshlanmadi";
    if (g.turn !== p) return 'Hozir sizning navbatingiz emas';
    let act;
    if (a.t === 'move') {
      const r = a.r | 0, c = a.c | 0;
      if (!validMoves(g, p).some(m => m.r === r && m.c === c)) return "U yerga yurib bo'lmaydi";
      g.pawns[p] = { r, c };
      if (r === GOAL[p]) { g.winner = p; g.reason = 'goal'; }
      act = { t: 'move', r, c };
    } else if (a.t === 'fence') {
      if (g.left[p] <= 0) return "To'siqlaringiz tugadi";
      const r = a.r | 0, c = a.c | 0;
      const err = fenceError(g, a.o, r, c);
      if (err) return err;
      g.fences.push({ o: a.o, r, c, p });
      g.left[p]--;
      act = { t: 'fence', o: a.o, r, c };
    } else return "Noma'lum harakat";
    g.clock[p] -= now - g.turnStart;
    g.turnStart = now;
    g.last = Object.assign({ p }, act);
    g.log.push(notation(act));
    g.hist.push(act);
    if (g.winner === null) g.turn = 1 - p;
    return null;
  }

  // level: 0 easy (often just walks, blocks late), 1 normal, 2 hard (blocks as soon as it is not ahead)
  function botAction(g, p, level = 1) {
    const E = edges(g.fences);
    const myDist = distMap(E, GOAL[p]), opDist = distMap(E, GOAL[1 - p]);
    const me = g.pawns[p], op = g.pawns[1 - p];
    const myLen = myDist[me.r][me.c], opLen = opDist[op.r][op.c];
    // block when the opponent is ahead in the race (or about to win)
    const wantBlock = level === 0 ? (opLen <= 1 || (opLen < myLen - 2 && Math.random() < 0.5))
      : level === 2 ? (opLen <= myLen || opLen <= 3) : (opLen < myLen || opLen <= 2);
    if (g.left[p] > 0 && wantBlock) {
      let best = null, bestScore = 0;
      for (const o of ['h', 'v']) for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (fenceError(g, o, r, c)) continue;
        const E2 = edges(g.fences.concat([{ o, r, c }]));
        const score = (distMap(E2, GOAL[1 - p])[op.r][op.c] - opLen)
          - 0.9 * (distMap(E2, GOAL[p])[me.r][me.c] - myLen) + Math.random() * 0.3;
        if (score > bestScore) { bestScore = score; best = { t: 'fence', o, r, c }; }
      }
      if (best && bestScore >= 1) return best;
    }
    const moves = validMoves(g, p, E);
    if (level === 0 && Math.random() < 0.3) return Object.assign({ t: 'move' }, moves[Math.floor(Math.random() * moves.length)]);
    const bestD = Math.min(...moves.map(m => myDist[m.r][m.c]));
    const pick = moves.filter(m => myDist[m.r][m.c] === bestD);
    return Object.assign({ t: 'move' }, pick[Math.floor(Math.random() * pick.length)]);
  }

  const api = { COLS, ROWS, FENCES, CLOCK_MS, DIRS, GOAL, newGame, start, edges, canStep, distMap,
    validMoves, fenceError, notation, checkTimeout, resign, apply, botAction };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.FenceRace = api;
})();
