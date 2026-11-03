// Drawing and input for the newer games (4 ta qatorga, Nuqtalar, Dengiz jangi, Domino, Nardi).
// index.html calls Boards(env) once; env gives access to the app state (game, you, act, ...).
// Every plugin: badge(g, p) html for the player card, draw(c, g, now, B) where B = {x0, y0, S} is the board square,
// down(x, y, g) for a tap at board coordinates, thumb(c, now) for a 92x92 preview, msg(g) status line (optional),
// why(g, won, oppName) result text, stats(g, you) -> 3 [value, label] pairs, ui(g, tray) for buttons under the board.
window.Boards = function (env) {
  const C0 = '#ff2d46', C1 = '#2f7bff';
  const col = (p) => env.COLORS[p];
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); };
  const glowDisc = (c, x, y, r, color, alpha = 1) => {
    c.save(); c.globalAlpha = alpha; c.shadowColor = color; c.shadowBlur = 12;
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, env.shade(color, 0.45)); g.addColorStop(1, env.shade(color, -0.2));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    c.shadowBlur = 0; c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = Math.max(1, r * 0.12);
    c.beginPath(); c.arc(x, y, r * 0.62, 0, 7); c.stroke(); c.restore();
  };
  const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const P = {};

  // ---------------- 4 ta qatorga ----------------
  {
    const M = window.Connect4, C = M.C, R = M.R;
    let hover = -1, dropAt = 0, lastN = -1;
    const geo = (B) => { const cs = B.S / C, h = cs * R; return { cs, x: B.x0, y: B.y0 + (B.S - h) / 2, h }; };
    P.c4 = {
      badge: (g, p) => `<span class="disc"></span> <small>${p === env.you ? 'siz' : 'raqib'}</small>`,
      draw(c, g, now, B) {
        const { cs, x, y, h } = geo(B);
        if (g.n !== lastN) { lastN = g.n; dropAt = now; }
        c.save(); c.shadowColor = 'rgba(47,123,255,.6)'; c.shadowBlur = 18; c.fillStyle = '#16205a'; rr(c, x - 4, y - 4, cs * C + 8, h + 8, 14); c.fill(); c.restore();
        if (hover >= 0 && env.myTurn()) { c.fillStyle = env.hexA(col(env.you), 0.16); c.fillRect(x + hover * cs, y, cs, h); }
        for (let r = 0; r < R; r++) for (let k = 0; k < C; k++) {
          const v = g.board[r * C + k], cx = x + (k + 0.5) * cs, cy = y + (r + 0.5) * cs;
          c.fillStyle = '#070b1f'; c.beginPath(); c.arc(cx, cy, cs * 0.38, 0, 7); c.fill();
          if (v === null) continue;
          let yy = cy;
          if (g.last && g.last.r === r && g.last.c === k) { const t = Math.min(1, (now - dropAt) / 320); yy = y + cs * 0.5 + (cy - y - cs * 0.5) * t * t; }
          glowDisc(c, cx, yy, cs * 0.36, col(v));
        }
        if (g.line) {
          const pts = g.line.map(i => [x + (i % C + 0.5) * cs, y + (Math.floor(i / C) + 0.5) * cs]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
          c.save(); c.strokeStyle = '#fff'; c.lineWidth = cs * 0.12; c.lineCap = 'round'; c.shadowColor = col(g.winner); c.shadowBlur = 20;
          c.beginPath(); c.moveTo(...pts[0]); c.lineTo(...pts[pts.length - 1]); c.stroke(); c.restore();
        }
      },
      move(x, y, g, B) { const { cs, x: x0 } = geo(B); const k = Math.floor((x - x0) / cs); hover = k >= 0 && k < C ? k : -1; },
      down(x, y, g, B) {
        const { cs, x: x0 } = geo(B), k = Math.floor((x - x0) / cs);
        if (k < 0 || k >= C) return;
        if (M.dropRow(g.board, k) < 0) return env.flash("Bu ustun to'la", 900);
        env.act({ t: 'move', c: k });
      },
      thumb(c, now) {
        c.fillStyle = '#16205a'; rr(c, 4, 12, 84, 68, 10); c.fill();
        const seq = [3, 3, 4, 2, 5, 4], n = Math.floor((now % 4200) / 600);
        for (let r = 0; r < 5; r++) for (let k = 0; k < 6; k++) { c.fillStyle = '#070b1f'; c.beginPath(); c.arc(14 + k * 13, 21 + r * 13, 5, 0, 7); c.fill(); }
        const h = [0, 0, 0, 0, 0, 0];
        seq.slice(0, n).forEach((k, i) => { const r = 4 - h[k]++; glowDisc(c, 14 + k * 13, 21 + r * 13, 5, i % 2 ? C1 : C0); });
      },
      why: (g, won, opp) => g.reason === 'line' ? (won ? "Siz 4 ta toshni bir qatorga terdingiz!" : opp + " 4 ta toshni bir qatorga terdi.") : "Taxta to'ldi — durrang!",
      stats: (g, you) => [[g.log.filter((_, i) => (i % 2 === 0) === (g.starter === you)).length, "{pen} Yurish"], ['●', '{mark} Rang'], [null, '{timer} Vaqt']],
    };
  }

  // ---------------- Nuqtalar va kataklar ----------------
  {
    const M = window.Dots, N = M.N;
    let hover = -1;
    const geo = (B) => { const m = B.S * 0.08, step = (B.S - 2 * m) / N; return { m, step, x: B.x0 + m, y: B.y0 + m }; };
    const lineEnds = (e, G) => {
      if (e < M.H) { const r = Math.floor(e / N), k = e % N; return [G.x + k * G.step, G.y + r * G.step, G.x + (k + 1) * G.step, G.y + r * G.step]; }
      const q = e - M.H, r = Math.floor(q / (N + 1)), k = q % (N + 1);
      return [G.x + k * G.step, G.y + r * G.step, G.x + k * G.step, G.y + (r + 1) * G.step];
    };
    const nearest = (x, y, g, B) => {
      const G = geo(B); let best = -1, bd = G.step * 0.45;
      for (let e = 0; e < M.E; e++) {
        if (g.lines[e] !== null) continue;
        const [a, b, cc, d] = lineEnds(e, G), mx = (a + cc) / 2, my = (b + d) / 2, dist = Math.hypot(x - mx, y - my);
        if (dist < bd) { bd = dist; best = e; }
      }
      return best;
    };
    P.dots = {
      badge: (g, p) => `<span class="disc"></span> ${g.score[p]} <small>katak</small>`,
      msg: (g) => (g.last && g.last.got && g.turn === g.last.p && g.winner === null ? (g.turn === env.you ? '{check} Katak yopildi — yana yuring!' : 'Raqib katak yopdi — yana yuradi') : null),
      draw(c, g, now, B) {
        const G = geo(B), pulse = 0.5 + 0.5 * Math.sin(now / 250);
        for (let r = 0; r < N; r++) for (let k = 0; k < N; k++) {
          const o = g.boxes[r * N + k];
          if (o === null) continue;
          c.fillStyle = env.hexA(col(o), 0.28); c.fillRect(G.x + k * G.step + 2, G.y + r * G.step + 2, G.step - 4, G.step - 4);
          c.fillStyle = env.hexA(col(o), 0.9); c.font = `900 ${G.step * 0.32}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(o === env.you ? '★' : '●', G.x + (k + 0.5) * G.step, G.y + (r + 0.5) * G.step);
        }
        for (let e = 0; e < M.E; e++) {
          const [a, b, cc, d] = lineEnds(e, G), o = g.lines[e];
          c.save(); c.lineCap = 'round';
          if (o !== null) { c.strokeStyle = col(o); c.lineWidth = G.step * 0.09; c.shadowColor = col(o); c.shadowBlur = g.last && g.last.e === e ? 10 + 8 * pulse : 6; }
          else if (e === hover && env.myTurn()) { c.strokeStyle = env.hexA(col(env.you), 0.55); c.lineWidth = G.step * 0.08; }
          else { c.strokeStyle = 'rgba(170,185,255,.12)'; c.lineWidth = G.step * 0.05; c.setLineDash([2, G.step * 0.12]); }
          c.beginPath(); c.moveTo(a, b); c.lineTo(cc, d); c.stroke(); c.restore();
        }
        c.fillStyle = '#e8ecff';
        for (let r = 0; r <= N; r++) for (let k = 0; k <= N; k++) { c.beginPath(); c.arc(G.x + k * G.step, G.y + r * G.step, G.step * 0.075, 0, 7); c.fill(); }
      },
      move(x, y, g, B) { hover = nearest(x, y, g, B); },
      down(x, y, g, B) { const e = nearest(x, y, g, B); if (e >= 0) env.act({ t: 'move', e }); },
      thumb(c, now) {
        const s = 22, x0 = 13, y0 = 13, t = Math.floor((now % 3600) / 450);
        const L = [[0, 0, 1, 0, C0], [0, 0, 0, 1, C1], [1, 0, 1, 1, C0], [0, 1, 1, 1, C1], [1, 1, 2, 1, C0], [2, 0, 2, 1, C1], [1, 0, 2, 0, C0]];
        if (t >= 4) { c.fillStyle = env.hexA(C1, 0.3); c.fillRect(x0 + 2, y0 + 2, s - 4, s - 4); }
        L.slice(0, t).forEach(([a, b, cc, d, k]) => { c.strokeStyle = k; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(x0 + a * s, y0 + b * s); c.lineTo(x0 + cc * s, y0 + d * s); c.stroke(); });
        c.fillStyle = '#e8ecff'; for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x0 + k * s, y0 + r * s, 2.5, 0, 7); c.fill(); }
      },
      why: (g, won, opp) => `Kataklar: ${g.score[env.you]} : ${g.score[1 - env.you]}. ` + (g.winner === -1 ? 'Teng!' : won ? "Siz ko'proq katak yopdingiz!" : opp + " ko'proq katak yopdi."),
      stats: (g, you) => [[g.score[you], '{grid} Katak'], [g.lines.filter(v => v === you).length, '{pen} Chiziq'], [null, '{timer} Vaqt']],
    };
  }

  // ---------------- Dengiz jangi ----------------
  {
    const M = window.Battleship, N = M.N;
    let fleet = null, fleetFor = null; // my fleet while placing (re-rolled locally)
    const enemyGeo = (B) => { const s = B.S * 0.62; return { x: B.x0 + (B.S - s) / 2, y: B.y0 + B.S * 0.04, s, cs: s / N }; };
    const mineGeo = (B, big) => { const s = big ? B.S * 0.9 : B.S * 0.3; return { x: B.x0 + (B.S - s) / 2, y: big ? B.y0 + B.S * 0.05 : B.y0 + B.S * 0.69, s, cs: s / N }; };
    const grid = (c, G, title) => {
      c.fillStyle = '#0b1640'; rr(c, G.x, G.y, G.s, G.s, 6); c.fill();
      c.strokeStyle = 'rgba(120,170,255,.18)'; c.lineWidth = 1;
      for (let i = 1; i < N; i++) { c.beginPath(); c.moveTo(G.x + i * G.cs, G.y); c.lineTo(G.x + i * G.cs, G.y + G.s); c.moveTo(G.x, G.y + i * G.cs); c.lineTo(G.x + G.s, G.y + i * G.cs); c.stroke(); }
      if (title) { c.fillStyle = 'rgba(200,215,255,.8)'; c.font = `800 ${Math.max(9, G.cs * 0.45)}px system-ui`; c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillText(title, G.x, G.y - 2); }
    };
    const ship = (c, G, s, color, alpha) => {
      const w = s.dir === 'h' ? s.len : 1, h = s.dir === 'v' ? s.len : 1;
      c.save(); c.globalAlpha = alpha == null ? 1 : alpha; c.fillStyle = env.hexA(color, 0.75); c.strokeStyle = '#e8ecff'; c.lineWidth = 1.5;
      rr(c, G.x + s.c * G.cs + 2, G.y + s.r * G.cs + 2, w * G.cs - 4, h * G.cs - 4, G.cs * 0.3); c.fill(); c.stroke(); c.restore();
    };
    const marks = (c, G, shots, now, lastK) => {
      for (let k = 0; k < N * N; k++) {
        if (!shots[k]) continue;
        const cx = G.x + (k % N + 0.5) * G.cs, cy = G.y + (Math.floor(k / N) + 0.5) * G.cs;
        if (shots[k] === 1) { c.fillStyle = 'rgba(160,190,255,.6)'; c.beginPath(); c.arc(cx, cy, G.cs * 0.12, 0, 7); c.fill(); }
        else { c.save(); c.strokeStyle = '#ff4d5e'; c.shadowColor = '#ff4d5e'; c.shadowBlur = k === lastK ? 14 : 6; c.lineWidth = G.cs * 0.14; c.lineCap = 'round';
          const r = G.cs * 0.28; c.beginPath(); c.moveTo(cx - r, cy - r); c.lineTo(cx + r, cy + r); c.moveTo(cx + r, cy - r); c.lineTo(cx - r, cy + r); c.stroke(); c.restore(); }
      }
    };
    const placing = (g) => g.phase === 'place' && !(g.placed ? g.placed[env.you] : g.ships[env.you]);
    P.dengiz = {
      noReplay: true,
      badge: (g, p) => { const sunk = g.sunk[p].length; return `🚢 ${M.FLEET.length - sunk} <small>/${M.FLEET.length}</small>`; },
      msg: (g) => g.phase === 'place' ? (placing(g) ? "Kemalaringizni joylang va \"Tayyor\"ni bosing" : 'Raqib kemalarini joylamoqda...')
        : g.turn === env.you ? (g.last && g.last.p === env.you && g.last.res !== 'miss' ? "{check} Tegdi! Yana oting" : "{target} O'q uzing!") : 'Raqib otmoqda...',
      draw(c, g, now, B) {
        if (g.phase === 'place') {
          const G = mineGeo(B, true); grid(c, G, placing(g) ? 'Sizning flotingiz' : 'Joylandi ✓');
          if (fleetFor !== g) { if (!fleet || !placing(g)) fleet = M.randomFleet(); fleetFor = g; }
          const mine = placing(g) ? fleet : (g.ships[env.you] || fleet);
          for (const s of mine || []) ship(c, G, s, col(env.you));
          return;
        }
        const E = enemyGeo(B), Me = mineGeo(B, false), opp = 1 - env.you;
        grid(c, E, 'Raqib maydoni'); grid(c, Me, 'Sizniki');
        // enemy ships stay hidden until sunk (in bot games the app holds the whole fleet)
        (g.ships[opp] || []).forEach((s, i) => s && (g.winner !== null || g.sunk[opp].includes(i)) && ship(c, E, s, '#5c6488', 0.9));
        const lk = g.last && g.last.cap != null ? g.last.cap : g.last ? g.last.r * N + g.last.c : -1;
        marks(c, E, g.shots[env.you], now, g.last && g.last.p === env.you ? lk : -1);
        (g.ships[env.you] || []).forEach(s => s && ship(c, Me, s, col(env.you)));
        marks(c, Me, g.shots[opp], now, g.last && g.last.p === opp ? lk : -1);
        if (env.myTurn()) { c.save(); c.strokeStyle = env.hexA(col(env.you), 0.5 + 0.3 * Math.sin(now / 250)); c.lineWidth = 2; rr(c, E.x - 2, E.y - 2, E.s + 4, E.s + 4, 8); c.stroke(); c.restore(); }
      },
      down(x, y, g, B) {
        if (g.phase !== 'battle') return;
        const E = enemyGeo(B), k = Math.floor((x - E.x) / E.cs), r = Math.floor((y - E.y) / E.cs);
        if (k < 0 || k >= N || r < 0 || r >= N) return;
        if (g.shots[env.you][r * N + k]) return env.flash('Bu katakka otilgan', 800);
        env.act({ t: 'shot', r, c: k });
      },
      ui(g, tray) {
        tray.innerHTML = '';
        if (!placing(g)) return;
        const again = env.button('🔀 Boshqa joylash', () => { fleet = M.randomFleet(); env.haptic('light'); });
        const ok = env.button('✅ Tayyor', () => env.act({ t: 'place', ships: fleet }), 'pri');
        tray.append(again, ok);
      },
      thumb(c, now) {
        const G = { x: 8, y: 8, s: 76, cs: 7.6 };
        c.fillStyle = '#0b1640'; rr(c, 8, 8, 76, 76, 6); c.fill();
        ship(c, G, { r: 2, c: 1, len: 4, dir: 'h' }, C1); ship(c, G, { r: 5, c: 6, len: 3, dir: 'v' }, C1);
        const t = Math.floor((now % 3000) / 500), shots = Array(100).fill(0);
        [[2, 2, 2], [7, 3, 1], [2, 3, 2], [4, 8, 1], [6, 6, 2], [1, 7, 1]].slice(0, t).forEach(([r, k, v]) => { shots[r * 10 + k] = v; });
        marks(c, G, shots, now, -1);
      },
      why: (g, won, opp) => g.reason === 'fleet' ? (won ? "Siz raqib flotini butunlay cho'ktirdingiz!" : opp + " flotingizni cho'ktirdi.") : '',
      stats: (g, you) => [[g.shots[you].filter(v => v).length, "{target} O'q"], [g.shots[you].filter(v => v === 2).length, '{check} Tegdi'], [null, '{timer} Vaqt']],
      placeClock: (g, now) => mmss(M.PLACE_MS - (now - g.phaseStart)),
    };
  }

  // ---------------- Domino ----------------
  {
    const M = window.Domino;
    let pick = null; // a tile that fits both ends: which side?
    const pipsAt = { 0: [], 1: [[0.5, 0.5]], 2: [[0.25, 0.25], [0.75, 0.75]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]], 4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
      5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]], 6: [[0.25, 0.22], [0.75, 0.22], [0.25, 0.5], [0.75, 0.5], [0.25, 0.78], [0.75, 0.78]] };
    // a tile: halves a|b laid out horizontally (or vertically) at x, y with the short side `u`
    function tile(c, x, y, u, a, b, vert, glow, back) {
      const w = vert ? u : u * 2, h = vert ? u * 2 : u;
      c.save();
      if (glow) { c.shadowColor = glow; c.shadowBlur = 12; }
      c.fillStyle = back ? '#26306a' : '#f4f1e8'; rr(c, x, y, w, h, u * 0.18); c.fill();
      c.shadowBlur = 0; c.strokeStyle = back ? '#4b5aa8' : '#9a917a'; c.lineWidth = 1; c.stroke();
      if (!back) {
        c.strokeStyle = '#b8ad92'; c.beginPath();
        if (vert) { c.moveTo(x + u * 0.15, y + u); c.lineTo(x + u * 0.85, y + u); } else { c.moveTo(x + u, y + u * 0.15); c.lineTo(x + u, y + u * 0.85); }
        c.stroke();
        c.fillStyle = '#1b1f33';
        [[a, 0], [b, 1]].forEach(([n, half]) => {
          const ox = vert ? x : x + half * u, oy = vert ? y + half * u : y;
          for (const [px, py] of pipsAt[n]) { c.beginPath(); c.arc(ox + px * u, oy + py * u, u * 0.085, 0, 7); c.fill(); }
        });
      }
      c.restore();
    }
    const handOf = (g) => g.hands[env.you] || [];
    const oppCount = (g) => (g.handCount ? g.handCount[1 - env.you] : g.hands[1 - env.you].length);
    P.domino = {
      noReplay: true,
      badge: (g, p) => `🀫 ${g.handCount ? g.handCount[p] : g.hands[p].length} <small>tosh</small>`,
      msg: (g) => g.turn === env.you && g.winner === null ? (M.canPlay(g, env.you) ? 'Tosh tanlang' : g.bazar.length ? "Mos tosh yo'q — bozordan oling" : "Yurish yo'q — o'tkazing") : null,
      draw(c, g, now, B) {
        // the line of tiles as a snake: left to right, then right to left
        const L = g.line, u = B.S / 17, perRow = 7, rowH = u * 1.6;
        const rows = Math.max(1, Math.ceil(L.length / perRow)), top = B.y0 + B.S * 0.5 - rows * rowH / 2;
        L.forEach((x, i) => {
          const row = Math.floor(i / perRow), k = i % perRow, ltr = row % 2 === 0;
          const pos = ltr ? k : perRow - 1 - k, tx = B.x0 + B.S / 2 - (perRow * u * 2.15) / 2 + pos * u * 2.15, ty = top + row * rowH;
          const a = x.flip ? x.t[1] : x.t[0], b = x.flip ? x.t[0] : x.t[1];
          const isLast = g.last && g.last.t === 'move' && g.last.tile && x.t[0] === g.last.tile[0] && x.t[1] === g.last.tile[1];
          tile(c, tx, ty, u, ltr ? a : b, ltr ? b : a, false, isLast ? col(g.last.p) : null);
        });
        if (!L.length) { c.fillStyle = 'rgba(200,210,255,.6)'; c.font = `700 ${u * 0.7}px system-ui`; c.textAlign = 'center'; c.fillText(g.turn === env.you ? 'Birinchi toshni qo\'ying' : 'Raqib boshlaydi', B.x0 + B.S / 2, B.y0 + B.S / 2); }
        // the opponent's hand (face down) and the bozor
        const n = oppCount(g), su = u * 0.62;
        for (let i = 0; i < n; i++) tile(c, B.x0 + B.S / 2 - n * su * 1.1 / 2 + i * su * 1.1, B.y0 + 4, su, 0, 0, true, null, true);
        c.fillStyle = 'rgba(200,210,255,.75)'; c.font = `700 ${u * 0.55}px system-ui`; c.textAlign = 'left'; c.textBaseline = 'bottom';
        c.fillText(`Bozor: ${g.bazar.length}`, B.x0 + 4, B.y0 + B.S - 2);
        if (g.ends) { c.textAlign = 'right'; c.fillText(`Uchlari: ${g.ends[0]} · ${g.ends[1]}`, B.x0 + B.S - 4, B.y0 + B.S - 2); }
      },
      down() {},
      ui(g, tray) {
        tray.innerHTML = '';
        const my = handOf(g), mine = env.myTurn();
        const wrap = document.createElement('div'); wrap.className = 'dhand';
        my.forEach(t => {
          const can = mine && M.fits(g, t).length > 0;
          const cv = document.createElement('canvas'), d = window.devicePixelRatio || 1, u = 22;
          cv.width = u * d; cv.height = u * 2 * d; cv.style.width = u + 'px'; cv.style.height = u * 2 + 'px';
          const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); tile(x, 0, 0, u, t[0], t[1], true);
          const b = document.createElement('button'); b.className = 'dtile' + (can ? ' can' : '') + (pick && pick[0] === t[0] && pick[1] === t[1] ? ' sel' : '');
          b.appendChild(cv);
          b.onclick = () => {
            if (!env.myTurn()) return env.flash('Hozir sizning navbatingiz emas', 900);
            const sides = M.fits(g, t);
            if (!sides.length) return env.flash('Bu tosh mos kelmaydi', 900);
            if (sides.length === 1 || (g.ends && g.ends[0] === g.ends[1])) { pick = null; return env.act({ t: 'move', a: t[0], b: t[1], side: sides[0] }); }
            pick = t; env.haptic('light'); P.domino.ui(g, tray);
          };
          wrap.appendChild(b);
        });
        tray.appendChild(wrap);
        if (pick && mine) {
          const row = document.createElement('div'); row.className = 'drow';
          row.append(env.button(`◀ Chapga (${g.ends[0]})`, () => { const t = pick; pick = null; env.act({ t: 'move', a: t[0], b: t[1], side: 'L' }); }, 'pri'),
            env.button(`O'ngga (${g.ends[1]}) ▶`, () => { const t = pick; pick = null; env.act({ t: 'move', a: t[0], b: t[1], side: 'R' }); }, 'pri'));
          tray.appendChild(row);
        } else if (mine && !M.canPlay(g, env.you)) {
          tray.appendChild(g.bazar.length ? env.button(`🛒 Bozordan olish (${g.bazar.length})`, () => env.act({ t: 'draw' }), 'pri') : env.button("⏭ O'tkazish", () => env.act({ t: 'pass' }), 'pri'));
        }
      },
      thumb(c, now) {
        const t = Math.floor((now % 3000) / 600), tiles = [[6, 6], [6, 3], [3, 1], [1, 5]];
        tiles.slice(0, Math.max(1, t)).forEach((x, i) => tile(c, 6 + i * 21 - (i > 1 ? 0 : 0), 36, 10, x[0], x[1], false, i === t - 1 ? C1 : null));
        for (let i = 0; i < 4; i++) tile(c, 20 + i * 14, 6, 7, 0, 0, true, null, true);
      },
      why: (g, won, opp) => g.reason === 'empty' ? (won ? 'Siz barcha toshlarni birinchi qo\'ydingiz!' : opp + ' barcha toshlarini birinchi qo\'ydi.')
        : g.reason === 'blocked' ? "Hech kim yura olmadi — qo'lida ochko kamroq bo'lgan yutdi." : '',
      stats: (g, you) => [[g.log.filter((x, i) => x !== '—').length, "{pen} Qo'yildi"], [(g.hands[you] || []).length, '🀫 Qoldi'], [null, '{timer} Vaqt']],
    };
  }

  // ---------------- Nardi ----------------
  {
    const M = window.Nardi;
    let sel = null; // own index of the picked checker
    // board layout: absolute point -> its slot (0..11 bottom row right to left, 12..23 top row left to right),
    // turned for player 1 so that their head is at the bottom right too
    const geo = (B) => { const bar = B.S * 0.06, w = (B.S - bar - B.S * 0.1) / 12; return { bar, w, x: B.x0, y: B.y0 + B.S * 0.08, h: B.S * 0.84, off: B.S * 0.1 }; };
    const slot = (a) => (env.you === 1 ? (a + 12) % 24 : a);
    const pointXY = (a, G) => {
      const s = slot(a), top = s >= 12, k = top ? s - 12 : 11 - s;
      const x = G.x + k * G.w + (k >= 6 ? G.bar : 0) + G.w / 2;
      return { x, top, base: top ? G.y : G.y + G.h };
    };
    const offZone = (G) => ({ x: G.x + 12 * G.w + G.bar + 4, y: G.y, w: G.off - 8, h: G.h });
    P.nardi = {
      noReplay: true,
      badge: (g, p) => `🎲 ${g.off[p]}<small>/15</small>`,
      msg: (g) => g.winner !== null ? null : g.turn === env.you ? (g.dice ? `Zar: ${g.dice[0]}-${g.dice[1]} · ${sel === null ? 'tosh tanlang' : 'qayerga?'}` : '') : (g.passed ? "Raqibda yurish yo'q edi — navbat sizda" : 'Raqib yurmoqda...'),
      draw(c, g, now, B) {
        const G = geo(B), pulse = 0.5 + 0.5 * Math.sin(now / 260);
        c.fillStyle = '#3b2716'; rr(c, G.x, G.y - 6, 12 * G.w + G.bar, G.h + 12, 10); c.fill();
        c.fillStyle = '#2a1a0d'; c.fillRect(G.x + 6 * G.w, G.y - 6, G.bar, G.h + 12);
        const legal = env.myTurn() ? M.legalSteps(g, env.you) : [];
        const targets = sel === null ? [] : legal.filter(m => m.from === sel);
        const fromSet = new Set(legal.map(m => M.abs(env.you, m.from)));
        for (let a = 0; a < 24; a++) {
          const { x, top, base } = pointXY(a, G), h = G.h * 0.42;
          c.fillStyle = (slot(a) % 2) ? '#c9a36b' : '#7a4a22';
          c.beginPath(); c.moveTo(x - G.w * 0.48, base); c.lineTo(x + G.w * 0.48, base); c.lineTo(x, top ? base + h : base - h); c.closePath(); c.fill();
          if (targets.some(m => m.to < 24 && M.abs(env.you, m.to) === a)) {
            c.save(); c.fillStyle = env.hexA(col(env.you), 0.35 + 0.25 * pulse); c.beginPath(); c.arc(x, top ? base + h * 0.85 : base - h * 0.85, G.w * 0.22, 0, 7); c.fill(); c.restore();
          }
          const pt = g.pts[a]; if (!pt.n) continue;
          const r = Math.min(G.w * 0.45, G.h * 0.042), show = Math.min(pt.n, 5);
          for (let i = 0; i < show; i++) {
            const cy = top ? base + r + i * r * 1.9 : base - r - i * r * 1.9;
            const isSel = sel !== null && M.abs(env.you, sel) === a && i === show - 1;
            glowDisc(c, x, cy, r * 0.95, col(pt.p), 1);
            if (isSel) { c.save(); c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.beginPath(); c.arc(x, cy, r, 0, 7); c.stroke(); c.restore(); }
          }
          if (pt.n > 5) { const cy = top ? base + r + 4 * r * 1.9 : base - r - 4 * r * 1.9; c.fillStyle = '#fff'; c.font = `900 ${r}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(pt.n, x, cy); }
          if (fromSet.has(a) && sel === null) { c.save(); c.strokeStyle = env.hexA(col(env.you), 0.5 + 0.4 * pulse); c.lineWidth = 2; const cy = top ? base + r : base - r; c.beginPath(); c.arc(x, cy, r * 1.15, 0, 7); c.stroke(); c.restore(); }
        }
        // borne-off checkers and the bear-off target
        const Z = offZone(G);
        c.fillStyle = 'rgba(255,255,255,.05)'; rr(c, Z.x, Z.y, Z.w, Z.h, 8); c.fill();
        [env.you, 1 - env.you].forEach((p, i) => { c.fillStyle = col(p); c.font = `900 ${Z.w * 0.4}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(g.off[p], Z.x + Z.w / 2, i === 0 ? Z.y + Z.h * 0.8 : Z.y + Z.h * 0.2); });
        if (targets.some(m => m.to === 24)) { c.save(); c.strokeStyle = env.hexA(col(env.you), 0.6 + 0.4 * pulse); c.lineWidth = 3; rr(c, Z.x, Z.y + Z.h / 2, Z.w, Z.h / 2, 8); c.stroke(); c.restore(); }
        // dice
        if (g.dice) {
          const ds = B.S * 0.07, cx = G.x + 3 * G.w, cy = G.y + G.h / 2 - ds / 2;
          g.dice.forEach((d, i) => {
            const used = g.left.filter(v => v === d).length < (g.dice[0] === g.dice[1] ? 4 - i * 2 : 1) && g.turn === g.dice.owner;
            const x = cx + (i ? ds * 1.3 : -ds * 1.3) - ds / 2;
            c.fillStyle = g.left.includes(d) ? '#fff' : 'rgba(255,255,255,.35)'; rr(c, x, cy, ds, ds, ds * 0.2); c.fill();
            c.fillStyle = '#1b1f33';
            const dots = { 1: [[.5, .5]], 2: [[.25, .25], [.75, .75]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.25, .25], [.75, .25], [.25, .75], [.75, .75]], 5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]], 6: [[.25, .22], [.75, .22], [.25, .5], [.75, .5], [.25, .78], [.75, .78]] }[d];
            for (const [px, py] of dots) { c.beginPath(); c.arc(x + px * ds, cy + py * ds, ds * 0.09, 0, 7); c.fill(); }
          });
          c.fillStyle = col(g.turn); c.beginPath(); c.arc(cx, cy + ds * 1.6, 4, 0, 7); c.fill();
        }
      },
      down(x, y, g, B) {
        if (!env.myTurn()) return env.flash('Hozir sizning navbatingiz emas', 900);
        const G = geo(B), legal = M.legalSteps(g, env.you);
        const Z = offZone(G);
        // tapped the bear-off zone
        if (sel !== null && x >= Z.x && x <= Z.x + Z.w) {
          const m = legal.find(q => q.from === sel && q.to === 24);
          if (m) { sel = null; return env.act({ t: 'move', from: m.from, die: m.die }); }
        }
        // which point?
        let best = -1, bd = G.w * 0.6;
        for (let a = 0; a < 24; a++) { const p = pointXY(a, G); const top = y < G.y + G.h / 2; if (p.top !== top) continue; const d = Math.abs(x - p.x); if (d < bd) { bd = d; best = a; } }
        if (best < 0) return;
        const ownIdx = M.rel(env.you, best);
        if (sel !== null) {
          const m = legal.filter(q => q.from === sel && q.to === ownIdx).sort((a, b) => a.die - b.die)[0];
          if (m) { sel = null; return env.act({ t: 'move', from: m.from, die: m.die }); }
        }
        if (legal.some(q => q.from === ownIdx)) { sel = ownIdx; env.haptic('light'); env.flash('Qayerga? Yorug\' nuqtani bosing', 0); return; }
        sel = null;
        if (g.pts[best].p === env.you) env.flash("Bu tosh bilan yurib bo'lmaydi", 900);
      },
      reset() { sel = null; },
      thumb(c, now) {
        c.fillStyle = '#3b2716'; rr(c, 4, 10, 84, 72, 8); c.fill();
        for (let k = 0; k < 6; k++) { const x = 10 + k * 13; c.fillStyle = k % 2 ? '#c9a36b' : '#7a4a22';
          c.beginPath(); c.moveTo(x, 12); c.lineTo(x + 12, 12); c.lineTo(x + 6, 40); c.fill(); c.beginPath(); c.moveTo(x, 80); c.lineTo(x + 12, 80); c.lineTo(x + 6, 52); c.fill(); }
        for (let i = 0; i < 3; i++) glowDisc(c, 16, 74 - i * 9, 4.5, C0);
        for (let i = 0; i < 3; i++) glowDisc(c, 80, 18 + i * 9, 4.5, C1);
        const t = (now % 2000) / 2000, d1 = 1 + Math.floor(t * 6), d2 = 1 + Math.floor((t * 6 * 7) % 6);
        [d1, d2].forEach((d, i) => { c.fillStyle = '#fff'; rr(c, 36 + i * 14, 40, 11, 11, 2); c.fill(); c.fillStyle = '#1b1f33'; c.font = '900 9px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(d, 41.5 + i * 14, 46); });
      },
      why: (g, won, opp) => g.reason === 'off' ? (won ? 'Siz barcha 15 toshni birinchi chiqardingiz!' + (g.mars ? ' Mars! 🔥' : '') : opp + ' barcha toshlarini birinchi chiqardi.' + (g.mars ? ' (Mars)' : '')) : '',
      stats: (g, you) => [[g.hist ? g.hist.length : 0, '{pen} Yurish'], [g.off[you], '🎲 Chiqdi'], [null, '{timer} Vaqt']],
    };
  }
  return P;
};
