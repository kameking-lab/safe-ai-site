import type { SafetyMaterial } from "@/types/foreign-worker";

const fall: SafetyMaterial = {
  id: "agriculture-fall-from-height",
  industry: "agriculture",
  topic: "fall-from-height",
  title: {
    "ja-easy": "果樹園(かじゅえん) で 高(たか)い 所(ところ) から 落(お)ちない",
    en: "Preventing falls in orchards and greenhouses",
    vi: "Phòng té ngã trong vườn cây và nhà kính",
    zh: "果园与温室防坠落",
    id: "Mencegah jatuh di kebun buah dan rumah kaca",
  },
  intro: {
    "ja-easy":
      "果物(くだもの) を 取(と)る はしご や ハウス の 屋根(やね) から 落(お)ちる 事故(じこ) が 多(おお)い です。",
    en: "Orchard ladders and greenhouse roofs cause many falls. Use approved tripod ladders and never walk on greenhouse roofs.",
    vi: "Thang trong vườn và mái nhà kính gây nhiều tai nạn ngã. Dùng thang ba chân chuẩn, không bao giờ đi trên mái nhà kính.",
    zh: "果园梯子和温室屋顶是坠落多发点。使用合规三脚梯，禁止踩踏温室屋顶。",
    id: "Tangga kebun dan atap rumah kaca sering memicu jatuh. Pakai tangga tripod resmi, jangan berjalan di atap rumah kaca.",
  },
  checklist: [
    {
      id: "tripod",
      text: {
        "ja-easy": "三脚(さんきゃく) はしご を 使(つか)う",
        en: "Use a 3-legged orchard ladder rated for soft ground.",
        vi: "Sử dụng thang ba chân chuyên dụng cho đất mềm.",
        zh: "使用适用于松软地面的三脚果园梯。",
        id: "Gunakan tangga tripod yang sesuai untuk tanah lunak.",
      },
    },
    {
      id: "no-top-rung",
      text: {
        "ja-easy": "はしご の 一番(いちばん) 上(うえ) に 立(た)たない",
        en: "Never stand on the top two rungs of any ladder.",
        vi: "Không đứng trên 2 bậc trên cùng của thang.",
        zh: "禁止站立梯子顶部两级。",
        id: "Jangan berdiri di dua anak tangga teratas.",
      },
    },
    {
      id: "greenhouse-plank",
      text: {
        "ja-easy": "ハウス の 屋根(やね) には 専用(せんよう) 通路(つうろ) を 使(つか)う",
        en: "Use designated roof planks when working on greenhouse roofs.",
        vi: "Dùng ván chuyên dụng khi làm việc trên mái nhà kính.",
        zh: "在温室屋顶作业必须使用专用走板。",
        id: "Pakai papan jalur khusus saat di atap rumah kaca.",
      },
    },
    {
      id: "tractor-cage",
      text: {
        "ja-easy": "トラクター の 屋根(やね) ROPS を 倒(たお)さない",
        en: "Keep tractor ROPS (Roll-Over Protection) upright; wear the seatbelt.",
        vi: "Giữ thanh chống lật ROPS thẳng đứng, đeo dây an toàn.",
        zh: "拖拉机ROPS翻车保护架保持直立，系好安全带。",
        id: "Jaga ROPS traktor tetap tegak, pakai sabuk pengaman.",
      },
    },
    {
      id: "no-jump",
      text: {
        "ja-easy": "トラック の 荷台(にだい) から 飛(と)び降(お)りない",
        en: "Use the step or jump-down assist; do not jump from truck beds.",
        vi: "Dùng bậc xuống xe, không nhảy từ thùng xe tải.",
        zh: "下卡车请使用踏板，禁止从车厢上跳下。",
        id: "Pakai pijakan turun, jangan loncat dari bak truk.",
      },
    },
    {
      id: "non-slip",
      text: {
        "ja-easy": "雨(あめ) の あと は 通路(つうろ) が 滑(すべ)る",
        en: "After rain, paths become slippery — wear non-slip boots.",
        vi: "Sau mưa, lối đi trơn — mang ủng chống trượt.",
        zh: "雨后小路湿滑，需穿防滑靴。",
        id: "Setelah hujan, jalan licin — pakai sepatu bot antislip.",
      },
    },
  ],
  emergency: [
    {
      id: "ground-injury",
      text: {
        "ja-easy": "倒(たお)れた 人(ひと) を 動(うご)かさない",
        en: "Do not move a fallen worker until help arrives.",
        vi: "Không di chuyển người ngã trước khi cứu hộ đến.",
        zh: "在救援抵达前不要移动跌落者。",
        id: "Jangan pindahkan korban jatuh sampai bantuan datang.",
      },
    },
    {
      id: "rural-119",
      text: {
        "ja-easy": "場所(ばしょ) を 番地(ばんち) や 目印(めじるし) で 119 に 伝(つた)える",
        en: "Tell 119 the address and a visible landmark — rural sites are hard to find.",
        vi: "Cung cấp địa chỉ và điểm mốc cho 119 — vùng nông thôn khó tìm.",
        zh: "向119说明门牌号和明显地标，乡村地区不易找到。",
        id: "Sebutkan alamat dan tengara ke 119 — area pedesaan sulit ditemukan.",
      },
    },
  ],
  source: "厚生労働省「農業における労働安全衛生対策」",
};

