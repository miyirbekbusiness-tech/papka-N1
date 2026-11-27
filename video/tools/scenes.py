# Scene table (executed by build_script.py). sc(id, type, sources, background, kind, visual, labels, cues)
# labels: (text, cue_index, trigger_word_in_say) ; cues: (say, sub, keyword_in_sub)
C = 'Corner: TAXMINIY SSENARIY.'

# ---------- 2–4 What the USSR was ----------
sc(2, 'FAKT', ['R01', 'R02'], 'jigarrang', 'timeline',
   'Archive paper timeline: 1922 pin drops, 4 republics light up on a small map, then it fills to 15. Host (thinking) at right.',
   [('1922', 0, 'ikkinchi'), ('4 respublika', 1, 'boʻlgan'), ('15 respublika', 2, 'beshta')],
   [('Sovet Ittifoqi bir ming toʻqqiz yuz yigirma ikkinchi yilda tuzilgan.', 'Sovet Ittifoqi 1922-yilda tuzilgan.', '1922-yilda'),
    ('Boshida toʻrtta respublika boʻlgan,', 'Boshida 4 ta respublika boʻlgan,', None),
    ('oxirida esa oʻn beshta boʻldi.', 'oxirida esa 15 ta boʻldi.', '15 ta')])

sc(3, 'FAKT', ['R03', 'R04', 'R51'], 'krem', 'map',
   'USSR map, 15 republics outlined, Uzbekistan green. Counter ticks to 287 mln; a single rouble coin icon.',
   [('287 mln', 0, 'million'), ('Oʻzbekiston ~20 mln', 1, 'Oʻzbekistonda'), ('yagona rubl', 2, 'rubl')],
   [('Unda qariyb ikki yuz sakson yetti million odam yashagan.', 'Unda qariyb 287 million odam yashagan.', '287 million'),
    ('Ulardan yigirma millionga yaqini Oʻzbekistonda edi.', 'Ulardan 20 millionga yaqini Oʻzbekistonda edi.', 'Oʻzbekistonda'),
    ('Hammasi bitta pul — rubl ishlatardi.', 'Hammasi bitta pul — rubl ishlatardi.', 'rubl')])

sc(4, 'FAKT', ['R05', 'R06'], 'yashil', 'scene',
   'Cotton field to the horizon, host in a cap (worried); camera pans to the Aral Sea: old and new coastlines.',
   [('Ittifoq paxtasining 60%+ (80-yillar)', 1, 'foizdan'), ('Orol dengizi', 2, 'Orol')],
   [('Oʻzbekistonning vazifasi esa paxta edi.', 'Oʻzbekistonning vazifasi esa paxta edi.', 'paxta'),
    ('Ittifoq paxtasining oltmish foizdan koʻprogʻi shu yerda edi.', 'Ittifoq paxtasining 60 foizdan koʻprogʻi shu yerda edi.', '60 foizdan'),
    ('Paxtani sugʻorish sababli Orol dengizi deyarli qurib qoldi.', 'Paxtani sugʻorish sababli Orol dengizi deyarli qurib qoldi.', 'Orol dengizi')])

# ---------- 5–9 Why it fell ----------
sc(5, 'FAKT', ['R10', 'R11'], 'jigarrang', 'chart',
   'Archive style: oil barrel with a falling price arrow; then an empty shop shelf, host worried.',
   [('neft arzonlashdi', 1, 'arzonlashdi'), ('taqchillik', 2, 'boʻshab')],
   [('Saksoninchi yillar oxirida tizim qiynala boshladi.', '80-yillar oxirida tizim qiynala boshladi.', 'qiynala'),
    ('Neft arzonlashdi, davlatning valyuta tushumi kamaydi.', 'Neft arzonlashdi, davlatning valyuta tushumi kamaydi.', 'Neft'),
    ('Doʻkonlar boʻshab qoldi.', 'Doʻkonlar boʻshab qoldi.', 'boʻshab')])

sc(6, 'FAKT', ['R11', 'R12'], 'toʻq sariq', 'chart',
   'Printing press stamping notes; a price tag rising; an output line bending down at 1990.',
   [('narxlar ↑', 0, 'koʻtarildi'), ('pul bosildi', 1, 'bosdi'), ('1990: pasayish', 2, 'qisqara')],
   [('Keyin narxlar ham koʻtarildi,', 'Keyin narxlar ham koʻtarildi,', 'narxlar'),
    ('chunki hukumat koʻproq pul bosdi.', 'chunki hukumat koʻproq pul bosdi.', 'pul bosdi'),
    ('Toʻqsoninchi yilda iqtisodiyot qisqara boshladi.', '90-yilda iqtisodiyot qisqara boshladi.', 'qisqara')])

sc(7, 'FAKT', ['R13', 'R52'], 'krem', 'map',
   'USSR map: Lithuania pulses first; then 6 republics turn grey (did not take part in the March 1991 referendum).',
   [('Litva, 1990', 0, 'Litva'), ('1991, mart', 1, 'martida'), ('6 respublika qatnashmadi', 2, 'qatnashmadi')],
   [('Shu paytda birinchi boʻlib Litva mustaqillik eʼlon qildi.', 'Shu paytda birinchi boʻlib Litva mustaqillik eʼlon qildi.', 'Litva'),
    ('Keyingi yil martida Ittifoq taqdiri boʻyicha referendum boʻldi.', 'Keyingi yil martida Ittifoq taqdiri boʻyicha referendum boʻldi.', 'referendum'),
    ('Oʻn besh respublikadan oltitasi unda qatnashmadi.', '15 respublikadan 6 tasi unda qatnashmadi.', '6 tasi')])

sc(8, 'FAKT', ['R14', 'R18'], 'tun', 'scene',
   'Night Moscow skyline silhouette; calendar flips 19–21 August; then Tashkent at dawn with a 31 August date card. No weapons, no people portraits.',
   [('1991, avgust', 0, 'Avgustda'), ('3 kun', 1, 'kunda'), ('31-avgust', 2, 'avgustda')],
   [('Avgustda Moskvada bir guruh rahbarlar hokimiyatni olishga urindi,', 'Avgustda Moskvada bir guruh rahbarlar hokimiyatni olishga urindi,', 'Avgustda'),
    ('lekin uch kunda magʻlub boʻldi.', 'lekin 3 kunda magʻlub boʻldi.', '3 kunda'),
    ('Oʻttiz birinchi avgustda Oʻzbekiston mustaqillik eʼlon qildi.', '31-avgustda Oʻzbekiston mustaqillik eʼlon qildi.', '31-avgustda')])

sc(9, 'FAKT', ['R15', 'R16', 'R17'], 'osmon', 'timeline',
   'December calendar with pins 8 → 21 → end of month; a plain red flag lowers and 15 colour chips rise.',
   [('8-dekabr', 0, 'Sakkizinchi'), ('21-dekabr', 1, 'birinchi'), ('dekabr oxiri', 2, 'tugadi')],
   [('Sakkizinchi dekabrda esa uch respublika Ittifoq tugaganini eʼlon qildi.', '8-dekabrda esa 3 respublika Ittifoq tugaganini eʼlon qildi.', '8-dekabrda'),
    ('Yigirma birinchi dekabrda buni oʻn bir respublika tasdiqladi.', '21-dekabrda buni 11 respublika tasdiqladi.', '11 respublika'),
    ('Yil oxirida Ittifoq rasman tugadi.', 'Yil oxirida Ittifoq rasman tugadi.', 'tugadi')])

