import type { SafetyMaterial } from "@/types/foreign-worker";

const fall: SafetyMaterial = {
  id: "food-service-fall-from-height",
  industry: "food-service",
  topic: "fall-from-height",
  title: {
    "ja-easy": "飲食店(いんしょくてん) で 滑(すべ)らない・落(お)ちない",
    en: "Avoiding slips and falls in food service",
    vi: "Tránh trượt và té ngã trong nhà hàng",
    zh: "餐饮业防滑、防坠落",
    id: "Mencegah terpeleset dan jatuh di rumah makan",
  },
  intro: {
    "ja-easy":
      "厨房(ちゅうぼう) の 床(ゆか) は 油(あぶら) と 水(みず) で 滑(すべ)りやすい です。",
    en: "Kitchen floors are slippery from oil and water — slips are the top injury in food service.",
    vi: "Sàn bếp trơn vì dầu và nước — trượt ngã là chấn thương phổ biến nhất.",
    zh: "厨房地面因油水变滑，是餐饮业最常见的工伤。",
    id: "Lantai dapur licin karena minyak dan air — terpeleset adalah cedera utama.",
  },
  checklist: [
    {
      id: "non-slip-shoes",
      text: {
        "ja-easy": "厨房(ちゅうぼう) 用(よう) の 滑(すべ)り 止(ど)め 靴(くつ) を 履(は)く",
        en: "Wear kitchen-rated non-slip shoes; never sandals or sneakers.",
        vi: "Mang giày chống trượt chuyên dụng, không đi sandal hoặc giày thể thao.",
        zh: "穿厨房专用防滑鞋，禁穿凉鞋或运动鞋。",
        id: "Pakai sepatu dapur antislip; jangan sandal atau sneaker.",
      },
    },
    {
      id: "clean-spills",
      text: {
        "ja-easy": "床(ゆか) の 油(あぶら) や 水(みず) は すぐ 拭(ふ)く",
        en: "Wipe up spills immediately and place a wet-floor sign.",
        vi: "Lau ngay vết tràn và đặt biển báo sàn ướt.",
        zh: "立即清理地面油水并放置湿滑警示牌。",
        id: "Segera lap tumpahan dan pasang tanda lantai basah.",
      },
    },
    {
      id: "step-stool",
      text: {
        "ja-easy": "棚(たな) の 上(うえ) は 専用(せんよう) の 踏(ふ)み 台(だい) を 使(つか)う",
        en: "Use a proper step stool to reach high shelves — not crates or buckets.",
        vi: "Dùng ghế bậc chuyên dụng để với kệ cao — không dùng thùng/chậu.",
        zh: "够取高架物品使用专用踏脚凳，禁用周转箱或水桶。",
        id: "Pakai bangku injak resmi untuk meraih rak — bukan kotak atau ember.",
      },
    },
    {
      id: "drain-mat",
      text: {
        "ja-easy": "排水(はいすい) マット を 敷(し)く",
        en: "Install drainage mats around sinks and fryers.",
        vi: "Đặt thảm thoát nước quanh bồn rửa và bếp chiên.",
        zh: "在水槽和炸锅周围铺设排水垫。",
        id: "Pasang matras saluran air di sekitar wastafel dan penggorengan.",
      },
    },
    {
      id: "no-rush",
      text: {
        "ja-easy": "急(いそ)いで 走(はし)らない",
        en: "Do not run in the kitchen, even during busy hours.",
        vi: "Không chạy trong bếp, kể cả giờ cao điểm.",
        zh: "厨房内即使忙时也禁止奔跑。",
        id: "Jangan berlari di dapur, bahkan saat sibuk.",
      },
    },
    {
      id: "stairs-rail",
      text: {
        "ja-easy": "階段(かいだん) は 手(て)すり を 持(も)つ",
        en: "Use the handrail when carrying anything up or down stairs.",
        vi: "Vịn tay khi mang đồ lên xuống cầu thang.",
        zh: "搬运上下楼梯时务必扶住扶手。",
        id: "Pegang pegangan tangga saat membawa barang naik/turun.",
      },
    },
  ],
  emergency: [
    {
      id: "knee-injury",
      text: {
        "ja-easy": "膝(ひざ) や 腰(こし) を 打(う)ったら 整形(せいけい) 外科(げか) へ",
        en: "Visit an orthopaedic clinic for knee or hip impact injuries.",
        vi: "Đến phòng khám chỉnh hình nếu va đập đầu gối hoặc hông.",
        zh: "膝盖或臀部撞击伤须就诊骨科。",
        id: "Ke klinik ortopedi bila lutut atau pinggul terbentur.",
      },
    },
    {
      id: "head-119",
      text: {
        "ja-easy": "頭(あたま) を 打(う)ったら すぐ 119",
        en: "Call 119 immediately if the head was struck.",
        vi: "Gọi 119 ngay nếu va đập đầu.",
        zh: "头部撞击立即拨打119。",
        id: "Telepon 119 segera bila kepala terbentur.",
      },
    },
  ],
  source: "厚生労働省「飲食店業における労働災害防止対策」",
};

