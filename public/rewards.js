// Rewards catalog, shared by the server (what is unlocked, what may be equipped) and the client (what to show).
// - skins: per game, unlocked by the player's best (peak) rated ELO in that game;
// - frames: around the avatar; unlocked by the best peak ELO in any game, or by special wins;
// - achievements: badges for things done in online games.
(function () {
  const SKINS = {
    tosiq: [
      { id: 'ninja', name: 'Ninja', elo: 1100, desc: 'Qora niqob va tasma' },
      { id: 'ritsar', name: 'Ritsar', elo: 1200, desc: "Kumush dubulg'a" },
      { id: 'qirol', name: 'Qirol', elo: 1300, desc: 'Oltin toj va plash' },
      { id: 'kosmik', name: 'Kosmik', elo: 1500, desc: 'Skafandr va yulduzlar' },
      { id: 'pirat', name: 'Pirat', price: 1500, desc: "Bandana va ko'z bog'ichi" },
    ],
    shaxmat: [
      { id: 'oltin', name: 'Oltin', elo: 1100, desc: 'Oltin donalar' },
      { id: 'neon', name: 'Neon', elo: 1200, desc: 'Yonib turgan konturlar' },
      { id: 'kristall', name: 'Kristall', elo: 1300, desc: 'Muzdek shaffof donalar' },
      { id: 'olov', name: 'Olov', elo: 1500, desc: 'Alangali donalar' },
      { id: 'yogoch', name: "Yog'och", price: 2000, desc: "Klassik yog'och donalar" },
      { id: 'qirollik', name: 'Qirollik', stars: 300, desc: 'Marvarid va oltin' },
    ],
    shashka: [
      { id: 'oltin', name: 'Oltin', elo: 1100, desc: 'Oltin tangalar' },
      { id: 'neon', name: 'Neon', elo: 1200, desc: 'Yonib turgan halqalar' },
      { id: 'olov', name: 'Olov', elo: 1300, desc: 'Alangali donalar' },
      { id: 'olmos', name: 'Olmos', elo: 1500, desc: 'Yaltiroq olmos donalar' },
      { id: 'yogoch', name: "Yog'och", price: 1500, desc: "Klassik yog'och donalar" },
    ],
    xo: [
      { id: 'oltin', name: 'Oltin', elo: 1100, desc: 'Oltin belgilar' },
      { id: 'kamalak', name: 'Kamalak', elo: 1200, desc: "Kamalak rangli belgilar" },
      { id: 'olov', name: 'Olov', elo: 1300, desc: 'Alangali belgilar' },
      { id: 'kosmik', name: 'Kosmik', elo: 1500, desc: 'Yulduzli belgilar' },
      { id: 'muz', name: 'Muz', price: 1500, desc: 'Muzdek belgilar' },
    ],
    nardi: [], domino: [], c4: [], dengiz: [], dots: [],
  };
  const FRAMES = [
    { id: 'bronza', name: 'Bronza', elo: 1100, desc: "Istalgan o'yinda 1100 ELO" },
    { id: 'kumush', name: 'Kumush', elo: 1200, desc: "Istalgan o'yinda 1200 ELO" },
    { id: 'oltin', name: 'Oltin', elo: 1300, desc: "Istalgan o'yinda 1300 ELO" },
    { id: 'olmos', name: 'Olmos', elo: 1500, desc: "Istalgan o'yinda 1500 ELO" },
    { id: 'hafta', name: 'Hafta qiroli', special: 'weekly', desc: "Haftalik reytingda 1-o'rin" },
    { id: 'chempion', name: 'Chempion', special: 'tour', desc: "Turnirda g'alaba" },
    { id: 'neon', name: 'Neon', price: 2500, desc: "Rang o'zgartiruvchi neon" },
    { id: 'olovli', name: 'Olovli', price: 4000, desc: 'Alangali halqa' },
    { id: 'afsona', name: 'Afsona', stars: 300, desc: 'Aylanuvchi kamalak halqa' },
    { id: 'mavsum', name: 'Mavsum', special: 'season', desc: 'Mavsum 30-darajasi (premium)' },
  ];
  // ---------- shop skins: 10+ per game ----------
  // To'siq Jangi: characters (drawn by hero.js), each one different
  SKINS.tosiq.push(
    { id: 'kovboy', name: 'Kovboy', price: 2000, desc: 'Shlyapa va bo\'yin ro\'mol' },
    { id: 'oshpaz', name: 'Oshpaz', price: 2000, desc: 'Baland oq qalpoq va mo\'ylov' },
    { id: 'mushuk', name: 'Mushuk', price: 2500, desc: 'Quloqlar va mo\'ylovlar' },
    { id: 'dj', name: 'DJ', price: 3000, desc: 'Quloqchin va qora ko\'zoynak' },
    { id: 'viking', name: 'Viking', price: 3500, desc: "Shoxli dubulg'a va soqol" },
    { id: 'sehrgar', name: 'Sehrgar', price: 4000, desc: "Yulduzli qalpoq va oq soqol" },
    { id: 'qorbobo', name: 'Qorbobo', price: 4500, desc: "Qizil qalpoq va momiq soqol" },
    { id: 'zombi', name: 'Zombi', price: 5000, desc: 'Yashil teri va choklar' },
    { id: 'farishta', name: 'Farishta', stars: 200, desc: 'Nur halqa va qanotlar' },
    { id: 'super', name: 'Superqahramon', stars: 350, desc: 'Niqob, plash va belgi' },
  );
  // the other games: ten gem-coloured sets (each game draws them its own way)
  const GEMS = [
    { id: 'zumrad', name: 'Zumrad', pal: ['#7dffb0', '#0f8a4a'], price: 1500 },
    { id: 'yoqut', name: 'Yoqut', pal: ['#ff9aa8', '#a3112a'], price: 1500 },
    { id: 'safir', name: 'Safir', pal: ['#9cc8ff', '#123f9e'], price: 2000 },
    { id: 'ametist', name: 'Ametist', pal: ['#e0b0ff', '#5b1f8f'], price: 2500 },
    { id: 'bronza', name: 'Bronza', pal: ['#ffd0a0', '#8a4a1a'], price: 3000 },
    { id: 'grafit', name: 'Grafit', pal: ['#c8ccd6', '#2a2e38'], price: 3500 },
    { id: 'shokolad', name: 'Shokolad', pal: ['#e0b48a', '#4a2814'], price: 4000 },
    { id: 'flamingo', name: 'Flamingo', pal: ['#ffc0e0', '#d6337a'], price: 5000 },
    { id: 'okean', name: 'Okean', pal: ['#a0fff4', '#0a6f7a'], stars: 150 },
    { id: 'marvarid', name: 'Marvarid', pal: ['#ffffff', '#b8b0dc'], stars: 250 },
  ];
  const WHAT = { shaxmat: 'donalar', shashka: 'donalar', xo: 'belgilar', nardi: 'toshlar', domino: 'toshlar', c4: 'toshlar', dengiz: 'kemalar' };
  for (const k of Object.keys(WHAT)) for (const gm of GEMS) SKINS[k].push(Object.assign({ desc: `${gm.name} ${WHAT[k]}` }, gm));
  // Nuqtalar: the mark drawn in your boxes
  [['yulduz', 'Yulduz', '★', '#ffd34d', 1500], ['yurak', 'Yurak', '♥', '#ff4d6d', 1500], ['olmos', 'Olmos', '♦', '#7fe9ff', 2000], ['quyosh', 'Quyosh', '☀', '#ffb020', 2500],
   ['chaqmoq', 'Chaqmoq', 'ϟ', '#ffe14d', 3000], ['gul', 'Gul', '✿', '#ff8ad8', 3500], ['beda', 'Beda', '☘', '#5cff8a', 4000], ['toj', 'Toj', '♛', '#ffc531', 5000],
   ['langar', 'Langar', '⚓', '#4dc3ff', null, 150], ['kamalak', 'Kamalak', '◆', 'rainbow', null, 250]]
    .forEach(([id, name, sym, color, price, stars]) => SKINS.dots.push({ id, name, sym, color, price: price || undefined, stars: stars || undefined, desc: `Kataklarda ${sym}` }));
  const skinDef = (kind, id) => (SKINS[kind] || []).find(x => x.id === id) || null;

  // Telegram Stars packs: coins and VIP
  const STARS_ITEMS = [
    { id: 'coins500', type: 'coins', amount: 500, stars: 25, name: '500 tanga' },
    { id: 'coins1500', type: 'coins', amount: 1500, stars: 65, name: '1500 tanga', tag: '+15%' },
    { id: 'coins4000', type: 'coins', amount: 4000, stars: 150, name: '4000 tanga', tag: '+33%' },
    { id: 'vip30', type: 'vip', days: 30, stars: 120, name: 'VIP · 30 kun' },
    { id: 'season', type: 'season', stars: 199, name: 'Mavsum · Premium' },
  ];
  // daily bonus by streak day (day 7 and on: the top prize)
  const DAILY = [20, 30, 40, 50, 60, 80, 150];
  const ACHIEVEMENTS = [
    { id: 'first_win', icon: '🎉', name: "Birinchi g'alaba", desc: "Onlayn o'yinda birinchi marta yuting" },
    { id: 'wins10', icon: '🔟', name: "O'nta g'alaba", desc: "Onlayn o'yinlarda 10 marta yuting" },
    { id: 'wins50', icon: '💯', name: "Ellikta g'alaba", desc: "Onlayn o'yinlarda 50 marta yuting" },
    { id: 'streak5', icon: '🔥', name: 'Ketma-ket 5', desc: "Onlayn o'yinlarda 5 marta ketma-ket yuting" },
    { id: 'mate', icon: '♚', name: 'Mot ustasi', desc: "Shaxmatda mot qo'yib yuting" },
    { id: 'damka', icon: '👑', name: 'Damka ustasi', desc: 'Shashkada taxtada damkangiz bilan yuting' },
    { id: 'wall', icon: '🧱', name: 'Devor quruvchi', desc: "To'siq Jangida 10 ta to'siqning hammasini qo'yib yuting" },
    { id: 'xo3', icon: '❌', name: 'Uchtalik', desc: "X va O'da uchta belgini qatorga terib yuting" },
    { id: 'all4', icon: '🎮', name: "Hamma o'yin", desc: "Barcha o'yinlarning har birida kamida bir marta yuting" },
    { id: 'elo1200', icon: '⚡', name: "Kuchli o'yinchi", desc: "Istalgan o'yinda 1200 ELO'ga chiqing" },
    { id: 'elo1500', icon: '🏅', name: 'Usta', desc: "Istalgan o'yinda 1500 ELO'ga chiqing" },
    { id: 'blitz', icon: '⏱️', name: 'Chaqmoq', desc: "1 daqiqalik onlayn o'yinda yuting" },
    { id: 'revansh', icon: '🔁', name: 'Qasos', desc: "Yutqazgan raqibingizni revanshda yuting" },
    { id: 'friend', icon: '🤝', name: "Do'stona", desc: "Birinchi do'stingizni qo'shing" },
    { id: 'watcher', icon: '👀', name: 'Tomoshabin', desc: "Boshqalarning o'yinini tomosha qiling" },
    { id: 'bothard', icon: '🤖', name: 'Bot yengildi', desc: "Botni \"Qiyin\" darajada yuting" },
    { id: 'tour', icon: '🏆', name: 'Turnir g\'olibi', desc: "Turnirda birinchi o'rinni oling" },
    { id: 'weekly', icon: '👑', name: 'Hafta qiroli', desc: "Haftalik reytingda birinchi bo'ling" },
    { id: 'streak7', icon: '📅', name: 'Haftalik seriya', desc: "7 kun ketma-ket kunlik bonusni oling" },
    { id: 'shopper', icon: '🛍', name: 'Xaridor', desc: "Do'kondan birinchi buyumni oling" },
    { id: 'referral', icon: '🎁', name: 'Taklifchi', desc: "Taklif qilgan do'stingiz 5 ta o'yin o'ynasin" },
  ];

  const peakOf = (stats, kind) => (stats && stats[kind] ? stats[kind].peak || 1000 : 1000);
  const bestPeak = (stats) => Math.max(1000, ...Object.keys(stats || {}).map(k => peakOf(stats, k)));
  // p = a player record: { stats, ach }
  const owns = (p, type, kind, id) => !!(p.owned && (type === 'frame' ? (p.owned.frames || []).includes(id) : ((p.owned.skins || {})[kind] || []).includes(id)));
  function frameUnlocked(p, id) {
    const f = FRAMES.find(x => x.id === id);
    if (!f) return false;
    if (f.price || f.stars) return owns(p, 'frame', null, id);
    if (f.special === 'weekly') return !!(p.ach && p.ach.weekly);
    if (f.special === 'tour') return !!(p.ach && p.ach.tour);
    if (f.special === 'season') return owns(p, 'frame', null, id);
    return bestPeak(p.stats) >= f.elo;
  }
  function skinUnlocked(p, kind, id) {
    const s = (SKINS[kind] || []).find(x => x.id === id);
    if (!s) return false;
    if (s.price || s.stars) return owns(p, 'skin', kind, id);
    return peakOf(p.stats, kind) >= s.elo;
  }
  // the next reward for this game: { item, need } or null
  function nextSkin(p, kind) {
    const peak = peakOf(p.stats, kind), s = (SKINS[kind] || []).find(x => x.elo && x.elo > peak);
    return s ? { item: s, need: s.elo - peak } : null;
  }

  const api = { SKINS, FRAMES, ACHIEVEMENTS, STARS_ITEMS, DAILY, skinDef, frameUnlocked, skinUnlocked, nextSkin, bestPeak };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.Rewards = api;
})();