# ---------- 10–14 The 15 countries today ----------
sc(10, 'FAKT', ['R21', 'R22', 'R23', 'R24'], 'krem', 'map',
   'Modern map of the 15 countries in palette colours, Uzbekistan green; tags on the biggest and smallest; counter 300 mln.',
   [('~300 mln', 1, 'millionga'), ('Rossiya 143,5 mln', 2, 'Rossiya'), ('Estoniya 1,4 mln', 2, 'Estoniya')],
   [('Oʻshandan beri oʻttiz besh yilcha oʻtdi.', 'Oʻshandan beri 35 yilcha oʻtdi.', '35 yilcha'),
    ('Bugun oʻn besh davlatda uch yuz millionga yaqin odam yashaydi.', 'Bugun 15 davlatda 300 millionga yaqin odam yashaydi.', '300 millionga'),
    ('Eng kattasi Rossiya, eng kichigi Estoniya.', 'Eng kattasi Rossiya, eng kichigi Estoniya.', None)])

sc(11, 'FAKT', ['R25', 'R04', 'R23'], 'osmon', 'chart',
   'Two rows of people icons: "avval" 1 of 14 green; "bugun" 1 of 8 green. Host happy-surprised.',
   [('avval: 14 tadan 1', 1, 'biri'), ('bugun: 8 tadan 1', 2, 'biri')],
   [('Nisbatlar ham oʻzgardi.', 'Nisbatlar ham oʻzgardi.', 'Nisbatlar'),
    ('Avval har oʻn toʻrt sovet fuqarosidan biri oʻzbekistonlik edi.', 'Avval har 14 sovet fuqarosidan biri oʻzbekistonlik edi.', '14'),
    ('Bugun esa har sakkiz kishidan biri oʻzbekistonlik.', 'Bugun esa har 8 kishidan biri oʻzbekistonlik.', '8 kishidan')])

sc(12, 'FAKT', ['R26', 'R28'], 'toʻq sariq', 'chart',
   'Two bars: Estonia tall, Tajikistan tiny; a ×23 bracket springs between them. Host surprised.',
   [('Estoniya ~32 800 $', 1, 'dollar'), ('Tojikiston ~1 400 $', 2, 'atrofida'), ('×23', 3, 'baravar')],
   [('Eng katta farq esa daromadda.', 'Eng katta farq esa daromadda.', 'farq'),
    ('Estoniyada jon boshiga qariyb oʻttiz uch ming dollar,', 'Estoniyada jon boshiga qariyb 33 ming dollar,', '33 ming'),
    ('Tojikistonda esa bir ming toʻrt yuz dollar atrofida.', 'Tojikistonda esa 1 400 dollar atrofida.', '1 400'),
    ('Farq qariyb yigirma uch baravar.', 'Farq qariyb 23 baravar.', '23 baravar')])

sc(13, 'FAKT', ['R26'], 'yashil', 'chart',
   'Horizontal bar ranking of 15 countries; Uzbekistan bar green near the bottom; Kazakhstan bar just above Russia.',
   [('Oʻzbekiston ~3 500 $', 0, 'atrofida'), ('Qozogʻiston 14 770 $', 1, 'Qozogʻistonda'), ('Rossiya 14 260 $', 1, 'Rossiyadan')],
   [('Oʻzbekistonda bu raqam uch ming besh yuz dollar atrofida.', 'Oʻzbekistonda bu raqam 3 500 dollar atrofida.', '3 500'),
    ('Qozogʻistonda esa u hatto Rossiyadan ham yuqori.', 'Qozogʻistonda esa u hatto Rossiyadan ham yuqori.', 'Rossiyadan ham yuqori')])

sc(14, 'FAKT', ['R31', 'R32', 'R35'], 'krem', 'map',
   'Map with groups: Baltics in osmon (EU+NATO), the five EAEU members (Russia + 4) in toʻq sariq, Uzbekistan green with dashed outline (observer).',
   [('YeI + NATO', 0, 'NATOda'), ('Yevroosiyo iqtisodiy ittifoqi', 1, 'ittifoqda'), ('kuzatuvchi', 2, 'kuzatuvchi')],
   [('Ittifoqlarda ham farq bor: Boltiqboʻyi NATOda.', 'Ittifoqlarda ham farq bor: Boltiqboʻyi NATOda.', 'NATOda'),
    ('Toʻrttasi Rossiya bilan iqtisodiy ittifoqda.', '4 tasi Rossiya bilan iqtisodiy ittifoqda.', 'iqtisodiy ittifoqda'),
    ('Oʻzbekiston esa unda kuzatuvchi.', 'Oʻzbekiston esa unda kuzatuvchi.', 'kuzatuvchi')])

# ---------- 15–19 How a restoration could happen ----------
sc(15, 'TAXMIN', ['T01'], 'osmon', 'host',
   'Host close-up, eyes widen (surprised); behind him 15 country shapes slide together like puzzle pieces. ' + C,
   [('tinch yoʻl', 1, 'tinch'), ('referendum', 1, 'referendum')],
   [('Endi tasavvur qiling: ular yana birlashsa-chi?', 'Endi tasavvur qiling: ular yana birlashsa-chi?', 'birlashsa-chi'),
    ('Faqat tinch yoʻl bilan, referendum orqali.', 'Faqat tinch yoʻl bilan, referendum orqali.', 'referendum')])

sc(16, 'TAXMIN', ['T01', 'R33', 'R34'], 'toʻq sariq', 'host',
   'Host thinking under a big question mark; small cards fly out: "MDHdan chiqish", "ishtirok muzlatildi". ' + C,
   [('fikriy tajriba', 2, 'tajriba')],
   [('Lekin kim bunga rozi boʻladi?', 'Lekin kim bunga rozi boʻladi?', 'rozi'),
    ('Hozir ayrim davlatlar aksincha ittifoqlardan chiqmoqda.', 'Hozir ayrim davlatlar aksincha ittifoqlardan chiqmoqda.', 'chiqmoqda'),
    ('Shuning uchun bu prognoz emas, fikriy tajriba.', 'Shuning uchun bu prognoz emas, fikriy tajriba.', 'fikriy tajriba')])

sc(17, 'TAXMIN', ['T02'], 'krem', 'icons',
   'Three round icons pop in on cue words: market stall, coin, shield. ' + C,
   [('umumiy bozor', 1, 'bozor'), ('umumiy pul', 1, 'pul'), ('umumiy mudofaa', 1, 'mudofaa')],
   [('Faraz qilaylik, hamma rozi boʻldi.', 'Faraz qilaylik, hamma rozi boʻldi.', None),
    ('Yangi ittifoqda umumiy bozor, pul va mudofaa boʻladi.', 'Yangi ittifoqda umumiy bozor, pul va mudofaa boʻladi.', 'umumiy')])