const chemical: SafetyMaterial = {
  id: "food-service-chemical-handling",
  industry: "food-service",
  topic: "chemical-handling",
  title: {
    "ja-easy": "厨房(ちゅうぼう) の 洗剤(せんざい) を 安全(あんぜん)に 使(つか)う",
    en: "Safe use of cleaning chemicals in the kitchen",
    vi: "Sử dụng hóa chất tẩy rửa bếp an toàn",
    zh: "厨房洗涤剂的安全使用",
    id: "Penggunaan bahan kimia pembersih dapur",
  },
  intro: {
    "ja-easy":
      "業務(ぎょうむ) 用(よう) の 洗剤(せんざい) は 強(つよ)い 薬品(やくひん) です。家庭用(かていよう) と 違(ちが)います。",
    en: "Commercial detergents and degreasers are much stronger than home products. Wear gloves and goggles.",
    vi: "Chất tẩy thương mại mạnh hơn nhiều sản phẩm gia đình. Đeo găng và kính.",
    zh: "商用洗涤剂和去油剂强度远超家用品，需佩戴手套和护目镜。",
    id: "Pembersih komersial jauh lebih kuat dari produk rumah tangga. Pakai sarung tangan dan kacamata.",
  },
  checklist: [
    {
      id: "no-mix-bleach",
      text: {
        "ja-easy": "塩素系(えんそけい) と 酸性(さんせい) を 混(ま)ぜない",
        en: "Never mix chlorine bleach with acid descaler — produces deadly gas.",
        vi: "Không trộn nước Javel với chất tẩy axit — sinh khí cực độc.",
        zh: "禁止混合含氯漂白剂与酸性除垢剂，会产生致命毒气。",
        id: "Jangan campur pemutih klorin dengan asam — menghasilkan gas mematikan.",
      },
    },
    {
      id: "dilution",
      text: {
        "ja-easy": "ラベル の 薄(うす)め 方(かた) を 守(まも)る",
        en: "Always dilute to label specifications before use.",
        vi: "Luôn pha loãng theo nhãn trước khi dùng.",
        zh: "使用前严格按标签稀释。",
        id: "Selalu encerkan sesuai label sebelum dipakai.",
      },
    },
    {
      id: "ppe",
      text: {
        "ja-easy": "手袋(てぶくろ) と ゴーグル を 着(つ)ける",
        en: "Wear chemical gloves and splash goggles when degreasing.",
        vi: "Đeo găng và kính bảo hộ khi tẩy dầu mỡ.",
        zh: "除油作业时戴防化手套和护目镜。",
        id: "Pakai sarung tangan kimia dan kacamata saat membersihkan lemak.",
      },
    },
    {
      id: "ventilation",
      text: {
        "ja-easy": "強(つよ)い 洗剤(せんざい) を 使(つか)う 時(とき) は 換気(かんき)",
        en: "Open windows or run the hood fan when using strong cleaners.",
        vi: "Mở cửa hoặc bật quạt hút khi dùng chất tẩy mạnh.",
        zh: "使用强洗涤剂时打开窗户或启动抽油烟机。",
        id: "Buka jendela atau nyalakan exhaust saat memakai pembersih kuat.",
      },
    },
    {
      id: "original-container",
      text: {
        "ja-easy": "ペットボトル に 移(うつ)し 替(か)えない",
        en: "Keep cleaners in their original labeled containers.",
        vi: "Để chất tẩy trong bình gốc có nhãn.",
        zh: "保留洗涤剂原装带标签容器。",
        id: "Simpan pembersih di wadah asli berlabel.",
      },
    },
    {
      id: "store-separate",
      text: {
        "ja-easy": "食材(しょくざい) と 一緒(いっしょ) に 置(お)かない",
        en: "Store cleaners separately from food and food utensils.",
        vi: "Lưu chất tẩy tách biệt với thực phẩm và dụng cụ ăn.",
        zh: "洗涤剂与食材及餐具分开存放。",
        id: "Simpan pembersih terpisah dari makanan dan alat masak.",
      },
    },
  ],
  emergency: [
    {
      id: "gas-evacuate",
      text: {
        "ja-easy": "ガス が 出(で)たら すぐ 外(そと) へ",
        en: "If toxic gas is released, evacuate everyone outside and call 119.",
        vi: "Nếu có khí độc, sơ tán ngay và gọi 119.",
        zh: "产生毒气立即疏散人员并拨打119。",
        id: "Jika gas beracun keluar, evakuasi semua dan telepon 119.",
      },
    },
    {
      id: "eye-flush",
      text: {
        "ja-easy": "目(め) に 入(はい)ったら 15 分(ふん) 水(みず) で 洗(あら)う",
        en: "Flush eyes with water for 15 minutes if splashed.",
        vi: "Rửa mắt 15 phút nếu bị bắn.",
        zh: "溅入眼睛冲水15分钟。",
        id: "Bilas mata 15 menit bila terkena cipratan.",
      },
    },
  ],
  source: "厚生労働省「飲食店業における化学物質取扱いガイド」",
};

