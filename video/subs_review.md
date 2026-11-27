# Subtitr cue tekshiruvi (subs_review.md)

Har bir cue alohida oʻqildi: maʼnosi oʻzicha tushunarlimi, 3–8 soʻz, ≤2 qator × 42 belgi, bitta cue ichida ikki gap yoʻq, son+birlik / ism qismlari / sifat+ot / ot+koʻmakchi / inkor+feʼl ajratilmagan. Avtomatik tekshiruv: `tools/lint_script.py` (soʻz soni, qatorlar, gaplar, ʻ/ʼ belgilar, ovoz ↔ subtitr soʻzlari mosligi) — **0 muammo**.

## Tuzatilgan cue'lar (koʻrib chiqish davomida)

| Sahna | Oldin | Keyin | Sabab |
|---|---|---|---|
| 2 | oxirida esa 15 ta. | oxirida esa 15 ta boʻldi. | feʼlsiz qoldiq, alohida oʻqilganda yarim gap edi |
| 4 | Paxta sugʻorilishi sabab Orol dengizi qurib qoldi. | Paxtani sugʻorish sababli Orol dengizi deyarli qurib qoldi. | grammatika + aniqlik (dengiz toʻliq qurimagan) |
| 4 | Saksoninchi yillarda … koʻprogʻi / shu yerda yetishtirilgan. | Ittifoq paxtasining 60 foizdan koʻprogʻi shu yerda edi. | ega va kesim ikki cue'ga boʻlingan edi |
| 9 | Yigirma birinchi dekabrda yana 11 respublika qoʻshildi | 21-dekabrda buni 11 respublika tasdiqladi. | fakt xatosi: 11 ta ichida dastlabki 3 tasi ham bor |
| 10 | … 300 millionga yaqin odam bor. | … 300 millionga yaqin odam yashaydi. | tabiiyroq ifoda |
| 12 | Bu 23 baravar demak. | Farq qariyb 23 baravar. | gʻaliz ifoda; "qariyb" — 22,9 baravar |
| 14 | 5 tasi Rossiya bilan iqtisodiy ittifoqda. | 4 tasi Rossiya bilan iqtisodiy ittifoqda. | fakt xatosi: YeOII = Rossiya + 4 |
| 19 | Kichiklar buni xavfli deb biladi. | Kichik respublikalar buni xavfli deb biladi. | "kichiklar" bolalar deb tushunilishi mumkin |
| 26 | Litvaliklar qaytishni orqaga qadam deb biladi. | Koʻp litvaliklar … | butun xalq nomidan gapirmaslik |
| 37 | … taʼsirini ham saqlaydi. | … taʼsirini ham saqlashga intiladi. | taxminni fakt kabi aytmaslik |
| 38 | Umumiy pulni bitta markaziy bank chiqaradi | Ichkarida esa umumiy pulni … | oldingi sahna bilan bogʻlovchi |
| 40 | Kuchli tomon esa energiya. | Ittifoqning kuchli tomoni esa energiya. | alohida oʻqilganda kimning? degan savol |
| 48 | … 15 milliard dollar keldi. | … 15 milliard dollar pul oʻtkazildi. | nima kelgani aniq emas edi |
| 52 | biz lotinchaga 93-yilda oʻtganmiz | lotin yozuviga 93-yilda oʻta boshlaganmiz | "lotincha" til deb tushuniladi; oʻtish hali tugamagan (R43) |
| 63 | Kambagʻalroqlar bozor va yordam oladi, | Kambagʻalroq respublikalar … | aniqlik |
| 7, 8, 9, 14, 17, 35, 43, 46, 55, 61 | bitta cue ichida ikki gap | gaplar alohida cue'larga yoki bittaga birlashtirildi | "cue ikki gapni oʻz ichiga olmaydi" qoidasi |
| 39, 43, 46, 56 | 9–13 soʻzli cue'lar | ≤ 8 soʻz | soʻz chegarasi |

## Imlo va grammatika