sc(18, 'TAXMIN', ['T02', 'T06'], 'yashil', 'icons',
   'Row of 15 abstract colour chips (no real flags) keep their colours; arrows converge to a round table in the centre. ' + C,
   [('oʻz tili va parlamenti', 0, 'parlamentini'), ('umumiy markaz', 1, 'markazda')],
   [('Respublikalar oʻz tili va parlamentini saqlaydi,', 'Respublikalar oʻz tili va parlamentini saqlaydi,', 'saqlaydi'),
    ('lekin muhim qarorlar umumiy markazda qabul qilinadi.', 'lekin muhim qarorlar umumiy markazda qabul qilinadi.', 'umumiy markazda'),
    ('Bahs shu yerda boshlanadi.', 'Bahs shu yerda boshlanadi.', 'Bahs')])

sc(19, 'TAXMIN', ['R25', 'T02'], 'osmon', 'chart',
   'Pie chart of votes by population: Russia slice ~48% fills almost half; small slices for the rest; host worried. ' + C,
   [('Rossiya ~48%', 1, 'yarmini')],
   [('Masalan, ovozlar qanday taqsimlanadi?', 'Masalan, ovozlar qanday taqsimlanadi?', 'ovozlar'),
    ('Aholiga qarab boʻlinsa, Rossiya deyarli yarmini oladi.', 'Aholiga qarab boʻlinsa, Rossiya deyarli yarmini oladi.', 'yarmini'),
    ('Kichik respublikalar buni xavfli deb biladi.', 'Kichik respublikalar buni xavfli deb biladi.', 'xavfli')])

# ---------- 20–34 Consequences country by country ----------
sc(20, 'TAXMIN', ['R21', 'R26'], 'krem', 'map',
   'Map zooms to Russia (qizil fill). ' + C,
   [('Rossiya', 0, 'Rossiya'), ('yetakchilik', 0, 'yetakchilik'), ('moliyaviy yuk', 1, 'moliyalaydi')],
   [('Davlatma-davlat koʻrsak, Rossiya yetakchilik qiladi,', 'Davlatma-davlat koʻrsak, Rossiya yetakchilik qiladi,', 'yetakchilik'),
    ('lekin kambagʻalroq aʼzolarni ham moliyalaydi.', 'lekin kambagʻalroq aʼzolarni ham moliyalaydi.', 'moliyalaydi'),
    ('Koʻp rossiyaliklar bu yukni ogʻir deb biladi.', 'Koʻp rossiyaliklar bu yukni ogʻir deb biladi.', 'yukni')])

sc(21, 'TAXMIN', ['R50'], 'jigarrang', 'map',
   'Map pans to Ukraine (sariq fill); a closed gate icon between it and the union outline. No weapons drawn. ' + C,
   [('Ukraina', 0, 'Ukraina'), ('yoʻl deyarli yopiq', 1, 'yopgan')],
   [('Ukraina uchun esa bu eng ogʻir savol.', 'Ukraina uchun esa bu eng ogʻir savol.', 'Ukraina'),
    ('Rossiya bilan urush bu yoʻlni deyarli yopgan.', 'Rossiya bilan urush bu yoʻlni deyarli yopgan.', 'yopgan'),
    ('Koʻp ukrainaliklar buni mustaqillik yoʻqolishi deb biladi.', 'Koʻp ukrainaliklar buni mustaqillik yoʻqolishi deb biladi.', 'mustaqillik')])

sc(22, 'TAXMIN', ['R32', 'R33'], 'osmon', 'map',
   'Map to Belarus (pushti fill), already tied to Russia by two thin lines (economy, defence). ' + C,
   [('Belarus', 0, 'Belarus'), ('allaqachon ittifoqda', 1, 'ittifoqda')],
   [('Belarus esa bunga eng tayyor davlat.', 'Belarus esa bunga eng tayyor davlat.', 'Belarus'),
    ('U allaqachon Rossiya bilan ittifoqda.', 'U allaqachon Rossiya bilan ittifoqda.', 'ittifoqda'),
    ('Lekin mustaqil qaror imkoni yana torayadi.', 'Lekin mustaqil qaror imkoni yana torayadi.', 'torayadi')])

sc(23, 'TAXMIN', ['R34'], 'toʻq sariq', 'map',
   'Map to Moldova (osmon fill), arrow pointing west labelled Yevropa; two small groups of people facing opposite ways. ' + C,
   [('Moldova', 0, 'Moldova'), ('MDHdan chiqish', 1, 'chiqishga')],
   [('Moldova aksincha, Yevropaga qarab ketmoqda.', 'Moldova aksincha, Yevropaga qarab ketmoqda.', 'Yevropaga'),
    ('U Mustaqil Davlatlar Hamdoʻstligidan chiqishga qaror qilgan.', 'U Mustaqil Davlatlar Hamdoʻstligidan chiqishga qaror qilgan.', 'chiqishga'),
    ('Bu savol jamiyatni ikkiga boʻladi.', 'Bu savol jamiyatni ikkiga boʻladi.', 'ikkiga')])

sc(24, 'TAXMIN', ['R26', 'R29', 'R31'], 'krem', 'map',
   'Map to Estonia (osmon fill); three exit-door icons: €, YeI, NATO. ' + C,
   [('Estoniya', 0, 'Estoniya'), ('yevro, YeI, NATO', 1, 'NATOdan')],
   [('Boltiqboʻyidagi Estoniya eng boy respublika boʻlardi.', 'Boltiqboʻyidagi Estoniya eng boy respublika boʻlardi.', 'eng boy'),
    ('U yevrodan, Yevropa Ittifoqidan va NATOdan chiqadi.', 'U yevrodan, Yevropa Ittifoqidan va NATOdan chiqadi.', 'chiqadi')])

sc(25, 'TAXMIN', ['R29'], 'jigarrang', 'map',
   'Map to Latvia (sariq fill); a euro coin morphs into a blank new coin; price tags wobble. ' + C,
   [('Latviya', 0, 'Latviyada'), ('yevro → yangi pul', 0, 'pulga')],
   [('Latviyada yevrodan yangi pulga oʻtish narxlarni beqaror qiladi.', 'Latviyada yevrodan yangi pulga oʻtish narxlarni beqaror qiladi.', 'beqaror'),
    ('Biznes Yevropa bozoridan ayrilishdan qoʻrqadi.', 'Biznes Yevropa bozoridan ayrilishdan qoʻrqadi.', 'Yevropa bozoridan')])

