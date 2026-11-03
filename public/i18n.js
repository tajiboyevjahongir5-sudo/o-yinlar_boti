// Russian translation of the interface. The app is written in Uzbek; with Russian chosen (automatically for a
// Telegram language "ru", or in Profile), every text that appears on the page is swapped for its translation:
// exact phrases from RU, phrases with numbers / names from PATTERNS. Unknown text stays as it is.
window.I18N = (function () {
  const RU = {
    // navigation and common
    "O'yinlar": 'Игры', 'Reyting': 'Рейтинг', "Do'stlar": 'Друзья', "Do'kon": 'Магазин', 'Profil': 'Профиль',
    'Xush kelibsiz': 'Добро пожаловать', 'Taklif qilish': 'Пригласить', 'Taklif': 'Пригласить', 'Chiqish': 'Выход', 'Orqaga': 'Назад',
    'Yopish': 'Закрыть', 'Bekor qilish': 'Отмена', 'Yuborish': 'Отправить', 'Yuklanmoqda...': 'Загрузка...', 'Saqlash': 'Сохранить',
    'Keyinroq': 'Позже', 'yoki': 'или', 'Hozir': 'Сейчас', 'Ovoz': 'Звук', "Ovozni o'chirish": 'Выключить звук', 'Ovozni yoqish': 'Включить звук',
    'Reaksiya': 'Реакция', 'YANGI': 'НОВОЕ', 'onlayn': 'онлайн', 'daq': 'мин', "O'ynash": 'Играть', '▶ O\'ynash': '▶ Играть',
    'Onlayn o\'yinchilar yuklanmoqda...': 'Загрузка онлайна...', 'RAQIB — o\'yinlar': 'RAQIB — игры',
    // games
    'Durak': 'Дурак', "To'qqiz qumaloq": 'Тогуз коргоол', 'Qumaloq': 'Коргоол', 'Kozir': 'Козырь', 'Bito': 'Бито', '🫴 Olaman': '🫴 Беру', '✅ Bito': '✅ Бито', 'Tuzdik!': 'Туздык!', 'Siz': 'Вы', 'Raqib': 'Соперник', 'Siz hujum qilasiz': 'Вы атакуете', 'Raqib hujum qiladi': 'Соперник атакует', 'Sizning navbatingiz': 'Ваш ход', 'Raqib navbati': 'Ход соперника', 'Hujum qiling: karta tashlang': 'Атакуйте: выложите карту', "Karta qo'shing yoki «Bito» bosing": 'Подкиньте карту или нажмите «Бито»', 'Kartani yoping yoki «Olaman» bosing': 'Отбейтесь или нажмите «Беру»', 'Raqib yopmoqda...': 'Соперник отбивается...', "Bu karta bilan yopib bo'lmaydi": 'Этой картой не побить', 'Qaysi kartani yopasiz? Stoldagisini bosing': 'Какую карту бьёте? Нажмите на стол', "O'z uyalaringizdan birini bosing (pastki qator)": 'Нажмите на свою лунку (нижний ряд)', "Bu uya bo'sh": 'Лунка пуста', "Kartalaringizdan birinchi bo'lib qutuling — durak qolmang!": 'Избавьтесь от карт первым — не оставайтесь дураком!', "81 dan ko'p qumaloq yig'ing va tuzdik oling!": 'Соберите больше 81 камня и возьмите туздык!', 'Kartalarni yoping, oxirida durak qolmang': 'Отбивайтесь и не останьтесь дураком', 'Qumaloqlarni tering, tuzdik oling': 'Собирайте камни, берите туздык', '🫴 Olindi': '🫴 Взято', '🃏 Qoldi': '🃏 Осталось', '🪨 Qozon': '🪨 Казан', '⭐ Tuzdik': '⭐ Туздык', "Kartalaringiz birinchi tugadi — raqib durak qoldi! 🃏": 'Ваши карты кончились первыми — соперник дурак! 🃏', 'Ikkalangiz ham bir vaqtda tugatdingiz — durrang!': 'Вы оба закончили одновременно — ничья!', "Siz ko'proq qumaloq yig'dingiz!": 'Вы собрали больше камней!', 'Teng — durrang!': 'Поровну — ничья!', 'Shaxmat': 'Шахматы', 'Shashka': 'Шашки', 'Nardi': 'Нарды', 'Domino': 'Домино', 'Dengiz jangi': 'Морской бой', 'Dengiz': 'Морской бой',
    '4 ta qatorga': '4 в ряд', '4 qator': '4 в ряд', 'Nuqtalar': 'Точки', "To'siq Jangi": 'Битва стен', "To'siq": 'Стены', 'X va O': 'Крестики-нолики',
    "Klassik shaxmat — raqib shohiga mot qo'ying": 'Классические шахматы — поставьте мат королю',
    'Rus shashkasi — urish majburiy, damka uchadi': 'Русские шашки — бить обязательно, дамка летает',
    "Uzun nardi — zar tashlang, 15 toshni chiqaring": 'Длинные нарды — бросайте кости, выведите 15 шашек',
    "Toshlarni uchlariga moslab qo'ying": 'Ставьте кости к подходящим концам',
    "Raqib kemalarini toping va cho'ktiring": 'Найдите и потопите корабли соперника',
    'Toshni tushiring, 4 tasini qatorga tering': 'Бросайте фишки, соберите 4 в ряд',
    'Chiziq chizing, katakni yoping': 'Рисуйте линии, закрывайте клетки',
    "Yo'lni to'sing va marraga birinchi yeting": 'Ставьте стены и первым дойдите до финиша',
    'Uchta belgini bir qatorga birinchi tering': 'Первым соберите три в ряд',
    // lobby
    'Yaratish': 'Создать', "Reytingli o'yin": 'Рейтинговая игра', 'Sizga mos raqib topiladi · ELO uchun': 'Подберём равного соперника · на ELO',
    'Vaqt': 'Время', 'Kod bilan kirish': 'Войти по коду', 'Botga qarshi': 'Против бота', 'Turnirlar': 'Турниры', 'Turnir yaratish': 'Создать турнир',
    'Xonalar': 'Комнаты', '· ELO berilmaydi': '· без ELO', 'Xona yaratish': 'Создать комнату', 'Qanday xona ochmoqchisiz?': 'Какую комнату открыть?',
    'Ochiq xona': 'Открытая комната', 'Maxfiy xona': 'Закрытая комната', 'Ochiq': 'Открытая', 'Maxfiy': 'Закрытая', 'Reytingli': 'Рейтинговая', 'Turnir': 'Турнир',
    "Qo'shilish": 'Войти', 'Kirish': 'Войти', "O'yinda": 'В игре', 'Tomosha': 'Смотреть',
    "Hozircha xona yo'q. Birinchi bo'lib xona yarating — boshqalar shu yerda darhol ko'rib qo'shilishadi!": 'Комнат пока нет. Создайте первую — остальные сразу её увидят!',
    "Botdagi istalgan onlayn o'yinchi ro'yxatdan ko'rib qo'shila oladi.": 'Любой игрок онлайн увидит её в списке и сможет войти.',
    "Ro'yxatda qulf belgisi bilan ko'rinadi, lekin faqat kodni bilgan do'stingiz kira oladi.": 'Видна в списке с замком — войти может только друг с кодом.',
    "Do'stingiz bergan 5 belgili xona kodini kiriting.": 'Введите 5-значный код комнаты от друга.',
    'Oson': 'Легко', "O'rta": 'Средне', 'Qiyin': 'Сложно', 'Yangi boshlovchilar uchun': 'Для новичков', "Yaxshi raqib, ba'zan adashadi": 'Хороший соперник, иногда ошибается', 'Adashmaydi': 'Не ошибается',
    'Raqib qidirilmoqda': 'Поиск соперника', 'Raqib topildi!': 'Соперник найден!', "Birinchi bo'lib siz yurasiz": 'Вы ходите первым', 'Raqib birinchi yuradi': 'Соперник ходит первым',
    "Qidiruv oralig'i": 'Диапазон поиска', 'Navbatda': 'В очереди', 'Sizning ELO': 'Ваш ELO',
    // in game
    'Sizning navbatingiz!': 'Ваш ход!', 'Raqib navbati...': 'Ход соперника...', 'Raqib kutilmoqda...': 'Ожидание соперника...', 'Raqib kutilmoqda': 'Ожидание соперника',
    'Hozir sizning navbatingiz emas': 'Сейчас не ваш ход', "Hali yurish yo'q": 'Ходов пока нет', 'Gorizontal': 'Горизонт.', 'Vertikal': 'Вертик.',
    "To'siq joyini tanlang": 'Выберите место для стены', 'Tasdiqlash uchun yana bir marta bosing': 'Нажмите ещё раз для подтверждения', "Qo'yib yuboring": 'Отпустите',
    "Belgingizni surib katakka qo'ying": 'Перетащите знак в клетку', "yoki bo'sh katakni bosing": 'или нажмите на пустую клетку',
    'Urishni davom ettiring!': 'Продолжайте бить!', 'Urish majburiy!': 'Бить обязательно!', 'Shoh! Shohingizni himoya qiling': 'Шах! Защитите короля',
    'Raqibga shoh! Raqib navbati...': 'Шах сопернику! Ход соперника...', "O'z donangizni tanlang": 'Выберите свою фигуру', "Bu dona yura olmaydi": 'Эта фигура не может ходить',
    'Piyodani almashtirish': 'Превращение пешки', 'Farzin': 'Ферзь', 'Ruh': 'Ладья', 'Fil': 'Слон', 'Ot': 'Конь',
    'Durrang taklif qilish': 'Предложить ничью', 'Durrang taklifi': 'Предложение ничьей', 'Taklif qilish ': 'Предложить', 'Roziman, durrang': 'Согласен на ничью',
    "Yo'q, davom etamiz": 'Нет, продолжаем', 'Yurishni qaytarish': 'Отменить ход', 'Yurish qaytarildi': 'Ход отменён',
    "O'yin hali tugamadi. Hozir chiqsangiz, mag'lub hisoblanasiz va raqibingiz g'olib bo'ladi.": 'Игра ещё не окончена. Если выйдете сейчас — засчитается поражение.',
    "O'yin hali tugamadi. Hozir chiqsangiz, bu o'yin mag'lubiyat deb hisoblanadi.": 'Игра ещё не окончена. Выход засчитается как поражение.',
    'Davom etish': 'Продолжить', '▶ Davom etish': '▶ Продолжить', 'Ha, chiqish': 'Да, выйти', 'Kemalaringizni joylang va "Tayyor"ni bosing': 'Расставьте корабли и нажмите «Готово»',
    'Raqib kemalarini joylamoqda...': 'Соперник расставляет корабли...', "O'q uzing!": 'Стреляйте!', 'Tegdi! Yana oting': 'Попал! Стреляйте ещё', 'Raqib otmoqda...': 'Соперник стреляет...',
    '🔀 Boshqa joylash': '🔀 Расставить иначе', '✅ Tayyor': '✅ Готово', 'Raqib maydoni': 'Поле соперника', 'Sizniki': 'Ваше', 'Sizning flotingiz': 'Ваш флот', 'Joylandi ✓': 'Расставлено ✓',
    'Tosh tanlang': 'Выберите кость', "Mos tosh yo'q — bozordan oling": 'Нет подходящей — возьмите с базара', "Yurish yo'q — o'tkazing": 'Ходов нет — пропустите', "⏭ O'tkazish": '⏭ Пропустить',
    'Raqib yurmoqda...': 'Соперник ходит...', "Qayerga? Yorug' nuqtani bosing": 'Куда? Нажмите на светлую точку', "Bu tosh bilan yurib bo'lmaydi": 'Этой шашкой ходить нельзя',
    'Katak yopildi — yana yuring!': 'Клетка закрыта — ходите ещё!', 'Raqib katak yopdi — yana yuradi': 'Соперник закрыл клетку — ходит ещё', "Bu ustun to'la": 'Этот столбец заполнен',
    // results
    "G'ALABA!": 'ПОБЕДА!', "MAG'LUBIYAT": 'ПОРАЖЕНИЕ', 'DURRANG': 'НИЧЬЯ', "O'YIN TUGADI": 'ИГРА ОКОНЧЕНА', 'Revansh': 'Реванш', "Qayta o'ynash": 'Играть снова',
    'Yangi raqib': 'Новый соперник', "Yurishlarni ko'rish": 'Просмотр партии', 'Yurishlar': 'Ходы', 'Turnir jadvali': 'Сетка турнира',
    'Yurish': 'Ходы', 'Qadam': 'Шаги', 'Vaqt ': 'Время', 'Urish': 'Взятия', 'Belgingiz': 'Ваш знак', 'Katak': 'Клетки', 'Chiziq': 'Линии', "O'q": 'Выстрелы', 'Tegdi': 'Попадания',
    "Qo'yildi": 'Поставлено', 'Qoldi': 'Осталось', 'Chiqdi': 'Выведено', "Raqib o'yindan chiqib ketdi.": 'Соперник вышел из игры.', "Siz o'yindan chiqdingiz.": 'Вы вышли из игры.',
    'Raqibning vaqti tugadi.': 'У соперника закончилось время.', 'Vaqtingiz tugab qoldi.': 'У вас закончилось время.', "Raqib revansh so'rayapti!": 'Соперник просит реванш!',
    'Revanshni qabul qilish': 'Принять реванш', 'Raqib javobi kutilmoqda...': 'Ждём ответа соперника...', "Raqib o'yindan chiqib ketdi": 'Соперник вышел',
    "Botga qarshi o'yin reytingga (ELO) ta'sir qilmaydi": 'Игра с ботом не влияет на рейтинг (ELO)',
    "Do'st qo'shish": 'Добавить в друзья', "Do'stlar ro'yxatida": 'В списке друзей', "So'rov yuborildi — javob kutilmoqda": 'Запрос отправлен — ждём ответа',
    "Do'stlik so'rovini qabul qilish": 'Принять запрос в друзья', '🚩 Shikoyat': '🚩 Пожаловаться', '🚩 Shikoyat qilish': '🚩 Пожаловаться',
    // rating
    'Umumiy': 'Общий', 'Shu hafta': 'Эта неделя', "Reytingli o'yinlardagi ELO bo'yicha eng kuchli o'yinchilar": 'Сильнейшие игроки по ELO в рейтинговых играх',
    "Hali reyting yo'q. Onlayn o'yinda g'alaba qozonib, birinchi bo'ling!": 'Рейтинга пока нет. Победите онлайн и станьте первым!',
    "Bu hafta hali reytingli o'yin bo'lmadi. Birinchi bo'ling!": 'На этой неделе рейтинговых игр ещё не было. Будьте первым!',
    "Shu haftada reytingli o'yinlarda eng ko'p ELO yig'ganlar. Hafta g'olibi 👑 \"Hafta qiroli\" ramkasini oladi.": 'Больше всех набравшие ELO за неделю. Победитель получает рамку 👑 «Король недели».',
    "O'tgan hafta qiroli": 'Король прошлой недели', "Siz hali reytingda yo'qsiz — onlayn o'yin o'ynang!": 'Вас ещё нет в рейтинге — сыграйте онлайн!',
    // friends
    "Do'stlik havolasini yuborish": 'Отправить ссылку дружбы', 'Do\'stlik taklifi': 'Приглашение в друзья', "Do'stingizga shunday xabar boradi:": 'Другу придёт такое сообщение:',
    "Do'st bo'lish": 'Подружиться', '🤝 Do\'st bo\'lish': '🤝 Подружиться', 'Chaqirish': 'Вызвать', 'Qabul': 'Принять', "Do'stlik so'rovlari": 'Заявки в друзья', "Do'stlarim": 'Мои друзья',
    'Onlayn': 'Онлайн', 'Oflayn': 'Офлайн', "Do'st bo'lmoqchi": 'Хочет дружить', 'Kutilmoqda': 'Ожидание', "Qo'shish": 'Добавить', "Do'st": 'Друг',
    'Ism yoki @username (kamida 2 harf)': 'Имя или @username (минимум 2 буквы)',
    "Havolani do'stingizga yuboring — u ochishi bilan ikkalangiz do'st bo'lasiz. Ism bo'yicha topsangiz, unga so'rov boradi va u tasdiqlagach do'st bo'lasiz.": 'Отправьте ссылку другу — как только он её откроет, вы станете друзьями. Если найдёте по имени — придёт запрос, и после подтверждения вы станете друзьями.',
    "Hali do'stlaringiz yo'q.\n\nYuqoridagi tugma orqali do'stingizni ismi bo'yicha toping yoki unga do'stlik havolasini yuboring. O'yin tugagach natija oynasidan ham qo'shsa bo'ladi.": 'Друзей пока нет.\n\nНайдите друга по имени кнопкой выше или отправьте ему ссылку. Добавить можно и после игры.',
    "Do'stlaringiz onlayn bo'lsa, chaqiruv ilovada darhol chiqadi; bo'lmasa bot orqali xabar boradi.": 'Если друг онлайн, вызов появится сразу; иначе придёт сообщение от бота.',
    'Chaqiruv!': 'Вызов!', 'Qabul qilish': 'Принять', 'Rad etish': 'Отклонить', "O'yin": 'Игра',
    // shop & economy
    'Kunlik bonus': 'Ежедневный бонус', 'Har kuni kiring!': 'Заходите каждый день!', 'Bonus olindi': 'Бонус получен', 'Bugungi topshiriqlar': 'Задания на сегодня',
    'Bugungi vazifalar': 'Задания на сегодня', 'Olish': 'Забрать', '✓ Olindi': '✓ Получено', 'Tanga o\'yinlarda, vazifalarda va kunlik bonusda yig\'iladi': 'Монеты дают за игры, задания и ежедневный бонус',
    'VIP · 30 kun': 'VIP · 30 дней', 'Reklamasiz · kunlik bonus ×2 · o\'yinlardan +50% tanga · VIP belgisi': 'Без рекламы · бонус ×2 · +50% монет за игры · значок VIP',
    'Ramkalar': 'Рамки', 'Skinlar': 'Скины', '🖼 Ramkalar': '🖼 Рамки', '🎨 Skinlar': '🎨 Скины', '⭐ Tanga sotib olish (Telegram Stars)': '⭐ Купить монеты (Telegram Stars)',
    "🎁 Do'st taklif qiling": '🎁 Пригласите друга', 'Har bir do\'st uchun 200 🪙': '200 🪙 за каждого друга', 'Darhol hisobingizga': 'Сразу на счёт',
    '500 tanga': '500 монет', '1500 tanga': '1500 монет', '4000 tanga': '4000 монет', 'Foydali: +15%': 'Выгода: +15%', 'Foydali: +33%': 'Выгода: +33%',
    '✓ Sizda bor': '✓ Есть', 'Reklama': 'Реклама', 'Batafsil': 'Подробнее',
    // profile
    'Kolleksiya': 'Коллекция', 'Profil ramkasi': 'Рамка профиля', 'Oddiy': 'Обычная', 'Ramkasiz': 'Без рамки', 'Standart': 'Стандарт', 'Yutuqlar': 'Достижения',
    "Barcha o'yinlar": 'Все игры', "So'nggi onlayn o'yinlar": 'Последние онлайн-игры', "G'alaba": 'Победы', "Mag'lubiyat": 'Поражения', "G'alaba %": '% побед',
    "O'rin": 'Место', 'Durrang': 'Ничьи', 'Bot G/M': 'Бот П/П', 'Bot G/M/D': 'Бот П/П/Н', "Do'stlarni taklif qilish": 'Пригласить друзей',
    'Yangi boshlovchi': 'Новичок', 'Havaskor': 'Любитель', 'Tajribali': 'Опытный', 'Usta': 'Мастер', 'Grossmeyster': 'Гроссмейстер',
    "Hali onlayn o'yin o'ynamagansiz. Xonalar bo'limidan raqib toping!": 'Вы ещё не играли онлайн. Найдите соперника в комнатах!',
    "Reytingli o'yinlarda ELO oshgani sari yangi ramka va skinlar ochiladi. Bosib kiying — raqiblaringiz ham ko'radi.": 'С ростом ELO открываются новые рамки и скины. Нажмите, чтобы надеть — соперники тоже увидят.',
    'ELO faqat "Reytingli o\'yin"da (mos raqib bilan) beriladi: g\'alaba uchun qo\'shiladi, mag\'lubiyat uchun ayiriladi. Kuchliroq raqibni yutsangiz ko\'proq ball olasiz.': 'ELO даётся только в «Рейтинговой игре»: за победу прибавляется, за поражение отнимается. Победа над сильным соперником даёт больше.',
    '🔔 Bot eslatmalari (seriya, haftalik natija)': '🔔 Напоминания бота (серия, итоги недели)', 'Til': 'Язык', 'Taxta mavzusi': 'Тема доски',
    "o'yinchi onlayn": 'игроков онлайн', 'Oq': 'Белые', 'Qora': 'Чёрные', 'siz': 'вы', 'raqib': 'соперник', 'katak': 'клеток', 'dona': 'шт.', 'tosh': 'шт.',
    // rewards: frames, skins, achievements
    'Bronza': 'Бронза', 'Kumush': 'Серебро', 'Oltin': 'Золото', 'Olmos': 'Алмаз', 'Hafta qiroli': 'Король недели', 'Chempion': 'Чемпион',
    'Olovli': 'Огненная', 'Afsona': 'Легенда', "Haftalik reytingda 1-o'rin": '1-е место недели', "Turnirda g'alaba": 'Победа в турнире',
    "Rang o'zgartiruvchi neon": 'Переливающийся неон', 'Alangali halqa': 'Огненное кольцо', 'Aylanuvchi kamalak halqa': 'Вращающаяся радуга',
    'Ninja': 'Ниндзя', 'Ritsar': 'Рыцарь', 'Qirol': 'Король', 'Kosmik': 'Космос', 'Pirat': 'Пират', 'Kristall': 'Кристалл', 'Olov': 'Огонь',
    'Kamalak': 'Радуга', 'Muz': 'Лёд', 'Qirollik': 'Королевский', 'Qora niqob va tasma': 'Чёрная маска и повязка', "Kumush dubulg'a": 'Серебряный шлем',
    'Oltin toj va plash': 'Золотая корона и плащ', 'Skafandr va yulduzlar': 'Скафандр и звёзды', "Bandana va ko'z bog'ichi": 'Бандана и повязка на глаз',
    'Oltin donalar': 'Золотые фигуры', 'Yonib turgan konturlar': 'Светящиеся контуры', 'Muzdek shaffof donalar': 'Ледяные фигуры', 'Alangali donalar': 'Огненные фигуры',
    "Klassik yog'och donalar": 'Классическое дерево', 'Marvarid va oltin': 'Жемчуг и золото', 'Oltin tangalar': 'Золотые монеты', 'Yonib turgan halqalar': 'Светящиеся кольца',
    'Yaltiroq olmos donalar': 'Сверкающие алмазы', 'Oltin belgilar': 'Золотые знаки', "Kamalak rangli belgilar": 'Радужные знаки', 'Alangali belgilar': 'Огненные знаки',
    'Yulduzli belgilar': 'Звёздные знаки', 'Muzdek belgilar': 'Ледяные знаки',
    "Birinchi g'alaba": 'Первая победа', "O'nta g'alaba": 'Десять побед', "Ellikta g'alaba": 'Пятьдесят побед', 'Ketma-ket 5': '5 подряд', 'Mot ustasi': 'Мастер мата',
    'Damka ustasi': 'Мастер дамки', 'Devor quruvchi': 'Строитель стен', 'Uchtalik': 'Три в ряд', "Hamma o'yin": 'Все игры', "Kuchli o'yinchi": 'Сильный игрок',
    'Chaqmoq': 'Молния', 'Qasos': 'Реванш', "Do'stona": 'Дружелюбный', 'Tomoshabin': 'Зритель', 'Bot yengildi': 'Бот побеждён', "Turnir g'olibi": 'Победитель турнира',
    'Haftalik seriya': 'Недельная серия', 'Xaridor': 'Покупатель', 'Taklifchi': 'Пригласивший',
    'Kirish cheklangan': 'Доступ ограничен', 'Kemani surib joylang, bosib aylantiring': 'Перетащите корабль, нажмите — повернуть',
    'Kemalar bir-biriga tegmasligi kerak': 'Корабли не должны касаться', "Bu yerda aylantirib bo'lmaydi": 'Здесь повернуть нельзя', "Birinchi toshni qo'ying": 'Поставьте первую кость', 'Raqib boshlaydi': 'Соперник начинает',
    'Neon': 'Неон', "Yog'och": 'Дерево', 'Marmar': 'Мрамор', 'Yashil': 'Зелёная', "O'zbekcha": 'Узбекский', 'Faqat siz ko\'rasiz': 'Видите только вы',
  };
  const PATTERNS = [
    [/^(\d+) o'yinchi onlayn$/, '$1 игроков онлайн'], [/^Hozir (\d+) o'yinchi onlayn$/, 'Сейчас $1 игроков онлайн'],
    [/^(\d+) daq$/, '$1 мин'], [/^(\d+) daqiqa$/, '$1 мин'], [/^(\d+) ELO kerak$/, 'нужно $1 ELO'], [/^Istalgan o'yinda (\d+) ELO$/, '$1 ELO в любой игре'],
    [/^Eng yuqori: (\d+)(.*)$/, 'Максимум: $1$2'], [/^Kunlik bonus: (\d+) 🪙$/, 'Бонус дня: $1 🪙'], [/^Vazifalar (\d+)\/(\d+)$/, 'Задания $1/$2'],
    [/^(\d+) kunlik seriya$/, 'Серия $1 дн.'], [/^🔥 (\d+) kunlik seriya$/, '🔥 Серия $1 дн.'], [/^Hafta tugashiga: (\d+) kun (\d+) soat$/, 'До конца недели: $1 д $2 ч'],
    [/^Shu hafta: ([+-]?\d+) ELO \((\d+) o'yin\)(.*)$/, 'Эта неделя: $1 ELO ($2 игр)$3'], [/^Yutuqlar · (\d+)\/(\d+)$/, 'Достижения · $1/$2'],
    [/^(\d+) ta mukofot kutmoqda!$/, 'Ждут награды: $1!'], [/^(.+) skinlari$/, 'Скины: $1'], [/^Zar: (\d)-(\d) · tosh tanlang$/, 'Кости: $1-$2 · выберите шашку'],
    [/^(\d+) tosh$/, '$1 шт.'], [/^(\d+) dona$/, '$1 шт.'], [/^Bozor: (\d+)$/, 'Базар: $1'], [/^Bito (\d+)$/, 'Бито $1'], [/^Kozir (.)$/, 'Козырь $1'], [/^(.+) kartalaridan birinchi qutuldi — siz durak qoldingiz\.$/, '$1 первым избавился от карт — вы дурак.'], [/^(.+) ko'proq qumaloq yig'di\.$/, '$1 собрал больше камней.'], [/^Qozon: (\d+) : (\d+)\. (.*)$/, 'Казан: $1 : $2. $3'], [/^Uchlari: (\d) · (\d)$/, 'Концы: $1 · $2'],
    [/^(.+) xonasi$/, 'Комната $1'], [/^1\/2 · (\d+) daq · Raqib kutmoqda · (.+)$/, '1/2 · $1 мин · ждёт соперника'], [/^(\d+) daq · O'yin ketmoqda(.*)$/, '$1 мин · идёт игра$2'],
    [/^🪙 (\d+) — do'konda$/, '🪙 $1 — в магазине'], [/^⭐ (\d+) — do'konda$/, '⭐ $1 — в магазине'], [/^(\d+) tanga$/, '$1 монет'],
    [/^Tomosha · (.+) yuradi(.*)$/, 'Просмотр · ходит $1$2'], [/^(.+) bilan do'st bo'ldingiz!$/, 'Вы подружились с $1!'],
    [/^(.+) sizga do'stlik so'rovi yubordi — Do'stlar bo'limida tasdiqlang$/, '$1 хочет добавить вас в друзья — подтвердите в разделе «Друзья»'],
    [/^Jami: (\d+) ta o'yin \(onlayn \+ bot\), (\d+) ta g'alaba(.*)$/, 'Всего: $1 игр (онлайн + бот), $2 побед$3'],
  ];
  let lang = 'uz', busy = false;
  function tr(s) {
    if (lang !== 'ru' || typeof s !== 'string') return s;
    const t = s.trim();
    if (!t) return s;
    let r = RU[t];
    if (r === undefined) for (const [re, to] of PATTERNS) if (re.test(t)) { r = t.replace(re, to); break; }
    return r === undefined ? s : s.replace(t, r);
  }
  function fix(n) {
    if (n.nodeType === 3) { const v = n.nodeValue, t = tr(v); if (t !== v) n.nodeValue = t; return; }
    if (n.nodeType !== 1 || n.tagName === 'SCRIPT' || n.tagName === 'STYLE') return;
    for (const a of ['placeholder', 'aria-label', 'title']) { const v = n.getAttribute(a); if (v) { const t = tr(v); if (t !== v) n.setAttribute(a, t); } }
    for (const c of n.childNodes) fix(c);
  }
  function start(l) {
    lang = l === 'ru' ? 'ru' : 'uz';
    document.documentElement.lang = lang;
    if (lang !== 'ru') return;
    fix(document.body);
    new MutationObserver((ms) => {
      if (busy) return;
      busy = true;
      try { for (const m of ms) { if (m.type === 'characterData') fix(m.target); else m.addedNodes.forEach(fix); } } finally { busy = false; }
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
  }
  return { start, tr, get lang() { return lang; } };
})();
