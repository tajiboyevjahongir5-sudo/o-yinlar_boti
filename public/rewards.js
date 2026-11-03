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
      { id: 'pirat', name: 'Pirat', price: 600, desc: "Bandana va ko'z bog'ichi" },
    ],
    shaxmat: [
      { id: 'oltin', name: 'Oltin', elo: 1100, desc: 'Oltin donalar' },
      { id: 'neon', name: 'Neon', elo: 1200, desc: 'Yonib turgan konturlar' },
      { id: 'kristall', name: 'Kristall', elo: 1300, desc: 'Muzdek shaffof donalar' },
      { id: 'olov', name: 'Olov', elo: 1500, desc: 'Alangali donalar' },
      { id: 'yogoch', name: "Yog'och", price: 600, desc: "Klassik yog'och donalar" },
      { id: 'qirollik', name: 'Qirollik', stars: 100, desc: 'Marvarid va oltin' },
    ],
    shashka: [
      { id: 'oltin', name: 'Oltin', elo: 1100, desc: 'Oltin tangalar' },
      { id: 'neon', name: 'Neon', elo: 1200, desc: 'Yonib turgan halqalar' },
      { id: 'olov', name: 'Olov', elo: 1300, desc: 'Alangali donalar' },
      { id: 'olmos', name: 'Olmos', elo: 1500, desc: 'Yaltiroq olmos donalar' },
      { id: 'yogoch', name: "Yog'och", price: 500, desc: "Klassik yog'och donalar" },
    ],
    xo: [
      { id: 'oltin', name: 'Oltin', elo: 1100, desc: 'Oltin belgilar' },
      { id: 'kamalak', name: 'Kamalak', elo: 1200, desc: "Kamalak rangli belgilar" },
      { id: 'olov', name: 'Olov', elo: 1300, desc: 'Alangali belgilar' },
      { id: 'kosmik', name: 'Kosmik', elo: 1500, desc: 'Yulduzli belgilar' },
      { id: 'muz', name: 'Muz', price: 400, desc: 'Muzdek belgilar' },
    ],
  };
  const FRAMES = [
    { id: 'bronza', name: 'Bronza', elo: 1100, desc: "Istalgan o'yinda 1100 ELO" },
    { id: 'kumush', name: 'Kumush', elo: 1200, desc: "Istalgan o'yinda 1200 ELO" },
    { id: 'oltin', name: 'Oltin', elo: 1300, desc: "Istalgan o'yinda 1300 ELO" },
    { id: 'olmos', name: 'Olmos', elo: 1500, desc: "Istalgan o'yinda 1500 ELO" },
    { id: 'hafta', name: 'Hafta qiroli', special: 'weekly', desc: "Haftalik reytingda 1-o'rin" },
    { id: 'chempion', name: 'Chempion', special: 'tour', desc: "Turnirda g'alaba" },
    { id: 'neon', name: 'Neon', price: 500, desc: "Rang o'zgartiruvchi neon" },
    { id: 'olovli', name: 'Olovli', price: 800, desc: 'Alangali halqa' },
    { id: 'afsona', name: 'Afsona', stars: 150, desc: 'Aylanuvchi kamalak halqa' },
  ];
  // Telegram Stars packs: coins and VIP
  const STARS_ITEMS = [
    { id: 'coins500', type: 'coins', amount: 500, stars: 25, name: '500 tanga' },
    { id: 'coins1500', type: 'coins', amount: 1500, stars: 65, name: '1500 tanga', tag: '+15%' },
    { id: 'coins4000', type: 'coins', amount: 4000, stars: 150, name: '4000 tanga', tag: '+33%' },
    { id: 'vip30', type: 'vip', days: 30, stars: 120, name: 'VIP · 30 kun' },
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
    { id: 'all4', icon: '🎮', name: "Hamma o'yin", desc: "To'rtala o'yinning har birida kamida bir marta yuting" },
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

  const api = { SKINS, FRAMES, ACHIEVEMENTS, STARS_ITEMS, DAILY, frameUnlocked, skinUnlocked, nextSkin, bestPeak };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.Rewards = api;
})();
