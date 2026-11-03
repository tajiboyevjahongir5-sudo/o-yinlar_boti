// Durak (podkidnoy, 2 players, 36 cards 6..A). 6 cards each; the last card of the deck shows the trump suit.
// The attacker plays a card; the defender covers it with a higher card of the same suit or a trump, or takes
// everything. The attacker may add cards whose rank is already on the table (6 pairs at most, never more than the
// defender can cover). All covered -> "bito": the cards leave, hands refill (attacker first) and the defender attacks.
// When the deck is empty, the first to run out of cards wins; the one left with cards is the durak.
// Cards are strings: rank + suit, e.g. "14h" (A of hearts); suits s c h d. view(g, p) hides the other hand and the deck.
(function () {
  const CLOCK_MS = 5 * 60 * 1000, SUITS = ['s', 'c', 'h', 'd'];
  const rank = (c) => parseInt(c, 10), suit = (c) => c.slice(-1);
  const RN = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  const label = (c) => (RN[rank(c)] || rank(c)) + { s: '♠', c: '♣', h: '♥', d: '♦' }[suit(c)];

  function newGame(starter, minutes) {
    const ms = minutes ? minutes * 60000 : CLOCK_MS, deck = [];
    for (const s of SUITS) for (let r = 6; r <= 14; r++) deck.push(r + s);
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    const hands = [deck.splice(0, 6), deck.splice(0, 6)], trump = deck[0]; // deck[0] is drawn last and lies face up
    // the lowest trump in hand attacks first
    const low = (h) => Math.min(99, ...h.filter(c => suit(c) === suit(trump)).map(rank));
    const att = low(hands[0]) <= low(hands[1]) ? 0 : 1;
    return { kind: 'durak', deck, trump, trumpSuit: suit(trump), hands, table: [], att, turn: att, starter: starter || 0, out: 0,
      bout: 6, winner: null, reason: null, log: [], hist: [], n: 0, last: null, base: ms, clock: [ms, ms], turnStart: null };
  }
  function start(g, now) { if (g.turnStart === null) g.turnStart = now; }
  const beats = (g, a, d) => (suit(d) === suit(a) && rank(d) > rank(a)) || (suit(d) === g.trumpSuit && suit(a) !== g.trumpSuit);
  const uncovered = (g) => g.table.filter(x => !x.d).length;
  const ranksOnTable = (g) => new Set(g.table.flatMap(x => [x.a, x.d]).filter(Boolean).map(rank));
  function canAdd(g, c) {
    if (!g.table.length) return true;
    if (g.table.length >= Math.min(6, g.bout)) return false;
    if (uncovered(g) >= g.hands[1 - g.att].length) return false;
    return ranksOnTable(g).has(rank(c));
  }
  function checkTimeout(g, now) {
    if (g.winner !== null || g.turnStart === null) return false;
    if (g.clock[g.turn] - (now - g.turnStart) > 0) return false;
    g.clock[g.turn] = 0; g.winner = 1 - g.turn; g.reason = 'time';
    return true;
  }
  function resign(g, p) { if (g.winner !== null || g.turnStart === null) return false; g.winner = 1 - p; g.reason = 'resign'; return true; }
  function pass(g, p, now) { g.clock[p] -= now - g.turnStart; g.turnStart = now; }
  function refill(g, first) {
    for (const p of [first, 1 - first]) while (g.hands[p].length < 6 && g.deck.length) g.hands[p].push(g.deck.pop());
  }
  function endCheck(g) {
    if (g.deck.length) return false;
    const e0 = !g.hands[0].length, e1 = !g.hands[1].length;
    if (e0 && e1) { g.winner = -1; g.reason = 'draw'; return true; }
    if (e0 || e1) { g.winner = e0 ? 0 : 1; g.reason = 'cards'; return true; }
    return false;
  }
  function apply(g, p, a, now) {
    if (checkTimeout(g, now)) return 'Vaqt tugadi';
    if (g.winner !== null) return "O'yin tugagan";
    if (g.turnStart === null) return "O'yin hali boshlanmadi";
    if (g.turn !== p) return 'Hozir sizning navbatingiz emas';
    const hand = g.hands[p], def = 1 - g.att;
    if (a.t === 'attack') {
      if (p !== g.att) return 'Siz himoyadasiz';
      const i = hand.indexOf(a.card);
      if (i < 0) return "Bu karta sizda yo'q";
      if (!canAdd(g, a.card)) return g.table.length ? "Faqat stoldagi qiymatdagi karta qo'shiladi" : 'Mumkin emas';
      if (!g.table.length) g.bout = Math.min(6, g.hands[def].length);
      hand.splice(i, 1); g.table.push({ a: a.card, d: null });
      g.log.push(label(a.card)); g.hist.push(a); g.n++; g.last = { p, t: 'attack', card: a.card };
      pass(g, p, now); g.turn = def;
      return null;
    }
    if (a.t === 'defend') {
      if (p !== def) return 'Siz hujumdasiz';
      const i = hand.indexOf(a.card);
      if (i < 0) return "Bu karta sizda yo'q";
      const k = a.i != null ? a.i | 0 : g.table.findIndex(x => !x.d && beats(g, x.a, a.card));
      const slot = g.table[k];
      if (!slot || slot.d) return 'Yopiladigan karta yo\'q';
      if (!beats(g, slot.a, a.card)) return "Bu karta bilan yopib bo'lmaydi";
      hand.splice(i, 1); slot.d = a.card;
      g.log[g.log.length - 1] += '/' + label(a.card); g.hist.push(a); g.n++; g.last = { p, t: 'defend', card: a.card };
      if (!uncovered(g)) {
        // everything is covered: if the attacker can't add anything, the bout ends by itself
        if (endCheck(g)) return null;
        pass(g, p, now); g.turn = g.att;
      }
      return null;
    }
    if (a.t === 'take') {
      if (p !== def || !uncovered(g)) return 'Hozir olib bo\'lmaydi';
      for (const x of g.table) { hand.push(x.a); if (x.d) hand.push(x.d); }
      g.table = []; g.log.push('olaman'); g.hist.push(a); g.n++; g.last = { p, t: 'take', cap: 1 };
      refill(g, g.att);
      if (endCheck(g)) return null;
      pass(g, p, now); g.turn = g.att; // the same attacker goes again
      return null;
    }
    if (a.t === 'bito') {
      if (p !== g.att || !g.table.length || uncovered(g)) return "Hozir \"Bito\" qilib bo'lmaydi";
      g.out += g.table.length * 2; g.table = [];
      g.log.push('bito'); g.hist.push(a); g.n++; g.last = { p, t: 'bito' };
      refill(g, g.att);
      if (endCheck(g)) return null;
      pass(g, p, now); g.att = def; g.turn = def;
      return null;
    }
    return "Noma'lum harakat";
  }
  function view(g, p) {
    const v = Object.assign({}, g);
    v.handCount = [g.hands[0].length, g.hands[1].length];
    v.hands = [0, 1].map(q => (q === p || g.winner !== null ? g.hands[q] : g.hands[q].map(() => null)));
    v.deck = g.deck.map(() => null); v.deckCount = g.deck.length; v.hist = [];
    return v;
  }
  // ---------- bot ----------
  const cost = (g, c) => rank(c) + (suit(c) === g.trumpSuit ? 20 : 0);
  function botAction(g, p, level = 1) {
    const hand = g.hands[p].slice().sort((x, y) => cost(g, x) - cost(g, y));
    if (p === g.att) {
      if (!g.table.length) return { t: 'attack', card: level === 0 && Math.random() < 0.4 ? hand[Math.floor(Math.random() * hand.length)] : hand[0] };
      if (uncovered(g)) return null;
      // add cheap cards only (or anything near the end of the game)
      const add = hand.filter(c => canAdd(g, c) && (suit(c) !== g.trumpSuit || !g.deck.length) && (rank(c) < 11 || !g.deck.length || level === 2));
      if (add.length && Math.random() < (level === 0 ? 0.5 : 0.9)) return { t: 'attack', card: add[0] };
      return { t: 'bito' };
    }
    const k = g.table.findIndex(x => !x.d);
    const ok = hand.filter(c => beats(g, g.table[k].a, c));
    if (!ok.length) return { t: 'take' };
    const c = ok[0];
    // early in the game, don't spend a high trump on a small attack
    if (level > 0 && g.deck.length > 8 && suit(c) === g.trumpSuit && rank(c) >= 12 && rank(g.table[k].a) < 10) return { t: 'take' };
    return { t: 'defend', card: c, i: k };
  }
  const api = { CLOCK_MS, rank, suit, label, beats, canAdd, uncovered, newGame, start, checkTimeout, resign, apply, view, botAction };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else window.Durak = api;
})();
