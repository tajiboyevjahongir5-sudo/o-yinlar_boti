// Shashka (Russian draughts) rules: shared by the server (authoritative) and the client (bot mode).
// 8x8 board, index = r * 8 + c, row 0 at the top. The player who starts plays white ('w', bottom rows,
// moves up); the other plays black ('b'). Kings are upper case ('W', 'B').
// - men move one square diagonally forward and capture forwards and backwards;
// - capturing is compulsory, and a capture continues while the same piece can capture again;
// - kings fly: they move and capture along a whole diagonal;
// - a man that reaches the far row becomes a king at once (and keeps capturing as a king);
// - captured pieces stay on the board until the move ends (they can't be jumped twice).
// A multi-capture is played one jump per action; g.chain holds the square of the piece that must go on.
// winner: 0/1 = that player, -1 = draw (15 moves in a row each by kings only without a capture).
(function () {
  const N = 8, CLOCK_MS = 5 * 60 * 1000, KING_DRAW_PLIES = 30;
  const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const FILES = 'abcdefgh';

  const colorOf = (g, p) => (p === g.starter ? 'w' : 'b');
  const ownerOf = (g, piece) => (piece.toLowerCase() === 'w' ? g.starter : 1 - g.starter);
  const isKing = (piece) => piece === 'W' || piece === 'B';
  const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
  const sq = (i) => FILES[i % N] + (N - Math.floor(i / N));

  function newGame(starter) {
    starter = starter || 0;
    const board = Array(N * N).fill(null);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if ((r + c) % 2 === 1) {
      if (r < 3) board[r * N + c] = 'b';
      else if (r > 4) board[r * N + c] = 'w';
    }
    return {
      kind: 'shashka', board, turn: starter, starter, winner: null, reason: null,
      chain: null,      // square of the piece in the middle of a multi-capture
      taken: [],        // squares captured during the current move (removed when it ends)
      quiet: 0,         // plies in a row by kings without a capture
      log: [], n: 0, last: null,
      clock: [CLOCK_MS, CLOCK_MS], turnStart: null,
    };
  }
  function start(g, now) { if (g.turnStart === null) g.turnStart = now; }

  // all single captures by the piece on square i: [{from, to, over}]
  function capturesFrom(g, i) {
    const b = g.board, piece = b[i], mine = piece.toLowerCase(), out = [];
    const r0 = Math.floor(i / N), c0 = i % N;
    const enemy = (k) => b[k] && b[k].toLowerCase() !== mine && !g.taken.includes(k);
    for (const [dr, dc] of DIAG) {
      if (!isKing(piece)) {
        const r1 = r0 + dr, c1 = c0 + dc, r2 = r0 + 2 * dr, c2 = c0 + 2 * dc;
        if (inside(r2, c2) && enemy(r1 * N + c1) && !b[r2 * N + c2]) out.push({ from: i, to: r2 * N + c2, over: r1 * N + c1 });
        continue;
      }
      // flying king: slide over empty squares to the first piece; it must be an enemy with room behind it
      let r = r0 + dr, c = c0 + dc;
      while (inside(r, c) && !b[r * N + c]) { r += dr; c += dc; }
      if (!inside(r, c) || !enemy(r * N + c)) continue;
      const over = r * N + c, lands = [];
      r += dr; c += dc;
      while (inside(r, c) && !b[r * N + c]) { lands.push(r * N + c); r += dr; c += dc; }
      // a king must land where it can capture again, if there is such a square
      const goOn = lands.filter(to => canCaptureAfter(g, i, to, over));
      for (const to of (goOn.length ? goOn : lands)) out.push({ from: i, to, over });
    }
    return out;
  }
  function canCaptureAfter(g, from, to, over) {
    const b = g.board, piece = b[from];
    b[to] = piece; b[from] = null; g.taken.push(over);
    let can = false;
    try { can = capturesFrom2(g, to).length > 0; } finally { g.taken.pop(); b[from] = piece; b[to] = null; }
    return can;
  }
  // like capturesFrom, without the "must continue" filter (avoids endless recursion)
  function capturesFrom2(g, i) {
    const b = g.board, piece = b[i], mine = piece.toLowerCase(), out = [];
    const r0 = Math.floor(i / N), c0 = i % N;
    for (const [dr, dc] of DIAG) {
      let r = r0 + dr, c = c0 + dc;
      if (isKing(piece)) while (inside(r, c) && !b[r * N + c]) { r += dr; c += dc; }
      if (!inside(r, c)) continue;
      const k = r * N + c;
      if (!b[k] || b[k].toLowerCase() === mine || g.taken.includes(k)) continue;
      const r2 = r + dr, c2 = c + dc;
      if (inside(r2, c2) && !b[r2 * N + c2]) out.push(r2 * N + c2);
    }
    return out;
  }

  function simpleFrom(g, i) {
    const b = g.board, piece = b[i], out = [];
    const r0 = Math.floor(i / N), c0 = i % N, fwd = piece.toLowerCase() === 'w' ? -1 : 1;
    for (const [dr, dc] of DIAG) {
      if (!isKing(piece)) {
        if (dr !== fwd) continue;
        const r = r0 + dr, c = c0 + dc;
        if (inside(r, c) && !b[r * N + c]) out.push({ from: i, to: r * N + c });
        continue;
      }
      let r = r0 + dr, c = c0 + dc;
      while (inside(r, c) && !b[r * N + c]) { out.push({ from: i, to: r * N + c }); r += dr; c += dc; }
    }
    return out;
  }

  // every legal single step for player p: captures when any exist, otherwise simple moves
  function legalSteps(g, p) {
    if (g.chain !== null) return capturesFrom(g, g.chain);
    const col = colorOf(g, p);
    let caps = [], simple = [];
    for (let i = 0; i < N * N; i++) {
      const piece = g.board[i];
      if (!piece || piece.toLowerCase() !== col) continue;
      caps = caps.concat(capturesFrom(g, i));
      if (!caps.length) simple = simple.concat(simpleFrom(g, i));
    }
    return caps.length ? caps : simple;
  }

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

  // plays one step without any checks (used by apply and by the bot's search)
  function step(g, p, s) {
    const b = g.board, piece = b[s.from], wasKing = isKing(piece);
    b[s.to] = piece; b[s.from] = null;
    const r = Math.floor(s.to / N);
    if (!wasKing && ((piece === 'w' && r === 0) || (piece === 'b' && r === N - 1))) b[s.to] = piece.toUpperCase();
    if (s.over !== undefined) {
      g.taken.push(s.over);
      if (capturesFrom(g, s.to).length) { g.chain = s.to; return { more: true, crowned: !wasKing && isKing(b[s.to]) }; }
    }
    for (const k of g.taken) b[k] = null;
    const captured = g.taken.length;
    g.taken = []; g.chain = null;
    g.quiet = captured || !wasKing ? 0 : g.quiet + 1;
    return { more: false, captured, crowned: !wasKing && isKing(b[s.to]) };
  }

  function apply(g, p, a, now) {
    if (checkTimeout(g, now)) return 'Vaqt tugadi';
    if (g.winner !== null) return "O'yin tugagan";
    if (g.turnStart === null) return "O'yin hali boshlanmadi";
    if (g.turn !== p) return 'Hozir sizning navbatingiz emas';
    if (a.t !== 'move') return "Noma'lum harakat";
    const from = a.from | 0, to = a.to | 0;
    const steps = legalSteps(g, p), s = steps.find(x => x.from === from && x.to === to);
    if (!s) {
      if (g.chain !== null) return 'Urishni davom ettiring';
      if (steps.length && steps[0].over !== undefined) return 'Urish majburiy!';
      return "U yerga yurib bo'lmaydi";
    }
    const startOfMove = g.chain === null;
    const res = step(g, p, s);
    if (startOfMove) g.log.push(sq(from) + (s.over !== undefined ? ':' : '-') + sq(to));
    else g.log[g.log.length - 1] += ':' + sq(to);
    g.last = { p, t: 'move', from, to, cap: s.over !== undefined ? s.over : null, crowned: res.crowned, more: res.more };
    g.n++;
    if (res.more) return null; // same player keeps capturing; the clock keeps running
    g.clock[p] -= now - g.turnStart;
    g.turnStart = now;
    g.turn = 1 - p;
    if (!legalSteps(g, g.turn).length) { g.winner = p; g.reason = count(g, g.turn) ? 'blocked' : 'captured'; }
    else if (g.quiet >= KING_DRAW_PLIES) { g.winner = -1; g.reason = 'draw'; }
    return null;
  }
  const count = (g, p) => g.board.filter(x => x && x.toLowerCase() === colorOf(g, p)).length;

  // ---------- bot ----------
  // full moves (whole capture sequences) for the side to move: [{steps:[...], g}]
  function fullMoves(g, p) {
    const out = [];
    const walk = (st, seq) => {
      for (const s of legalSteps(st, p)) {
        const n = clone(st), res = step(n, p, s);
        if (res.more) walk(n, seq.concat([s]));
        else out.push({ steps: seq.concat([s]), g: n });
      }
    };
    walk(g, []);
    return out;
  }
  const clone = (g) => ({ board: g.board.slice(), starter: g.starter, chain: g.chain, taken: g.taken.slice(), quiet: g.quiet });

  const PST = (r, piece) => { // men like to advance and to stay in the centre
    const adv = piece === 'w' ? N - 1 - r : r;
    return adv * 6;
  };
  function evaluate(g, p) {
    const me = colorOf(g, p);
    let s = 0;
    g.board.forEach((x, i) => {
      if (!x) return;
      const r = Math.floor(i / N), c = i % N;
      let v = isKing(x) ? 260 : 100 + PST(r, x);
      if (c === 0 || c === N - 1) v -= 4;
      if (!isKing(x) && ((x === 'w' && r === N - 1) || (x === 'b' && r === 0))) v += 8; // back rank guard
      s += x.toLowerCase() === me ? v : -v;
    });
    return s;
  }
  function search(g, p, toMove, depth, alpha, beta) {
    const moves = fullMoves(g, toMove);
    if (!moves.length) return toMove === p ? -10000 - depth : 10000 + depth;
    if (depth === 0) return evaluate(g, p);
    if (toMove === p) {
      let best = -Infinity;
      for (const m of moves) {
        best = Math.max(best, search(m.g, p, 1 - toMove, depth - 1, alpha, beta));
        alpha = Math.max(alpha, best); if (alpha >= beta) break;
      }
      return best;
    }
    let best = Infinity;
    for (const m of moves) {
      best = Math.min(best, search(m.g, p, 1 - toMove, depth - 1, alpha, beta));
      beta = Math.min(beta, best); if (alpha >= beta) break;
    }
    return best;
  }
  // returns the first step of the best full move; a multi-capture is replayed step by step
  function botAction(g, p, mistake = 0.12) {
    const moves = fullMoves(g, p);
    if (!moves.length) return null;
    let pick;
    if (moves.length === 1 || Math.random() < mistake) pick = moves[Math.floor(Math.random() * moves.length)];
    else {
      let best = -Infinity, picks = [];
      for (const m of moves) {
        const v = search(m.g, p, 1 - p, 5, -Infinity, Infinity) + Math.random() * 6;
        if (v > best) { best = v; picks = [m]; }
      }
      pick = picks[0];
    }
    const s = pick.steps[0];
    return { t: 'move', from: s.from, to: s.to };
  }

  const api = { N, CLOCK_MS, newGame, start, colorOf, ownerOf, isKing, legalSteps, checkTimeout, resign, apply, botAction, sq,
    count };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.Shashka = api;
})();
