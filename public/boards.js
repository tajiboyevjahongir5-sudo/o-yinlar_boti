// Drawing and input for the newer games (4 ta qatorga, Nuqtalar, Dengiz jangi, Domino, Nardi, Durak, To'qqiz qumaloq).
// index.html calls Boards(env) once; env gives access to the app state (game, you, act, ...).
// Every plugin: badge(g, p) html for the player card, draw(c, g, now, B) where B = {x0, y0, S} is the board square,
// down(x, y, g) for a tap at board coordinates, thumb(c, now) for a 92x92 preview, msg(g) status line (optional),
// why(g, won, oppName) result text, stats(g, you) -> 3 [value, label] pairs, ui(g, tray) for buttons under the board.
window.Boards = function (env) {
  const C0 = '#ff2d46', C1 = '#2f7bff';
  const col = (p) => env.COLORS[p];
  const T = (t) => (window.I18N ? window.I18N.tr(t) : t); // canvas text in the chosen language
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); };
  // the skin of seat p in this game: its catalog entry (pal = [light, deep], sym, color) or null
  const skinDef = (kind, p) => { const id = env.skinOf ? env.skinOf(p) : null; return id && env.skin ? env.skin(kind, id) : null; };
  const palOf = (kind, p) => { const d = skinDef(kind, p); return d && d.pal ? d.pal : null; };
  // a glossy disc; with a gem palette the owner's colour stays as a ring so both sides are easy to tell apart
  const glowDisc = (c, x, y, r, color, alpha = 1, pal) => {
    c.save(); c.globalAlpha = alpha; c.shadowColor = pal ? pal[0] : color; c.shadowBlur = 12;
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    if (pal) { g.addColorStop(0, env.shade(pal[0], 0.5)); g.addColorStop(0.5, pal[0]); g.addColorStop(1, pal[1]); }
    else { g.addColorStop(0, env.shade(color, 0.45)); g.addColorStop(1, env.shade(color, -0.2)); }
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    if (pal) { c.shadowBlur = 0; c.strokeStyle = color; c.lineWidth = Math.max(2, r * 0.2); c.beginPath(); c.arc(x, y, r - c.lineWidth / 2, 0, 7); c.stroke(); }
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
        c.save(); c.shadowColor = 'rgba(47,123,255,.6)'; c.shadowBlur = 18; c.fillStyle = env.theme().frame; rr(c, x - 4, y - 4, cs * C + 8, h + 8, 14); c.fill(); c.restore();
        if (hover >= 0 && env.myTurn()) { c.fillStyle = env.hexA(col(env.you), 0.16); c.fillRect(x + hover * cs, y, cs, h); }
        for (let r = 0; r < R; r++) for (let k = 0; k < C; k++) {
          const v = g.board[r * C + k], cx = x + (k + 0.5) * cs, cy = y + (r + 0.5) * cs;
          c.fillStyle = '#070b1f'; c.beginPath(); c.arc(cx, cy, cs * 0.38, 0, 7); c.fill();
          if (v === null) continue;
          let yy = cy;
          if (g.last && g.last.r === r && g.last.c === k) { const t = Math.min(1, (now - dropAt) / 320); yy = y + cs * 0.5 + (cy - y - cs * 0.5) * t * t; }
          glowDisc(c, cx, yy, cs * 0.36, col(v), 1, palOf('c4', v));
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
      preview(c, skin) { const d = env.skin('c4', skin); glowDisc(c, 22, 34, 13, C0, 1, d && d.pal); glowDisc(c, 44, 30, 11, C1, 1, d && d.pal); },
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
          const sd = skinDef('dots', o);
          c.fillStyle = sd ? (sd.color === 'rainbow' ? `hsl(${(now / 12 + (r + k) * 40) % 360},90%,65%)` : sd.color) : env.hexA(col(o), 0.9);
          c.font = `900 ${G.step * (sd ? 0.5 : 0.32)}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle';
          if (sd) { c.shadowColor = c.fillStyle; c.shadowBlur = 8; }
          c.fillText(sd ? sd.sym : o === env.you ? '★' : '●', G.x + (k + 0.5) * G.step, G.y + (r + 0.5) * G.step); c.shadowBlur = 0;
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
      preview(c, skin, now) {
        const d = env.skin('dots', skin);
        c.fillStyle = env.hexA(C0, 0.25); c.fillRect(14, 14, 36, 36); c.strokeStyle = C0; c.lineWidth = 3; c.strokeRect(14, 14, 36, 36);
        c.fillStyle = d ? (d.color === 'rainbow' ? `hsl(${(now / 12) % 360},90%,65%)` : d.color) : C0; c.font = '900 26px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(d ? d.sym : '★', 32, 33);
      },
      why: (g, won, opp) => `Kataklar: ${g.score[env.you]} : ${g.score[1 - env.you]}. ` + (g.winner === -1 ? 'Teng!' : won ? "Siz ko'proq katak yopdingiz!" : opp + " ko'proq katak yopdi."),
      stats: (g, you) => [[g.score[you], '{grid} Katak'], [g.lines.filter(v => v === you).length, '{pen} Chiziq'], [null, '{timer} Vaqt']],
    };
  }

  // ---------------- Dengiz jangi ----------------
  {
    const M = window.Battleship, N = M.N;
    let fleet = null; // my fleet while placing (re-rolled / dragged locally)
    const enemyGeo = (B) => { const s = B.S * 0.62; return { x: B.x0 + (B.S - s) / 2, y: B.y0 + B.S * 0.04, s, cs: s / N }; };
    const mineGeo = (B, big) => { const s = big ? B.S * 0.9 : B.S * 0.3; return { x: B.x0 + (B.S - s) / 2, y: big ? B.y0 + B.S * 0.05 : B.y0 + B.S * 0.69, s, cs: s / N }; };
    const grid = (c, G, title) => {
      c.fillStyle = '#0b1640'; rr(c, G.x, G.y, G.s, G.s, 6); c.fill();
      c.strokeStyle = 'rgba(120,170,255,.18)'; c.lineWidth = 1;
      for (let i = 1; i < N; i++) { c.beginPath(); c.moveTo(G.x + i * G.cs, G.y); c.lineTo(G.x + i * G.cs, G.y + G.s); c.moveTo(G.x, G.y + i * G.cs); c.lineTo(G.x + G.s, G.y + i * G.cs); c.stroke(); }
      if (title) { c.fillStyle = 'rgba(200,215,255,.8)'; c.font = `800 ${Math.max(9, G.cs * 0.45)}px system-ui`; c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillText(T(title), G.x, G.y - 2); }
    };
    // a warship drawn along +x in a box len x 1 cells, then turned for vertical ones:
    // pointed bow, grey hull with a stripe in the owner's colour, deck, guns and a bridge that depend on the size
    const ship = (c, G, s, color, alpha, tint) => {
      const L = s.len * G.cs, H = G.cs, x0 = G.x + s.c * G.cs, y0 = G.y + s.r * G.cs;
      c.save(); c.globalAlpha = alpha == null ? 1 : alpha;
      c.translate(x0, y0);
      if (s.dir === 'v') { c.translate(H, 0); c.rotate(Math.PI / 2); }
      const pad = H * 0.12, top = pad, bot = H - pad, mid = H / 2, bow = L - pad * 0.6, stern = pad * 0.8;
      const hullTop = tint ? tint[0] : '#9aa6c2', hullBot = tint ? tint[1] : '#4d5878';
      // hull
      c.shadowColor = color; c.shadowBlur = 10;
      const gr = c.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, hullTop); gr.addColorStop(1, hullBot);
      c.fillStyle = gr;
      c.beginPath(); c.moveTo(stern, top + H * 0.08); c.lineTo(bow - H * 0.45, top); c.quadraticCurveTo(bow, mid, bow - H * 0.45, bot);
      c.lineTo(stern, bot - H * 0.08); c.quadraticCurveTo(stern - pad * 0.6, mid, stern, top + H * 0.08); c.closePath(); c.fill();
      c.shadowBlur = 0; c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.2; c.stroke();
      // owner's stripe and the deck
      c.fillStyle = color; c.fillRect(stern + H * 0.1, mid + H * 0.2, (bow - stern) * 0.7, H * 0.08);
      c.fillStyle = 'rgba(255,255,255,.18)'; rr(c, stern + H * 0.2, top + H * 0.16, bow - stern - H * 0.8, H * 0.36, H * 0.1); c.fill();
      const gun = (gx) => { c.fillStyle = '#2b3350'; c.beginPath(); c.arc(gx, mid - H * 0.03, H * 0.13, 0, 7); c.fill(); c.fillRect(gx, mid - H * 0.06, H * 0.32, H * 0.06); };
      const bridge = (bx, w) => { c.fillStyle = '#d7deef'; rr(c, bx, top + H * 0.18, w, H * 0.42, H * 0.06); c.fill(); c.fillStyle = '#1d2a55';
        for (let k = 0; k < 3; k++) c.fillRect(bx + w * (0.18 + k * 0.26), top + H * 0.26, w * 0.14, H * 0.08); };
      if (s.len === 1) bridge(L * 0.3, L * 0.32);
      else if (s.len === 2) { bridge(L * 0.22, H * 0.55); gun(L * 0.62); }
      else if (s.len === 3) { gun(L * 0.2); bridge(L * 0.38, H * 0.7); gun(L * 0.7); }
      else { gun(L * 0.14); gun(L * 0.3); bridge(L * 0.46, H * 0.8); c.fillStyle = '#3a4466'; c.fillRect(L * 0.62, top + H * 0.12, H * 0.16, H * 0.2); gun(L * 0.78); }
      c.restore();
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
    // placing by hand: drag a ship (snaps to the grid, red when it may not stand there), tap it to turn it
    let drag = null; // { i, dr, dc, r, c, moved, x0, y0 }
    const cellAt = (G, x, y) => ({ r: Math.floor((y - G.y) / G.cs), c: Math.floor((x - G.x) / G.cs) });
    const shipAtCell = (r, c) => fleet.findIndex(s => M.cellsOf(s).includes(r * N + c));
    const fleetWith = (i, patch) => fleet.map((s, k) => (k === i ? Object.assign({}, s, patch) : s));
    P.dengiz = {
      noReplay: true,
      badge: (g, p) => { const sunk = g.sunk[p].length; return `🚢 ${M.FLEET.length - sunk} <small>/${M.FLEET.length}</small>`; },
      msg: (g) => g.phase === 'place' ? (placing(g) ? "Kemani surib joylang, bosib aylantiring" : 'Raqib kemalarini joylamoqda...')
        : g.turn === env.you ? (g.last && g.last.p === env.you && g.last.res !== 'miss' ? "{check} Tegdi! Yana oting" : "{target} O'q uzing!") : 'Raqib otmoqda...',
      draw(c, g, now, B) {
        if (g.phase === 'place') {
          const G = mineGeo(B, true); grid(c, G, placing(g) ? 'Sizning flotingiz' : 'Joylandi ✓');
          if (!fleet) fleet = M.randomFleet(); // a fresh fleet for every game (cleared once the battle starts)
          const mine = placing(g) ? fleet : (g.ships[env.you] || fleet);
          (mine || []).forEach((s, i) => { if (!(drag && drag.moved && drag.i === i)) ship(c, G, s, col(env.you), 1, palOf('dengiz', env.you)); });
          if (drag && drag.moved) { // the dragged ship at its snapped spot
            const s = Object.assign({}, fleet[drag.i], { r: drag.r, c: drag.c }), ok = !M.fleetError(fleetWith(drag.i, { r: drag.r, c: drag.c }));
            const w = s.dir === 'h' ? s.len : 1, h = s.dir === 'v' ? s.len : 1;
            c.save(); c.fillStyle = ok ? 'rgba(46,230,107,.25)' : 'rgba(255,45,70,.3)'; c.fillRect(G.x + s.c * G.cs, G.y + s.r * G.cs, w * G.cs, h * G.cs); c.restore();
            ship(c, G, s, ok ? col(env.you) : '#ff2d46', 0.85, palOf('dengiz', env.you));
          }
          return;
        }
        fleet = null; drag = null;
        const E = enemyGeo(B), Me = mineGeo(B, false), opp = 1 - env.you;
        grid(c, E, 'Raqib maydoni'); grid(c, Me, 'Sizniki');
        // enemy ships stay hidden until sunk (in bot games the app holds the whole fleet)
        (g.ships[opp] || []).forEach((s, i) => s && (g.winner !== null || g.sunk[opp].includes(i)) && ship(c, E, s, '#5c6488', 0.9, palOf('dengiz', opp)));
        const lk = g.last && g.last.cap != null ? g.last.cap : g.last ? g.last.r * N + g.last.c : -1;
        marks(c, E, g.shots[env.you], now, g.last && g.last.p === env.you ? lk : -1);
        (g.ships[env.you] || []).forEach(s => s && ship(c, Me, s, col(env.you), 1, palOf('dengiz', env.you)));
        marks(c, Me, g.shots[opp], now, g.last && g.last.p === opp ? lk : -1);
        if (env.myTurn()) { c.save(); c.strokeStyle = env.hexA(col(env.you), 0.5 + 0.3 * Math.sin(now / 250)); c.lineWidth = 2; rr(c, E.x - 2, E.y - 2, E.s + 4, E.s + 4, 8); c.stroke(); c.restore(); }
      },
      down(x, y, g, B) {
        if (g.phase === 'place') {
          if (!placing(g)) return;
          const G = mineGeo(B, true), { r, c } = cellAt(G, x, y), i = shipAtCell(r, c);
          if (i < 0) return;
          drag = { i, dr: r - fleet[i].r, dc: c - fleet[i].c, r: fleet[i].r, c: fleet[i].c, moved: false, x0: x, y0: y };
          return;
        }
        if (g.phase !== 'battle') return;
        const E = enemyGeo(B), k = Math.floor((x - E.x) / E.cs), r = Math.floor((y - E.y) / E.cs);
        if (k < 0 || k >= N || r < 0 || r >= N) return;
        if (g.shots[env.you][r * N + k]) return env.flash('Bu katakka otilgan', 800);
        env.act({ t: 'shot', r, c: k });
      },
      move(x, y, g, B) {
        if (!drag || g.phase !== 'place') return;
        if (!drag.moved && Math.hypot(x - drag.x0, y - drag.y0) < 6) return;
        drag.moved = true;
        const G = mineGeo(B, true), { r, c } = cellAt(G, x, y), s = fleet[drag.i];
        const maxR = N - (s.dir === 'v' ? s.len : 1), maxC = N - (s.dir === 'h' ? s.len : 1);
        const nr = Math.max(0, Math.min(maxR, r - drag.dr)), nc = Math.max(0, Math.min(maxC, c - drag.dc));
        if (nr !== drag.r || nc !== drag.c) { drag.r = nr; drag.c = nc; env.haptic('light'); }
      },
      up(x, y, g) {
        if (!drag || g.phase !== 'place') { drag = null; return; }
        const d = drag; drag = null;
        if (d.moved) {
          const next = fleetWith(d.i, { r: d.r, c: d.c });
          if (M.fleetError(next)) { env.haptic('warning'); return env.flash("Kemalar bir-biriga tegmasligi kerak", 1200); }
          fleet = next; env.haptic('medium');
          return;
        }
        // a tap turns the ship around its first cell (moved back inside the field when needed)
        const s = fleet[d.i], dir = s.dir === 'h' ? 'v' : 'h';
        const r0 = Math.min(s.r, N - (dir === 'v' ? s.len : 1)), c0 = Math.min(s.c, N - (dir === 'h' ? s.len : 1));
        const next = fleetWith(d.i, { dir, r: r0, c: c0 });
        if (s.len === 1) return;
        if (M.fleetError(next)) { env.haptic('warning'); return env.flash("Bu yerda aylantirib bo'lmaydi", 1000); }
        fleet = next; env.haptic('light');
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
      preview(c, skin) { const d = env.skin('dengiz', skin); ship(c, { x: 4, y: 20, cs: 14 }, { r: 0, c: 0, len: 4, dir: 'h' }, C0, 1, d && d.pal); ship(c, { x: 18, y: 38, cs: 14 }, { r: 0, c: 0, len: 2, dir: 'h' }, C1, 1, d && d.pal); },
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
    function tile(c, x, y, u, a, b, vert, glow, back, pal) {
      const w = vert ? u : u * 2, h = vert ? u * 2 : u;
      c.save();
      if (glow) { c.shadowColor = glow; c.shadowBlur = 12; }
      if (pal && !back) { const gr = c.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, env.shade(pal[0], 0.55)); gr.addColorStop(1, pal[0]); c.fillStyle = gr; }
      else c.fillStyle = back ? '#26306a' : '#f4f1e8';
      rr(c, x, y, w, h, u * 0.18); c.fill();
      c.shadowBlur = 0; c.strokeStyle = back ? '#4b5aa8' : '#9a917a'; c.lineWidth = 1; c.stroke();
      if (!back) {
        c.strokeStyle = '#b8ad92'; c.beginPath();
        if (vert) { c.moveTo(x + u * 0.15, y + u); c.lineTo(x + u * 0.85, y + u); } else { c.moveTo(x + u, y + u * 0.15); c.lineTo(x + u, y + u * 0.85); }
        c.stroke();
        c.fillStyle = pal ? pal[1] : '#1b1f33';
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
          tile(c, tx, ty, u, ltr ? a : b, ltr ? b : a, false, isLast ? col(g.last.p) : null, false, x.p != null ? palOf('domino', x.p) : null);
        });
        if (!L.length) { c.fillStyle = 'rgba(200,210,255,.6)'; c.font = `700 ${u * 0.7}px system-ui`; c.textAlign = 'center'; c.fillText(T(g.turn === env.you ? "Birinchi toshni qo'ying" : 'Raqib boshlaydi'), B.x0 + B.S / 2, B.y0 + B.S / 2); }
        // the opponent's hand (face down) and the bozor
        const n = oppCount(g), su = u * 0.62;
        for (let i = 0; i < n; i++) tile(c, B.x0 + B.S / 2 - n * su * 1.1 / 2 + i * su * 1.1, B.y0 + 4, su, 0, 0, true, null, true);
        c.fillStyle = 'rgba(200,210,255,.75)'; c.font = `700 ${u * 0.55}px system-ui`; c.textAlign = 'left'; c.textBaseline = 'bottom';
        c.fillText(T(`Bozor: ${g.bazar.length}`), B.x0 + 4, B.y0 + B.S - 2);
        if (g.ends) { c.textAlign = 'right'; c.fillText(T(`Uchlari: ${g.ends[0]} · ${g.ends[1]}`), B.x0 + B.S - 4, B.y0 + B.S - 2); }
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
          const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); tile(x, 0, 0, u, t[0], t[1], true, null, false, palOf('domino', env.you));
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
      preview(c, skin) { const d = env.skin('domino', skin); tile(c, 6, 20, 13, 6, 3, false, null, false, d && d.pal); tile(c, 34, 8, 12, 5, 5, true, null, false, d && d.pal); },
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
            glowDisc(c, x, cy, r * 0.95, col(pt.p), 1, palOf('nardi', pt.p));
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
      preview(c, skin) { const d = env.skin('nardi', skin); for (let i = 0; i < 3; i++) glowDisc(c, 20, 52 - i * 15, 8, C0, 1, d && d.pal); for (let i = 0; i < 2; i++) glowDisc(c, 44, 12 + i * 15, 8, C1, 1, d && d.pal); },
      why: (g, won, opp) => g.reason === 'off' ? (won ? 'Siz barcha 15 toshni birinchi chiqardingiz!' + (g.mars ? ' Mars! 🔥' : '') : opp + ' barcha toshlarini birinchi chiqardi.' + (g.mars ? ' (Mars)' : '')) : '',
      stats: (g, you) => [[g.hist ? g.hist.length : 0, '{pen} Yurish'], [g.off[you], '🎲 Chiqdi'], [null, '{timer} Vaqt']],
    };
  }
  // ---------------- Durak ----------------
  {
    const M = window.Durak;
    let sel = null; // the card picked to cover with, when it can cover more than one
    const SUIT = { s: '♠', c: '♣', h: '♥', d: '♦' }, RED = { h: 1, d: 1 }, RN = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
    // a playing card at x, y (w x h); back = face down; pal = the owner's skin (the back and the face rim)
    function card(c, x, y, w, h, cd, back, pal, glow) {
      c.save();
      if (glow) { c.shadowColor = glow; c.shadowBlur = 14; } else { c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 5; c.shadowOffsetY = 2; }
      if (back || !cd) {
        const gr = c.createLinearGradient(x, y, x + w, y + h);
        gr.addColorStop(0, pal ? pal[0] : '#3d55d8'); gr.addColorStop(1, pal ? pal[1] : '#1a2470');
        c.fillStyle = gr; rr(c, x, y, w, h, w * 0.12); c.fill(); c.shadowBlur = 0; c.shadowOffsetY = 0;
        c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = Math.max(1, w * 0.04); rr(c, x + w * 0.1, y + w * 0.1, w * 0.8, h - w * 0.2, w * 0.08); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.35)'; c.font = `900 ${w * 0.42}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('R', x + w / 2, y + h / 2);
        c.restore(); return;
      }
      const r = M.rank(cd), s = M.suit(cd), ink = RED[s] ? '#d8203a' : '#1b1f33';
      c.fillStyle = '#fbfaf5'; rr(c, x, y, w, h, w * 0.12); c.fill(); c.shadowBlur = 0; c.shadowOffsetY = 0;
      c.strokeStyle = pal ? pal[1] : '#c9c3b0'; c.lineWidth = pal ? Math.max(2, w * 0.07) : 1; rr(c, x, y, w, h, w * 0.12); c.stroke();
      c.fillStyle = ink; c.textAlign = 'left'; c.textBaseline = 'top';
      c.font = `900 ${w * 0.34}px system-ui`; c.fillText(RN[r] || r, x + w * 0.1, y + w * 0.08);
      c.font = `${w * 0.3}px system-ui`; c.fillText(SUIT[s], x + w * 0.1, y + w * 0.44);
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `${w * (r > 10 ? 0.55 : 0.62)}px system-ui`;
      c.fillText(r > 10 ? (RN[r] + SUIT[s]) : SUIT[s], x + w * 0.56, y + h * 0.62);
      c.restore();
    }
    const handOf = (g) => (g.hands[env.you] || []).filter(Boolean);
    const sortHand = (g, h) => h.slice().sort((a, b) => ((M.suit(a) === g.trumpSuit) - (M.suit(b) === g.trumpSuit)) || ('scdh'.indexOf(M.suit(a)) - 'scdh'.indexOf(M.suit(b))) || (M.rank(a) - M.rank(b)));
    const deckN = (g) => (g.deckCount != null ? g.deckCount : g.deck.length);
    const oppN = (g) => (g.handCount ? g.handCount[1 - env.you] : g.hands[1 - env.you].length);
    const slotsFor = (g, cd) => g.table.map((x, i) => (!x.d && M.beats(g, x.a, cd) ? i : -1)).filter(i => i >= 0);
    // where the table pairs go: 3 x 2 in the middle of the board
    const slotXY = (B, i) => { const w = B.S * 0.155, h = w * 1.42; return { x: B.x0 + B.S * 0.34 + (i % 3) * w * 1.32, y: B.y0 + B.S * 0.27 + Math.floor(i / 3) * h * 1.12, w, h }; };
    const canPlay = (g, cd) => {
      if (g.turn !== env.you || g.winner !== null) return false;
      if (env.you === g.att) return !M.uncovered(g) || !g.table.length ? M.canAdd(g, cd) : false;
      return slotsFor(g, cd).length > 0;
    };
    function playCard(g, cd) {
      if (!env.myTurn()) return env.flash('Hozir sizning navbatingiz emas', 900);
      if (env.you === g.att) { sel = null; return env.act({ t: 'attack', card: cd }); }
      const sl = slotsFor(g, cd);
      if (!sl.length) return env.flash("Bu karta bilan yopib bo'lmaydi", 900);
      if (sl.length === 1) { sel = null; return env.act({ t: 'defend', card: cd, i: sl[0] }); }
      sel = cd; env.haptic('light'); env.flash('Qaysi kartani yopasiz? Stoldagisini bosing', 0); P.durak.ui(g, document.getElementById('plugTray'));
    }
    P.durak = {
      noReplay: true,
      badge: (g, p) => `🃏 ${g.handCount ? g.handCount[p] : g.hands[p].length} <small>${p === g.att ? 'hujum' : 'himoya'}</small>`,
      msg: (g) => {
        if (g.winner !== null) return null;
        if (g.turn !== env.you) return env.you === g.att ? 'Raqib yopmoqda...' : 'Raqib yurmoqda...';
        if (env.you === g.att) return !g.table.length ? 'Hujum qiling: karta tashlang' : "Karta qo'shing yoki «Bito» bosing";
        return "Kartani yoping yoki «Olaman» bosing";
      },
      draw(c, g, now, B) {
        const S = B.S, cw = S * 0.13, ch = cw * 1.42;
        // felt
        const fg = c.createRadialGradient(B.x0 + S / 2, B.y0 + S / 2, S * 0.1, B.x0 + S / 2, B.y0 + S / 2, S * 0.75);
        fg.addColorStop(0, '#16704a'); fg.addColorStop(1, '#0a3424'); c.fillStyle = fg; rr(c, B.x0, B.y0, S, S, 16); c.fill();
        c.strokeStyle = 'rgba(255,215,120,.35)'; c.lineWidth = 2; rr(c, B.x0 + 5, B.y0 + 5, S - 10, S - 10, 13); c.stroke();
        // the opponent's hand (backs, or faces at the end)
        const n = oppN(g), opp = g.hands[1 - env.you] || [], step = Math.min(cw * 0.55, (S * 0.8 - cw) / Math.max(1, n - 1));
        const ox = B.x0 + S / 2 - ((n - 1) * step + cw) / 2;
        const open = g.winner !== null; // in bot games the whole state is here: keep the bot's cards face down
        for (let i = 0; i < n; i++) card(c, ox + i * step, B.y0 + S * 0.03, cw, ch, open ? opp[i] : null, !open || !opp[i], palOf('durak', 1 - env.you));
        // deck with the trump under it
        const dn = deckN(g), dx = B.x0 + S * 0.05, dy = B.y0 + S * 0.36;
        if (dn > 0) {
          c.save(); c.translate(dx + cw + ch * 0.12, dy + ch * 0.5); c.rotate(Math.PI / 2); card(c, -cw / 2, -ch / 2, cw, ch, g.trump, false); c.restore();
          if (dn > 1) for (let i = 0; i < Math.min(4, dn - 1); i++) card(c, dx - i * 1.2, dy - i * 1.2, cw, ch, null, true);
          c.fillStyle = '#fff'; c.font = `900 ${cw * 0.36}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(dn, dx + cw / 2, dy + ch + cw * 0.38);
        } else {
          c.fillStyle = 'rgba(255,255,255,.12)'; rr(c, dx, dy, cw, ch, cw * 0.12); c.fill();
          c.fillStyle = RED[g.trumpSuit] ? '#ff5a72' : '#fff'; c.font = `${cw * 0.7}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(SUIT[g.trumpSuit], dx + cw / 2, dy + ch / 2);
        }
        c.fillStyle = 'rgba(255,255,255,.7)'; c.font = `700 ${cw * 0.26}px system-ui`; c.textAlign = 'left'; c.textBaseline = 'bottom';
        c.fillText(T('Kozir') + ' ' + SUIT[g.trumpSuit], B.x0 + S * 0.04, B.y0 + S * 0.34);
        // discarded ("bito") pile
        if (g.out) {
          for (let i = 0; i < Math.min(3, g.out / 4); i++) { c.save(); c.translate(B.x0 + S * 0.86, B.y0 + S * 0.8); c.rotate(-0.3 + i * 0.25); card(c, -cw / 2, -ch / 2, cw * 0.9, ch * 0.9, null, true); c.restore(); }
          c.fillStyle = 'rgba(255,255,255,.7)'; c.font = `700 ${cw * 0.26}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText(T('Bito') + ' ' + g.out, B.x0 + S * 0.86, B.y0 + S * 0.9);
        }
        // the table
        const pulse = 0.5 + 0.5 * Math.sin(now / 240);
        g.table.forEach((x, i) => {
          const P2 = slotXY(B, i), canHit = sel && !x.d && M.beats(g, x.a, sel);
          card(c, P2.x, P2.y, P2.w, P2.h, x.a, false, palOf('durak', g.att), canHit ? env.hexA('#ffd34d', 0.6 + 0.4 * pulse) : null);
          if (x.d) { c.save(); c.translate(P2.x + P2.w * 0.55, P2.y + P2.h * 0.5); c.rotate(0.22); card(c, -P2.w / 2 + P2.w * 0.05, -P2.h / 2 + P2.w * 0.1, P2.w, P2.h, x.d, false, palOf('durak', 1 - g.att)); c.restore(); }
        });
        if (!g.table.length && g.winner === null) {
          c.fillStyle = 'rgba(255,255,255,.45)'; c.font = `700 ${S * 0.04}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(T(g.att === env.you ? 'Siz hujum qilasiz' : 'Raqib hujum qiladi'), B.x0 + S * 0.58, B.y0 + S * 0.47);
        }
        // whose move, at the bottom
        c.fillStyle = col(g.turn); c.font = `800 ${S * 0.035}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'bottom';
        if (g.winner === null) c.fillText(T(g.turn === env.you ? 'Sizning navbatingiz' : 'Raqib navbati'), B.x0 + S / 2, B.y0 + S - 8);
      },
      down(x, y, g, B) {
        if (!sel) return;
        for (let i = 0; i < g.table.length; i++) {
          const P2 = slotXY(B, i);
          if (x >= P2.x && x <= P2.x + P2.w * 1.2 && y >= P2.y && y <= P2.y + P2.h * 1.1 && !g.table[i].d) {
            if (!M.beats(g, g.table[i].a, sel)) return env.flash("Bu karta bilan yopib bo'lmaydi", 900);
            const cd = sel; sel = null; return env.act({ t: 'defend', card: cd, i });
          }
        }
      },
      reset() { sel = null; },
      ui(g, tray) {
        tray.innerHTML = '';
        if (sel && !handOf(g).includes(sel)) sel = null;
        const wrap = document.createElement('div'); wrap.className = 'dhand chand';
        const d = window.devicePixelRatio || 1, w = 40, h = 57, pal = palOf('durak', env.you);
        sortHand(g, handOf(g)).forEach(cd => {
          const cv = document.createElement('canvas'); cv.width = (w + 4) * d; cv.height = (h + 6) * d; cv.style.width = (w + 4) + 'px'; cv.style.height = (h + 6) + 'px';
          const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); card(x, 2, 2, w, h, cd, false, pal);
          const b = document.createElement('button'); b.className = 'dtile ccard' + (canPlay(g, cd) ? ' can' : '') + (sel === cd ? ' sel' : '');
          b.appendChild(cv); b.onclick = () => playCard(g, cd);
          wrap.appendChild(b);
        });
        tray.appendChild(wrap);
        if (g.winner !== null || g.turn !== env.you) return;
        if (env.you !== g.att && M.uncovered(g)) tray.appendChild(env.button('🫴 Olaman', () => { sel = null; env.act({ t: 'take' }); }, 'pri'));
        else if (env.you === g.att && g.table.length && !M.uncovered(g)) tray.appendChild(env.button('✅ Bito', () => env.act({ t: 'bito' }), 'pri'));
      },
      thumb(c, now) {
        const t = Math.floor((now % 3200) / 800);
        c.fillStyle = '#0f5a3a'; rr(c, 4, 4, 84, 84, 12); c.fill();
        card(c, 10, 30, 22, 31, null, true);
        card(c, 40, 22, 24, 34, '9h', false);
        if (t >= 1) { c.save(); c.translate(56, 42); c.rotate(0.25); card(c, -10, -14, 24, 34, t >= 2 ? '13h' : '12h', false); c.restore(); }
        for (let i = 0; i < 4; i++) card(c, 22 + i * 12, 64, 16, 22, null, true, i % 2 ? null : ['#ff7aa8', '#8a1240']);
      },
      preview(c, skin) { const d = env.skin('durak', skin); card(c, 6, 10, 28, 40, null, true, d && d.pal); card(c, 30, 14, 28, 40, '14s', false, d && d.pal); },
      why: (g, won, opp) => g.reason === 'cards' ? (won ? "Kartalaringiz birinchi tugadi — raqib durak qoldi! 🃏" : opp + " kartalaridan birinchi qutuldi — siz durak qoldingiz.")
        : g.reason === 'draw' ? 'Ikkalangiz ham bir vaqtda tugatdingiz — durrang!' : '',
      stats: (g, you) => [[g.log.filter(x => x === 'olaman').length, '🫴 Olindi'], [(g.hands[you] || []).length, '🃏 Qoldi'], [null, '{timer} Vaqt']],
    };
  }

  // ---------------- To'qqiz qumaloq ----------------
  {
    const M = window.Qumaloq;
    let lastN = -1, flashAt = 0;
    // my row at the bottom (left to right = my holes 1..9), the opponent's row on top running right to left,
    // so the stones travel round the board anticlockwise for both players
    const geo = (B) => { const m = B.S * 0.03, w = (B.S - 2 * m) / 9, h = B.S * 0.3; return { m, w, h, x: B.x0 + m, top: B.y0 + B.S * 0.08, bot: B.y0 + B.S * 0.62 }; };
    const holeAt = (G, i) => {
      const mine = M.sideOf(i) === env.you, k = i % 9;
      return mine ? { x: G.x + k * G.w, y: G.bot, k } : { x: G.x + (8 - k) * G.w, y: G.top, k };
    };
    // a cluster of pebbles in a hole, seeded by the index so it stays still
    function pebbles(c, cx, cy, rw, rh, n, pal, seed) {
      const show = Math.min(n, 24), pr = Math.min(rw, rh) * (n > 14 ? 0.16 : 0.2);
      for (let s = 0; s < show; s++) {
        const a = (s * 2.39996) + seed, rad = Math.sqrt((s + 0.5) / show) * 0.78;
        const x = cx + Math.cos(a) * rw * rad, y = cy + Math.sin(a) * rh * rad;
        const gr = c.createRadialGradient(x - pr * 0.4, y - pr * 0.4, pr * 0.1, x, y, pr);
        gr.addColorStop(0, pal ? env.shade(pal[0], 0.4) : '#fff2d6'); gr.addColorStop(1, pal ? pal[1] : '#8c6a3c');
        c.fillStyle = gr; c.beginPath(); c.arc(x, y, pr, 0, 7); c.fill();
      }
    }
    P.qumaloq = {
      noReplay: true,
      badge: (g, p) => `🪨 ${g.store[p]}<small>/81</small>${g.tuz[p] >= 0 ? ' ★' : ''}`,
      draw(c, g, now, B) {
        const G = geo(B), S = B.S;
        if (g.n !== lastN) { lastN = g.n; flashAt = now; }
        const fresh = Math.max(0, 1 - (now - flashAt) / 900);
        // wooden board
        const wg = c.createLinearGradient(B.x0, B.y0, B.x0, B.y0 + S);
        wg.addColorStop(0, '#6b4223'); wg.addColorStop(0.5, '#8a5a30'); wg.addColorStop(1, '#5a361b');
        c.fillStyle = wg; rr(c, B.x0, B.y0 + S * 0.04, S, S * 0.92, 18); c.fill();
        c.strokeStyle = 'rgba(255,220,160,.25)'; c.lineWidth = 2; rr(c, B.x0 + 4, B.y0 + S * 0.04 + 4, S - 8, S * 0.92 - 8, 15); c.stroke();
        // the stores (qozon) in the middle strip
        const my = env.you, op = 1 - my, mid = B.y0 + S * 0.5;
        [[op, B.x0 + S * 0.27], [my, B.x0 + S * 0.73]].forEach(([p, cx]) => {
          c.fillStyle = 'rgba(20,10,4,.55)'; rr(c, cx - S * 0.21, mid - S * 0.055, S * 0.42, S * 0.11, S * 0.05); c.fill();
          c.strokeStyle = col(p); c.lineWidth = 2; c.stroke();
          pebbles(c, cx - S * 0.12, mid, S * 0.07, S * 0.035, Math.min(12, Math.ceil(g.store[p] / 7)), palOf('qumaloq', p), p * 3);
          c.fillStyle = '#fff'; c.font = `900 ${S * 0.05}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(g.store[p], cx + S * 0.08, mid + 1);
          c.fillStyle = col(p); c.font = `800 ${S * 0.028}px system-ui`; c.textBaseline = 'bottom'; c.fillText(T(p === my ? 'Siz' : 'Raqib'), cx, mid - S * 0.06);
        });
        const mine = env.myTurn(), pulse = 0.5 + 0.5 * Math.sin(now / 260);
        for (let i = 0; i < 18; i++) {
          const H = holeAt(G, i), cx = H.x + G.w / 2, cy = H.y + G.h / 2, rw = G.w * 0.42, rh = G.h * 0.44;
          const own = M.sideOf(i) === env.you, n = g.holes[i];
          const tuzOf = g.tuz[0] === i ? 0 : g.tuz[1] === i ? 1 : -1;
          // the hole
          const hg = c.createRadialGradient(cx, cy - rh * 0.3, rw * 0.1, cx, cy, rh * 1.1);
          hg.addColorStop(0, '#2a1608'); hg.addColorStop(1, '#4a2c14');
          c.save(); c.fillStyle = hg; c.beginPath(); c.ellipse(cx, cy, rw, rh, 0, 0, 7); c.fill();
          if (tuzOf >= 0) { c.strokeStyle = col(tuzOf); c.lineWidth = 3; c.shadowColor = col(tuzOf); c.shadowBlur = 10; c.stroke(); }
          else if (own && mine && n > 0) { c.strokeStyle = env.hexA(col(env.you), 0.4 + 0.4 * pulse); c.lineWidth = 2; c.stroke(); }
          if (g.last && g.last.end === i && fresh > 0) { c.strokeStyle = `rgba(255,230,120,${fresh})`; c.lineWidth = 4; c.stroke(); }
          if (g.last && g.last.i === i) { c.strokeStyle = env.hexA(col(g.last.p), 0.7); c.lineWidth = 2; c.setLineDash([4, 4]); c.stroke(); c.setLineDash([]); }
          c.restore();
          if (tuzOf >= 0) { c.fillStyle = col(tuzOf); c.font = `900 ${G.w * 0.5}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('★', cx, cy); }
          else pebbles(c, cx, cy, rw * 0.85, rh * 0.85, n, palOf('qumaloq', M.sideOf(i)), i);
          // the count and the hole number
          c.fillStyle = '#fff'; c.font = `900 ${G.w * 0.32}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle';
          if (tuzOf < 0) { c.save(); c.shadowColor = '#000'; c.shadowBlur = 4; c.fillText(n, cx, own ? H.y + G.h + G.w * 0.22 : H.y - G.w * 0.2); c.restore(); }
          c.fillStyle = 'rgba(255,230,190,.45)'; c.font = `700 ${G.w * 0.2}px system-ui`;
          c.fillText(H.k + 1, cx, own ? H.y - G.w * 0.12 : H.y + G.h + G.w * 0.14);
        }
        if (g.last && g.last.got && fresh > 0) {
          const H = holeAt(G, g.last.end);
          c.fillStyle = `rgba(255,230,120,${fresh})`; c.font = `900 ${G.w * 0.45}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(g.last.tuz ? '★ ' + T('Tuzdik!') : '+' + g.last.got, H.x + G.w / 2, H.y + G.h / 2 - (1 - fresh) * G.w * 0.6);
        }
      },
      down(x, y, g, B) {
        if (!env.myTurn()) return env.flash('Hozir sizning navbatingiz emas', 900);
        const G = geo(B);
        if (y < G.bot - G.w * 0.3 || y > G.bot + G.h + G.w * 0.4) return env.flash("O'z uyalaringizdan birini bosing (pastki qator)", 1100);
        const k = Math.floor((x - G.x) / G.w); if (k < 0 || k > 8) return;
        const i = env.you * 9 + k;
        if (!g.holes[i]) return env.flash("Bu uya bo'sh", 900);
        env.act({ t: 'move', i });
      },
      thumb(c, now) {
        c.fillStyle = '#7a4c27'; rr(c, 4, 14, 84, 64, 12); c.fill();
        const t = Math.floor((now % 2800) / 700);
        for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) {
          const cx = 16 + k * 20, cy = r ? 60 : 32; c.fillStyle = '#2a1608'; c.beginPath(); c.ellipse(cx, cy, 8, 10, 0, 0, 7); c.fill();
          const n = r === 1 && k === 1 ? (t ? 1 : 5) : r === 1 && k > 1 && k - 1 <= t ? 4 : 3;
          pebbles(c, cx, cy, 6, 7, n, null, k + r * 4);
        }
        c.fillStyle = C0; c.font = '900 12px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; if (t === 3) c.fillText('★', 76, 32);
      },
      preview(c, skin) { const d = env.skin('qumaloq', skin); c.fillStyle = '#2a1608'; c.beginPath(); c.ellipse(32, 32, 24, 20, 0, 0, 7); c.fill(); pebbles(c, 32, 32, 18, 15, 9, d && d.pal, 1); },
      why: (g, won, opp) => `Qozon: ${g.store[env.you]} : ${g.store[1 - env.you]}. ` + (g.winner === -1 ? 'Teng — durrang!' : won ? "Siz ko'proq qumaloq yig'dingiz!" : opp + " ko'proq qumaloq yig'di."),
      stats: (g, you) => [[g.store[you], '🪨 Qozon'], [g.tuz[you] >= 0 ? '★' : '—', '⭐ Tuzdik'], [null, '{timer} Vaqt']],
    };
  }
  return P;
};