const heat: SafetyMaterial = {
  id: "food-service-heatstroke",
  industry: "food-service",
  topic: "heatstroke",
  title: {
    "ja-easy": "厨房(ちゅうぼう) の 暑(あつ)さ に 注意(ちゅうい)",
    en: "Heatstroke prevention in hot kitchens",
    vi: "Phòng sốc nhiệt trong bếp nóng",
    zh: "高温厨房中暑预防",
    id: "Pencegahan sengatan panas di dapur panas",
  },
  intro: {
    "ja-easy":
      "夏(なつ) の 厨房(ちゅうぼう) は とても 暑(あつ)く なります。エアコン と 換気(かんき) を 使(つか)って ください。",
    en: "Summer kitchens can exceed 35°C even with AC. Plan rotations and hydration breaks.",
    vi: "Bếp mùa hè có thể trên 35°C dù có điều hòa. Sắp xếp luân phiên và nghỉ uống nước.",
    zh: "夏季厨房即使有空调也可能超过35摄氏度，需安排轮换和补水。",
    id: "Dapur musim panas bisa lebih 35°C meski ber-AC. Atur rotasi dan istirahat minum.",
  },
  checklist: [
    {
      id: "ac-on",
      text: {
        "ja-easy": "エアコン を 必(かなら)ず つける",
        en: "Keep AC running during all open hours.",
        vi: "Bật điều hòa suốt giờ mở cửa.",
        zh: "营业期间务必开启空调。",
        id: "Nyalakan AC selama jam operasional.",
      },
    },
    {
      id: "hood-fan",
      text: {
        "ja-easy": "換気扇(かんきせん) を 強(つよ)く する",
        en: "Set the kitchen hood fan to the maximum during peak service.",
        vi: "Đặt quạt hút bếp ở mức cao nhất khi cao điểm.",
        zh: "高峰时段抽油烟机开至最大。",
        id: "Nyalakan exhaust dapur maksimal saat puncak operasi.",
      },
    },
    {
      id: "drink-break",
      text: {
        "ja-easy": "30 分(ぷん) ごと に 水(みず) を 飲(の)む",
        en: "Drink water every 30 minutes during peak service.",
        vi: "Uống nước mỗi 30 phút khi cao điểm.",
        zh: "高峰时段每30分钟饮水。",
        id: "Minum air setiap 30 menit saat sibuk.",
      },
    },
    {
      id: "rotation",
      text: {
        "ja-easy": "コンロ の 担当(たんとう) を 交代(こうたい) する",
        en: "Rotate cook stations every 1-2 hours away from open flame.",
        vi: "Luân phiên vị trí bếp lửa mỗi 1–2 giờ.",
        zh: "明火灶位每1至2小时轮换。",
        id: "Bergantian pos kompor api setiap 1–2 jam.",
      },
    },
    {
      id: "fan-vest",
      text: {
        "ja-easy": "ファン ベスト を 使(つか)って いい",
        en: "Cooks may wear a fan-equipped vest under the apron.",
        vi: "Đầu bếp có thể mặc áo có quạt dưới tạp dề.",
        zh: "厨师可在围裙内穿着风扇背心。",
        id: "Koki boleh pakai rompi berkipas di balik celemek.",
      },
    },
    {
      id: "salt-water",
      text: {
        "ja-easy": "塩(しお) タブレット や スポーツ ドリンク を 用意(ようい)",
        en: "Keep salt tablets and electrolyte drinks in the back area.",
        vi: "Chuẩn bị viên muối và nước thể thao ở khu hậu cần.",
        zh: "在后厨备好盐片和电解质饮料。",
        id: "Sediakan tablet garam dan minuman elektrolit di area belakang.",
      },
    },
  ],
  emergency: [
    {
      id: "rest-cool",
      text: {
        "ja-easy": "気分(きぶん) が 悪(わる)い 人(ひと) は 涼(すず)しい 所(ところ) へ",
        en: "Move a sickly worker to a cool area and cool the body.",
        vi: "Đưa người mệt vào nơi mát và làm mát cơ thể.",
        zh: "不适员工立即移至阴凉处并降温。",
        id: "Pindahkan pekerja yang lemas ke area sejuk dan dinginkan tubuh.",
      },
    },
    {
      id: "burn-119",
      text: {
        "ja-easy": "意識(いしき) が ない 時(とき) は 119",
        en: "Call 119 if the worker loses consciousness.",
        vi: "Gọi 119 nếu bất tỉnh.",
        zh: "失去意识立即拨打119。",
        id: "Telepon 119 jika pingsan.",
      },
    },
  ],
  source: "厚生労働省「STOP！熱中症 クールワーク（外食業）」",
};