- Barcha oʻ, gʻ — U+02BB (ʻ); tutuq belgisi — U+02BC (ʼ): eʼlon, aʼzo, taʼsir, taʼlim, qatʼiy. ASCII apostrof yoʻq (linter tekshiradi).
- Ovoz matnida raqam yoʻq; yillar va sonlar soʻz bilan ("bir ming toʻqqiz yuz yigirma ikkinchi", "yetti butun oʻndan uch"). "SSSR" ovozda — "Sovet Ittifoqi"; MDH — "Mustaqil Davlatlar Hamdoʻstligi"; NATO — oʻzicha oʻqiladi.
- "Siz" murojaati (sahna 15, 70), qisqa gaplar, rus kalkalari yoʻq.

## Barcha cue'lar

| Sahna | # | Cue (ekranda) | Soʻz | Qatorlar | Holat |
|---|---|---|---|---|---|
| 2 FAKT | 1 | Sovet Ittifoqi 1922-yilda tuzilgan. | 4 | 1 | OK |
| 2 FAKT | 2 | Boshida 4 ta respublika boʻlgan, | 5 | 1 | OK |
| 2 FAKT | 3 | oxirida esa 15 ta boʻldi. | 5 | 1 | OK |
| 3 FAKT | 1 | Unda qariyb 287 million odam yashagan. | 6 | 1 | OK |
| 3 FAKT | 2 | Ulardan 20 millionga yaqini Oʻzbekistonda edi. | 6 | 2 | OK |
| 3 FAKT | 3 | Hammasi bitta pul — rubl ishlatardi. | 6 | 1 | OK |
| 4 FAKT | 1 | Oʻzbekistonning vazifasi esa paxta edi. | 5 | 1 | OK |
| 4 FAKT | 2 | Ittifoq paxtasining 60 foizdan koʻprogʻi shu yerda edi. | 8 | 2 | OK |
| 4 FAKT | 3 | Paxtani sugʻorish sababli Orol dengizi deyarli qurib qoldi. | 8 | 2 | OK |
| 5 FAKT | 1 | 80-yillar oxirida tizim qiynala boshladi. | 5 | 1 | OK |
| 5 FAKT | 2 | Neft arzonlashdi, davlatning valyuta tushumi kamaydi. | 6 | 2 | OK |
| 5 FAKT | 3 | Doʻkonlar boʻshab qoldi. | 3 | 1 | OK |
| 6 FAKT | 1 | Keyin narxlar ham koʻtarildi, | 4 | 1 | OK |
| 6 FAKT | 2 | chunki hukumat koʻproq pul bosdi. | 5 | 1 | OK |
| 6 FAKT | 3 | 90-yilda iqtisodiyot qisqara boshladi. | 4 | 1 | OK |
| 7 FAKT | 1 | Shu paytda birinchi boʻlib Litva mustaqillik eʼlon qildi. | 8 | 2 | OK |
| 7 FAKT | 2 | Keyingi yil martida Ittifoq taqdiri boʻyicha referendum boʻldi. | 8 | 2 | OK |
| 7 FAKT | 3 | 15 respublikadan 6 tasi unda qatnashmadi. | 6 | 1 | OK |
| 8 FAKT | 1 | Avgustda Moskvada bir guruh rahbarlar hokimiyatni olishga urindi, | 8 | 2 | OK |
| 8 FAKT | 2 | lekin 3 kunda magʻlub boʻldi. | 5 | 1 | OK |
| 8 FAKT | 3 | 31-avgustda Oʻzbekiston mustaqillik eʼlon qildi. | 5 | 2 | OK |
| 9 FAKT | 1 | 8-dekabrda esa 3 respublika Ittifoq tugaganini eʼlon qildi. | 8 | 2 | OK |
| 9 FAKT | 2 | 21-dekabrda buni 11 respublika tasdiqladi. | 5 | 1 | OK |
| 9 FAKT | 3 | Yil oxirida Ittifoq rasman tugadi. | 5 | 1 | OK |
| 10 FAKT | 1 | Oʻshandan beri 35 yilcha oʻtdi. | 5 | 1 | OK |
| 10 FAKT | 2 | Bugun 15 davlatda 300 millionga yaqin odam yashaydi. | 8 | 2 | OK |
| 10 FAKT | 3 | Eng kattasi Rossiya, eng kichigi Estoniya. | 6 | 1 | OK |
| 11 FAKT | 1 | Nisbatlar ham oʻzgardi. | 3 | 1 | OK |
| 11 FAKT | 2 | Avval har 14 sovet fuqarosidan biri oʻzbekistonlik edi. | 8 | 2 | OK |
| 11 FAKT | 3 | Bugun esa har 8 kishidan biri oʻzbekistonlik. | 7 | 2 | OK |
| 12 FAKT | 1 | Eng katta farq esa daromadda. | 5 | 1 | OK |
| 12 FAKT | 2 | Estoniyada jon boshiga qariyb 33 ming dollar, | 7 | 2 | OK |
| 12 FAKT | 3 | Tojikistonda esa 1 400 dollar atrofida. | 6 | 1 | OK |
| 12 FAKT | 4 | Farq qariyb 23 baravar. | 4 | 1 | OK |
| 13 FAKT | 1 | Oʻzbekistonda bu raqam 3 500 dollar atrofida. | 7 | 2 | OK |
| 13 FAKT | 2 | Qozogʻistonda esa u hatto Rossiyadan ham yuqori. | 7 | 2 | OK |
| 14 FAKT | 1 | Ittifoqlarda ham farq bor: Boltiqboʻyi NATOda. | 6 | 2 | OK |
| 14 FAKT | 2 | 4 tasi Rossiya bilan iqtisodiy ittifoqda. | 6 | 1 | OK |
| 14 FAKT | 3 | Oʻzbekiston esa unda kuzatuvchi. | 4 | 1 | OK |
| 15 TAXMIN | 1 | Endi tasavvur qiling: ular yana birlashsa-chi? | 6 | 2 | OK |
| 15 TAXMIN | 2 | Faqat tinch yoʻl bilan, referendum orqali. | 6 | 1 | OK |
| 16 TAXMIN | 1 | Lekin kim bunga rozi boʻladi? | 5 | 1 | OK |
| 16 TAXMIN | 2 | Hozir ayrim davlatlar aksincha ittifoqlardan chiqmoqda. | 6 | 2 | OK |
| 16 TAXMIN | 3 | Shuning uchun bu prognoz emas, fikriy tajriba. | 7 | 2 | OK |
| 17 TAXMIN | 1 | Faraz qilaylik, hamma rozi boʻldi. | 5 | 1 | OK |
| 17 TAXMIN | 2 | Yangi ittifoqda umumiy bozor, pul va mudofaa boʻladi. | 8 | 2 | OK |
| 18 TAXMIN | 1 | Respublikalar oʻz tili va parlamentini saqlaydi, | 6 | 2 | OK |
| 18 TAXMIN | 2 | lekin muhim qarorlar umumiy markazda qabul qilinadi. | 7 | 2 | OK |
| 18 TAXMIN | 3 | Bahs shu yerda boshlanadi. | 4 | 1 | OK |
| 19 TAXMIN | 1 | Masalan, ovozlar qanday taqsimlanadi? | 4 | 1 | OK |
| 19 TAXMIN | 2 | Aholiga qarab boʻlinsa, Rossiya deyarli yarmini oladi. | 7 | 2 | OK |
| 19 TAXMIN | 3 | Kichik respublikalar buni xavfli deb biladi. | 6 | 2 | OK |
| 20 TAXMIN | 1 | Davlatma-davlat koʻrsak, Rossiya yetakchilik qiladi, | 5 | 2 | OK |
| 20 TAXMIN | 2 | lekin kambagʻalroq aʼzolarni ham moliyalaydi. | 5 | 2 | OK |
| 20 TAXMIN | 3 | Koʻp rossiyaliklar bu yukni ogʻir deb biladi. | 7 | 2 | OK |
| 21 TAXMIN | 1 | Ukraina uchun esa bu eng ogʻir savol. | 7 | 1 | OK |
| 21 TAXMIN | 2 | Rossiya bilan urush bu yoʻlni deyarli yopgan. | 7 | 2 | OK |
| 21 TAXMIN | 3 | Koʻp ukrainaliklar buni mustaqillik yoʻqolishi deb biladi. | 7 | 2 | OK |
| 22 TAXMIN | 1 | Belarus esa bunga eng tayyor davlat. | 6 | 1 | OK |
| 22 TAXMIN | 2 | U allaqachon Rossiya bilan ittifoqda. | 5 | 1 | OK |
| 22 TAXMIN | 3 | Lekin mustaqil qaror imkoni yana torayadi. | 6 | 1 | OK |
| 23 TAXMIN | 1 | Moldova aksincha, Yevropaga qarab ketmoqda. | 5 | 2 | OK |
| 23 TAXMIN | 2 | U Mustaqil Davlatlar Hamdoʻstligidan chiqishga qaror qilgan. | 7 | 2 | OK |
| 23 TAXMIN | 3 | Bu savol jamiyatni ikkiga boʻladi. | 5 | 1 | OK |
| 24 TAXMIN | 1 | Boltiqboʻyidagi Estoniya eng boy respublika boʻlardi. | 6 | 2 | OK |
| 24 TAXMIN | 2 | U yevrodan, Yevropa Ittifoqidan va NATOdan chiqadi. | 7 | 2 | OK |
| 25 TAXMIN | 1 | Latviyada yevrodan yangi pulga oʻtish narxlarni beqaror qiladi. | 8 | 2 | OK |
| 25 TAXMIN | 2 | Biznes Yevropa bozoridan ayrilishdan qoʻrqadi. | 5 | 2 | OK |
| 26 TAXMIN | 1 | Litva esa Ittifoqdan birinchi boʻlib chiqqan edi. | 7 | 2 | OK |
| 26 TAXMIN | 2 | Bugun u daromad boʻyicha 2-oʻrinda. | 5 | 1 | OK |
| 26 TAXMIN | 3 | Koʻp litvaliklar qaytishni orqaga qadam deb biladi. | 7 | 2 | OK |
| 27 TAXMIN | 1 | Kavkazdagi Gruziya esa Hamdoʻstlikdan allaqachon chiqqan. | 6 | 2 | OK |
| 27 TAXMIN | 2 | Qaytish Yevropa yoʻlidan voz kechish boʻladi, | 6 | 2 | OK |
| 27 TAXMIN | 3 | lekin mahsulotlariga katta bozor ochiladi. | 5 | 1 | OK |
| 28 TAXMIN | 1 | Qoʻshni Armaniston iqtisodiy ittifoq aʼzosi, | 5 | 2 | OK |
| 28 TAXMIN | 2 | lekin harbiy ittifoqdagi ishtirokini muzlatgan. | 5 | 2 | OK |
| 28 TAXMIN | 3 | U xavfsizlik va mustaqil siyosat orasida tanlaydi. | 7 | 2 | OK |
| 29 TAXMIN | 1 | Ozarbayjon esa neft va gazi bilan kuchli. | 7 | 1 | OK |
| 29 TAXMIN | 2 | Ittifoqda u daromadini boshqalar bilan boʻlishadi. | 6 | 2 | OK |
| 30 TAXMIN | 1 | Markaziy Osiyoda eng boy davlat — Qozogʻiston. | 7 | 2 | OK |
| 30 TAXMIN | 2 | Neft pulining bir qismi umumiy byudjetga ketadi, | 7 | 2 | OK |
| 30 TAXMIN | 3 | lekin u ittifoqning ikkinchi kuchli markaziga aylanadi. | 7 | 2 | OK |
| 31 TAXMIN | 1 | Qirgʻiziston esa allaqachon ikkala ittifoqda. | 5 | 2 | OK |
| 31 TAXMIN | 2 | Uning yutugʻi — migrantlar uchun qulaylik, | 6 | 1 | OK |
| 31 TAXMIN | 3 | yoʻqotishi — savdo qoidalarini oʻzi belgilash imkoni. | 7 | 2 | OK |
| 32 TAXMIN | 1 | Tojikiston esa roʻyxatdagi eng kambagʻal davlat. | 6 | 2 | OK |
| 32 TAXMIN | 2 | U ittifoqdan eng koʻp yordam oladi, | 6 | 1 | OK |
| 32 TAXMIN | 3 | ammo qarorlarga taʼsiri eng kam boʻladi. | 6 | 1 | OK |
| 33 TAXMIN | 1 | Turkmaniston esa betaraflikni tanlagan. | 4 | 1 | OK |
| 33 TAXMIN | 2 | Ittifoq unga gaz uchun katta bozor beradi, | 7 | 1 | OK |
| 33 TAXMIN | 3 | lekin uning betarafligi tugaydi. | 4 | 1 | OK |
| 34 TAXMIN | 1 | Va nihoyat, Oʻzbekiston — eng yirik respublikalardan biri. | 8 | 2 | OK |
| 34 TAXMIN | 2 | Unga keyinroq qaytamiz, avval dunyoga qaraylik. | 6 | 2 | OK |
| 35 TAXMIN | 1 | Gʻarb uchun Boltiqboʻyining NATOdan chiqishi xavfsizlikni oʻzgartiradi. | 7 | 2 | OK |
| 35 TAXMIN | 2 | Shuning uchun Gʻarb yangi ittifoqdan xavotirga tushadi. | 7 | 2 | OK |
| 36 TAXMIN | 1 | Xavotir esa koʻpincha sanksiyaga aylanadi. | 5 | 1 | OK |
| 36 TAXMIN | 2 | Cheklovlar bizga ham tegishi mumkin. | 5 | 1 | OK |
| 36 TAXMIN | 3 | Bu eksport va bank toʻlovlarini qiyinlashtiradi. | 6 | 2 | OK |
| 37 TAXMIN | 1 | Sharqda esa Xitoy turibdi. | 4 | 1 | OK |
| 37 TAXMIN | 2 | U bugun Oʻzbekistonning birinchi savdo hamkori. | 6 | 2 | OK |
| 37 TAXMIN | 3 | Xitoy savdoni davom ettiradi, taʼsirini ham saqlashga intiladi. | 8 | 2 | OK |
| 38 TAXMIN | 1 | Ichkarida esa umumiy pulni bitta markaziy bank chiqaradi | 8 | 2 | OK |
| 38 TAXMIN | 2 | va hamma uchun bitta foiz stavkasini belgilaydi. | 7 | 2 | OK |
| 39 TAXMIN | 1 | Yevro hududi buni boshdan kechirgan: | 5 | 1 | OK |
| 39 TAXMIN | 2 | Boy va kambagʻal iqtisodga bitta stavka mos kelmaydi. | 8 | 2 | OK |
| 40 TAXMIN | 1 | Ittifoqning kuchli tomoni esa energiya. | 5 | 1 | OK |
| 40 TAXMIN | 2 | Rossiya, Qozogʻiston, Turkmaniston va Ozarbayjon neft-gazga boy. | 7 | 2 | OK |
| 40 TAXMIN | 3 | Blok ichida yoqilgʻi arzonlashishi mumkin. | 5 | 1 | OK |
| 41 TAXMIN | 1 | Ammo bu boylik siyosiy dastakka ham aylanadi. | 7 | 2 | OK |
| 41 TAXMIN | 2 | Bu Yevropa va Osiyo bilan yangi bahs keltiradi. | 8 | 2 | OK |
| 42 TAXMIN | 1 | Chegaralar ham oʻzgaradi. | 3 | 1 | OK |
| 42 TAXMIN | 2 | Ichki chegaralar yoʻqoladi, tashqisi qattiqlashadi. | 5 | 2 | OK |
| 42 TAXMIN | 3 | Afgʻoniston bilan chegaramiz ittifoq chegarasiga aylanadi. | 6 | 2 | OK |
| 43 FAKT | 1 | Oʻzbekistonda birinchi oʻzgarish pulda boʻladi. | 5 | 2 | OK |
| 43 FAKT | 2 | 94-yildan beri bizda oʻz pulimiz — soʻm bor. | 8 | 2 | OK |
| 43 FAKT | 3 | Ittifoqda u umumiy pulga almashadi. | 5 | 1 | OK |
| 44 TAXMIN | 1 | Pul oʻzgarsa, narxlar ham oʻzgaradi. | 5 | 1 | OK |
| 44 TAXMIN | 2 | Narxlar boy qoʻshnilarga qarab koʻtariladi, | 5 | 2 | OK |
| 44 TAXMIN | 3 | maoshlar esa ularga sekinroq yetib boradi. | 6 | 1 | OK |
| 45 FAKT | 1 | Holbuki, oʻtgan yili inflyatsiya 7,3 foizga tushdi. | 7 | 2 | OK |
| 45 FAKT | 2 | Ittifoqda bu jarayonni oʻzimiz boshqara olmaymiz. | 6 | 2 | OK |
| 46 FAKT | 1 | Oʻtgan yili oʻrtacha oylik 6,4 million soʻm boʻldi. | 8 | 2 | OK |
| 46 FAKT | 2 | Bu 500 dollardan sal koʻproq. | 5 | 1 | OK |
| 46 FAKT | 3 | Oʻqituvchi va shifokorlar esa kamroq oladi. | 6 | 2 | OK |
| 47 TAXMIN | 1 | Ittifoqda maoshlar bir pulda solishtiriladi. | 5 | 2 | OK |
| 47 TAXMIN | 2 | Farqni koʻrgan odamlar yaxshi maosh tomon koʻchadi. | 7 | 2 | OK |
| 48 FAKT | 1 | 2024-yilda chetdan qariyb 15 milliard dollar pul oʻtkazildi. | 8 | 2 | OK |
| 48 FAKT | 2 | Uning toʻrtdan uch qismidan koʻprogʻi Rossiyadan. | 6 | 2 | OK |
| 49 TAXMIN | 1 | Ittifoqda migrantlar hayoti yengillashadi. | 4 | 1 | OK |
| 49 TAXMIN | 2 | Patent va roʻyxatdan oʻtish muammolari yoʻqoladi. | 6 | 2 | OK |
| 49 TAXMIN | 3 | Ular oʻz yurtidagidek ishlaydi. | 4 | 1 | OK |
| 50 TAXMIN | 1 | Ammo buning teskari tomoni ham bor. | 6 | 1 | OK |
| 50 TAXMIN | 2 | Gʻayratli yoshlarning ketishi osonlashadi, | 4 | 1 | OK |
| 50 TAXMIN | 3 | qishloqlarda esa ishchi qoʻllar kamayadi. | 5 | 1 | OK |
| 51 FAKT | 1 | Tilga kelsak, oʻzbek tili 89-yildan beri davlat tili. | 8 | 2 | OK |
| 51 FAKT | 2 | Ittifoqqa esa umumiy ish tili kerak boʻladi, | 7 | 2 | OK |
| 51 FAKT | 3 | va bu, ehtimol, rus tili boʻladi. | 6 | 1 | OK |
| 52 FAKT | 1 | Alifbo ham muhim: lotin yozuviga 93-yilda oʻta boshlaganmiz. | 8 | 2 | OK |
| 52 FAKT | 2 | Umumiy hujjatlar kirillda boʻlsa, bu oʻtish sekinlashadi. | 7 | 2 | OK |
| 53 FAKT | 1 | Maktabda hozir 11 yillik bepul taʼlim bor. | 7 | 1 | OK |
| 53 FAKT | 2 | Ittifoqda dasturlar umumiy standartga moslashadi. | 5 | 2 | OK |
| 54 TAXMIN | 1 | Maktabdan keyin esa imkoniyat kengayadi. | 5 | 1 | OK |
| 54 TAXMIN | 2 | Talabalar istalgan respublikada oʻqiy oladi. | 5 | 2 | OK |
| 55 FAKT | 1 | Din esa Sovet davrida qattiq cheklangan edi. | 7 | 2 | OK |
| 55 FAKT | 2 | Bugun aholimizning aksariyati musulmon. | 4 | 1 | OK |
| 55 FAKT | 3 | Shartnomada vijdon erkinligi qatʼiy yozilishi kerak. | 6 | 2 | OK |
| 56 FAKT | 1 | Sovet davrida chet elga chiqishga ruxsat kerak edi. | 8 | 2 | OK |
| 56 FAKT | 2 | Yangi ittifoqda ichki safarlar osonlashadi. | 5 | 2 | OK |
| 57 TAXMIN | 1 | Bugun esa koʻp davlat fuqarolari bizga vizasiz keladi. | 8 | 2 | OK |
| 57 TAXMIN | 2 | Umumiy viza siyosati bu ochiqlikni toraytirishi mumkin. | 7 | 2 | OK |
| 58 TAXMIN | 1 | Biznes uchun esa ulkan bozor ochiladi. | 6 | 1 | OK |
| 58 TAXMIN | 2 | 300 million xaridorga bojsiz yetib borish mumkin. | 7 | 2 | OK |
| 59 TAXMIN | 1 | Lekin katta bozor — katta raqobat degani. | 7 | 1 | OK |
| 59 TAXMIN | 2 | Mulk huquqi himoyalanmasa, mahalliy biznes zarar koʻradi. | 7 | 2 | OK |
| 60 FAKT | 1 | Armiyada Sovet davrida xizmat 2 yil edi, | 7 | 1 | OK |
| 60 FAKT | 2 | bugun esa 12 oy. | 4 | 1 | OK |
| 60 FAKT | 3 | Umumiy armiyada muddatni markaz belgilaydi. | 5 | 2 | OK |
| 61 TAXMIN | 1 | Jamlasak, yutuqlar: katta bozor, migrantlarga qulaylik, | 6 | 2 | OK |
| 61 TAXMIN | 2 | arzon energiya va umumiy xavfsizlik. | 5 | 1 | OK |
| 62 TAXMIN | 1 | Yoʻqotishlar: oʻz pulimiz va mustaqil tashqi siyosat. | 7 | 2 | OK |
| 62 TAXMIN | 2 | Yana xom ashyo yetkazuvchisiga aylanish xavfi bor. | 7 | 2 | OK |
| 63 TAXMIN | 1 | Butun ittifoqda kim yutadi? | 4 | 1 | OK |
| 63 TAXMIN | 2 | Kambagʻalroq respublikalar bozor va yordam oladi, | 6 | 2 | OK |
| 63 TAXMIN | 3 | Rossiya esa katta taʼsir oladi. | 5 | 1 | OK |
| 64 TAXMIN | 1 | Kim esa yutqazadi? | 3 | 1 | OK |
| 64 TAXMIN | 2 | Boltiqboʻyi Yevropa bozoridan ajraladi. | 4 | 1 | OK |
| 64 TAXMIN | 3 | Gruziya va Moldova tanlagan yoʻlidan voz kechadi. | 7 | 2 | OK |
| 65 TAXMIN | 1 | Bir voqeaga har xalq turlicha qaraydi. | 6 | 1 | OK |
| 65 TAXMIN | 2 | Kimdir buni eski qoʻshnilar uchrashuvi deb biladi, | 7 | 2 | OK |
| 65 TAXMIN | 3 | boshqasi uchun esa bu mustaqillikni yoʻqotish. | 6 | 2 | OK |
| 66 TAXMIN | 1 | Xoʻsh, nega tarix orqaga qaytmaydi? | 5 | 1 | OK |
| 66 TAXMIN | 2 | 91-yildan beri yangi avlod ulgʻaydi. | 5 | 1 | OK |
| 66 TAXMIN | 3 | Ular uchun mustaqillik odatiy hol. | 5 | 1 | OK |
| 67 TAXMIN | 1 | Har davlatda oʻz puli, armiyasi va ittifoqlari bor. | 8 | 2 | OK |
| 67 TAXMIN | 2 | Ularni bekor qilish yaratishdan ham qiyin. | 6 | 1 | OK |
| 68 TAXMIN | 1 | Tarqalgan ittifoqlar tarixda deyarli qayta tiklanmagan. | 6 | 2 | OK |
| 68 TAXMIN | 2 | Xalqlar esa savdo va doʻstlik orqali yaqinlashadi. | 7 | 2 | OK |
| 69 TAXMIN | 1 | Xulosa: bunday ittifoq bizga ham imkoniyat, ham xavf. | 8 | 2 | OK |
| 69 TAXMIN | 2 | Bozor kengayadi, lekin mustaqil qaror imkoni torayadi. | 7 | 2 | OK |
| 70 TAXMIN | 1 | Endi navbat sizga. | 3 | 1 | OK |
| 70 TAXMIN | 2 | Siz bunday ittifoqqa ha deb ovoz bergan boʻlarmidingiz? | 8 | 2 | OK |
| 70 TAXMIN | 3 | Javobingizni izohlarda yozing. | 3 | 1 | OK |

Jami: 69 sahna, 182 cue. **Ochiq muammolar: 0.**