const chemical: SafetyMaterial = {
  id: "agriculture-chemical-handling",
  industry: "agriculture",
  topic: "chemical-handling",
  title: {
    "ja-easy": "農薬(のうやく) を 安全(あんぜん)に 使(つか)う",
    en: "Safe use of agricultural chemicals",
    vi: "Sử dụng nông dược an toàn",
    zh: "农药安全使用",
    id: "Penggunaan pestisida yang aman",
  },
  intro: {
    "ja-easy":
      "農薬(のうやく) は 体(からだ) に 入(はい)ると とても 危(あぶ)ない です。マスク・ゴーグル・ つなぎ を 必(かなら)ず 着(つ)けて ください。",
    en: "Pesticides are highly toxic. Always wear a respirator, goggles and a coverall when mixing or spraying.",
    vi: "Thuốc trừ sâu rất độc. Luôn mặc mặt nạ, kính bảo hộ và áo liền quần khi pha hoặc phun.",
    zh: "农药毒性强，配药和喷洒时必须佩戴呼吸器、护目镜和连体服。",
    id: "Pestisida sangat beracun. Selalu pakai respirator, kacamata, dan baju terusan saat mencampur atau menyemprot.",
  },
  checklist: [
    {
      id: "label",
      text: {
        "ja-easy": "ラベル の 使(つか)い 方(かた) を 守(まも)る",
        en: "Follow the dilution and use instructions on the pesticide label.",
        vi: "Tuân thủ hướng dẫn pha và sử dụng trên nhãn.",
        zh: "严格遵循农药标签的稀释和使用说明。",
        id: "Ikuti petunjuk pengenceran dan penggunaan pada label.",
      },
    },
    {
      id: "ppe-set",
      text: {
        "ja-easy": "防護服(ぼうごふく)・マスク・ゴーグル・手袋(てぶくろ)",
        en: "Wear coverall, respirator, goggles and rubber gloves.",
        vi: "Mặc áo liền quần, mặt nạ, kính và găng cao su.",
        zh: "穿戴防护服、呼吸器、护目镜和橡胶手套。",
        id: "Pakai coverall, respirator, kacamata, dan sarung tangan karet.",
      },
    },
    {
      id: "no-spray-wind",
      text: {
        "ja-easy": "風(かぜ) が 強(つよ)い 日(ひ) は 散布(さんぷ) しない",
        en: "Do not spray on windy days (>3 m/s) — drift can reach others.",
        vi: "Không phun khi gió mạnh (>3 m/giây) — thuốc có thể bay sang khu khác.",
        zh: "风速>3米/秒时禁止喷洒，避免药雾飘散。",
        id: "Jangan menyemprot saat angin >3 m/detik — semprotan dapat bergeser.",
      },
    },
    {
      id: "wash-after",
      text: {
        "ja-easy": "散布(さんぷ) の 後(あと) は すぐ シャワー",
        en: "Shower immediately after spraying; wash work clothes separately.",
        vi: "Tắm ngay sau khi phun, giặt riêng đồ làm việc.",
        zh: "喷洒后立即淋浴，工作服与他衣分开清洗。",
        id: "Mandi segera setelah menyemprot, cuci pakaian terpisah.",
      },
    },
    {
      id: "lock-store",
      text: {
        "ja-easy": "農薬(のうやく) は 鍵(かぎ) を かけて 保管(ほかん)",
        en: "Store pesticides in a locked, ventilated cabinet away from food.",
        vi: "Lưu trữ thuốc trong tủ có khóa, thông gió, xa thực phẩm.",
        zh: "农药须存放于上锁通风柜，远离食品。",
        id: "Simpan pestisida di lemari terkunci, berventilasi, jauh dari makanan.",
      },
    },
    {
      id: "no-reentry",
      text: {
        "ja-easy": "散布(さんぷ) した 場所(ばしょ) は 一定(いってい) 時間(じかん) 入(はい)らない",
        en: "Observe the label re-entry interval before going back into the field.",
        vi: "Tuân thủ thời gian cách ly trên nhãn trước khi quay lại ruộng.",
        zh: "遵守标签规定的复入间隔后再进入田地。",
        id: "Patuhi interval masuk kembali sesuai label sebelum masuk ladang.",
      },
    },
  ],
  emergency: [
    {
      id: "poisoning",
      text: {
        "ja-easy": "気分(きぶん) が 悪(わる)く なったら 119、ラベル を 持(も)つ",
        en: "If you feel nauseous or dizzy, call 119 and bring the pesticide label.",
        vi: "Buồn nôn hay chóng mặt, gọi 119 và mang nhãn thuốc.",
        zh: "出现恶心、头晕拨打119，并携带农药标签。",
        id: "Jika mual atau pusing, telepon 119 dan bawa label pestisida.",
      },
    },
    {
      id: "skin-flush",
      text: {
        "ja-easy": "肌(はだ) に つけたら 15 分(ふん) 水(みず) で 流(なが)す",
        en: "Flush skin with water for 15 minutes if exposed.",
        vi: "Rửa da bằng nước 15 phút nếu bị dính.",
        zh: "皮肤接触农药用水冲洗15分钟。",
        id: "Bilas kulit dengan air 15 menit bila terpapar.",
      },
    },
  ],
  source: "農林水産省・厚生労働省「農薬の安全使用に関する手引」",
};

