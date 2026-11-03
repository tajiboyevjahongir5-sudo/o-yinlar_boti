// Player characters drawn on a canvas. Origin (x, y) is the point between the feet on the ground.
(function () {
  const shade = (hex, amt) => {
    const n = parseInt(hex.slice(1), 16), t = amt < 0 ? 0 : 255, a = Math.abs(amt);
    const ch = (v) => Math.round(v + (t - v) * a);
    return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
  };

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  /*
   * o = {
   *   color, kind: 'human'|'bot', dir: 'down'|'up'|'left'|'right',
   *   walk: phase (radians), moving: 0..1, hop: px above ground, squash: -0.2..0.2,
   *   pose: 'idle'|'win'|'lose', t: ms clock, blink: bool, glow: 0..1, ring: bool, shadow: bool,
   *   skin: null|'ninja'|'ritsar'|'qirol'|'kosmik'  (rewards for To'siq Jangi ELO)
   * }
   */
  function draw(ctx, x, y, S, o) {
    const c = o.color, dark = shade(c, -0.45), light = shade(c, 0.5);
    const dir = o.pose === 'idle' ? o.dir : 'down';
    const side = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    const back = dir === 'up';
    const t = o.t || 0, mv = o.moving || 0;
    const hop = o.hop || 0;
    const breathe = o.pose === 'lose' ? 0 : Math.sin(t / 420) * 0.025 * (1 - mv);
    const sq = (o.squash || 0) - breathe;

    // ground shadow + turn ring
    if (o.shadow !== false) {
      const k = Math.max(0.45, 1 - hop / S);
      ctx.fillStyle = `rgba(0,0,0,${0.38 * k})`;
      ctx.beginPath(); ctx.ellipse(x, y, S * 0.3 * k, S * 0.09 * k, 0, 0, 7); ctx.fill();
    }
    if (o.ring) {
      const p = 0.5 + 0.5 * Math.sin(t / 260);
      ctx.save(); ctx.strokeStyle = c; ctx.globalAlpha = 0.45 + 0.4 * p; ctx.lineWidth = 2;
      ctx.shadowColor = c; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.ellipse(x, y, S * (0.36 + 0.04 * p), S * (0.12 + 0.015 * p), 0, 0, 7); ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(x, y - hop);
    ctx.scale(1 + sq, 1 - sq);

    const legH = S * 0.1, bw = S * 0.58, bh = S * 0.6;
    const bTop = -legH - bh, bx = -bw / 2;

    // feet: alternate lifting while walking; for side view they step forward/back
    const fy = -S * 0.035, fs = Math.sin(o.walk || 0);
    const lift1 = Math.max(0, fs) * S * 0.07 * mv, lift2 = Math.max(0, -fs) * S * 0.07 * mv;
    const slide = side ? fs * S * 0.07 * mv : 0;
    ctx.fillStyle = dark;
    const footX = side ? S * 0.06 : S * 0.13;
    ctx.beginPath(); ctx.ellipse(-footX + slide, fy - lift1, S * 0.095, S * 0.06, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(footX - slide, fy - lift2, S * 0.095, S * 0.06, 0, 0, 7); ctx.fill();

    // arms
    const armY = bTop + bh * 0.55, armL = S * 0.2;
    let swing = Math.sin(o.walk || 0) * 0.7 * mv;
    let aL = 0.35 + swing, aR = -0.35 - swing;               // angles from straight down
    if (o.pose === 'win') { const w = Math.sin(t / 110) * 0.35; aL = 2.6 + w; aR = -2.6 - w; }
    if (o.pose === 'lose') { aL = 0.12; aR = -0.12; }
    const arm = (sx, a) => {
      ctx.save(); ctx.translate(sx, armY); ctx.rotate(a);
      ctx.fillStyle = shade(c, -0.2); rr(ctx, -S * 0.045, 0, S * 0.09, armL, S * 0.045); ctx.fill();
      ctx.restore();
    };
    if (side >= 0) arm(-bw / 2 + S * 0.02, aL);
    if (side <= 0) arm(bw / 2 - S * 0.02, aR);

    const skin = o.kind === 'bot' ? null : o.skin;
    if (skin === 'farishta') { // white feathered wings behind the body
      const flap = Math.sin(t / 220) * 0.15;
      for (const sd of [-1, 1]) {
        ctx.save(); ctx.translate(sd * bw * 0.35, bTop + bh * 0.45); ctx.rotate(sd * (0.35 + flap)); ctx.fillStyle = '#f4f6ff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(sd * S * 0.42, -S * 0.32, sd * S * 0.5, -S * 0.05);
        ctx.quadraticCurveTo(sd * S * 0.36, S * 0.02, sd * S * 0.4, S * 0.1); ctx.quadraticCurveTo(sd * S * 0.2, S * 0.12, 0, S * 0.08); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
    if (skin === 'super') { // golden cape fluttering behind
      const fl = Math.sin(t / 200) * S * 0.05;
      ctx.fillStyle = '#ffb300';
      ctx.beginPath(); ctx.moveTo(bx + bw * 0.15, bTop + bh * 0.28); ctx.lineTo(bx + bw * 0.85, bTop + bh * 0.28);
      ctx.lineTo(bx + bw + S * 0.12 + fl, -legH * 0.3); ctx.lineTo(bx - S * 0.12 - fl, -legH * 0.3); ctx.closePath(); ctx.fill();
    }
    if (skin === 'qirol') { // red cape behind the body
      const fl = Math.sin(t / 260) * S * 0.03;
      ctx.fillStyle = '#c4122f';
      ctx.beginPath(); ctx.moveTo(bx + bw * 0.12, bTop + bh * 0.25); ctx.lineTo(bx + bw * 0.88, bTop + bh * 0.25);
      ctx.lineTo(bx + bw + S * 0.06 + fl, -legH * 0.6); ctx.lineTo(bx - S * 0.06 - fl, -legH * 0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f4f6ff'; ctx.fillRect(bx + bw * 0.1, bTop + bh * 0.22, bw * 0.8, bh * 0.06);
    }

    // body (bean) with neon glow
    ctx.save();
    ctx.shadowColor = c; ctx.shadowBlur = 6 + 12 * (o.glow || 0);
    const g = ctx.createLinearGradient(bx, bTop, bx + bw, bTop + bh);
    g.addColorStop(0, light); g.addColorStop(0.35, c); g.addColorStop(1, dark);
    ctx.fillStyle = g; rr(ctx, bx, bTop, bw, bh, bw * 0.48); ctx.fill();
    ctx.restore();
    if (skin === 'zombi') { // greenish skin with patches and stitches
      ctx.save(); ctx.fillStyle = 'rgba(90,200,90,.5)'; rr(ctx, bx, bTop, bw, bh, bw * 0.48); ctx.fill();
      ctx.fillStyle = 'rgba(40,90,40,.45)'; ctx.beginPath(); ctx.ellipse(bx + bw * 0.72, bTop + bh * 0.7, bw * 0.12, bh * 0.08, 0.4, 0, 7); ctx.fill();
      ctx.strokeStyle = '#2b3a2b'; ctx.lineWidth = Math.max(1, S * 0.015);
      ctx.beginPath(); ctx.moveTo(bx + bw * 0.2, bTop + bh * 0.82); ctx.lineTo(bx + bw * 0.45, bTop + bh * 0.76); ctx.stroke();
      for (let k = 0; k < 4; k++) { const x = bx + bw * (0.24 + k * 0.06), y = bTop + bh * (0.81 - k * 0.012); ctx.beginPath(); ctx.moveTo(x, y - S * 0.02); ctx.lineTo(x, y + S * 0.02); ctx.stroke(); }
      ctx.restore();
    }
    // rim light
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.beginPath(); ctx.ellipse(bx + bw * 0.3, bTop + bh * 0.2, bw * 0.13, bh * 0.08, -0.6, 0, 7); ctx.fill();
    // belly
    if (!back) {
      ctx.fillStyle = 'rgba(255,255,255,.16)';
      ctx.beginPath(); ctx.ellipse(side * bw * 0.12, bTop + bh * 0.72, bw * 0.28, bh * 0.2, 0, 0, 7); ctx.fill();
    }

    // the arm on the far side is hidden behind the body; the near one drawn after for side views
    if (side < 0) arm(bw / 2 - S * 0.05, aR);
    if (side > 0) arm(-bw / 2 + S * 0.05, aL);

    const faceY = bTop + bh * 0.42, fx = side * bw * 0.17;
    if (o.kind === 'bot') {
      // antenna
      ctx.strokeStyle = shade(c, 0.3); ctx.lineWidth = Math.max(1.5, S * 0.03);
      ctx.beginPath(); ctx.moveTo(0, bTop + 1); ctx.lineTo(Math.sin(t / 300) * S * 0.04, bTop - S * 0.13); ctx.stroke();
      ctx.save(); ctx.fillStyle = '#7fe3ff'; ctx.shadowColor = '#7fe3ff'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(Math.sin(t / 300) * S * 0.04, bTop - S * 0.14, S * 0.045, 0, 7); ctx.fill(); ctx.restore();
    }

    if (back) {
      if (o.kind === 'bot') { // back panel with two lights
        ctx.fillStyle = 'rgba(10,16,40,.55)'; rr(ctx, -bw * 0.22, bTop + bh * 0.3, bw * 0.44, bh * 0.3, S * 0.04); ctx.fill();
        ctx.fillStyle = Math.sin(t / 200) > 0 ? '#7fe3ff' : '#ffd166';
        ctx.beginPath(); ctx.arc(-bw * 0.08, bTop + bh * 0.45, S * 0.025, 0, 7); ctx.arc(bw * 0.08, bTop + bh * 0.45, S * 0.025, 0, 7); ctx.fill();
      } else if (!skin || skin === 'ninja') { // headband with knot ribbons fluttering
        ctx.fillStyle = skin === 'ninja' ? '#14141f' : '#f4f6ff'; ctx.fillRect(bx + 1, bTop + bh * 0.2, bw - 2, bh * 0.11);
        if (skin === 'ninja') ctx.fillStyle = '#e0283c';
        const fl = Math.sin(t / 150) * S * 0.03;
        ctx.beginPath(); ctx.moveTo(0, bTop + bh * 0.25); ctx.lineTo(-S * 0.1, bTop + bh * 0.45 + fl); ctx.lineTo(-S * 0.03, bTop + bh * 0.4); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0, bTop + bh * 0.25); ctx.lineTo(S * 0.1, bTop + bh * 0.47 - fl); ctx.lineTo(S * 0.03, bTop + bh * 0.4); ctx.fill();
      }
    } else {
      if (skin === 'ninja') { // black mask across the eyes, red ribbon
        ctx.fillStyle = '#14141f'; rr(ctx, bx + 1, faceY - bh * 0.14, bw - 2, bh * 0.25, bh * 0.08); ctx.fill();
        ctx.fillStyle = '#e0283c'; ctx.fillRect(bx + 1, bTop + bh * 0.13, bw - 2, bh * 0.06);
        const fl = Math.sin(t / 150) * 2, sx = side ? -side : 1;
        ctx.beginPath(); ctx.moveTo(sx * bw * 0.46, bTop + bh * 0.16); ctx.lineTo(sx * bw * 0.78, bTop + bh * 0.3 + fl); ctx.lineTo(sx * bw * 0.5, bTop + bh * 0.24); ctx.fill();
      } else if (o.kind !== 'bot' && !skin) { // headband
        ctx.fillStyle = '#f4f6ff'; ctx.fillRect(bx + 1, bTop + bh * 0.13, bw - 2, bh * 0.1);
        if (side) { ctx.beginPath(); ctx.moveTo(-side * bw * 0.48, bTop + bh * 0.18); ctx.lineTo(-side * bw * 0.72, bTop + bh * 0.3 + Math.sin(t / 150) * 2); ctx.lineTo(-side * bw * 0.5, bTop + bh * 0.28); ctx.fill(); }
      } else { // visor
        ctx.fillStyle = '#0c1430'; rr(ctx, fx - bw * 0.36, faceY - bh * 0.17, bw * 0.72, bh * 0.32, bh * 0.13); ctx.fill();
      }
      if (skin === 'super') { ctx.fillStyle = '#1b1f3a'; rr(ctx, fx - bw * 0.34, faceY - bh * 0.1, bw * 0.68, bh * 0.2, bh * 0.1); ctx.fill(); }
      drawFace(ctx, fx, faceY, S, o, bw, bh);
      if (skin === 'super') { // chest emblem
        ctx.save(); ctx.fillStyle = '#ffb300'; ctx.translate(fx, bTop + bh * 0.78); ctx.beginPath();
        ctx.moveTo(0, -S * 0.07); ctx.lineTo(S * 0.07, 0); ctx.lineTo(0, S * 0.07); ctx.lineTo(-S * 0.07, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#c4122f'; ctx.font = `900 ${S * 0.08}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', 0, S * 0.005); ctx.restore();
      }
      if (skin === 'oshpaz') { ctx.fillStyle = '#2b1d14'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(fx + sd * bw * 0.1, faceY + bh * 0.16, bw * 0.11, bh * 0.035, sd * 0.25, 0, 7); ctx.fill(); } }
      if (skin === 'mushuk') { // whiskers and a pink nose
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = Math.max(1, S * 0.012);
        for (const sd of [-1, 1]) for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(fx + sd * bw * 0.16, faceY + bh * 0.16); ctx.lineTo(fx + sd * bw * 0.48, faceY + bh * (0.13 + k * 0.05)); ctx.stroke(); }
        ctx.fillStyle = '#ff8ab0'; ctx.beginPath(); ctx.moveTo(fx - S * 0.025, faceY + bh * 0.1); ctx.lineTo(fx + S * 0.025, faceY + bh * 0.1); ctx.lineTo(fx, faceY + bh * 0.15); ctx.fill();
      }
      if (skin === 'dj') { // dark sunglasses over the eyes
        ctx.fillStyle = '#0d0f1a'; for (const sd of [-1, 1]) { rr(ctx, fx + sd * bw * 0.17 - bw * 0.15, faceY - bh * 0.08, bw * 0.3, bh * 0.16, bh * 0.05); ctx.fill(); }
        ctx.fillRect(fx - bw * 0.05, faceY - bh * 0.03, bw * 0.1, bh * 0.03);
        ctx.fillStyle = 'rgba(255,255,255,.35)'; for (const sd of [-1, 1]) ctx.fillRect(fx + sd * bw * 0.17 - bw * 0.1, faceY - bh * 0.06, bw * 0.06, bh * 0.03);
      }
      if (skin === 'viking' || skin === 'sehrgar' || skin === 'qorbobo') { // beards
        const col2 = skin === 'viking' ? '#e07a2b' : '#f4f6ff';
        ctx.fillStyle = col2; ctx.beginPath(); ctx.moveTo(fx - bw * 0.34, faceY + bh * 0.12);
        ctx.quadraticCurveTo(fx, faceY + bh * (skin === 'sehrgar' ? 0.75 : 0.55), fx + bw * 0.34, faceY + bh * 0.12);
        ctx.quadraticCurveTo(fx, faceY + bh * 0.3, fx - bw * 0.34, faceY + bh * 0.12); ctx.fill();
        if (skin === 'viking') { ctx.strokeStyle = '#a84f12'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(fx, faceY + bh * 0.25); ctx.lineTo(fx, faceY + bh * 0.45); ctx.stroke(); }
      }
    }

    if (skin === 'kovboy') { // brown hat and a red neck scarf
      ctx.fillStyle = '#7a4a22'; ctx.beginPath(); ctx.ellipse(0, bTop + bh * 0.06, bw * 0.68, bh * 0.08, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#8f5a2b'; rr(ctx, -bw * 0.32, bTop - bh * 0.24, bw * 0.64, bh * 0.32, bw * 0.16); ctx.fill();
      ctx.fillStyle = '#3a2210'; ctx.fillRect(-bw * 0.32, bTop - bh * 0.02, bw * 0.64, bh * 0.06);
      if (!back) { ctx.fillStyle = '#d7263d'; ctx.beginPath(); ctx.moveTo(-bw * 0.3, bTop + bh * 0.66); ctx.lineTo(bw * 0.3, bTop + bh * 0.66); ctx.lineTo(0, bTop + bh * 0.86); ctx.fill(); }
    }
    if (skin === 'oshpaz') { // tall puffy chef's hat
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = 'rgba(0,0,0,.3)';
      for (const [dx, dy, r] of [[-0.22, -0.2, 0.2], [0.22, -0.2, 0.2], [0, -0.32, 0.24]]) { ctx.beginPath(); ctx.arc(bw * dx, bTop + bh * dy, bw * r, 0, 7); ctx.fill(); }
      rr(ctx, -bw * 0.34, bTop - bh * 0.18, bw * 0.68, bh * 0.26, bw * 0.06); ctx.fill();
      ctx.strokeStyle = '#d9dde8'; ctx.lineWidth = 1; ctx.strokeRect(-bw * 0.34, bTop + bh * 0.0, bw * 0.68, bh * 0.08);
    }
    if (skin === 'mushuk') { // ears
      for (const sd of [-1, 1]) {
        ctx.fillStyle = shade(c, -0.15); ctx.beginPath(); ctx.moveTo(sd * bw * 0.1, bTop + bh * 0.06); ctx.lineTo(sd * bw * 0.42, bTop - bh * 0.22); ctx.lineTo(sd * bw * 0.44, bTop + bh * 0.16); ctx.fill();
        ctx.fillStyle = '#ffb3cc'; ctx.beginPath(); ctx.moveTo(sd * bw * 0.2, bTop + bh * 0.06); ctx.lineTo(sd * bw * 0.39, bTop - bh * 0.12); ctx.lineTo(sd * bw * 0.39, bTop + bh * 0.1); ctx.fill();
      }
    }
    if (skin === 'dj') { // headphones
      ctx.strokeStyle = '#1b1f33'; ctx.lineWidth = Math.max(2, S * 0.05);
      ctx.beginPath(); ctx.arc(0, bTop + bh * 0.3, bw * 0.5, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      for (const sd of [-1, 1]) { ctx.fillStyle = '#1b1f33'; rr(ctx, sd * bw * 0.5 - bw * 0.09, bTop + bh * 0.22, bw * 0.18, bh * 0.28, bw * 0.08); ctx.fill();
        ctx.fillStyle = '#ff2d9a'; ctx.beginPath(); ctx.arc(sd * bw * 0.5, bTop + bh * 0.36, bw * 0.045, 0, 7); ctx.fill(); }
    }
    if (skin === 'viking') { // helmet with horns
      for (const sd of [-1, 1]) { ctx.fillStyle = '#f4ecd8'; ctx.beginPath(); ctx.moveTo(sd * bw * 0.36, bTop + bh * 0.12);
        ctx.quadraticCurveTo(sd * bw * 0.7, bTop + bh * 0.05, sd * bw * 0.62, bTop - bh * 0.3); ctx.quadraticCurveTo(sd * bw * 0.52, bTop - bh * 0.02, sd * bw * 0.26, bTop + bh * 0.2); ctx.fill(); }
      const hg = ctx.createLinearGradient(-bw * 0.4, 0, bw * 0.4, 0); hg.addColorStop(0, '#7c859c'); hg.addColorStop(0.5, '#d9dee9'); hg.addColorStop(1, '#6b7489');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.moveTo(bx, bTop + bh * 0.28); ctx.bezierCurveTo(bx, bTop - bh * 0.12, bx + bw, bTop - bh * 0.12, bx + bw, bTop + bh * 0.28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a6a2a'; ctx.fillRect(bx, bTop + bh * 0.22, bw, bh * 0.06);
    }
    if (skin === 'sehrgar') { // tall starry hat with a bent tip
      const bend = Math.sin(t / 400) * S * 0.03;
      ctx.fillStyle = '#3b3fbf'; ctx.beginPath(); ctx.moveTo(-bw * 0.55, bTop + bh * 0.12); ctx.lineTo(bw * 0.55, bTop + bh * 0.12);
      ctx.quadraticCurveTo(bw * 0.15, bTop - bh * 0.3, bw * 0.3 + bend, bTop - bh * 0.62); ctx.quadraticCurveTo(-bw * 0.05, bTop - bh * 0.35, -bw * 0.55, bTop + bh * 0.12); ctx.fill();
      ctx.fillStyle = '#ffd34d'; ctx.font = `900 ${S * 0.09}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('★', -bw * 0.1, bTop - bh * 0.05); ctx.fillText('✦', bw * 0.15, bTop - bh * 0.28);
    }
    if (skin === 'qorbobo') { // santa hat with a flopping pompom
      const fl = Math.sin(t / 300) * S * 0.03;
      ctx.fillStyle = '#d7263d'; ctx.beginPath(); ctx.moveTo(-bw * 0.48, bTop + bh * 0.12); ctx.lineTo(bw * 0.48, bTop + bh * 0.12);
      ctx.quadraticCurveTo(bw * 0.35, bTop - bh * 0.3, bw * 0.62 + fl, bTop - bh * 0.18); ctx.quadraticCurveTo(0, bTop - bh * 0.45, -bw * 0.48, bTop + bh * 0.12); ctx.fill();
      ctx.fillStyle = '#ffffff'; rr(ctx, -bw * 0.52, bTop + bh * 0.04, bw * 1.04, bh * 0.14, bh * 0.07); ctx.fill();
      ctx.beginPath(); ctx.arc(bw * 0.64 + fl, bTop - bh * 0.18, bw * 0.12, 0, 7); ctx.fill();
    }
    if (skin === 'farishta') { // golden halo
      ctx.save(); ctx.strokeStyle = '#ffd34d'; ctx.shadowColor = '#ffd34d'; ctx.shadowBlur = 12; ctx.lineWidth = Math.max(2, S * 0.04);
      ctx.beginPath(); ctx.ellipse(0, bTop - bh * 0.16 + Math.sin(t / 300) * S * 0.015, bw * 0.34, bh * 0.07, 0, 0, 7); ctx.stroke(); ctx.restore();
    }
    if (skin === 'pirat') { // red bandana with a knot and an eye patch
      ctx.fillStyle = '#d7263d';
      ctx.beginPath(); ctx.moveTo(bx - 1, bTop + bh * 0.26);
      ctx.bezierCurveTo(bx, bTop - bh * 0.08, bx + bw, bTop - bh * 0.08, bx + bw + 1, bTop + bh * 0.26); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; for (const [dx, dy] of [[0.3, 0.1], [0.55, 0.05], [0.75, 0.15]]) { ctx.beginPath(); ctx.arc(bx + bw * dx, bTop + bh * dy, S * 0.012, 0, 7); ctx.fill(); }
      const kx = back ? 0 : bw * 0.5 * (side ? -side : 1), fl = Math.sin(t / 160) * S * 0.02;
      ctx.fillStyle = '#d7263d';
      ctx.beginPath(); ctx.moveTo(kx, bTop + bh * 0.2); ctx.lineTo(kx + S * 0.12, bTop + bh * 0.35 + fl); ctx.lineTo(kx + S * 0.05, bTop + bh * 0.4); ctx.fill();
      if (!back && o.pose !== 'win') { // patch over one eye with its string
        const ex = fx + bw * (side ? 0.13 : 0.17) * (side < 0 ? -1 : 1);
        ctx.strokeStyle = '#141a33'; ctx.lineWidth = Math.max(1, S * 0.015);
        ctx.beginPath(); ctx.moveTo(bx + 2, faceY - bh * 0.14); ctx.lineTo(bx + bw - 2, faceY + bh * 0.02); ctx.stroke();
        ctx.fillStyle = '#141a33'; ctx.beginPath(); ctx.ellipse(ex, faceY, S * 0.075, S * 0.07, 0, 0, 7); ctx.fill();
      }
    }
    if (skin === 'ritsar') { // silver helmet with a visor slit and a red plume
      const hg = ctx.createLinearGradient(bx, bTop, bx + bw, bTop);
      hg.addColorStop(0, '#9aa3b8'); hg.addColorStop(0.45, '#f1f4fb'); hg.addColorStop(1, '#7c859c');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.moveTo(bx - S * 0.01, bTop + bh * 0.3);
      ctx.bezierCurveTo(bx - S * 0.01, bTop - bh * 0.12, bx + bw + S * 0.01, bTop - bh * 0.12, bx + bw + S * 0.01, bTop + bh * 0.3);
      ctx.closePath(); ctx.fill();
      if (!back) { ctx.fillStyle = '#1b2140'; ctx.fillRect(bx + bw * 0.18 + fx, bTop + bh * 0.18, bw * 0.64, bh * 0.05); }
      ctx.fillStyle = '#e0283c';
      const pw = Math.sin(t / 240) * S * 0.02;
      ctx.beginPath(); ctx.moveTo(-S * 0.02, bTop - bh * 0.03); ctx.quadraticCurveTo(S * 0.02 + pw, bTop - S * 0.24, S * 0.14 + pw, bTop - S * 0.2);
      ctx.quadraticCurveTo(S * 0.06, bTop - S * 0.08, S * 0.04, bTop - bh * 0.02); ctx.closePath(); ctx.fill();
    }
    if (skin === 'kosmik') { // glass bubble helmet and orbiting stars
      ctx.save();
      ctx.strokeStyle = 'rgba(190,235,255,.85)'; ctx.lineWidth = Math.max(1.5, S * 0.025);
      ctx.fillStyle = 'rgba(150,220,255,.13)';
      ctx.beginPath(); ctx.ellipse(0, bTop + bh * 0.36, bw * 0.62, bh * 0.5, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.beginPath(); ctx.ellipse(-bw * 0.3, bTop + bh * 0.08, bw * 0.08, bh * 0.05, -0.7, 0, 7); ctx.fill();
      for (let k = 0; k < 3; k++) {
        const a = t / 700 + k * 2.1, sx2 = Math.cos(a) * bw * 0.8, sy2 = bTop + bh * 0.4 + Math.sin(a) * bh * 0.25;
        ctx.fillStyle = ['#ffd34d', '#9cf', '#f9f'][k]; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(sx2, sy2, S * 0.025, 0, 7); ctx.fill();
      }
      ctx.restore();
    }

    // crown for the winner (and always for the king skin)
    if (o.pose === 'win' || skin === 'qirol') {
      ctx.save(); ctx.translate(0, bTop - S * (o.kind === 'bot' ? 0.18 : 0.02)); ctx.rotate(Math.sin(t / 200) * 0.08);
      ctx.fillStyle = '#ffc531'; ctx.shadowColor = '#ffc531'; ctx.shadowBlur = 10;
      const cw = S * 0.34, ch = S * 0.17;
      ctx.beginPath(); ctx.moveTo(-cw / 2, 0); ctx.lineTo(-cw / 2, -ch); ctx.lineTo(-cw / 4, -ch * 0.45); ctx.lineTo(0, -ch * 1.15);
      ctx.lineTo(cw / 4, -ch * 0.45); ctx.lineTo(cw / 2, -ch); ctx.lineTo(cw / 2, 0); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#ff2d46'; ctx.beginPath(); ctx.arc(0, -ch * 0.35, S * 0.025, 0, 7); ctx.fill();
      ctx.restore();
    }
    // sweat drop for the loser
    if (o.pose === 'lose') {
      const d = (t / 900) % 1;
      ctx.fillStyle = `rgba(140,200,255,${1 - d})`;
      const sx = bw * 0.42, sy = bTop + bh * 0.2 + d * S * 0.15;
      ctx.beginPath(); ctx.moveTo(sx, sy - S * 0.06); ctx.quadraticCurveTo(sx + S * 0.045, sy, sx, sy + S * 0.02);
      ctx.quadraticCurveTo(sx - S * 0.045, sy, sx, sy - S * 0.06); ctx.fill();
      ctx.fillStyle = 'rgba(40,50,90,.25)'; rr(ctx, bx, bTop, bw, bh, bw * 0.48); ctx.fill(); // greyed out
    }
    ctx.restore();
  }

  function drawFace(ctx, fx, fy, S, o, bw, bh) {
    const bot = o.kind === 'bot', ex = bw * (o.dir === 'left' || o.dir === 'right' ? 0.13 : 0.17);
    const er = S * (bot ? 0.05 : 0.065);
    const eyeCol = bot ? '#7fe3ff' : '#ffffff';
    ctx.lineCap = 'round';
    if (o.pose === 'win') { // happy ^ ^
      ctx.strokeStyle = eyeCol; ctx.lineWidth = Math.max(2, S * 0.035);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(fx + s * ex, fy + er * 0.4, er, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    } else if (o.pose === 'lose') { // droopy eyes
      ctx.strokeStyle = eyeCol; ctx.lineWidth = Math.max(2, S * 0.03);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(fx + s * ex - er, fy - er * 0.2 * s); ctx.lineTo(fx + s * ex + er, fy + er * 0.2 * s); ctx.stroke(); }
    } else if (o.blink) {
      ctx.strokeStyle = eyeCol; ctx.lineWidth = Math.max(2, S * 0.03);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(fx + s * ex - er, fy); ctx.lineTo(fx + s * ex + er, fy); ctx.stroke(); }
    } else {
      const look = o.dir === 'left' ? -1 : o.dir === 'right' ? 1 : 0;
      ctx.save();
      if (bot) { ctx.shadowColor = eyeCol; ctx.shadowBlur = 8; }
      ctx.fillStyle = eyeCol;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(fx + s * ex, fy, er, er * 1.2, 0, 0, 7); ctx.fill(); }
      ctx.restore();
      if (!bot) {
        ctx.fillStyle = '#141a33';
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(fx + s * ex + look * er * 0.45, fy + er * 0.15, er * 0.55, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#fff';
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(fx + s * ex + look * er * 0.45 - er * 0.2, fy - er * 0.15, er * 0.18, 0, 7); ctx.fill(); }
      }
    }
    if (bot) return;
    // cheeks + mouth
    ctx.fillStyle = 'rgba(255,170,190,.45)';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(fx + s * ex * 1.55, fy + er * 1.6, er * 0.6, er * 0.35, 0, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#141a33'; ctx.lineWidth = Math.max(1.5, S * 0.025);
    ctx.beginPath();
    if (o.pose === 'win') { ctx.fillStyle = '#141a33'; ctx.arc(fx, fy + er * 1.3, er * 0.75, 0, Math.PI); ctx.fill(); }
    else if (o.pose === 'lose') { ctx.arc(fx, fy + er * 2.4, er * 0.6, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
    else { ctx.arc(fx, fy + er * 1.1, er * 0.5, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
  }

  window.Hero = { draw };
})();