sc(26, 'TAXMIN', ['R52', 'R26'], 'osmon', 'map',
   'Map to Lithuania (toʻq sariq fill); the 1990 archive pin returns; rank badge #2. ' + C,
   [('Litva', 0, 'Litva'), ('daromad: 2-oʻrin', 1, 'oʻrinda')],
   [('Litva esa Ittifoqdan birinchi boʻlib chiqqan edi.', 'Litva esa Ittifoqdan birinchi boʻlib chiqqan edi.', 'birinchi'),
    ('Bugun u daromad boʻyicha ikkinchi oʻrinda.', 'Bugun u daromad boʻyicha 2-oʻrinda.', '2-oʻrinda'),
    ('Koʻp litvaliklar qaytishni orqaga qadam deb biladi.', 'Koʻp litvaliklar qaytishni orqaga qadam deb biladi.', 'orqaga qadam')])

sc(27, 'TAXMIN', ['R34'], 'yashil', 'map',
   'Map pans south to the Caucasus, Georgia (pushti fill); mountain silhouettes; a small market stall icon. ' + C,
   [('Gruziya', 0, 'Gruziya'), ('2009: MDHdan chiqqan', 0, 'chiqqan')],
   [('Kavkazdagi Gruziya esa Hamdoʻstlikdan allaqachon chiqqan.', 'Kavkazdagi Gruziya esa Hamdoʻstlikdan allaqachon chiqqan.', 'chiqqan'),
    ('Qaytish Yevropa yoʻlidan voz kechish boʻladi,', 'Qaytish Yevropa yoʻlidan voz kechish boʻladi,', 'Yevropa yoʻlidan'),
    ('lekin mahsulotlariga katta bozor ochiladi.', 'lekin mahsulotlariga katta bozor ochiladi.', 'katta bozor')])

sc(28, 'TAXMIN', ['R32', 'R33'], 'krem', 'map',
   'Map to Armenia (qizil fill); two switches: economy ON, defence paused. ' + C,
   [('Armaniston', 0, 'Armaniston'), ('iqtisodiy ittifoq: ha', 0, 'aʼzosi'), ('harbiy: muzlatilgan', 1, 'muzlatgan')],
   [('Qoʻshni Armaniston iqtisodiy ittifoq aʼzosi,', 'Qoʻshni Armaniston iqtisodiy ittifoq aʼzosi,', 'Armaniston'),
    ('lekin harbiy ittifoqdagi ishtirokini muzlatgan.', 'lekin harbiy ittifoqdagi ishtirokini muzlatgan.', 'muzlatgan'),
    ('U xavfsizlik va mustaqil siyosat orasida tanlaydi.', 'U xavfsizlik va mustaqil siyosat orasida tanlaydi.', 'tanlaydi')])

sc(29, 'TAXMIN', ['R55', 'T09'], 'toʻq sariq', 'map',
   'Map to Azerbaijan (sariq fill) with flat oil-derrick and gas-flame icons; coins flow into a shared pot. ' + C,
   [('Ozarbayjon', 0, 'Ozarbayjon'), ('neft va gaz', 0, 'gazi')],
   [('Ozarbayjon esa neft va gazi bilan kuchli.', 'Ozarbayjon esa neft va gazi bilan kuchli.', 'neft va gazi'),
    ('Ittifoqda u daromadini boshqalar bilan boʻlishadi.', 'Ittifoqda u daromadini boshqalar bilan boʻlishadi.', 'boʻlishadi')])

sc(30, 'TAXMIN', ['R26', 'T09'], 'osmon', 'map',
   'Map swings east to Kazakhstan (toʻq sariq fill), wheat and oil icons. ' + C,
   [('Qozogʻiston', 0, 'Qozogʻiston'), ('2-markaz', 2, 'markaziga')],
   [('Markaziy Osiyoda eng boy davlat — Qozogʻiston.', 'Markaziy Osiyoda eng boy davlat — Qozogʻiston.', 'eng boy'),
    ('Neft pulining bir qismi umumiy byudjetga ketadi,', 'Neft pulining bir qismi umumiy byudjetga ketadi,', 'umumiy byudjetga'),
    ('lekin u ittifoqning ikkinchi kuchli markaziga aylanadi.', 'lekin u ittifoqning ikkinchi kuchli markaziga aylanadi.', 'markaziga')])

sc(31, 'TAXMIN', ['R32', 'R33'], 'yashil', 'map',
   'Map to Kyrgyzstan (pushti fill), mountains; a migrant worker icon whose document turns into a tick. ' + C,
   [('Qirgʻiziston', 0, 'Qirgʻiziston'), ('ikkala ittifoqda', 0, 'ittifoqda')],
   [('Qirgʻiziston esa allaqachon ikkala ittifoqda.', 'Qirgʻiziston esa allaqachon ikkala ittifoqda.', 'ikkala ittifoqda'),
    ('Uning yutugʻi — migrantlar uchun qulaylik,', 'Uning yutugʻi — migrantlar uchun qulaylik,', 'migrantlar'),
    ('yoʻqotishi — savdo qoidalarini oʻzi belgilash imkoni.', 'yoʻqotishi — savdo qoidalarini oʻzi belgilash imkoni.', 'yoʻqotishi')])

sc(32, 'TAXMIN', ['R26'], 'krem', 'map',
   'Map to Tajikistan (sariq fill); a balance: big help on one pan, a small vote on the other. ' + C,
   [('Tojikiston', 0, 'Tojikiston'), ('koʻp yordam', 1, 'yordam'), ('kam taʼsir', 2, 'taʼsiri')],
   [('Tojikiston esa roʻyxatdagi eng kambagʻal davlat.', 'Tojikiston esa roʻyxatdagi eng kambagʻal davlat.', 'eng kambagʻal'),
    ('U ittifoqdan eng koʻp yordam oladi,', 'U ittifoqdan eng koʻp yordam oladi,', 'yordam'),
    ('ammo qarorlarga taʼsiri eng kam boʻladi.', 'ammo qarorlarga taʼsiri eng kam boʻladi.', 'eng kam')])

sc(33, 'TAXMIN', ['R53', 'R55'], 'toʻq sariq', 'map',
   'Map to Turkmenistan (osmon fill), desert dunes; a gas pipeline line reaches the union outline; 1995 neutrality pin. ' + C,
   [('Turkmaniston', 0, 'Turkmaniston'), ('1995: betaraflik', 0, 'betaraflikni')],
   [('Turkmaniston esa betaraflikni tanlagan.', 'Turkmaniston esa betaraflikni tanlagan.', 'betaraflikni'),
    ('Ittifoq unga gaz uchun katta bozor beradi,', 'Ittifoq unga gaz uchun katta bozor beradi,', 'gaz'),
    ('lekin uning betarafligi tugaydi.', 'lekin uning betarafligi tugaydi.', 'tugaydi')])

sc(34, 'TAXMIN', ['R23', 'R25'], 'yashil', 'map',
   'Map pushes in on Uzbekistan (yashil 3BB273) until it fills the frame; host appears beside it (thinking). ' + C,
   [('Oʻzbekiston', 0, 'Oʻzbekiston'), ('38,2 mln', 0, 'yirik')],
   [('Va nihoyat, Oʻzbekiston — eng yirik respublikalardan biri.', 'Va nihoyat, Oʻzbekiston — eng yirik respublikalardan biri.', 'Oʻzbekiston'),
    ('Unga keyinroq qaytamiz, avval dunyoga qaraylik.', 'Unga keyinroq qaytamiz, avval dunyoga qaraylik.', 'dunyoga')])