const heat: SafetyMaterial = {
  id: "agriculture-heatstroke",
  industry: "agriculture",
  topic: "heatstroke",
  title: {
    "ja-easy": "畑(はたけ) や ハウス で 熱中症(ねっちゅうしょう) を 防(ふせ)ぐ",
    en: "Heatstroke prevention in fields and greenhouses",
    vi: "Phòng sốc nhiệt tại ruộng và nhà kính",
    zh: "田间和温室的中暑预防",
    id: "Pencegahan sengatan panas di lapangan dan rumah kaca",
  },
  intro: {
    "ja-easy":
      "夏(なつ) の ハウス は 40 度(ど) を 超(こ)える ことが あります。早朝(そうちょう) に 仕事(しごと) を して、昼(ひる) は 休(やす)んで ください。",
    en: "Summer greenhouses can exceed 40°C. Work early morning, rest midday, and never work alone in a hot greenhouse.",
    vi: "Nhà kính mùa hè có thể trên 40°C. Làm việc sáng sớm, nghỉ trưa, không làm một mình trong nhà kính nóng.",
    zh: "夏季温室可超过40摄氏度。早晨作业、午间休息，禁止单独在高温温室内工作。",
    id: "Rumah kaca musim panas bisa lebih 40°C. Bekerja pagi hari, istirahat siang, jangan sendirian di rumah kaca panas.",
  },
  checklist: [
    {
      id: "early-shift",
      text: {
        "ja-easy": "朝(あさ) 早(はや)く 仕事(しごと) を 始(はじ)める",
        en: "Start at dawn; take a 3-hour midday break.",
        vi: "Bắt đầu lúc rạng sáng; nghỉ trưa 3 tiếng.",
        zh: "黎明开工，午间休息3小时。",
        id: "Mulai saat fajar; istirahat siang 3 jam.",
      },
    },
    {
      id: "shade-station",
      text: {
        "ja-easy": "畑(はたけ) の 近(ちか)く に 日陰(ひかげ) の 休憩(きゅうけい) 所(じょ) を 作(つく)る",
        en: "Set up a shaded rest station near each field with water and salt.",
        vi: "Lập trạm nghỉ có bóng râm gần ruộng, có nước và muối.",
        zh: "在田边设置阴凉休息站，备水和盐。",
        id: "Sediakan pos istirahat teduh dekat ladang dengan air dan garam.",
      },
    },
    {
      id: "greenhouse-vent",
      text: {
        "ja-easy": "ハウス の 窓(まど) と 扉(とびら) を 開(あ)ける",
        en: "Open greenhouse vents and doors fully during work.",
        vi: "Mở toàn bộ cửa thông gió và cửa ra vào nhà kính khi làm việc.",
        zh: "工作时打开温室所有通风窗和门。",
        id: "Buka semua ventilasi dan pintu rumah kaca saat bekerja.",
      },
    },
    {
      id: "hydrate-salt",
      text: {
        "ja-easy": "水(みず) と 塩(しお) タブレット を 取(と)る",
        en: "Drink water with salt tablets every 20 minutes.",
        vi: "Uống nước và viên muối mỗi 20 phút.",
        zh: "每20分钟饮水并服用盐片。",
        id: "Minum air dan tablet garam setiap 20 menit.",
      },
    },
    {
      id: "buddy",
      text: {
        "ja-easy": "一人(ひとり) で ハウス に 入(はい)らない",
        en: "Never work alone inside a greenhouse — buddy system.",
        vi: "Không vào nhà kính một mình — luôn có đồng nghiệp.",
        zh: "禁止单独进入温室作业，需结伴。",
        id: "Jangan masuk rumah kaca sendiri — sistem buddy.",
      },
    },
    {
      id: "cool-vest",
      text: {
        "ja-easy": "ファン 付(つ)き 服(ふく) を 使(つか)う",
        en: "Wear a fan-equipped work jacket during peak heat.",
        vi: "Mặc áo có quạt trong giờ nóng nhất.",
        zh: "高温时段穿着风扇服。",
        id: "Pakai jaket berkipas saat puncak panas.",
      },
    },
  ],
  emergency: [
    {
      id: "drag-out",
      text: {
        "ja-easy": "ハウス で 倒(たお)れた 人(ひと) は 外(そと) に 出(だ)す",
        en: "Move a collapsed worker out of the greenhouse to a shaded cool place.",
        vi: "Đưa người ngã trong nhà kính ra ngoài, nơi mát.",
        zh: "温室内倒下者立即抬出到阴凉处。",
        id: "Pindahkan korban roboh keluar rumah kaca ke tempat sejuk.",
      },
    },
    {
      id: "rural-help",
      text: {
        "ja-easy": "119 に 場所(ばしょ) を 詳(くわ)しく 伝(つた)える",
        en: "Give 119 a clear description of the field location.",
        vi: "Mô tả chi tiết vị trí ruộng cho 119.",
        zh: "向119详细说明田地具体位置。",
        id: "Sampaikan lokasi ladang dengan jelas ke 119.",
      },
    },
  ],
  source: "厚生労働省「STOP！熱中症 クールワーク（農業編）」",
};