const back: SafetyMaterial = {
  id: "food-service-lower-back-injury",
  industry: "food-service",
  topic: "lower-back-injury",
  title: {
    "ja-easy": "飲食店(いんしょくてん) の 仕事(しごと) で 腰痛(ようつう) を 防(ふせ)ぐ",
    en: "Lower-back injury prevention in food service",
    vi: "Phòng đau lưng trong nhà hàng",
    zh: "餐饮业腰痛预防",
    id: "Pencegahan nyeri punggung di rumah makan",
  },
  intro: {
    "ja-easy":
      "重(おも)い 鍋(なべ) や 食器(しょっき) の 箱(はこ) を 運(はこ)ぶ 時(とき)、腰(こし) に 気(き) を つけて ください。",
    en: "Heavy pots, dish tubs and supply boxes cause back injuries — lift with knees, not back.",
    vi: "Nồi nặng, khay đĩa và thùng vật tư gây đau lưng — nâng bằng đầu gối.",
    zh: "重锅、盘篮和补给箱易致腰伤，请用膝盖发力搬运。",
    id: "Panci berat, bak piring, dan boks bahan menyebabkan nyeri punggung — angkat dengan lutut.",
  },
  checklist: [
    {
      id: "knee-lift",
      text: {
        "ja-easy": "膝(ひざ) で 持(も)ち上(あ)げる",
        en: "Bend knees, keep back straight when lifting.",
        vi: "Cong đầu gối, lưng thẳng khi nâng.",
        zh: "弯曲膝盖，保持腰背挺直。",
        id: "Tekuk lutut, jaga punggung lurus saat mengangkat.",
      },
    },
    {
      id: "two-hands-pot",
      text: {
        "ja-easy": "鍋(なべ) は 両手(りょうて) で 持(も)つ",
        en: "Carry pots and trays with both hands close to your body.",
        vi: "Bưng nồi và khay bằng hai tay, sát vào người.",
        zh: "锅具与托盘双手紧贴身体搬运。",
        id: "Bawa panci dan baki dengan dua tangan dekat tubuh.",
      },
    },
    {
      id: "step-not-twist",
      text: {
        "ja-easy": "体(からだ) を ひねらない で 足(あし) を 動(うご)かす",
        en: "Step around instead of twisting your torso.",
        vi: "Dùng chân xoay người, không vặn thân.",
        zh: "请用脚步移动而非扭转身体。",
        id: "Putar dengan kaki, jangan memutar pinggang.",
      },
    },
    {
      id: "anti-fatigue",
      text: {
        "ja-easy": "立(た)ち 仕事(しごと) に は 疲労(ひろう) マット",
        en: "Use anti-fatigue mats at long-standing stations.",
        vi: "Dùng thảm chống mỏi tại vị trí đứng lâu.",
        zh: "长时间站立工位铺设防疲劳垫。",
        id: "Gunakan matras anti-lelah di pos berdiri lama.",
      },
    },
    {
      id: "trolley",
      text: {
        "ja-easy": "食器(しょっき) の 運搬(うんぱん) は カート を 使(つか)う",
        en: "Use a trolley to move dish racks between dining and kitchen.",
        vi: "Dùng xe đẩy để di chuyển khay đĩa giữa bàn ăn và bếp.",
        zh: "餐厅与厨房间使用手推车搬运餐具架。",
        id: "Pakai troli untuk pindahkan rak piring antara ruang makan dan dapur.",
      },
    },
    {
      id: "stretch",
      text: {
        "ja-easy": "シフト の 前(まえ) と 後(あと) に ストレッチ",
        en: "Stretch before and after every shift.",
        vi: "Giãn cơ trước và sau mỗi ca làm.",
        zh: "每班前后进行伸展运动。",
        id: "Peregangan sebelum dan sesudah shift.",
      },
    },
  ],
  emergency: [
    {
      id: "early-report",
      text: {
        "ja-easy": "腰(こし) が 痛(いた)い 時(とき) は すぐ 言(い)う",
        en: "Report back pain to the manager immediately.",
        vi: "Báo quản lý ngay khi đau lưng.",
        zh: "腰痛立即上报店长。",
        id: "Laporkan nyeri punggung ke manajer segera.",
      },
    },
    {
      id: "rosai",
      text: {
        "ja-easy": "労災(ろうさい) は 国籍(こくせき) に 関係(かんけい) なく 申請(しんせい) できる",
        en: "Workers' compensation applies regardless of nationality.",
        vi: "Bảo hiểm Rōsai áp dụng bất kể quốc tịch.",
        zh: "劳灾保险与国籍无关，均可申请。",
        id: "Asuransi Rōsai berlaku tanpa memandang kebangsaan.",
      },
    },
  ],
  source: "厚生労働省「サービス業（外食）のための腰痛予防対策」",
};