# ---------- 35–42 World reaction ----------
sc(35, 'TAXMIN', ['R31', 'T07'], 'tun', 'map',
   'Night globe from above, Europe lit; the Baltic outline detaches from a NATO ring. Host worried. ' + C,
   [('NATO', 0, 'NATOdan'), ('Yevropa xavfsizligi', 0, 'xavfsizlikni')],
   [('Gʻarb uchun Boltiqboʻyining NATOdan chiqishi xavfsizlikni oʻzgartiradi.', 'Gʻarb uchun Boltiqboʻyining NATOdan chiqishi xavfsizlikni oʻzgartiradi.', 'xavfsizlikni'),
    ('Shuning uchun Gʻarb yangi ittifoqdan xavotirga tushadi.', 'Shuning uchun Gʻarb yangi ittifoqdan xavotirga tushadi.', 'xavotirga')])

sc(36, 'TAXMIN', ['T07', 'R42'], 'jigarrang', 'icons',
   'Padlock icons snap onto: bank card, cargo container, plane. Host worried. ' + C,
   [('sanksiyalar', 0, 'sanksiyaga'), ('eksport va toʻlovlar', 2, 'toʻlovlarini')],
   [('Xavotir esa koʻpincha sanksiyaga aylanadi.', 'Xavotir esa koʻpincha sanksiyaga aylanadi.', 'sanksiyaga'),
    ('Cheklovlar bizga ham tegishi mumkin.', 'Cheklovlar bizga ham tegishi mumkin.', 'bizga ham'),
    ('Bu eksport va bank toʻlovlarini qiyinlashtiradi.', 'Bu eksport va bank toʻlovlarini qiyinlashtiradi.', 'bank toʻlovlarini')])

sc(37, 'TAXMIN', ['R42', 'T08'], 'osmon', 'chart',
   'Donut chart of Uzbekistan trade: China 21,2% slice in qizil, Russia 16% in osmon; camera pans to the China slice. ' + C,
   [('Xitoy 21,2%', 1, 'hamkori'), ('Rossiya 16%', 1, 'hamkori')],
   [('Sharqda esa Xitoy turibdi.', 'Sharqda esa Xitoy turibdi.', 'Xitoy'),
    ('U bugun Oʻzbekistonning birinchi savdo hamkori.', 'U bugun Oʻzbekistonning birinchi savdo hamkori.', 'birinchi'),
    ('Xitoy savdoni davom ettiradi, taʼsirini ham saqlashga intiladi.', 'Xitoy savdoni davom ettiradi, taʼsirini ham saqlashga intiladi.', 'taʼsirini')])

sc(38, 'TAXMIN', ['T03'], 'toʻq sariq', 'icons',
   'One big new coin in the centre (blank face); 15 smaller coins orbit and merge into it. ' + C,
   [('umumiy pul', 0, 'pulni'), ('bitta stavka', 1, 'stavkasini')],
   [('Ichkarida esa umumiy pulni bitta markaziy bank chiqaradi', 'Ichkarida esa umumiy pulni bitta markaziy bank chiqaradi', 'markaziy bank'),
    ('va hamma uchun bitta foiz stavkasini belgilaydi.', 'va hamma uchun bitta foiz stavkasini belgilaydi.', 'foiz stavkasini')])

sc(39, 'TAXMIN', ['T03', 'R29'], 'krem', 'chart',
   'Two thermometers (rich and poor economy) driven by one dial: one overheats, one freezes. ' + C,
   [('boy iqtisod', 1, 'boy'), ('kambagʻal iqtisod', 1, 'kambagʻal')],
   [('Yevro hududi buni boshdan kechirgan:', 'Yevro hududi buni boshdan kechirgan:', 'Yevro hududi'),
    ('Boy va kambagʻal iqtisodga bitta stavka mos kelmaydi.', 'Boy va kambagʻal iqtisodga bitta stavka mos kelmaydi.', 'bitta stavka')])

sc(40, 'TAXMIN', ['T09', 'R55'], 'yashil', 'map',
   'Map with four energy producers highlighted (Russia, Kazakhstan, Turkmenistan, Azerbaijan); pipeline lines reach Uzbekistan. ' + C,
   [('neft va gaz', 1, 'neft-gazga'), ('arzonroq yoqilgʻi', 2, 'arzonlashishi')],
   [('Ittifoqning kuchli tomoni esa energiya.', 'Ittifoqning kuchli tomoni esa energiya.', 'energiya'),
    ('Rossiya, Qozogʻiston, Turkmaniston va Ozarbayjon neft-gazga boy.', 'Rossiya, Qozogʻiston, Turkmaniston va Ozarbayjon neft-gazga boy.', 'neft-gazga'),
    ('Blok ichida yoqilgʻi arzonlashishi mumkin.', 'Blok ichida yoqilgʻi arzonlashishi mumkin.', 'arzonlashishi')])

sc(41, 'TAXMIN', ['T09'], 'tun', 'icons',
   'Night: a valve wheel in the middle; pipelines to Europe and Asia switch between open and closed. ' + C,
   [('siyosiy dastak', 0, 'dastakka'), ('Yevropa va Osiyo', 1, 'Osiyo')],
   [('Ammo bu boylik siyosiy dastakka ham aylanadi.', 'Ammo bu boylik siyosiy dastakka ham aylanadi.', 'siyosiy dastakka'),
    ('Bu Yevropa va Osiyo bilan yangi bahs keltiradi.', 'Bu Yevropa va Osiyo bilan yangi bahs keltiradi.', 'yangi bahs')])

sc(42, 'TAXMIN', ['R45'], 'krem', 'map',
   'Map of Uzbekistan and its 5 neighbours: inner borders dissolve into dashes; the Afghan border thickens in qizil. ' + C,
   [('ichki chegaralar', 1, 'yoʻqoladi'), ('Afgʻoniston chegarasi', 2, 'chegaramiz')],
   [('Chegaralar ham oʻzgaradi.', 'Chegaralar ham oʻzgaradi.', 'Chegaralar'),
    ('Ichki chegaralar yoʻqoladi, tashqisi qattiqlashadi.', 'Ichki chegaralar yoʻqoladi, tashqisi qattiqlashadi.', 'qattiqlashadi'),
    ('Afgʻoniston bilan chegaramiz ittifoq chegarasiga aylanadi.', 'Afgʻoniston bilan chegaramiz ittifoq chegarasiga aylanadi.', 'ittifoq chegarasiga')])