const back: SafetyMaterial = {
  id: "agriculture-lower-back-injury",
  industry: "agriculture",
  topic: "lower-back-injury",
  title: {
    "ja-easy": "農業(のうぎょう) で 腰(こし) を 守(まも)る",
    en: "Protecting your back in agricultural work",
    vi: "Bảo vệ lưng khi làm nông",
    zh: "农业工作中保护腰部",
    id: "Melindungi punggung dalam pekerjaan pertanian",
  },
  intro: {
    "ja-easy":
      "下(した) を 向(む)いて 長(なが)い 時間(じかん) 作業(さぎょう) する と 腰(こし) が 痛(いた)く なります。",
    en: "Bending and squatting for long hours in crop work is the top cause of back pain in agriculture.",
    vi: "Cúi và ngồi xổm lâu khi làm cây trồng là nguyên nhân chính gây đau lưng trong nông nghiệp.",
    zh: "长时间弯腰、蹲下是农业腰痛的主因。",
    id: "Membungkuk dan jongkok lama saat menanam adalah penyebab utama nyeri punggung.",
  },
  checklist: [
    {
      id: "kneeler",
      text: {
        "ja-easy": "膝(ひざ) 保護(ほご) パッド や 座(ざ) 板(いた) を 使(つか)う",
        en: "Use a kneeler pad or rolling stool to avoid prolonged squatting.",
        vi: "Dùng tấm lót đầu gối hoặc ghế lăn để tránh ngồi xổm lâu.",
        zh: "使用护膝垫或滚轮凳，避免长时间蹲坐。",
        id: "Pakai bantalan lutut atau bangku beroda untuk hindari jongkok lama.",
      },
    },
    {
      id: "raised-bed",
      text: {
        "ja-easy": "高(たか)い ベッド で 育(そだ)てる",
        en: "Use raised beds where possible to reduce bending.",
        vi: "Trồng trên luống cao khi có thể để giảm cúi.",
        zh: "尽量使用高架种植床，减少弯腰。",
        id: "Gunakan bedeng tinggi bila memungkinkan agar tidak banyak membungkuk.",
      },
    },
    {
      id: "rotate-task",
      text: {
        "ja-easy": "違(ちが)う 作業(さぎょう) を 順(じゅん)に 行(おこな)う",
        en: "Rotate between bending and standing tasks to vary posture.",
        vi: "Luân phiên giữa các việc cúi và đứng để đổi tư thế.",
        zh: "弯腰与站立作业交替进行，变换姿势。",
        id: "Bergantian antara tugas membungkuk dan berdiri.",
      },
    },
    {
      id: "warm-up",
      text: {
        "ja-easy": "畑(はたけ) に 出(で)る 前(まえ) に 体操(たいそう)",
        en: "Warm-up exercises before going to the field.",
        vi: "Khởi động trước khi ra ruộng.",
        zh: "下田前进行热身运动。",
        id: "Pemanasan sebelum ke ladang.",
      },
    },
    {
      id: "harvest-bag",
      text: {
        "ja-easy": "収穫(しゅうかく) の 袋(ふくろ) を 重(おも)く しない",
        en: "Keep harvest bags below 10 kg; empty them frequently.",
        vi: "Giữ túi thu hoạch dưới 10 kg, đổ thường xuyên.",
        zh: "采收袋装载不超10公斤，常清空。",
        id: "Jaga tas panen di bawah 10 kg, sering kosongkan.",
      },
    },
    {
      id: "machine-help",
      text: {
        "ja-easy": "運搬車(うんぱんしゃ) や リフト を 使(つか)う",
        en: "Use carts or hand lifts to move boxes, not just your back.",
        vi: "Dùng xe đẩy hoặc xe nâng tay để di chuyển thùng.",
        zh: "搬运箱子时使用手推车或手动叉车。",
        id: "Gunakan troli atau pengangkat untuk memindahkan kotak.",
      },
    },
  ],
  emergency: [
    {
      id: "rest-stretch",
      text: {
        "ja-easy": "腰(こし) が 痛(いた)い 時(とき) は すぐ 休(やす)む",
        en: "Stop and rest as soon as back pain begins; do not push through.",
        vi: "Dừng lại và nghỉ ngay khi đau lưng, đừng cố làm tiếp.",
        zh: "感到腰痛立即停下休息，切勿硬撑。",
        id: "Berhenti dan istirahat saat nyeri muncul; jangan paksakan.",
      },
    },
    {
      id: "clinic",
      text: {
        "ja-easy": "我慢(がまん) しないで 整形(せいけい) 外科(げか) へ",
        en: "Visit an orthopaedic clinic instead of relying on patches.",
        vi: "Đến phòng khám chỉnh hình, không chỉ dùng cao dán.",
        zh: "请前往骨科诊所，不要只靠贴药。",
        id: "Kunjungi klinik ortopedi, bukan hanya mengandalkan koyo.",
      },
    },
  ],
  source: "農林水産省「農作業安全のための指針」",
};

