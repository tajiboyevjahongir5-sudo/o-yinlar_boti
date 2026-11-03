// Shared board effects for every game: sparks, rings, floating text, flying objects and screen shake.
// Effects live in canvas (CSS pixel) coordinates; index.html draws them over the board every frame with FX.draw.
// Every effect may start later (`delay` ms), so a capture can burst when the sliding piece arrives.
(function () {
  const list = [];
  let shakeUntil = 0, shakeAmp = 0, shakeLen = 1;
  const now = () => performance.now();
  // people who asked their phone for less motion get no shaking
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease = {
    out: (t) => 1 - Math.pow(1 - t, 3),
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    back: (t) => { const k = 1.70158; return 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2); },
    bounce: (t) => {
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    },
  };
  const add = (e) => { e.at = now() + (e.delay || 0); list.push(e); if (list.length > 600) list.splice(0, list.length - 600); return e; };
  // a burst of particles; o: { color | colors, n, speed, size, life, grav, spread (radians), dir, shape: 'dot' | 'star' | 'square' | 'drop', delay }
  function spark(x, y, o = {}) {
    const n = o.n || 14, cols = o.colors || [o.color || '#fff'], ps = [];
    for (let i = 0; i < n; i++) {
      const a = (o.dir != null ? o.dir : 0) + (o.spread != null ? (Math.random() - 0.5) * o.spread : Math.random() * Math.PI * 2);
      const v = (o.speed || 160) * (0.35 + Math.random() * 0.75);
      ps.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: (o.size || 3) * (0.6 + Math.random() * 0.8), c: cols[i % cols.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12 });
    }
    return add({ k: 'spark', ps, life: o.life || 650, grav: o.grav != null ? o.grav : 260, shape: o.shape || 'dot', delay: o.delay, glow: o.glow !== false });
  }
  // an expanding ring; o: { color, r0, r1, life, width, delay, fill }
  const ring = (x, y, o = {}) => add({ k: 'ring', x, y, color: o.color || '#fff', r0: o.r0 || 4, r1: o.r1 || 40, life: o.life || 450, w: o.width || 3, delay: o.delay, fill: o.fill });
  // rising text ("+2", "Shoh!", ...); o: { color, size, life, rise, delay }
  const text = (x, y, str, o = {}) => add({ k: 'text', x, y, str: typeof window !== 'undefined' && window.I18N ? window.I18N.tr(str) : str, color: o.color || '#ffd34d', size: o.size || 20, life: o.life || 900, rise: o.rise != null ? o.rise : 34, delay: o.delay });
  // something that flies from a to b; draw(c, x, y, t, e) paints it (t = 0..1 progress, e = eased); o: { life, ease, arc, delay, spin }
  const fly = (ax, ay, bx, by, draw, o = {}) => add({ k: 'fly', ax, ay, bx, by, draw, life: o.life || 380, ease: o.ease || ease.out, arc: o.arc || 0, delay: o.delay, spin: o.spin || 0, hold: o.hold });
  // a soft glow that fades out over a rectangle; o: { color, life, delay, r }
  const flash = (x, y, w, h, o = {}) => add({ k: 'flash', x, y, w, h, color: o.color || '#fff', life: o.life || 380, delay: o.delay, r: o.r || 6 });
  // any custom painter for `life` ms: paint(c, t)
  const custom = (paint, o = {}) => add({ k: 'custom', paint, life: o.life || 500, delay: o.delay });
  function shake(amp = 6, len = 260, delay = 0) {
    if (reduced) return;
    setTimeout(() => { const t = now(); if (t + len > shakeUntil || amp > shakeAmp) { shakeAmp = amp; shakeLen = len; shakeUntil = t + len; } }, delay);
  }
  function offset(t) {
    if (t >= shakeUntil) return [0, 0];
    const k = (shakeUntil - t) / shakeLen, a = shakeAmp * k * k;
    return [Math.sin(t * 0.09) * a, Math.cos(t * 0.11) * a * 0.7];
  }
  const star = (c, r) => { c.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = i * Math.PI / 5 - Math.PI / 2; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); };
  function draw(c, t) {
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i], age = t - e.at;
      if (age < 0) continue;
      const p = age / e.life;
      if (p >= 1 && !(e.k === 'fly' && e.hold && e.hold())) { list.splice(i, 1); continue; }
      const q = Math.min(1, p);
      c.save();
      if (e.k === 'spark') {
        const dt = age / 1000;
        c.globalAlpha = Math.max(0, 1 - q * q);
        for (const s of e.ps) {
          const x = s.x + s.vx * dt, y = s.y + s.vy * dt + 0.5 * e.grav * dt * dt, r = s.s * (1 - q * 0.5);
          c.fillStyle = s.c;
          if (e.glow) { c.shadowColor = s.c; c.shadowBlur = r * 3; }
          if (e.shape === 'star') { c.save(); c.translate(x, y); c.rotate(s.rot + s.vr * dt); star(c, r * 1.6); c.restore(); }
          else if (e.shape === 'square') { c.save(); c.translate(x, y); c.rotate(s.rot + s.vr * dt); c.fillRect(-r, -r * 0.6, r * 2, r * 1.2); c.restore(); }
          else if (e.shape === 'drop') { c.beginPath(); c.ellipse(x, y, r * 0.7, r * 1.2, Math.atan2(s.vy + e.grav * dt, s.vx) + Math.PI / 2, 0, 7); c.fill(); }
          else { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
        }
      } else if (e.k === 'ring') {
        const r = e.r0 + (e.r1 - e.r0) * ease.out(q);
        c.globalAlpha = 1 - q;
        if (e.fill) { c.fillStyle = e.fill; c.beginPath(); c.arc(e.x, e.y, r, 0, 7); c.fill(); }
        c.strokeStyle = e.color; c.lineWidth = e.w * (1 - q * 0.6); c.shadowColor = e.color; c.shadowBlur = 12;
        c.beginPath(); c.arc(e.x, e.y, r, 0, 7); c.stroke();
      } else if (e.k === 'text') {
        const pop = q < 0.18 ? ease.back(q / 0.18) : 1;
        c.globalAlpha = q > 0.65 ? 1 - (q - 0.65) / 0.35 : 1;
        c.translate(e.x, e.y - e.rise * ease.out(q)); c.scale(pop, pop);
        c.font = `900 ${e.size}px system-ui,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = Math.max(3, e.size * 0.18); c.strokeStyle = 'rgba(0,0,0,.55)'; c.strokeText(e.str, 0, 0);
        c.fillStyle = e.color; c.shadowColor = e.color; c.shadowBlur = 10; c.fillText(e.str, 0, 0);
      } else if (e.k === 'fly') {
        const k = e.ease(q), x = e.ax + (e.bx - e.ax) * k, y = e.ay + (e.by - e.ay) * k - Math.sin(Math.PI * q) * e.arc;
        e.draw(c, x, y, q, k, e.spin * (1 - k));
      } else if (e.k === 'flash') {
        c.globalAlpha = (1 - q) * 0.8; c.fillStyle = e.color; c.shadowColor = e.color; c.shadowBlur = 18;
        c.beginPath(); c.roundRect ? c.roundRect(e.x, e.y, e.w, e.h, e.r) : c.rect(e.x, e.y, e.w, e.h); c.fill();
      } else if (e.k === 'custom') e.paint(c, q);
      c.restore();
    }
  }
  const busy = (t = now()) => list.some(e => e.k === 'fly' && t - e.at < e.life);
  const clear = () => { list.length = 0; shakeUntil = 0; };
  // a few ready-made combinations
  const pop = (x, y, color, size = 20) => { ring(x, y, { color, r0: size * 0.3, r1: size * 1.3, life: 380, width: 3 }); spark(x, y, { color, n: 8, speed: size * 5, size: Math.max(1.5, size * 0.09), life: 420, grav: 0 }); };
  const boom = (x, y, size = 24) => {
    ring(x, y, { color: '#ffd34d', r0: size * 0.2, r1: size * 1.8, life: 420, width: 4, fill: 'rgba(255,140,40,.25)' });
    spark(x, y, { colors: ['#ffd34d', '#ff8a1a', '#ff3b2f', '#fff'], n: 26, speed: size * 9, size: Math.max(2, size * 0.12), life: 700, grav: 120 });
    spark(x, y, { colors: ['rgba(90,90,110,.8)', 'rgba(60,60,80,.7)'], n: 8, speed: size * 2, size: size * 0.35, life: 900, grav: -60, glow: false, delay: 60 });
  };
  const api = { ease, spark, ring, text, fly, flash, custom, shake, offset, draw, busy, clear, pop, boom };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.FX = api;
})();