# ---------- 43–62 Uzbekistan in depth ----------
sc(43, 'FAKT', ['R30', 'T03'], 'osmon', 'icons',
   'Host holds a generic soʻm note (no real design); it flips into a blank "umumiy pul" note. Chip FAKT (soʻm history).',
   [('soʻm, 1994', 1, 'soʻm'), ('umumiy pul', 2, 'pulga')],
   [('Oʻzbekistonda birinchi oʻzgarish pulda boʻladi.', 'Oʻzbekistonda birinchi oʻzgarish pulda boʻladi.', 'pulda'),
    ('Toʻqson toʻrtinchi yildan beri bizda oʻz pulimiz — soʻm bor.', '94-yildan beri bizda oʻz pulimiz — soʻm bor.', 'soʻm'),
    ('Ittifoqda u umumiy pulga almashadi.', 'Ittifoqda u umumiy pulga almashadi.', 'umumiy pulga')])

sc(44, 'TAXMIN', ['T04'], 'toʻq sariq', 'icons',
   'Bazaar stall: price tags on bread, rice, meat step up on cue starts; a salary envelope follows slowly behind. ' + C,
   [('narxlar ↑', 1, 'koʻtariladi'), ('maosh sekinroq', 2, 'sekinroq')],
   [('Pul oʻzgarsa, narxlar ham oʻzgaradi.', 'Pul oʻzgarsa, narxlar ham oʻzgaradi.', 'narxlar'),
    ('Narxlar boy qoʻshnilarga qarab koʻtariladi,', 'Narxlar boy qoʻshnilarga qarab koʻtariladi,', 'koʻtariladi'),
    ('maoshlar esa ularga sekinroq yetib boradi.', 'maoshlar esa ularga sekinroq yetib boradi.', 'sekinroq')])

sc(45, 'FAKT', ['R37', 'T03'], 'krem', 'chart',
   'Inflation line 9,8% → 7,3% going down; then a steering wheel handed to a distant "markaz" building. Chip FAKT.',
   [('2024: 9,8%', 0, 'inflyatsiya'), ('2025: 7,3%', 0, 'foizga')],
   [('Holbuki, oʻtgan yili inflyatsiya yetti butun oʻndan uch foizga tushdi.', 'Holbuki, oʻtgan yili inflyatsiya 7,3 foizga tushdi.', '7,3 foizga'),
    ('Ittifoqda bu jarayonni oʻzimiz boshqara olmaymiz.', 'Ittifoqda bu jarayonni oʻzimiz boshqara olmaymiz.', 'boshqara olmaymiz')])

sc(46, 'FAKT', ['R39', 'R40'], 'osmon', 'chart',
   'Salary bars: average 6,4 mln soʻm tall; teacher and doctor bars shorter with small icons. Chip FAKT.',
   [('6,4 mln soʻm', 0, 'soʻm'), ('≈ 529 $', 1, 'koʻproq'), ('oʻqituvchi, shifokor', 2, 'shifokorlar')],
   [('Oʻtgan yili oʻrtacha oylik olti butun oʻndan toʻrt million soʻm boʻldi.', 'Oʻtgan yili oʻrtacha oylik 6,4 million soʻm boʻldi.', '6,4 million'),
    ('Bu besh yuz dollardan sal koʻproq.', 'Bu 500 dollardan sal koʻproq.', '500 dollardan'),
    ('Oʻqituvchi va shifokorlar esa kamroq oladi.', 'Oʻqituvchi va shifokorlar esa kamroq oladi.', 'kamroq')])

sc(47, 'TAXMIN', ['T03', 'R26'], 'yashil', 'icons',
   'Two pay slips side by side in the same new currency; footprints lead from the smaller to the bigger. ' + C,
   [('bir xil pul', 0, 'pulda'), ('koʻchish', 1, 'koʻchadi')],
   [('Ittifoqda maoshlar bir pulda solishtiriladi.', 'Ittifoqda maoshlar bir pulda solishtiriladi.', 'bir pulda'),
    ('Farqni koʻrgan odamlar yaxshi maosh tomon koʻchadi.', 'Farqni koʻrgan odamlar yaxshi maosh tomon koʻchadi.', 'koʻchadi')])

sc(48, 'FAKT', ['R41'], 'jigarrang', 'chart',
   'Money arrows from abroad into Uzbekistan: total 14,8 mlrd $; three quarters of the arrow coloured as from Russia. Chip FAKT.',
   [('14,8 mlrd $', 0, 'oʻtkazildi'), ('77% — Rossiyadan', 1, 'Rossiyadan')],
   [('Ikki ming yigirma toʻrtinchi yilda chetdan qariyb oʻn besh milliard dollar pul oʻtkazildi.', '2024-yilda chetdan qariyb 15 milliard dollar pul oʻtkazildi.', '15 milliard'),
    ('Uning toʻrtdan uch qismidan koʻprogʻi Rossiyadan.', 'Uning toʻrtdan uch qismidan koʻprogʻi Rossiyadan.', 'Rossiyadan')])

sc(49, 'TAXMIN', ['T05'], 'osmon', 'host',
   'Host as a young worker with a backpack; a stack of papers (patent, registration) blows away. Host happy. ' + C,
   [('patent', 1, 'Patent'), ('roʻyxatdan oʻtish', 1, 'roʻyxatdan')],
   [('Ittifoqda migrantlar hayoti yengillashadi.', 'Ittifoqda migrantlar hayoti yengillashadi.', 'yengillashadi'),
    ('Patent va roʻyxatdan oʻtish muammolari yoʻqoladi.', 'Patent va roʻyxatdan oʻtish muammolari yoʻqoladi.', 'yoʻqoladi'),
    ('Ular oʻz yurtidagidek ishlaydi.', 'Ular oʻz yurtidagidek ishlaydi.', 'oʻz yurtidagidek')])

sc(50, 'TAXMIN', ['T05'], 'toʻq sariq', 'scene',
   'Sunset village street; young figures walk toward a bus; an empty workbench remains. Host worried. ' + C,
   [('yoshlar ketadi', 1, 'ketishi'), ('ishchi qoʻllar', 2, 'qoʻllar')],
   [('Ammo buning teskari tomoni ham bor.', 'Ammo buning teskari tomoni ham bor.', 'teskari tomoni'),
    ('Gʻayratli yoshlarning ketishi osonlashadi,', 'Gʻayratli yoshlarning ketishi osonlashadi,', 'ketishi'),
    ('qishloqlarda esa ishchi qoʻllar kamayadi.', 'qishloqlarda esa ishchi qoʻllar kamayadi.', 'kamayadi')])

sc(51, 'FAKT', ['R20', 'T06'], 'krem', 'icons',
   'Open book with Uzbek text lines; an 1989 "davlat tili" stamp; a second book "ish tili?" slides in. Chip FAKT.',
   [('davlat tili, 1989', 0, 'tili'), ('umumiy ish tili?', 1, 'kerak')],
   [('Tilga kelsak, oʻzbek tili sakson toʻqqizinchi yildan beri davlat tili.', 'Tilga kelsak, oʻzbek tili 89-yildan beri davlat tili.', 'davlat tili'),
    ('Ittifoqqa esa umumiy ish tili kerak boʻladi,', 'Ittifoqqa esa umumiy ish tili kerak boʻladi,', 'ish tili'),
    ('va bu, ehtimol, rus tili boʻladi.', 'va bu, ehtimol, rus tili boʻladi.', 'rus tili')])

