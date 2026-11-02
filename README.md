# O'yinlar — Telegram Web App

Ikkita o'yin: **To'siq Jangi** va **X va O**. Ikkalasida ham ochiq/maxfiy xonalar, reytingli o'yin (mos raqib) va
botga qarshi rejim bor. ELO har bir o'yin uchun alohida hisoblanadi.

## X va O

3×3 taxta, birinchi yurgan **X** bo'ladi (qayta o'ynashda navbat almashadi). Uchta belgini qatorga (gorizontal,
vertikal yoki diagonal) birinchi tergan yutadi; taxta to'lsa — **durrang** (ELO'da yarim g'alaba). Har o'yinchiga
1 daqiqa. Bot eng yaxshi yurishni qiladi, lekin ba'zan adashadi. Qoidalar: `public/xo.js`.

## To'siq Jangi

9×9 taxta. Ikki o'yinchi qarama-qarshi tomondan boshlaydi; har navbatda **yo 1 katak yurasiz, yo 2 katakli
to'siq qo'yasiz** (gorizontal yoki vertikal). Kim birinchi raqib tomonidagi chetki qatorga yetsa — g'olib.

- Har o'yinchida 10 ta to'siq va 5 daqiqa vaqt; vaqti tugagan yutqazadi.
- To'siqlar ustma-ust tushmaydi, kesishmaydi va hech kimning yo'lini butunlay yopmaydi.
- Raqib yoningizda tursa, uning ustidan sakraysiz; orqasida to'siq bo'lsa — yon tomonga (diagonal).
- Har bir o'yinchi o'z tomonini pastda ko'radi.
- Yurish: oq ramkali katakni bosing. To'siq: "Gorizontal"/"Vertikal"ni tanlang, chiziqni bosing, tasdiqlash uchun yana bosing.

