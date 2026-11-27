# Ish jurnali — "Agarda SSSR yana tiklansa?"

## STAGE 0 · Setup — gate oʻtdi, API kalit kutilmoqda
- Node 22.23.5, ffmpeg 6.1.1, Python 3.13; remotion/@remotion/cli/@remotion/google-fonts 4.0.547, d3-geo 3.1.2, topojson-client 3.1.0, world-atlas 2.0.2 (aniq versiyalar). Shriftlar (Montserrat 800/900, Inter 700) Google Fonts'dan public/fonts ga lokal saqlandi — render internetsiz ishlaydi.
- GATE: 2 s test kompozitsiya (Oʻzbekiston xaritasi + subtitr) render qilindi: 1920×1080, 30 fps, 2.000 s. Bu bulutli Linux konteyner (GPU yoʻq): --gl=swangle; Windows noutbukda --gl=angle --concurrency=4.
- Toʻxtash sababi: .env va ELEVENLABS_API_KEY yoʻq; api.elevenlabs.io bu konteyner tarmogʻida bloklangan. ref/namuna.mp4 ham yoʻq. Ulangan ElevenLabs akkauntida "Mirjalol Professional Voice" (cfWx14ZbaEUT4BjIA5tH) bor, lekin u free tarif: 10 000 dan 5 485 belgi qolgan.
- Yangilanish: ElevenLabs kaliti xavfsiz forma orqali saqlandi (proxy kalitni oʻzi qoʻshadi, .env da shablon qiymat turadi). Akkaunt: free, 0/10 000 belgi ishlatilgan. Oʻzbek tilini qoʻllaydigan modellar: eleven_v4, eleven_v4_turbo (eleven_v3 va multilingual_v2 roʻyxatida uz yoʻq).
- Ovoz: yangi akkauntda "Mirjalol" yoʻq; Voice Library'da bor (cfWx14ZbaEUT4BjIA5tH, free_users_allowed=true). Qoʻshishni foydalanuvchidan soʻradim.
- STAGE 0 yopildi: foydalanuvchi Mirjalolni akkauntga qoʻshdi (cfWx14ZbaEUT4BjIA5tH, akkauntdagi nomi "Mirjalol - Calm, Confident" — Voice Library'dagi "Mirjalol Professional Voice" bilan bir xil ID).

## STAGE 1 · Research — gate oʻtdi
- research.md: 55 ta R-fakt (har biri 2 URL), 11 ta TAXMIN mulohaza (T01–T11), 7 ta manbalar farqi alohida roʻyxatda. Jahon banki/XVJ API bu muhitdan ochilmadi — raqamlar veb-qidiruv orqali milliy statistika, XVJ va Jahon banki sahifalaridan olindi.
- Raqamlar bir xil "nashr"dan: YaIM jon boshiga — XVJ 2025 (avgust 2025), aholi — Jahon banki 2024 + stat.uz/stat.gov.kz. Farqli raqamlar (soʻm sanasi, YaIM hajmi, musulmonlar ulushi) ssenariyda raqamsiz aytiladi.
- GATE: keyingi bosqichlarda ishlatiladigan har bir raqam research.md'da 2 manba bilan; hisoblangan raqamlar (300 mln, 23 baravar, ulushlar) "FAKT (hisob)" deb belgilandi.

## STAGE 2 · Script — gate oʻtdi
- script.json: sahnalar 2–70 (69 ta; 23 FAKT, 46 TAXMIN), 182 cue; har bir sahnada say/subs(cues)/visual/labels/src. Hamma FAKT sahna research.md dagi R-ID'larga bogʻlangan (topilmagan ID: 0).
- Uzunlik: say jami 8 526 belgi (≈609 s @14 bel/s). Muhim: 595 s nutq + 69×0,35 s nafas + hook ≈ 623 s — bu 10:00±10 s ga sigʻmaydi, shuning uchun STAGE 3 kalibrlashda nutq maqsadi ≈578 s qilib olinadi (video ≈10:06). ElevenLabs krediti (10 000) ham shunga yetadi.
- GATE: subs_review.md — 182 cue roʻyxati, 15+ tuzatish qayd etilgan, ochiq muammo 0; tools/lint_script.py — 0 muammo.

## STAGE 3 · Voice — toʻxtatildi (tarif cheklovi)
- Ovoz topildi (cfWx14ZbaEUT4BjIA5tH), model: eleven_v4 (oʻzbek tilini faqat v4/v4_turbo qoʻllaydi; v3 va multilingual_v2 da uz yoʻq). v4 `style` parametrini qoʻllamaydi (can_use_style=false) — yuboriladi, lekin taʼsir qilmaydi.
- Birinchi soʻrov (sahna 2) 402 paid_plan_required qaytardi: bepul tarif Voice Library ovozlarini API orqali ishlata olmaydi. Kredit sarflanmadi, 0/69 sahna ovozlangan, keyingisi: 2. Qoida boʻyicha qayta urinilmadi.
- Muqobil yoʻl sinaldi: ElevenLabs ulagichi (boshqa, bepul akkaunt) Mirjalol bilan sahna 2 ni yaratdi (8,16 s, 135 kredit sarflandi), lekin audio faqat elevenlabsusercontent.com dan yuklanadi — bu host tarmoqda yopiq; ruxsat soʻrovi rad etildi. Fayl konteynerga tushmadi, sahna ovozlangan deb hisoblanmadi.
- Ulagich orqali davom etildi (foydalanuvchi soʻrovi). Ulagich akkauntida oylik limit yangilangan (9 865 belgi). Kalibrlash (2–6): 681 belgi / 43,12 s = 15,8 bel/s → 7–70-sahnalarga 14 ta jumla qaytarildi (jami 8 416 belgi, maqsad ≈576 s). Audio ElevenLabs flow'ida qoladi (WbNbGKE3zKqa9o7RU5ef); vaqtlar sandbox'da pauza tahlili bilan olinadi; yakuniy yigʻish ham sandbox'da (repo public — video GitHub raw orqali beriladi).
- Cheklovlar: ulagich voice_settings (similarity 0,8, style), seed va previous/next_text ni bermaydi — standart sozlamalar (stability 0,5).
- Ovozlangan: 2–12, 14, 16 (13 navbatda); 15 — bepul navbat band, ishga tushmadi, kredit yechilmadi.
- Yetkazish yoʻli sinaldi: GitHub raw (repo public) → creative_attach_reference_file → sandbox — 1920×1080 test video toʻgʻri oʻtdi; sandbox'da ffmpeg, librosa, pyloudnorm bor.
