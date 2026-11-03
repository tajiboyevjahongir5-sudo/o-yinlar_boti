// Shaxmat (chess) rules: shared by the server (authoritative) and the client (bot mode).
// Board: 64 squares, index = r * 8 + c, row 0 = rank 8 (black's back rank) at the top.
// Pieces: 'PNBRQK' white, 'pnbrqk' black. The player who starts plays white.
// Full rules: castling, en passant, promotion, check / checkmate / stalemate, the 50-move rule,
// threefold repetition and insufficient material. winner: 0/1 = that player, -1 = draw.
(function () {
  const N = 8, CLOCK_MS = 10 * 60 * 1000;
  const FILES = 'abcdefgh';
  const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const ROOK = [[-1, 0], [1, 0], [0, -1], [0, 1]], BISHOP = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
  const isWhite = (x) => x && x === x.toUpperCase();
  const colorOfPiece = (x) => (x ? (isWhite(x) ? 'w' : 'b') : null);
  const sq = (i) => FILES[i % N] + (N - Math.floor(i / N));
  const colorOf = (g, p) => (p === g.starter ? 'w' : 'b');

  function newGame(starter) {
    starter = starter || 0;
    const back = 'rnbqkbnr', board = Array(64).fill(null);
    for (let c = 0; c < N; c++) {
      board[c] = back[c]; board[8 + c] = 'p';
      board[48 + c] = 'P'; board[56 + c] = back[c].toUpperCase();
    }
    const g = {
      kind: 'shaxmat', board, turn: starter, starter, winner: null, reason: null,
      castle: { K: true, Q: true, k: true, q: true },
      ep: -1,     // en passant target square, or -1
      half: 0,    // plies since the last capture or pawn move (50-move rule)
      reps: {},   // position key -> times seen (cleared on irreversible moves)
      log: [], n: 0, last: null, check: false,
      clock: [CLOCK_MS, CLOCK_MS], turnStart: null,
    };
    g.reps[posKey(g, 'w')] = 1;
    return g;
  }
  function start(g, now) { if (g.turnStart === null) g.turnStart = now; }

  const posKey = (g, side) => g.board.map(x => x || '.').join('') + side
    + (g.castle.K ? 'K' : '') + (g.castle.Q ? 'Q' : '') + (g.castle.k ? 'k' : '') + (g.castle.q ? 'q' : '') + g.ep;

  // is square i attacked by side `by` ('w'|'b')?
  function attacked(b, i, by) {
    const r = Math.floor(i / N), c = i % N;
    const own = (x, t) => x && colorOfPiece(x) === by && x.toLowerCase() === t;
    const pr = by === 'w' ? r + 1 : r - 1; // attacking pawns sit one row "behind" from their view
    for (const dc of [-1, 1]) if (inside(pr, c + dc) && own(b[pr * N + c + dc], 'p')) return true;
    for (const [dr, dc] of KNIGHT) if (inside(r + dr, c + dc) && own(b[(r + dr) * N + c + dc], 'n')) return true;
    for (const [dr, dc] of KING) if (inside(r + dr, c + dc) && own(b[(r + dr) * N + c + dc], 'k')) return true;
    for (const [dirs, t] of [[ROOK, 'r'], [BISHOP, 'b']]) for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      while (inside(rr, cc)) {
        const x = b[rr * N + cc];
        if (x) { if (own(x, t) || own(x, 'q')) return true; break; }
        rr += dr; cc += dc;
      }
    }
    return false;
  }
  const kingSq = (b, side) => b.indexOf(side === 'w' ? 'K' : 'k');
  const inCheck = (b, side) => attacked(b, kingSq(b, side), side === 'w' ? 'b' : 'w');

  // pseudo-legal moves for `side`: {from, to, promo?, ep?, castle?}
  function pseudo(g, side) {
    const b = g.board, out = [], enemy = side === 'w' ? 'b' : 'w';
    for (let i = 0; i < 64; i++) {
      const x = b[i];
      if (!x || colorOfPiece(x) !== side) continue;
      const r = Math.floor(i / N), c = i % N, t = x.toLowerCase();
      const add = (to) => {
        if (t === 'p' && (to < 8 || to >= 56)) for (const pr of 'qrbn') out.push({ from: i, to, promo: pr });
        else out.push({ from: i, to });
      };
      if (t === 'p') {
        const d = side === 'w' ? -1 : 1, start = side === 'w' ? 6 : 1;
        if (inside(r + d, c) && !b[(r + d) * N + c]) {
          add((r + d) * N + c);
          if (r === start && !b[(r + 2 * d) * N + c]) out.push({ from: i, to: (r + 2 * d) * N + c });
        }
        for (const dc of [-1, 1]) {
          if (!inside(r + d, c + dc)) continue;
          const to = (r + d) * N + c + dc;
          if (b[to] && colorOfPiece(b[to]) === enemy) add(to);
          else if (to === g.ep) out.push({ from: i, to, ep: true });
        }
      } else if (t === 'n' || t === 'k') {
        for (const [dr, dc] of t === 'n' ? KNIGHT : KING) {
          if (!inside(r + dr, c + dc)) continue;
          const to = (r + dr) * N + c + dc;
          if (!b[to] || colorOfPiece(b[to]) === enemy) out.push({ from: i, to });
        }
        if (t === 'k') { // castling: rights left, squares empty, king not passing through check
          const home = side === 'w' ? 60 : 4, K = side === 'w' ? 'K' : 'k', Q = side === 'w' ? 'Q' : 'q';
          if (i === home && !attacked(b, home, enemy)) {
            if (g.castle[K] && !b[home + 1] && !b[home + 2] && b[home + 3] === (side === 'w' ? 'R' : 'r')
              && !attacked(b, home + 1, enemy) && !attacked(b, home + 2, enemy)) out.push({ from: i, to: home + 2, castle: 'K' });
            if (g.castle[Q] && !b[home - 1] && !b[home - 2] && !b[home - 3] && b[home - 4] === (side === 'w' ? 'R' : 'r')
              && !attacked(b, home - 1, enemy) && !attacked(b, home - 2, enemy)) out.push({ from: i, to: home - 2, castle: 'Q' });
          }
        }
      } else {
        const dirs = t === 'r' ? ROOK : t === 'b' ? BISHOP : ROOK.concat(BISHOP);
        for (const [dr, dc] of dirs) {
          let rr = r + dr, cc = c + dc;
          while (inside(rr, cc)) {
            const to = rr * N + cc;
            if (b[to]) { if (colorOfPiece(b[to]) === enemy) out.push({ from: i, to }); break; }
            out.push({ from: i, to });
            rr += dr; cc += dc;
          }
        }
      }
    }
    return out;
  }

  // plays a move on g's board and state (no legality checks); returns the captured piece
  function make(g, m) {
    const b = g.board, x = b[m.from], side = colorOfPiece(x), t = x.toLowerCase();
    let cap = b[m.to];
    b[m.to] = m.promo ? (side === 'w' ? m.promo.toUpperCase() : m.promo) : x;
    b[m.from] = null;
    if (m.ep) { const k = m.to + (side === 'w' ? 8 : -8); cap = b[k]; b[k] = null; }
    if (m.castle) {
      const home = side === 'w' ? 60 : 4;
      if (m.castle === 'K') { b[home + 1] = b[home + 3]; b[home + 3] = null; }
      else { b[home - 1] = b[home - 4]; b[home - 4] = null; }
    }
    g.ep = t === 'p' && Math.abs(m.to - m.from) === 16 ? (m.from + m.to) / 2 : -1;
    if (t === 'k') { if (side === 'w') g.castle.K = g.castle.Q = false; else g.castle.k = g.castle.q = false; }
    for (const [s, k] of [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']]) if (m.from === s || m.to === s) g.castle[k] = false;
    g.half = t === 'p' || cap ? 0 : g.half + 1;
    return cap;
  }
  const copy = (g) => ({ board: g.board.slice(), castle: Object.assign({}, g.castle), ep: g.ep, half: g.half, starter: g.starter });

  function legalMoves(g, side) {
    return pseudo(g, side).filter(m => { const n = copy(g); make(n, m); return !inCheck(n.board, side); });
  }

  function insufficient(b) {
    const rest = b.map((x, i) => [x, i]).filter(([x]) => x && x.toLowerCase() !== 'k');
    if (!rest.length) return true;
    if (rest.length === 1 && 'nb'.includes(rest[0][0].toLowerCase())) return true;
    // only bishops, all on squares of one colour
    if (rest.every(([x]) => x.toLowerCase() === 'b')) {
      const shade = new Set(rest.map(([, i]) => (Math.floor(i / N) + i % N) % 2));
      return shade.size === 1;
    }
    return false;
  }

  function san(g, m, legal) {
    const x = g.board[m.from], t = x.toLowerCase();
    if (m.castle) return m.castle === 'K' ? 'O-O' : 'O-O-O';
    const capture = !!g.board[m.to] || m.ep;
    let s = '';
    if (t === 'p') s = (capture ? FILES[m.from % N] + 'x' : '') + sq(m.to) + (m.promo ? '=' + m.promo.toUpperCase() : '');
    else {
      s = t.toUpperCase();
      const twins = legal.filter(o => o.to === m.to && o.from !== m.from && g.board[o.from] === x);
      if (twins.length) {
        const sameFile = twins.some(o => o.from % N === m.from % N), sameRank = twins.some(o => Math.floor(o.from / N) === Math.floor(m.from / N));
        s += !sameFile ? FILES[m.from % N] : !sameRank ? String(N - Math.floor(m.from / N)) : sq(m.from);
      }
      s += (capture ? 'x' : '') + sq(m.to);
    }
    return s;
  }

  function checkTimeout(g, now) {
    if (g.winner !== null || g.turnStart === null) return false;
    if (g.clock[g.turn] - (now - g.turnStart) > 0) return false;
    g.clock[g.turn] = 0;
    // flagging against a lone king is a draw
    const opp = colorOf(g, 1 - g.turn);
    const oppMaterial = g.board.some(x => x && colorOfPiece(x) === opp && x.toLowerCase() !== 'k');
    if (oppMaterial) { g.winner = 1 - g.turn; g.reason = 'time'; } else { g.winner = -1; g.reason = 'time-draw'; }
    return true;
  }
  function resign(g, p) {
    if (g.winner !== null || g.turnStart === null) return false;
    g.winner = 1 - p; g.reason = 'resign';
    return true;
  }

  function apply(g, p, a, now) {
    if (checkTimeout(g, now)) return 'Vaqt tugadi';
    if (g.winner !== null) return "O'yin tugagan";
    if (g.turnStart === null) return "O'yin hali boshlanmadi";
    if (g.turn !== p) return 'Hozir sizning navbatingiz emas';
    if (a.t !== 'move') return "Noma'lum harakat";
    const side = colorOf(g, p), from = a.from | 0, to = a.to | 0;
    const promo = typeof a.promo === 'string' && 'qrbn'.includes(a.promo) && a.promo.length === 1 ? a.promo : 'q';
    const legal = legalMoves(g, side);
    const m = legal.find(o => o.from === from && o.to === to && (!o.promo || o.promo === promo));
    if (!m) {
      if (g.board[from] && colorOfPiece(g.board[from]) === side && pseudo(g, side).some(o => o.from === from && o.to === to))
        return inCheck(g.board, side) ? 'Shohingiz shoh ostida!' : "Bu yurish shohni xavf ostida qoldiradi";
      return "U yerga yurib bo'lmaydi";
    }
    let note = san(g, m, legal);
    const cap = make(g, m);
    const enemy = side === 'w' ? 'b' : 'w';
    g.check = inCheck(g.board, enemy);
    const replies = legalMoves(g, enemy);
    if (!replies.length) note += g.check ? '#' : ''; else if (g.check) note += '+';
    g.log.push(note);
    g.last = { p, t: 'move', from, to, cap: cap || null, castle: m.castle || null, promo: m.promo || null, check: g.check };
    g.n++;
    g.clock[p] -= now - g.turnStart;
    g.turnStart = now;
    g.turn = 1 - p;
    if (cap || m.promo || g.board[to].toLowerCase() === 'p') g.reps = {};
    const key = posKey(g, enemy);
    g.reps[key] = (g.reps[key] || 0) + 1;
    if (!replies.length) {
      if (g.check) { g.winner = p; g.reason = 'mate'; } else { g.winner = -1; g.reason = 'stalemate'; }
    } else if (insufficient(g.board)) { g.winner = -1; g.reason = 'material'; }
    else if (g.half >= 100) { g.winner = -1; g.reason = 'fifty'; }
    else if (g.reps[key] >= 3) { g.winner = -1; g.reason = 'repetition'; }
    return null;
  }

  // ---------- bot: alpha-beta (2 plies) + a capture-only search, material + piece-square tables ----------
  const VAL = { p: 100, n: 300, b: 320, r: 500, q: 900, k: 0 };
  // from white's point of view, index 0 = a8; black uses the mirrored square
  const PSQ = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5,
      0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30,
      -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10,
      -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5,
      0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30,
      -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
  };
  function evaluate(b, side) { // score for `side`
    let s = 0;
    for (let i = 0; i < 64; i++) {
      const x = b[i];
      if (!x) continue;
      const t = x.toLowerCase(), w = isWhite(x);
      const v = VAL[t] + PSQ[t][w ? i : (7 - Math.floor(i / N)) * N + i % N];
      s += (w ? 'w' : 'b') === side ? v : -v;
    }
    return s;
  }
  const order = (b, ms) => ms.map(m => [m, (b[m.to] ? 10 * VAL[b[m.to].toLowerCase()] - VAL[b[m.from].toLowerCase()] : 0) + (m.promo === 'q' ? 800 : 0)])
    .sort((x, y) => y[1] - x[1]).map(x => x[0]);
  function quiesce(g, side, alpha, beta, depth) {
    const stand = evaluate(g.board, side);
    if (stand >= beta || depth === 0) return stand;
    if (stand > alpha) alpha = stand;
    const enemy = side === 'w' ? 'b' : 'w';
    for (const m of order(g.board, pseudo(g, side).filter(m => g.board[m.to] || m.ep))) {
      const n = copy(g); make(n, m);
      if (inCheck(n.board, side)) continue;
      const v = -quiesce(n, enemy, -beta, -alpha, depth - 1);
      if (v >= beta) return v;
      if (v > alpha) alpha = v;
    }
    return alpha;
  }
  function negamax(g, side, depth, alpha, beta) {
    const enemy = side === 'w' ? 'b' : 'w';
    if (depth === 0) return quiesce(g, side, alpha, beta, 4);
    const moves = order(g.board, legalMoves(g, side));
    if (!moves.length) return inCheck(g.board, side) ? -100000 - depth : 0;
    let best = -Infinity;
    for (const m of moves) {
      const n = copy(g); make(n, m);
      const v = -negamax(n, enemy, depth - 1, -beta, -alpha);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }
  function botAction(g, p, mistake = 0.1) {
    const side = colorOf(g, p), enemy = side === 'w' ? 'b' : 'w';
    const moves = legalMoves(g, side);
    if (!moves.length) return null;
    // now and then a plain (but not suicidal) move, so the bot can be beaten
    if (Math.random() < mistake) {
      const safe = moves.filter(m => { const n = copy(g); make(n, m); return -quiesce(n, enemy, -Infinity, Infinity, 3) > evaluate(g.board, side) - 150; });
      const pool = safe.length ? safe : moves, m = pool[Math.floor(Math.random() * pool.length)];
      return { t: 'move', from: m.from, to: m.to, promo: m.promo };
    }
    let best = -Infinity, picks = [];
    for (const m of order(g.board, moves)) {
      const n = copy(g); make(n, m);
      const v = -negamax(n, enemy, 2, -Infinity, Infinity) + Math.random() * 12;
      if (v > best) { best = v; picks = [m]; }
    }
    const m = picks[0];
    return { t: 'move', from: m.from, to: m.to, promo: m.promo };
  }

  const api = { N, CLOCK_MS, newGame, start, colorOf, colorOfPiece, isWhite, legalMoves, inCheck, kingSq, checkTimeout, resign, apply,
    botAction, sq };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.Chess = api;
})();