const infection: SafetyMaterial = {
  id: "agriculture-infection-prevention",
  industry: "agriculture",
  topic: "infection-prevention",
  title: {
    "ja-easy": "農業(のうぎょう) の 仕事(しごと) で 感染症(かんせんしょう) を 防(ふせ)ぐ",
    en: "Infection prevention in agriculture",
    vi: "Phòng lây nhiễm trong nông nghiệp",
    zh: "农业工作传染病预防",
    id: "Pencegahan infeksi di pertanian",
  },
  intro: {
    "ja-easy":
      "土(つち)、動物(どうぶつ)、虫(むし) から 病気(びょうき) を もらう ことが あります。",
    en: "Soil, animals, and insects can transmit serious infections such as tetanus and Japanese encephalitis.",
    vi: "Đất, động vật và côn trùng có thể truyền các bệnh nghiêm trọng như uốn ván và viêm não Nhật Bản.",
    zh: "土壤、动物、昆虫可能传播破伤风、日本脑炎等严重传染病。",
    id: "Tanah, hewan, dan serangga dapat menularkan penyakit serius seperti tetanus dan ensefalitis Jepang.",
  },
  checklist: [
    {
      id: "tetanus",
      text: {
        "ja-easy": "破傷風(はしょうふう) の 注射(ちゅうしゃ) を 受(う)ける",
        en: "Receive a tetanus booster shot every 10 years.",
        vi: "Tiêm nhắc uốn ván mỗi 10 năm.",
        zh: "每10年接种破伤风加强针。",
        id: "Vaksin booster tetanus tiap 10 tahun.",
      },
    },
    {
      id: "long-sleeve",
      text: {
        "ja-easy": "長袖(ながそで) と 長(なが)ズボン を 着(き)る",
        en: "Wear long sleeves, long trousers and gloves to prevent insect bites.",
        vi: "Mặc áo dài tay, quần dài và găng để tránh côn trùng.",
        zh: "穿长袖长裤和手套，防止昆虫叮咬。",
        id: "Pakai lengan panjang, celana panjang, dan sarung tangan untuk hindari gigitan.",
      },
    },
    {
      id: "mosquito",
      text: {
        "ja-easy": "蚊(か) よけ スプレー を 使(つか)う",
        en: "Apply insect repellent (DEET) on exposed skin.",
        vi: "Xịt thuốc chống muỗi (DEET) lên da hở.",
        zh: "在裸露皮肤上喷洒含DEET驱蚊喷雾。",
        id: "Oles obat antinyamuk (DEET) ke kulit terbuka.",
      },
    },
    {
      id: "animal-bite",
      text: {
        "ja-easy": "牛(うし)・馬(うま)・鳥(とり) を 触(さわ)った後(あと) は 手(て) を 洗(あら)う",
        en: "Wash hands after handling livestock or poultry.",
        vi: "Rửa tay sau khi tiếp xúc với gia súc hoặc gia cầm.",
        zh: "接触家畜或家禽后须洗手。",
        id: "Cuci tangan setelah memegang ternak atau unggas.",
      },
    },
    {
      id: "well-water",
      text: {
        "ja-easy": "井戸(いど) 水(みず) は そのまま 飲(の)まない",
        en: "Do not drink well water without boiling or filtering it.",
        vi: "Không uống nước giếng chưa đun hoặc lọc.",
        zh: "井水必须煮沸或过滤后才能饮用。",
        id: "Jangan minum air sumur sebelum direbus atau disaring.",
      },
    },
    {
      id: "wound-care",
      text: {
        "ja-easy": "傷(きず) は すぐ 消毒(しょうどく) して 絆創膏(ばんそうこう)",
        en: "Clean and bandage cuts immediately; soil contains tetanus spores.",
        vi: "Sát trùng và băng vết thương ngay; đất chứa bào tử uốn ván.",
        zh: "立即消毒并包扎伤口；土壤含破伤风孢子。",
        id: "Bersihkan dan balut luka segera; tanah mengandung spora tetanus.",
      },
    },
  ],
  emergency: [
    {
      id: "fever-rash",
      text: {
        "ja-easy": "熱(ねつ) と 発疹(ほっしん) が 出(で)たら 医者(いしゃ) へ",
        en: "Go to a clinic if fever and rash appear together — could be tick-borne.",
        vi: "Đến phòng khám nếu sốt kèm phát ban — có thể do ve cắn.",
        zh: "出现发热伴皮疹应就医，可能为蜱虫传染病。",
        id: "Ke klinik bila demam dengan ruam — bisa dari gigitan kutu.",
      },
    },
    {
      id: "rusty-wound",
      text: {
        "ja-easy": "錆(さ)びた 道具(どうぐ) で 深(ふか)く 切(き)ったら 病院(びょういん)",
        en: "Visit a hospital for deep cuts from rusty tools to update tetanus shot.",
        vi: "Đến bệnh viện cập nhật mũi uốn ván nếu bị cắt sâu bởi dụng cụ gỉ.",
        zh: "被生锈工具深度割伤须就医补打破伤风针。",
        id: "Ke rumah sakit untuk update vaksin tetanus bila luka dalam akibat alat berkarat.",
      },
    },
  ],
  source: "厚生労働省「農作業従事者の感染症予防」",
};

export const AGRICULTURE_MATERIALS: SafetyMaterial[] = [
  fall,
  chemical,
  heat,
  back,
  infection,
];