const infection: SafetyMaterial = {
  id: "food-service-infection-prevention",
  industry: "food-service",
  topic: "infection-prevention",
  title: {
    "ja-easy": "厨房(ちゅうぼう) で 食中毒(しょくちゅうどく) と 感染症(かんせんしょう) を 防(ふせ)ぐ",
    en: "Preventing food poisoning and infection in the kitchen",
    vi: "Phòng ngộ độc thực phẩm và lây nhiễm trong bếp",
    zh: "厨房食物中毒与传染病预防",
    id: "Mencegah keracunan dan infeksi di dapur",
  },
  intro: {
    "ja-easy":
      "汚(きたな)い 手(て) や 古(ふる)い 食材(しょくざい) が 病気(びょうき) を 広(ひろ)げます。HACCP の 考(かんが)え 方(かた) を 守(まも)って ください。",
    en: "Dirty hands and old food spread illness fast. Follow HACCP principles every shift.",
    vi: "Tay bẩn và thực phẩm cũ truyền bệnh nhanh. Tuân thủ HACCP mỗi ca.",
    zh: "脏手和过期食材会迅速传染，每班需遵守HACCP原则。",
    id: "Tangan kotor dan bahan lama menularkan penyakit cepat. Patuhi HACCP setiap shift.",
  },
  checklist: [
    {
      id: "hand-wash-30",
      text: {
        "ja-easy": "30 秒(びょう) 以上(いじょう) 石(せっ)けん で 手(て) を 洗(あら)う",
        en: "Wash hands with soap for 30 seconds — before cooking and after toilet.",
        vi: "Rửa tay với xà phòng 30 giây trước khi nấu và sau toilet.",
        zh: "烹饪前与如厕后用肥皂洗手30秒以上。",
        id: "Cuci tangan dengan sabun 30 detik sebelum masak dan setelah toilet.",
      },
    },
    {
      id: "temperature",
      text: {
        "ja-easy": "肉(にく) は 中心(ちゅうしん) 75 度(ど) で 1 分(ぷん) 以上(いじょう) 加熱(かねつ)",
        en: "Heat meat to 75°C core temperature for at least 1 minute.",
        vi: "Hâm thịt đạt tâm 75°C trong ít nhất 1 phút.",
        zh: "肉类中心温度需达75摄氏度并加热1分钟以上。",
        id: "Panaskan daging hingga suhu inti 75°C minimal 1 menit.",
      },
    },
    {
      id: "cross-cont",
      text: {
        "ja-easy": "生肉(なまにく) の まな板(いた) と 野菜(やさい) の まな板(いた) を 分(わ)ける",
        en: "Use separate cutting boards for raw meat and ready-to-eat foods.",
        vi: "Dùng thớt riêng cho thịt sống và thực phẩm ăn liền.",
        zh: "生肉与即食食物使用不同砧板。",
        id: "Gunakan talenan berbeda untuk daging mentah dan makanan siap saji.",
      },
    },
    {
      id: "fridge-temp",
      text: {
        "ja-easy": "冷蔵庫(れいぞうこ) は 10 度(ど) 以下(いか)、冷凍庫(れいとうこ) は マイナス 15 度(ど) 以下(いか)",
        en: "Keep fridge ≤10°C and freezer ≤–15°C; check daily.",
        vi: "Giữ tủ lạnh ≤10°C, tủ đông ≤–15°C, kiểm tra hằng ngày.",
        zh: "冷藏≤10℃、冷冻≤-15℃，每日记录温度。",
        id: "Kulkas ≤10°C, freezer ≤–15°C, periksa harian.",
      },
    },
    {
      id: "sick-stay-home",
      text: {
        "ja-easy": "下痢(げり) や 熱(ねつ) の 時(とき) は 仕事(しごと) を 休(やす)む",
        en: "Stay home with diarrhoea, vomiting, or fever — never serve food sick.",
        vi: "Nghỉ làm khi tiêu chảy, nôn hoặc sốt — không phục vụ khi đang ốm.",
        zh: "腹泻、呕吐、发热时必须休假，禁止带病上岗。",
        id: "Tetap di rumah saat diare, muntah, atau demam — jangan kerja saat sakit.",
      },
    },
    {
      id: "checkup-norovirus",
      text: {
        "ja-easy": "ノロウイルス の 検査(けんさ) を 受(う)ける",
        en: "Get norovirus screening once during winter season.",
        vi: "Xét nghiệm norovirus một lần trong mùa đông.",
        zh: "冬季进行一次诺如病毒筛查。",
        id: "Lakukan tes norovirus sekali per musim dingin.",
      },
    },
  ],
  emergency: [
    {
      id: "outbreak-report",
      text: {
        "ja-easy": "お客(きゃく) さん が 体調(たいちょう) を 崩(くず)したら 保健所(ほけんじょ) に 連絡(れんらく)",
        en: "Report any customer illness to the local public health office.",
        vi: "Báo cơ quan y tế nếu khách hàng bị bệnh sau ăn.",
        zh: "顾客出现不适应通报当地保健所。",
        id: "Laporkan ke dinas kesehatan bila pelanggan jatuh sakit.",
      },
    },
    {
      id: "preserve-sample",
      text: {
        "ja-easy": "食(た)べ 物(もの) の サンプル を 2 週間(しゅうかん) 保存(ほぞん) する",
        en: "Keep food samples for 2 weeks for traceability.",
        vi: "Lưu mẫu thực phẩm trong 2 tuần để truy xuất.",
        zh: "保留食品样本2周以备追溯。",
        id: "Simpan sampel makanan 2 minggu untuk telusur.",
      },
    },
  ],
  source: "厚生労働省「HACCPに沿った衛生管理の手引書（外食）」",
};

export const FOOD_SERVICE_MATERIALS: SafetyMaterial[] = [
  fall,
  chemical,
  heat,
  back,
  infection,
];