sc(52, 'FAKT', ['R43'], 'jigarrang', 'icons',
   'Archive desk: Latin letter tiles "Oʻ Gʻ Sh Ch" beside Cyrillic tiles; a 1993 stamp; the arrow between them slows. Chip FAKT.',
   [('lotin alifbosi, 1993', 0, 'yozuviga'), ('kirill', 1, 'kirillda')],
   [('Alifbo ham muhim: lotin yozuviga toʻqson uchinchi yilda oʻta boshlaganmiz.', 'Alifbo ham muhim: lotin yozuviga 93-yilda oʻta boshlaganmiz.', 'lotin yozuviga'),
    ('Umumiy hujjatlar kirillda boʻlsa, bu oʻtish sekinlashadi.', 'Umumiy hujjatlar kirillda boʻlsa, bu oʻtish sekinlashadi.', 'sekinlashadi')])

sc(53, 'FAKT', ['R47', 'T06'], 'osmon', 'scene',
   'Bright classroom, host at a desk (happy), board shows "11 yil"; a second-language book appears on each desk. Chip FAKT.',
   [('11 yil, bepul', 0, 'taʼlim'), ('umumiy standart', 1, 'standartga')],
   [('Maktabda hozir oʻn bir yillik bepul taʼlim bor.', 'Maktabda hozir 11 yillik bepul taʼlim bor.', '11 yillik'),
    ('Ittifoqda dasturlar umumiy standartga moslashadi.', 'Ittifoqda dasturlar umumiy standartga moslashadi.', 'umumiy standartga')])

sc(54, 'TAXMIN', ['T02'], 'yashil', 'map',
   'Union map with university pins in several republics; a student icon hops between them. ' + C,
   [('istalgan respublika', 1, 'respublikada')],
   [('Maktabdan keyin esa imkoniyat kengayadi.', 'Maktabdan keyin esa imkoniyat kengayadi.', 'kengayadi'),
    ('Talabalar istalgan respublikada oʻqiy oladi.', 'Talabalar istalgan respublikada oʻqiy oladi.', 'istalgan respublikada')])

sc(55, 'FAKT', ['R07', 'R46'], 'tun', 'scene',
   'Evening silhouette of a generic dome and minaret (no real building), stars; host calm-thinking; a scroll "vijdon erkinligi" unrolls. Chip FAKT.',
   [('Sovet davri: cheklovlar', 0, 'cheklangan'), ('vijdon erkinligi', 2, 'erkinligi')],
   [('Din esa Sovet davrida qattiq cheklangan edi.', 'Din esa Sovet davrida qattiq cheklangan edi.', 'cheklangan'),
    ('Bugun aholimizning aksariyati musulmon.', 'Bugun aholimizning aksariyati musulmon.', 'musulmon'),
    ('Shartnomada vijdon erkinligi qatʼiy yozilishi kerak.', 'Shartnomada vijdon erkinligi qatʼiy yozilishi kerak.', 'vijdon erkinligi')])

sc(56, 'FAKT', ['R08'], 'krem', 'icons',
   'Old-style passport with an exit-permit stamp (archive), then a modern ID card; a train crosses an inner border freely. Chip FAKT.',
   [('chiqish uchun ruxsat', 0, 'ruxsat'), ('ichki safar', 1, 'safarlar')],
   [('Sovet davrida chet elga chiqishga ruxsat kerak edi.', 'Sovet davrida chet elga chiqishga ruxsat kerak edi.', 'ruxsat'),
    ('Yangi ittifoqda ichki safarlar osonlashadi.', 'Yangi ittifoqda ichki safarlar osonlashadi.', 'ichki safarlar')])

sc(57, 'TAXMIN', ['R54'], 'toʻq sariq', 'scene',
   'Sunset over generic blue domes and an arch (no copy of a real landmark); tourists with suitcases; a visa form appears and the queue slows. ' + C,
   [('vizasiz rejim', 0, 'vizasiz'), ('umumiy viza', 1, 'viza')],
   [('Bugun esa koʻp davlat fuqarolari bizga vizasiz keladi.', 'Bugun esa koʻp davlat fuqarolari bizga vizasiz keladi.', 'vizasiz'),
    ('Umumiy viza siyosati bu ochiqlikni toraytirishi mumkin.', 'Umumiy viza siyosati bu ochiqlikni toraytirishi mumkin.', 'toraytirishi')])

sc(58, 'TAXMIN', ['R24', 'T10'], 'osmon', 'icons',
   'Delivery truck with textile and fruit rolls across a dissolved border onto a huge map; counter 300 mln customers. ' + C,
   [('300 mln xaridor', 1, 'xaridorga'), ('bojsiz', 1, 'bojsiz')],
   [('Biznes uchun esa ulkan bozor ochiladi.', 'Biznes uchun esa ulkan bozor ochiladi.', 'ulkan bozor'),
    ('Uch yuz million xaridorga bojsiz yetib borish mumkin.', '300 million xaridorga bojsiz yetib borish mumkin.', '300 million')])

sc(59, 'TAXMIN', ['T10'], 'yashil', 'icons',
   'Small local shop next to a giant chain-store block casting a shadow; a "mulk huquqi" shield appears in front of the shop. ' + C,
   [('raqobat', 0, 'raqobat'), ('mulk huquqi', 1, 'huquqi')],
   [('Lekin katta bozor — katta raqobat degani.', 'Lekin katta bozor — katta raqobat degani.', 'raqobat'),
    ('Mulk huquqi himoyalanmasa, mahalliy biznes zarar koʻradi.', 'Mulk huquqi himoyalanmasa, mahalliy biznes zarar koʻradi.', 'Mulk huquqi')])

sc(60, 'FAKT', ['R09', 'R48'], 'jigarrang', 'chart',
   'Two calendar bars: Soviet 24 months vs today 12 months; a question mark over a third bar "umumiy armiya". Chip FAKT.',
   [('Sovet: 24 oy', 0, 'yil'), ('bugun: 12 oy', 1, 'oy')],
   [('Armiyada Sovet davrida xizmat ikki yil edi,', 'Armiyada Sovet davrida xizmat 2 yil edi,', '2 yil'),
    ('bugun esa oʻn ikki oy.', 'bugun esa 12 oy.', '12 oy'),
    ('Umumiy armiyada muddatni markaz belgilaydi.', 'Umumiy armiyada muddatni markaz belgilaydi.', 'markaz')])

sc(61, 'TAXMIN', ['T05', 'T09', 'T10'], 'yashil', 'icons',
   'Left pan of a balance fills with gain icons dropping in on cue words: market, migrant, energy, shield. Host happy. ' + C,
   [('+ bozor', 0, 'bozor'), ('+ energiya', 1, 'energiya'), ('+ xavfsizlik', 1, 'xavfsizlik')],
   [('Jamlasak, yutuqlar: katta bozor, migrantlarga qulaylik,', 'Jamlasak, yutuqlar: katta bozor, migrantlarga qulaylik,', 'yutuqlar'),
    ('arzon energiya va umumiy xavfsizlik.', 'arzon energiya va umumiy xavfsizlik.', 'energiya')])

