// Builds hub.html: the general (all games) bot avatar and banner, using Lucide icons (ISC).
// Usage: node build_hub_art.js <lucide-static/icons dir>   then screenshot hub.html?type=avatar|banner
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
const icon = (name) => fs.readFileSync(path.join(dir, name + '.svg'), 'utf8')
  .replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '').replace(/\s*\n\s*/g, '');
const svg = (name, cls) => `<svg class="${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" `
  + `stroke-linecap="round" stroke-linejoin="round">${icon(name)}</svg>`;

// [icon, colour] for the game kinds shown around the controller / in the banner grid
const KINDS = [['dice-5', '#ffc531'], ['puzzle', '#2ee66b'], ['brain', '#c084fc'], ['swords', '#ff2d46'],
  ['trophy', '#ffc531'], ['castle', '#2f7bff']];

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Raqib — o'yinlar markazi</title>
<style>
  * { box-sizing:border-box; margin:0; }
  html, body { background:#060918; overflow:hidden; font-family:"Segoe UI", system-ui, sans-serif; color:#fff; }
  .art { position:relative; overflow:hidden;
    background:radial-gradient(circle at 50% 42%, #1d2c78 0%, #0e1542 45%, #060918 100%); }
  .art::before, .art::after { content:""; position:absolute; height:12px; border-radius:6px; transform:rotate(-40deg); filter:blur(1px); }
  .art::before { width:70%; left:-25%; bottom:12%; background:#ff2d46; box-shadow:0 0 30px #ff2d46; opacity:.5; }
  .art::after { width:70%; right:-28%; top:14%; background:#2f7bff; box-shadow:0 0 30px #2f7bff; opacity:.5; }
  svg { display:block; }

  /* ---------- avatar 640x640 ---------- */
  .avatar { width:640px; height:640px; }
  .ring { position:absolute; inset:52px; border-radius:50%; padding:6px; z-index:1;
    background:conic-gradient(from 200deg, #ff2d46, #ffc531, #2ee66b, #2f7bff, #c084fc, #ff2d46);
    -webkit-mask:radial-gradient(closest-side, transparent calc(100% - 9px), #000 calc(100% - 8px));
    filter:drop-shadow(0 0 18px rgba(255,197,49,.6)); }
  .pad { position:absolute; left:50%; top:50%; width:300px; height:300px; margin:-165px 0 0 -150px; z-index:2;
    color:#eef3ff; filter:drop-shadow(0 0 14px #2f7bff) drop-shadow(0 0 30px rgba(47,123,255,.7)); }
  .pad svg { width:100%; height:100%; stroke-width:1.6; }
  .btn { position:absolute; width:26px; height:26px; border-radius:50%; z-index:3; }
  .orbit { position:absolute; width:92px; height:92px; border-radius:50%; display:grid; place-items:center; z-index:2;
    background:rgba(8,13,40,.9); border:3px solid var(--c); color:var(--c);
    box-shadow:0 0 18px var(--c), inset 0 0 16px color-mix(in srgb, var(--c) 30%, transparent); }
  .orbit svg { width:50px; height:50px; filter:drop-shadow(0 0 6px var(--c)); }
  .spark { position:absolute; color:#fff6d0; filter:drop-shadow(0 0 8px #ffc531); z-index:2; }

  /* ---------- banner 640x360 ---------- */
  .banner { width:640px; height:360px; display:flex; align-items:center; padding:0 30px 0 34px; gap:18px; }
  .left { flex:1; z-index:2; }
  .logo { display:flex; align-items:center; gap:12px; }
  .logo .mini { width:58px; height:58px; color:#eef3ff; filter:drop-shadow(0 0 10px #2f7bff); }
  .logo .mini svg { width:100%; height:100%; }
  h1 { font-size:76px; font-weight:900; letter-spacing:2px; line-height:1; text-shadow:0 0 28px #2f7bff, 0 0 8px #2f7bff; }
  .sub { font-size:23px; font-weight:700; color:#c9d6ff; margin:10px 0 18px; text-shadow:0 0 12px rgba(47,123,255,.6); }
  .chips { display:flex; flex-wrap:wrap; gap:9px; max-width:330px; }
  .chip { display:flex; align-items:center; gap:7px; font-size:15.5px; font-weight:700; padding:7px 13px; border-radius:18px;
    border:2px solid var(--c); background:rgba(8,13,36,.85); box-shadow:0 0 10px var(--c); }
  .chip svg { width:17px; height:17px; color:var(--c); }
  .foot { margin-top:16px; color:#9aa6d6; font-size:16px; font-weight:600; }
  .tiles { display:grid; grid-template-columns:repeat(3, 76px); gap:12px; z-index:2; }
  .tile { width:76px; height:76px; border-radius:18px; display:grid; place-items:center; color:var(--c);
    border:2px solid var(--c); background:linear-gradient(160deg, rgba(255,255,255,.08), rgba(8,13,40,.92));
    box-shadow:0 0 14px var(--c), inset 0 0 14px color-mix(in srgb, var(--c) 25%, transparent); }
  .tile svg { width:40px; height:40px; filter:drop-shadow(0 0 6px var(--c)); }
  .tile.big { grid-column:span 3; width:auto; height:70px; color:#eef3ff; --c:#2f7bff; gap:10px; display:flex; justify-content:center;
    font-weight:800; font-size:17px; }
  .tile.big svg { width:36px; height:36px; }
</style></head>
<body>
<div id="avatar" class="art avatar">
  <div class="ring"></div>
  <div class="pad">${svg('gamepad-2')}</div>
  ${[[86, 88], [462, 88], [44, 300], [504, 300], [104, 470], [444, 470]].map(([l, t], i) =>
    `<div class="orbit" style="left:${l}px;top:${t}px;--c:${KINDS[i][1]}">${svg(KINDS[i][0])}</div>`).join('')}
  <div class="spark" style="left:300px;top:118px;width:40px;height:40px">${svg('sparkles')}</div>
  <div class="spark" style="left:296px;top:480px;width:46px;height:46px">${svg('crown')}</div>
</div>
<div id="banner" class="art banner">
  <div class="left">
    <div class="logo"><div class="mini">${svg('gamepad-2')}</div><h1>RAQIB</h1></div>
    <div class="sub">O'yinlar markazi</div>
    <div class="chips">
      <span class="chip" style="--c:#c084fc">${svg('brain')}Aql o'yinlari</span>
      <span class="chip" style="--c:#ffc531">${svg('trophy')}Reyting · ELO</span>
      <span class="chip" style="--c:#2ee66b">${svg('swords')}Do'stlar bilan</span>
      <span class="chip" style="--c:#ff2d46">${svg('sparkles')}Yangi o'yinlar</span>
    </div>
    <div class="foot">Bir botda — ko'plab o'yinlar</div>
  </div>
  <div class="tiles">
    ${KINDS.map(([n, c]) => `<div class="tile" style="--c:${c}">${svg(n)}</div>`).join('')}
    <div class="tile big">${svg('joystick')}O'ynash</div>
  </div>
</div>
<script>
  // show only the requested piece
  const type = new URLSearchParams(location.search).get('type') || 'avatar';
  document.getElementById(type === 'avatar' ? 'banner' : 'avatar').remove();
</script>
</body></html>`;
fs.writeFileSync(path.join(__dirname, 'hub.html'), html);
console.log('wrote hub.html');
