# O'yinlar — Telegram Web App

To'rtta o'yin: **Shaxmat**, **Shashka**, **To'siq Jangi** va **X va O**. Hammasida ochiq/maxfiy xonalar, reytingli
o'yin (mos raqib) va botga qarshi rejim bor. ELO har bir o'yin uchun alohida hisoblanadi.

## Shaxmat

Klassik shaxmat, to'liq qoidalar bilan: rokirovka, o'tib olish (en passant), piyodani almashtirish (farzin, ruh, fil
yoki ot tanlanadi), shoh, mot va pat. Durrang: pat, 50 yurish qoidasi, holatning 3 marta takrorlanishi, mot qo'yishga
kuch yetmasligi; vaqti tugaganda raqibda faqat shoh qolgan bo'lsa ham durrang. Birinchi yurgan **oq** bilan o'ynaydi
(qayta o'ynashda ranglar almashadi), har o'yinchiga 10 daqiqa. Qora o'ynayotgan o'yinchi taxtani teskari ko'radi.
Yurish: donani bosing va yashil nuqtali katakni bosing (yoki donani surib qo'ying). Bot 3 yurish oldinga hisoblaydi,
ba'zan adashadi. Qoidalar: `public/chess.js` (perft testlari bilan tekshirilgan).

## Shashka

Rus shashkasi (8×8, 12 tadan dona): oddiy dona bir katak oldinga diagonal yuradi, lekin oldinga ham, orqaga ham uradi.
**Urish majburiy**; bir nechta urish bir yurishda davom etadi (har sakrash alohida bosiladi, taxta keyingi urishni
ko'rsatadi). Oxirgi qatorga yetgan dona **damka** bo'ladi (urish o'rtasida ham — keyin damka kabi uradi).
Damka butun diagonal bo'ylab yuradi va uradi; urilgan donalar yurish tugaguncha taxtada turadi va ikki marta
urilmaydi. Raqibda dona qolmasa yoki yurishga joyi bo'lmasa — g'alaba. 15 yurish davomida faqat damkalar yurib,
urish bo'lmasa — durrang. Har o'yinchiga 5 daqiqa. Qoidalar: `public/checkers.js`.

## Mukofotlar: skinlar va ramkalar

Reytingli o'yinlarda **eng yuqori ELO** (peak) ma'lum chegaraga yetganda mukofot ochiladi. ELO keyin tushsa ham
mukofot qoladi. Profil → **Kolleksiya**da bosib kiyiladi; raqiblar ham ko'radi (server tekshiradi).

| ELO | To'siq Jangi (personaj) | Shaxmat (donalar) | Shashka (donalar) | X va O (belgilar) | Ramka (istalgan o'yin) |
|---|---|---|---|---|---|
| 1100 | Ninja | Oltin | Oltin | Oltin | Bronza |
| 1200 | Ritsar | Neon | Neon | Kamalak | Kumush |
| 1300 | Qirol | Kristall | Olov | Olov | Oltin |
| 1500 | Kosmik | Olov | Olmos | Kosmik | Olmos |

Maxsus ramkalar: **Hafta qiroli** (haftalik reytingda 1-o'rin) va **Chempion** (turnir g'olibi).
Katalog: `public/rewards.js` (server ham, ilova ham ishlatadi).

## Yutuqlar

18 ta nishon: birinchi g'alaba, 10/50 g'alaba, 5 ta ketma-ket, mot, damka, 10 ta to'siq bilan yutish, uchtalik,
hamma o'yinda yutish, 1200/1500 ELO, 1 daqiqalik o'yinda yutish, revanshda qasos, birinchi do'st, tomosha,
"Qiyin" botni yutish, turnir g'olibi, hafta qiroli. Onlayn o'yinlar (xona, reytingli, turnir) hisoblanadi, ikkala
o'yinchi tasdiqlangan (Telegram) bo'lishi kerak. Yangi yutuq ilovada darhol ko'rsatiladi.

## Haftalik reyting

Reyting → **Shu hafta**: shu haftada reytingli o'yinlarda yig'ilgan ELO (+/-) bo'yicha. Hafta dushanba 00:00
(Toshkent vaqti) da yangilanadi; har bir o'yinning haftalik g'olibi 👑 "Hafta qiroli" nishoni va ramkasini oladi.
Ma'lumot: `data/meta.json`.

## Do'stlar, chaqiruv va tomosha

- **Do'st qo'shish** (Do'stlar → "Do'st qo'shish"): ism bo'yicha qidirib, natija oynasidan yoki Reyting ro'yxatidan.
  Bu **so'rov** bo'lib boradi: u odamga ilovada va bot orqali xabar keladi, Do'stlar bo'limida (menyuda qizil son)
  "Qabul" bossa ikkalangiz do'st bo'lasiz. Ikkalangiz bir-biringizga so'rov yuborsangiz, darhol do'st bo'lasiz.
- **Do'stlik havolasi**: tugmali xabar; havolani ochgan odam bilan darhol do'st bo'lasiz (havolani o'zingiz yuborgansiz).
- Do'stlikdan o'chirish ikki tomonlama.
- **Do'stlar** bo'limi: kim onlayn, kim o'ynayapti; **Chaqirish** (o'yin va vaqtni tanlab) — do'stingizga ilovada
  darhol oyna chiqadi va bot orqali "Xonaga kirish" tugmali xabar boradi. Rad etsa, sizga xabar keladi.
- **Tomosha**: Xonalar ro'yxatida ketayotgan ochiq, reytingli va turnir o'yinlarida "Tomosha" tugmasi bor;
  do'stingizning o'yinini (maxfiy bo'lsa ham) Do'stlar bo'limidan ko'rasiz. Tomoshabin yura olmaydi.
- O'yinchilar bir-birining Telegram ID'sini ko'rmaydi — faqat qisqa ochiq ID (`pid`).

## Turnirlar

Xonalar sahifasida **Turnir yaratish**: 4, 8 yoki 16 kishilik, tanlangan o'yin va vaqt bilan. To'lishi bilan
boshlanadi (yaratuvchi 3+ kishi bilan oldinroq boshlashi mumkin; yetmagan joylar keyingi bosqichga bepul o'tadi).
Navbat kelganda o'yin o'zi ochiladi; 1 daqiqada kelmagan o'yinchi yutqazadi; durrang qayta o'ynaladi. Jadvalda
ketayotgan o'yinni bosib tomosha qilish mumkin. Turnir o'yinlari ELO bermaydi; g'olib "Chempion" ramkasini oladi.

## Vaqt, bot darajasi, durrang, qaytarish, yurishlarni ko'rish

- **Vaqt**: Xonalar sahifasida 1 / 3 / 5 / 10 daqiqa — reytingli qidiruv (faqat shu vaqtni tanlaganlar bilan
  juftlanadi), yangi xona, turnir va botga qarshi o'yin uchun.
- **Bot darajasi**: Oson / O'rta / Qiyin (har o'yinda). Qiyin shaxmat boti ko'pi bilan ~1 soniya o'ylaydi.
- **Durrang taklifi** (Shaxmat, Shashka): 🤝 tugmasi; raqib rozi bo'lsa durrang. Har o'yinda 3 martagacha,
  yurish qilish taklifni rad etadi. Bot o'z holati yaxshi bo'lmasa rozi bo'ladi.
- **Yurishni qaytarish** (↺, faqat botga qarshi, hamma o'yinda).
- **Yurishlarni ko'rish**: o'yin tugagach ⏮ ◀ ▶ ⏭ bilan butun o'yinni qadamma-qadam ko'rish.

## Yangi o'yinlar: Nardi, Domino, Dengiz jangi, 4 ta qatorga, Nuqtalar

Hammasida xonalar, reytingli o'yin, turnir, tomosha, botga qarshi (3 daraja), vaqt nazorati ishlaydi.
- **🎲 Nardi** (uzun nardi, `public/nardi.js`): 15 tadan tosh boshdan; urish yo'q — raqib turgan joyga qo'yib
  bo'lmaydi; boshdan navbatiga bitta tosh (birinchi navbatda 6-6, 4-4, 3-3 bo'lsa ikkita); raqib o'tib ketmagan
  bo'lsa 6 ta ketma-ket blok taqiqlangan; ikkala zarni ishlatish majburiy (bittasi bo'lsa — kattasi); hamma tosh
  uyda bo'lgach chiqarish. Zarni server tashlaydi. Yurish bo'lmasa navbat o'zi o'tadi.
- **🁫 Domino** (`public/domino.js`): 0–6, 7 tadan tosh, 14 tasi bozorda; eng katta dubl boshlaydi; mos tosh bo'lmasa
  bozordan olinadi, bozor bo'sh bo'lsa o'tkaziladi; qo'lini birinchi bo'shatgan yutadi, hech kim yura olmasa — ochkosi
  kam. Raqib qo'li va bozor yashirin (server har o'yinchiga faqat o'zinikini yuboradi).
- **🚢 Dengiz jangi** (`public/battleship.js`): 10×10, 1×4, 2×3, 3×2, 4×1, kemalar tegmaydi; 1 daqiqada joylash
  ("Boshqa joylash" / "Tayyor", kechiksa avtomatik); tekkizsangiz yana otasiz; cho'kkan kema atrofi ochiladi.
  Raqib kemalari yashirin.
- **🔴 4 ta qatorga** (`public/connect4.js`): 7×6, tosh pastga tushadi, 4 tasini qatorga tergan yutadi.
- **▪️ Nuqtalar** (`public/dots.js`): 5×5 katak; katakni yopgan yana yuradi; ko'p katak yopgan yutadi.
- Chizish va boshqaruv: `public/boards.js`. Bu o'yinlar uchun hozircha skinlar yo'q; Nardi, Domino va Dengiz jangida
  "Yurishlarni ko'rish" o'chirilgan (tasodif va yashirin ma'lumot sababli).

## Tangalar, kunlik bonus, vazifalar, do'kon, VIP, referal

- **Tangalar 🪙**: onlayn g'alaba +10 (reytingli +15), durrang +5, mag'lubiyat +2; botni yutish +3/+5/+8
  (Oson/O'rta/Qiyin, kuniga 15 tagacha); VIP'da o'yinlardan +50%.
- **Kunlik bonus**: 20, 30, 40, 50, 60, 80, 150 (7-kundan keyin har kuni 150) — kun o'tkazib yuborilsa seriya
  1-kundan boshlanadi. VIP'da ×2.
- **Kunlik vazifalar**: har kuni 3 ta (o'yinchiga xos), bajarilganda "Olish" bilan tanga.
- **Do'kon** (pastki menyu): tanga yoki **Telegram Stars** bilan ramkalar (Neon, Olovli, Afsona⭐) va skinlar
  (Pirat, Yog'och, Qirollik⭐, Muz); Stars bilan tanga paketlari va **VIP 30 kun** (reklamasiz, bonus ×2, +50% tanga).
  Stars to'lovi: bot `createInvoiceLink` (XTR) → ilova `openInvoice` → bot `successful_payment`da beradi
  (`data/meta.json` → `payments`, takror hisoblanmaydi). Provider token kerak emas.
- **Referal**: do'stlik havolasi orqali kirgan **yangi** o'yinchi 5 ta o'yin o'ynasa, ikkalasi 200 tanga oladi.
- Admin: o'yinchiga tanga berish/olish; statistikada Stars daromadi, VIP soni, jami tangalar.

## Shikoyat, guruhda o'ynash, eslatmalar

- **🚩 Shikoyat**: o'yin natijasi oynasida va o'yinchi kartasida (haqorat, firibgarlik, o'yinni cho'zish, nomaqbul
  ism/rasm, boshqa + izoh). Kuniga bir o'yinchiga bitta, jami 10 ta. Admin panel → **Shikoyatlar**: ko'rish,
  "Hal" / "Rad", o'yinchi kartasidan bloklash. Yangi shikoyat onlayn adminlarga darhol bildiriladi.
- **Guruhda o'ynash**: istalgan chatda `@BotNomi` yozing → o'yinni tanlang → guruhga tugmali chaqiruv boradi;
  tugmani **birinchi bosgan** raqib bo'ladi. Buning uchun @BotFather → `/setinline` → botni tanlang → yozuv
  (masalan "o'yin tanlang") — **inline rejimni yoqing**.
- **Bot eslatmalari** (Profilda o'chirsa bo'ladi): 19:00 da "seriyangiz yo'qolmasin" (seriya 2+ kun, bonus olinmagan,
  ilova yopiq), dushanba 10:00 da o'tgan hafta natijasi (ELO o'zgarishi, Hafta qiroli), turnir o'yini boshlanganda
  (ilova yopiq bo'lsa). Do'stingiz ilovaga kirganda — ilovada xabar.

## Admin panel

Serverga `ADMIN_ID` (Telegram ID; botga `/id` yozsangiz ko'rsatadi; bir nechta bo'lsa vergul bilan) qo'shing.
Shu foydalanuvchi uchun Profil sahifasida **🛡 Admin panel** tugmasi chiqadi (server Telegram imzosini tekshiradi —
boshqalar API'ni ham ishlata olmaydi).

- **Statistika**: **faol foydalanuvchilar (LIVE)** — bugun (DAU), 7 kun (WAU), 30 kun (MAU), shu oy, kecha bilan
  solishtirish, DAU/MAU va 30 kunlik grafik; kimdir ilovani ochishi bilan raqamlar darhol yangilanadi. Shuningdek: hozir onlayn (umumiy va har o'yinda), ketayotgan o'yinlar, jami/bugungi/7 kunlik o'yinchilar,
  navbat, turnirlar, bloklanganlar, 7 kunlik onlayn o'yinlar grafigi (o'yinlar bo'yicha). 10 soniyada yangilanadi.
- **O'yinchilar**: ism, @username, Telegram ID yoki pid bo'yicha qidirish; saralash (oxirgi kirgan, yangi, ko'p
  o'ynagan, bloklangan). O'yinchi kartasida: har o'yindagi ELO / eng yuqori / G-M, **ELO'ni o'zgartirish**,
  **bloklash** (1/7/30 kun yoki muddatsiz, sabab bilan — o'yinchi navbat, xona va turnirlardan chiqariladi, ilovada
  "Kirish cheklangan" ekrani chiqadi), **blokdan chiqarish**, **statistikani tozalash**.
- **Xonalar**: barcha xonalar va turnirlar; ketayotgan o'yinni 👁 tomosha qilish, xonani yopish, turnirni bekor qilish.
- **Xabarlar**: ilovada hammaga ko'rinadigan **e'lon** (o'yinlar ro'yxati tepasida, darhol) va **bot orqali hammaga
  xabar** (ilovani ochgan yoki botga /start bosganlarga; HTML; "O'ynash" tugmasi; avval "Menga sinov"; jarayon
  ko'rsatiladi, ~20 xabar/soniya).
- **Reklama**: o'yinlar sahifasida banner — rasm (3 MB gacha) yoki video (MP4/WEBM/MOV, 20 MB gacha; ovozsiz takrorlanadi, 🔇 tugmasi bilan ovoz), telefondan foiz ko'rsatkichi bilan yuklanadi, sarlavha, matn, tugma va
  havola (https:// yoki tg://). Yoqish/o'chirish, oldindan ko'rish, ko'rishlar / bosishlar / CTR. Saqlash bilan
  hammada darhol yangilanadi. Banner bo'lmasa, joyini faqat admin ko'radi. Rasm: `data/ad-image`.
- Ma'lumot: `data/meta.json` (kunlik o'yinlar, e'lon, bot foydalanuvchilari), `data/players.json` (blok, sanalar).

## Revansh, reaksiyalar va ovoz

- **🔁 Revansh**: o'yin tugagach o'sha raqib bilan yana o'ynash. Ikkala o'yinchi ham rozi bo'lishi kerak: birinchi
  so'rov raqibga "Raqib revansh so'rayapti!" bo'lib ko'rinadi, u qabul qilsa yangi o'yin boshlanadi (ranglar
  almashadi). Reytingli o'yindagi revansh ham reytingli. Raqib chiqib ketgan bo'lsa, tugma o'chadi.
- **Emoji reaksiyalar** (onlayn o'yinda): 😊 tugmasi yoki natija oynasidagi qator — 👍 😂 😮 😡 🔥 👏 🤝 😭.
  Emoji yuboruvchining kartasi ustida ko'rinadi. Server faqat shu ro'yxatdagilarni qabul qiladi, 1,2 soniyada bittadan.
- **Ovoz**: yurish, urish, to'siq, shoh, damka, g'alaba/mag'lubiyat, raqib topilganda va vaqt tugashiga 10 soniya
  qolganda — Web Audio bilan yaratiladi (fayl yuklanmaydi). 🔊 tugmasi (bosh sahifa va o'yin ekrani) ovozni
  o'chiradi/yoqadi, tanlov qurilmada saqlanadi. Telegram titrashi (haptic) ham bor.
- **Profil**: tanlangan o'yin statistikasi va "Barcha o'yinlar" — har bir o'yindagi ELO, onlayn va bot natijalari.

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

## Bot xabarlari

Server botga kelgan xabarlarni o'zi o'qiydi (long polling, webhook shart emas): `/start` ga xush kelibsiz xabari va
"🎮 O'ynash" tugmasi, `/start KOD` ga "Xonaga kirish" tugmasi, `/help`. Ishga tushganda menyu tugmasi, buyruqlar va
bot tavsifini ham o'rnatadi. Tugma ilova manzilini `WEB_URL` dan yoki Railway'ning `RAILWAY_PUBLIC_DOMAIN` idan oladi.

### Rangli tugmalar va premium emoji

- "🎮 O'ynash" — yashil (`style: success`), "👥 Taklif" — ko'k (`primary`).
- **Premium emoji:** serverga `ADMIN_ID` (Telegram ID'ingiz; `/id` buyrug'i ko'rsatadi) qo'shing. Keyin botga
  `/emoji 🎮=` + premium emoji yuboring (bir xabarda bir nechta: `/emoji 🎮=… 🏆=… 👥=…`). Shundan so'ng bot
  xabarlarida va tugmalarida shu emoji premium ko'rinishda chiqadi. O'chirish: `/emojidel 🎮` yoki `/emojidel all`.
  Ro'yxat: `/emoji`. Saqlanadi: `DATA_DIR/emoji.json`.
- Telegram qoidasi: bot premium emoji ishlata olishi uchun **bot egasida Telegram Premium** bo'lishi kerak
  (yoki Fragment'dan qo'shimcha username). Aks holda bot xabarni oddiy emoji bilan yuboradi.

## Render'ga joylash

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/tajiboyevjahongir5-sudo/o-yinlar_boti)

1. Yuqoridagi tugmani bosing (yoki render.com → **New → Blueprint** → shu repozitoriyni tanlang).
   Render `render.yaml` faylidan sozlamalarni o'zi oladi: `npm ci`, `npm start`, `/healthz` tekshiruvi.
2. Render 3 ta qiymat so'raydi:
   - `BOT_TOKEN` — @BotFather bergan token (maxfiy! faqat Render'ga kiriting, kodga yozmang)
   - `BOT_USERNAME` — bot nomi `@` belgisiz (masalan `OyinlarBot`)
   - `APP_NAME` — Mini App qisqa nomi (masalan `game`), 4-qadamda yaratiladi. Hozircha `game` deb yozing.
3. **Apply / Deploy** bosing. Bir necha daqiqada `https://o-yinlar-boti.onrender.com` kabi manzil chiqadi.
4. Telegramda @BotFather → `/newapp` → botni tanlang → nom, tavsif, rasm (640×360) → **Web App URL** sifatida
   Render manzilini kiriting → qisqa nom sifatida 2-qadamdagi `APP_NAME` ni bering.
5. Ixtiyoriy: @BotFather → `/mybots` → Bot Settings → **Menu Button** → Render manzili.

**Bepul tarif haqida:** 15 daqiqa hech kim kirmasa server "uxlaydi" va keyingi ochilishda ~1 daqiqa uyg'onadi.
Bepul tarifda doimiy disk yo'q, shuning uchun ELO ma'lumotlari (`data/players.json`) har qayta ishga tushishda
o'chadi. Reytingni saqlash uchun pullik tarif + disk kerak (`render.yaml` dagi izohga qarang).

Boshqa hostinglar ham bo'ladi (Railway, Fly.io, VPS): start buyrug'i `npm start`, port `PORT` dan olinadi.
Sinash uchun: `cloudflared tunnel --url http://localhost:3000`.

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

- `public/game.js` — To'siq Jangi qoidalari (server ham, brauzer ham ishlatadi) va bot
- `public/xo.js`, `public/checkers.js`, `public/chess.js` — X va O, Shashka, Shaxmat qoidalari va botlari
- `public/rewards.js` — skinlar, ramkalar va yutuqlar katalogi
- `public/index.html` — o'yin interfeysi (canvas, Telegram haptik)
- `server.js` — statik fayllar + WebSocket xonalar (`/ws`)

## Eslatma

Server o'yinchini Telegram `initData` imzosini tekshirmasdan, foydalanuvchi ID'si bo'yicha taniydi.
Do'stlar o'rtasidagi o'yin uchun bu yetarli; reyting yoki mukofot qo'shsangiz, `initData`ni bot tokeni
bilan serverda tekshirish kerak bo'ladi.