- 🌐 **Ochiq xona**: "Xonalar" ro'yxatida ko'rinadi, istalgan o'yinchi kodsiz qo'shiladi
- 🔒 **Maxfiy xona**: ro'yxatda 🔒 belgisi bilan ko'rinadi, kirish uchun 5 belgili maxfiy kod so'raladi
  (kod xonaning ro'yxatdagi id'sidan alohida va ro'yxatga hech qachon yuborilmaydi)
- 🤖 **Botga qarshi**: oflayn, server shart emas

Xonalar ro'yxati realtime: server WebSocket orqali (`{t:'lobby'}` obunasi) xona ochilganda, to'lganda,
o'yin boshlanganda yoki yopilganda yangi ro'yxatni darhol yuboradi. Xuddi shu ma'lumot `GET /api/rooms` da ham bor.
Xona egasi raqib kelishidan oldin chiqib ketsa, xona yopiladi.

## Kompyuterda ishga tushirish

```bash
npm install
```

```bash
npm start
```

Brauzerda `http://localhost:3000` ni oching. Onlayn rejimni sinash uchun xonani yarating va
`http://localhost:3000/?room=XONA_KODI` havolasini boshqa oynada oching.

## Telegramga ulash

1. **Serverni internetga chiqaring** (Telegram faqat `https://` havolani qabul qiladi). WebSocket'ni
   qo'llab-quvvatlaydigan istalgan hosting bo'ladi: Render, Railway, Fly.io yoki o'zingizning VPS'ingiz.
   Start buyrug'i: `npm start`; port `PORT` muhit o'zgaruvchisidan olinadi.
   Sinash uchun: `cloudflared tunnel --url http://localhost:3000`.
2. Telegramda **@BotFather** → `/newbot` → bot yarating.
3. @BotFather → `/newapp` → botni tanlang → nom, tavsif, rasm (640×360) → **Web App URL** sifatida
   `https://sizning-domen.com` ni kiriting → qisqa nom bering (masalan `race`).
4. Serverga quyidagi muhit o'zgaruvchilarini bering — taklif havolalari shulardan yasaladi:
   - `BOT_USERNAME` — botingiz nomi, `@` belgisiz (masalan `MyRaceBot`)
   - `APP_NAME` — 3-qadamdagi qisqa nom (masalan `race`)
5. Ixtiyoriy: @BotFather → `/mybots` → Bot Settings → **Menu Button** → shu URL.

O'yin havolasi: `https://t.me/MyRaceBot/race`. "Do'stni taklif qilish" tugmasi
`https://t.me/MyRaceBot/race?startapp=XONA` havolasini yuboradi; do'stingiz uni ochishi bilan
o'sha xonaga qo'shiladi.

## Reyting (ELO)

- ELO **faqat "⭐ Reytingli o'yin"** da beriladi (boshlang'ich 1000, K=32): g'olib ball oladi, yutqazgan ayiriladi.
  Kuchliroq raqibni yutsangiz ko'proq ball olasiz. O'yindan chiqish va vaqt tugashi ham mag'lubiyat.
- **Raqib tanlash (matchmaking):** "Reytingli o'yin" bosilganda o'yinchi navbatga turadi. Server har soniyada ELO'si
  yaqin ikki o'yinchini juftlaydi: qidiruv oralig'i ±50 dan boshlanib, har soniya kutishda 10 ga kengayadi (eng ko'pi ±400).
  Juftlangach 3 soniyalik "Raqib topildi" ekrani, so'ng o'yin. Kim birinchi yurishi tasodifiy.
- Ochiq va maxfiy **xonalardagi o'yinlar ELO bermaydi** (do'stona o'yin), botga qarshi o'yinlar ham (profilda alohida).
- Ma'lumotlar `data/players.json` faylida saqlanadi (`DATA_DIR` bilan joyini o'zgartirish mumkin).
- **Muhim:** serverga `BOT_TOKEN` (BotFather bergan token) ni bering. Shunda server Telegram imzosini (`initData`)
  tekshiradi va faqat haqiqiy Telegram foydalanuvchilari reytingga kiradi — aks holda kimdir boshqa odam nomidan
  ELO yig'ishi mumkin. Token berilmasa (lokal sinov), hamma o'yinlar hisoblanadi.
- API: `GET /api/leaderboard?uid=…`, `GET /api/profile?uid=…`

## Do'stni taklif qilish

"👥 Taklif qilish" (o'yinlar ro'yxati, profil) va "📨 Taklif" (xonada raqib kutilayotganda) tugmalari avval
ilova ichida xabar ko'rinishini ko'rsatadi. "Yuborish" bosilganda server Bot API'ning `savePreparedInlineMessage`
metodi bilan **"▶️ O'ynash" tugmali** chiroyli xabar tayyorlaydi va ilova `Telegram.WebApp.shareMessage` orqali
foydalanuvchiga chat tanlatadi. Buning uchun serverda `BOT_TOKEN`, `BOT_USERNAME` va `APP_NAME` bo'lishi kerak
(Telegram 8.0+). Bo'lmasa — oddiy Telegram "ulashish" oynasi (matn + havola) ochiladi.

## Profil rasmi

Telegram foydalanuvchi rasmini (`photo_url`) faqat ruxsat berilgan hollarda uzatadi. Rasm bo'lsa — profil,
o'yinlar ro'yxati, o'yindagi kartalar va reytingda ko'rinadi; bo'lmasa personaj/ikonka chiqadi. Server faqat
`https://t.me/i/userpic/...` manzillarini qabul qiladi.

## Ikonkalar va moslashuv

- Ikonkalar: [Lucide](https://lucide.dev) (ISC litsenziya). `public/icons.js` — faqat ilovada ishlatiladigan
  ikonkalar (SVG); `ic('trophy')` kabi chaqiriladi. Telegramga yuboriladigan taklif xabarida emoji qoldirilgan.
- Ekranlar: kichik telefon (320px), oddiy telefon, yotiq telefon va kompyuter. Kompyuterda va yotiq ekranda
  taxta chapda, ma'lumot paneli o'ngda; o'yinlar va xonalar ro'yxati keng ekranda 2 ustun.

## Fayllar

- `public/game.js` — o'yin qoidalari (server ham, brauzer ham ishlatadi) va bot
- `public/index.html` — o'yin interfeysi (canvas, Telegram haptik)
- `server.js` — statik fayllar + WebSocket xonalar (`/ws`)

## Eslatma

Server o'yinchini Telegram `initData` imzosini tekshirmasdan, foydalanuvchi ID'si bo'yicha taniydi.
Do'stlar o'rtasidagi o'yin uchun bu yetarli; reyting yoki mukofot qo'shsangiz, `initData`ni bot tokeni
bilan serverda tekshirish kerak bo'ladi.