sc(62, 'TAXMIN', ['T03', 'T06', 'R05'], 'toʻq sariq', 'icons',
   'Right pan fills with loss icons: soʻm coin, compass (foreign policy), letter tile, cotton boll; the scale levels out. Host worried. ' + C,
   [('− oʻz pulimiz', 0, 'pulimiz'), ('− mustaqil siyosat', 0, 'siyosat'), ('xom ashyo xavfi', 1, 'xom')],
   [('Yoʻqotishlar: oʻz pulimiz va mustaqil tashqi siyosat.', 'Yoʻqotishlar: oʻz pulimiz va mustaqil tashqi siyosat.', 'Yoʻqotishlar'),
    ('Yana xom ashyo yetkazuvchisiga aylanish xavfi bor.', 'Yana xom ashyo yetkazuvchisiga aylanish xavfi bor.', 'xom ashyo')])

# ---------- 63–68 Winners vs losers; why history rarely rewinds ----------
sc(63, 'TAXMIN', ['T10', 'R26'], 'osmon', 'map',
   'Union map: poorer republics highlighted yashil (gain), Russia sariq (influence). ' + C,
   [('yutadi: kambagʻalroqlar', 1, 'oladi'), ('yutadi: Rossiya', 2, 'taʼsir')],
   [('Butun ittifoqda kim yutadi?', 'Butun ittifoqda kim yutadi?', 'yutadi'),
    ('Kambagʻalroq respublikalar bozor va yordam oladi,', 'Kambagʻalroq respublikalar bozor va yordam oladi,', 'yordam'),
    ('Rossiya esa katta taʼsir oladi.', 'Rossiya esa katta taʼsir oladi.', 'taʼsir')])

sc(64, 'TAXMIN', ['T10', 'R31', 'R34'], 'krem', 'map',
   'Same map: Baltics, Georgia and Moldova highlighted qizil (loss). ' + C,
   [('Boltiqboʻyi', 1, 'Boltiqboʻyi'), ('Gruziya va Moldova', 2, 'Moldova')],
   [('Kim esa yutqazadi?', 'Kim esa yutqazadi?', 'yutqazadi'),
    ('Boltiqboʻyi Yevropa bozoridan ajraladi.', 'Boltiqboʻyi Yevropa bozoridan ajraladi.', 'ajraladi'),
    ('Gruziya va Moldova tanlagan yoʻlidan voz kechadi.', 'Gruziya va Moldova tanlagan yoʻlidan voz kechadi.', 'voz kechadi')])

sc(65, 'TAXMIN', ['T10'], 'yashil', 'host',
   'Two neutral generic characters (not real people) look at the same map: one smiles, one frowns. ' + C,
   [('qayta uchrashuv', 1, 'uchrashuvi'), ('mustaqillikni yoʻqotish', 2, 'yoʻqotish')],
   [('Bir voqeaga har xalq turlicha qaraydi.', 'Bir voqeaga har xalq turlicha qaraydi.', 'turlicha'),
    ('Kimdir buni eski qoʻshnilar uchrashuvi deb biladi,', 'Kimdir buni eski qoʻshnilar uchrashuvi deb biladi,', 'uchrashuvi'),
    ('boshqasi uchun esa bu mustaqillikni yoʻqotish.', 'boshqasi uchun esa bu mustaqillikni yoʻqotish.', 'mustaqillikni yoʻqotish')])

sc(66, 'TAXMIN', ['T11', 'R18'], 'toʻq sariq', 'timeline',
   'Timeline 1991 → today; a baby icon at 1991 grows into a young adult at today. Host thinking. ' + C,
   [('1991', 1, 'yildan'), ('yangi avlod', 1, 'avlod')],
   [('Xoʻsh, nega tarix orqaga qaytmaydi?', 'Xoʻsh, nega tarix orqaga qaytmaydi?', 'orqaga qaytmaydi'),
    ('Toʻqson birinchi yildan beri yangi avlod ulgʻaydi.', '91-yildan beri yangi avlod ulgʻaydi.', 'yangi avlod'),
    ('Ular uchun mustaqillik odatiy hol.', 'Ular uchun mustaqillik odatiy hol.', 'mustaqillik')])

sc(67, 'TAXMIN', ['T11', 'R51'], 'osmon', 'icons',
   'Fifteen small stacks appear: coin, shield, colour chip, signature; each grows roots into the ground. ' + C,
   [('oʻz puli, armiyasi, ittifoqlari', 0, 'ittifoqlari')],
   [('Har davlatda oʻz puli, armiyasi va ittifoqlari bor.', 'Har davlatda oʻz puli, armiyasi va ittifoqlari bor.', 'oʻz puli'),
    ('Ularni bekor qilish yaratishdan ham qiyin.', 'Ularni bekor qilish yaratishdan ham qiyin.', 'qiyin')])

sc(68, 'TAXMIN', ['T11'], 'jigarrang', 'scene',
   'Archive book pages flip; then a modern road with trucks and travellers linking the countries. ' + C,
   [('savdo va doʻstlik', 1, 'doʻstlik')],
   [('Tarqalgan ittifoqlar tarixda deyarli qayta tiklanmagan.', 'Tarqalgan ittifoqlar tarixda deyarli qayta tiklanmagan.', 'qayta tiklanmagan'),
    ('Xalqlar esa savdo va doʻstlik orqali yaqinlashadi.', 'Xalqlar esa savdo va doʻstlik orqali yaqinlashadi.', 'savdo va doʻstlik')])

# ---------- 69–70 Conclusion ----------
sc(69, 'TAXMIN', ['T10', 'T11'], 'yashil', 'host',
   'Host faces camera (thinking → calm smile), Uzbekistan map behind; two cards: imkoniyat / xavf. ' + C,
   [('imkoniyat', 0, 'imkoniyat'), ('xavf', 0, 'xavf')],
   [('Xulosa: bunday ittifoq bizga ham imkoniyat, ham xavf.', 'Xulosa: bunday ittifoq bizga ham imkoniyat, ham xavf.', 'imkoniyat'),
    ('Bozor kengayadi, lekin mustaqil qaror imkoni torayadi.', 'Bozor kengayadi, lekin mustaqil qaror imkoni torayadi.', 'torayadi')])

sc(70, 'TAXMIN', [], 'osmon', 'host',
   'Host points at the viewer (happy), then at a comment bubble with "Ha / Yoʻq". ' + C,
   [('Ha yoki yoʻq?', 1, 'boʻlarmidingiz'), ('izohlarda yozing', 2, 'izohlarda')],
   [('Endi navbat sizga.', 'Endi navbat sizga.', 'sizga'),
    ('Siz bunday ittifoqqa ha deb ovoz bergan boʻlarmidingiz?', 'Siz bunday ittifoqqa ha deb ovoz bergan boʻlarmidingiz?', 'ha deb'),
    ('Javobingizni izohlarda yozing.', 'Javobingizni izohlarda yozing.', 'izohlarda')])
