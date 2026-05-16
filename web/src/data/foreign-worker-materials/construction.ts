import type { SafetyMaterial } from "@/types/foreign-worker";

/**
 * Construction-sector safety materials. The five topics map to the
 * cumulative top causes of foreign-worker injury reported by MHLW for
 * 建設業 (墜落・転落, 化学物質, 熱中症, 腰痛, 感染症). Wording aligns with
 * 厚労省「外国人労働者向け労働関係法令周知用パンフレット」 (the parallel
 * Japanese is intentionally short — Yasashii-Nihongo style).
 */

const construction_fall: SafetyMaterial = {
  id: "construction-fall-from-height",
  industry: "construction",
  topic: "fall-from-height",
  title: {
    "ja-easy": "高い 所(ところ) で 安全(あんぜん)に 仕事(しごと) を する",
    en: "Working safely at height",
    vi: "Làm việc an toàn trên cao",
    zh: "在高处安全作业",
    id: "Bekerja dengan aman di ketinggian",
  },
  intro: {
    "ja-easy":
      "高(たか)い 所(ところ) で 仕事(しごと) を する 時(とき) は、落(お)ちると 大(おお)きな ケガ を します。ベルト と ヘルメット を 必(かなら)ず つけて ください。",
    en: "Falls from height are the leading cause of fatal accidents in construction. Always wear a helmet and a full-harness safety belt.",
    vi: "Ngã từ trên cao là nguyên nhân hàng đầu gây tai nạn chết người trong ngành xây dựng. Luôn đội mũ bảo hộ và đeo dây an toàn toàn thân.",
    zh: "高处坠落是建筑业事故死亡的首要原因。务必佩戴安全帽和全身式安全带。",
    id: "Jatuh dari ketinggian adalah penyebab utama kecelakaan fatal di konstruksi. Selalu pakai helm dan sabuk pengaman tubuh penuh.",
  },
  checklist: [
    {
      id: "harness",
      text: {
        "ja-easy": "フルハーネス を 正(ただ)しく つける",
        en: "Wear a full-body harness correctly.",
        vi: "Đeo dây an toàn toàn thân đúng cách.",
        zh: "正确穿戴全身式安全带。",
        id: "Pakai sabuk pengaman tubuh penuh dengan benar.",
      },
      illustrationHint: "Harness fitted to body, all buckles closed",
    },
    {
      id: "anchor",
      text: {
        "ja-easy": "ロープ を 強(つよ)い 場所(ばしょ) に かける",
        en: "Hook the lanyard to a strong anchor point above your waist.",
        vi: "Móc dây bảo hộ vào điểm neo chắc chắn, cao hơn thắt lưng.",
        zh: "将安全绳挂在腰部以上的牢固挂点。",
        id: "Kaitkan tali ke titik jangkar yang kuat di atas pinggang.",
      },
    },
    {
      id: "scaffold-check",
      text: {
        "ja-easy": "足場(あしば) と はしご を 使(つか)う 前(まえ) に 見(み)る",
        en: "Inspect scaffolds and ladders for damage before use.",
        vi: "Kiểm tra giàn giáo và thang trước khi sử dụng.",
        zh: "使用前检查脚手架和梯子有无损伤。",
        id: "Periksa perancah dan tangga sebelum digunakan.",
      },
    },
    {
      id: "guard-rail",
      text: {
        "ja-easy": "手(て)すり が ない 場所(ばしょ) で 仕事(しごと) を しない",
        en: "Do not work where guardrails are missing or removed.",
        vi: "Không làm việc ở nơi không có lan can bảo vệ.",
        zh: "在没有防护栏的地方不要作业。",
        id: "Jangan bekerja di tempat tanpa pagar pelindung.",
      },
    },
    {
      id: "weather",
      text: {
        "ja-easy": "強(つよ)い 風(かぜ) や 雨(あめ) の 時(とき) は 高所(こうしょ) 作業(さぎょう) を 止(と)める",
        en: "Stop high-work in strong wind (over 10 m/s) or rain.",
        vi: "Dừng làm việc trên cao khi có gió mạnh (trên 10 m/giây) hoặc mưa.",
        zh: "风速超过10米/秒或下雨时停止高处作业。",
        id: "Hentikan kerja di ketinggian saat angin kencang (lebih 10 m/detik) atau hujan.",
      },
    },
    {
      id: "report-defect",
      text: {
        "ja-easy": "壊(こわ)れた 道具(どうぐ) は すぐ 班長(はんちょう) に 言(い)う",
        en: "Report any damaged equipment to your supervisor immediately.",
        vi: "Báo ngay cho quản đốc nếu thiết bị bị hỏng.",
        zh: "发现器具损坏立即报告班长。",
        id: "Segera laporkan peralatan rusak kepada mandor.",
      },
    },
  ],
  emergency: [
    {
      id: "call-119",
      text: {
        "ja-easy": "ケガ を したら 119 に 電話(でんわ) する",
        en: "Call 119 (fire/ambulance) if anyone is injured.",
        vi: "Gọi 119 (cứu thương) khi có người bị thương.",
        zh: "有人受伤立即拨打119（消防/救护）。",
        id: "Telepon 119 (pemadam/ambulans) jika ada yang terluka.",
      },
    },
    {
      id: "report-supervisor",
      text: {
        "ja-easy": "班長(はんちょう) と 会社(かいしゃ) に すぐ 知(し)らせる",
        en: "Inform your supervisor and company immediately.",
        vi: "Báo ngay cho quản đốc và công ty.",
        zh: "立即通知班长和公司。",
        id: "Beritahu mandor dan perusahaan segera.",
      },
    },
  ],
  source: "厚生労働省「建設業における外国人労働者の安全衛生確保のための教材」",
};

const construction_chemical: SafetyMaterial = {
  id: "construction-chemical-handling",
  industry: "construction",
  topic: "chemical-handling",
  title: {
    "ja-easy": "化学物質(かがくぶっしつ) を 安全(あんぜん)に 使(つか)う",
    en: "Handling chemicals safely on the construction site",
    vi: "Sử dụng hóa chất an toàn tại công trường",
    zh: "工地化学品的安全使用",
    id: "Menggunakan bahan kimia dengan aman di proyek",
  },
  intro: {
    "ja-easy":
      "塗料(とりょう)、シンナー、接着剤(せっちゃくざい) は 体(からだ) に 良(よ)くない 物(もの) が 入(はい)っています。マスク と 手袋(てぶくろ) を つけて ください。",
    en: "Paints, thinners and adhesives contain substances that can harm your lungs and skin. Use a respirator and gloves at all times.",
    vi: "Sơn, dung môi và keo có chứa chất gây hại cho phổi và da. Luôn dùng mặt nạ phòng độc và găng tay.",
    zh: "涂料、稀释剂、粘合剂含有损害肺部和皮肤的物质。务必佩戴呼吸防护具和手套。",
    id: "Cat, tiner, dan lem mengandung zat yang merusak paru-paru dan kulit. Selalu pakai masker pernapasan dan sarung tangan.",
  },
  checklist: [
    {
      id: "read-sds",
      text: {
        "ja-easy": "SDS（安全(あんぜん) データシート） を 読(よ)む",
        en: "Read the SDS (Safety Data Sheet) before opening the container.",
        vi: "Đọc SDS (bảng dữ liệu an toàn) trước khi mở thùng chứa.",
        zh: "开桶前先阅读SDS（安全数据表）。",
        id: "Baca SDS (lembar data keselamatan) sebelum membuka wadah.",
      },
    },
    {
      id: "ventilation",
      text: {
        "ja-easy": "風(かぜ) が 通(とお)る 所(ところ) で 使(つか)う",
        en: "Work only in well-ventilated areas; never in closed rooms.",
        vi: "Chỉ làm việc nơi thông gió tốt, không làm trong phòng kín.",
        zh: "仅在通风良好的地方使用，禁止在密闭空间作业。",
        id: "Bekerja hanya di area berventilasi baik, jangan di ruang tertutup.",
      },
    },
    {
      id: "respirator",
      text: {
        "ja-easy": "正(ただ)しい マスク を つける（防(ぼう)じん か 防毒(ぼうどく)）",
        en: "Wear the correct mask (dust mask or chemical respirator).",
        vi: "Dùng đúng loại mặt nạ (chống bụi hoặc lọc hóa chất).",
        zh: "佩戴正确的口罩（防尘或防毒）。",
        id: "Pakai masker yang tepat (debu atau respirator kimia).",
      },
      illustrationHint: "Comparing dust mask vs chemical respirator",
    },
    {
      id: "skin-contact",
      text: {
        "ja-easy": "肌(はだ) に つけない。すぐ 水(みず) で 洗(あら)う",
        en: "Avoid skin contact. Wash with water immediately if splashed.",
        vi: "Tránh tiếp xúc da. Rửa ngay bằng nước nếu bị bắn vào.",
        zh: "避免皮肤接触，溅到立即用水冲洗。",
        id: "Hindari kontak kulit. Segera cuci dengan air bila terkena.",
      },
    },
    {
      id: "no-fire",
      text: {
        "ja-easy": "火(ひ) や タバコ の そば で 使(つか)わない",
        en: "Keep flames, sparks and cigarettes away from solvents.",
        vi: "Không dùng gần lửa, tia lửa hoặc thuốc lá.",
        zh: "禁止在明火、火花和香烟附近使用。",
        id: "Jauhkan dari api, percikan, dan rokok.",
      },
    },
    {
      id: "storage",
      text: {
        "ja-easy": "使(つか)い 終(お)わったら 蓋(ふた) を しめて 元(もと) の 場所(ばしょ) に 戻(もど)す",
        en: "Close the lid tightly and return the container to the designated storage area.",
        vi: "Đậy nắp chặt và đặt lại vào nơi lưu trữ quy định.",
        zh: "用毕盖紧盖子并放回指定存放处。",
        id: "Tutup rapat dan kembalikan ke tempat penyimpanan yang ditentukan.",
      },
    },
  ],
  emergency: [
    {
      id: "eye-splash",
      text: {
        "ja-easy": "目(め) に 入(はい)ったら 15 分(ふん) 以上(いじょう) 水(みず) で 洗(あら)う",
        en: "If splashed in the eyes, rinse with clean water for at least 15 minutes.",
        vi: "Nếu bắn vào mắt, rửa bằng nước sạch ít nhất 15 phút.",
        zh: "溅入眼睛立即用清水冲洗15分钟以上。",
        id: "Jika terkena mata, bilas dengan air bersih minimal 15 menit.",
      },
    },
    {
      id: "show-sds",
      text: {
        "ja-easy": "病院(びょういん) では SDS を 見(み)せる",
        en: "Show the SDS to the doctor at the hospital.",
        vi: "Đưa SDS cho bác sĩ tại bệnh viện.",
        zh: "在医院出示SDS给医生。",
        id: "Tunjukkan SDS kepada dokter di rumah sakit.",
      },
    },
  ],
  source: "厚生労働省「化学物質取扱いに係る外国人労働者向け教材」",
};

const construction_heat: SafetyMaterial = {
  id: "construction-heatstroke",
  industry: "construction",
  topic: "heatstroke",
  title: {
    "ja-easy": "夏(なつ) の 工事(こうじ) 現場(げんば) で 熱中症(ねっちゅうしょう) を 防(ふせ)ぐ",
    en: "Preventing heatstroke on summer construction sites",
    vi: "Phòng chống sốc nhiệt tại công trường mùa hè",
    zh: "夏季工地的中暑预防",
    id: "Mencegah sengatan panas di proyek musim panas",
  },
  intro: {
    "ja-easy":
      "暑(あつ)い 日(ひ) は 体(からだ) が とても 熱(あつ)く なります。水(みず) と 塩(しお) を 取(と)って、休(やす)む 時間(じかん) を 作(つく)って ください。",
    en: "Heatstroke kills construction workers every summer in Japan. Drink water with salt, take breaks, and watch for warning signs.",
    vi: "Sốc nhiệt cướp đi nhiều mạng sống công nhân xây dựng mỗi mùa hè ở Nhật. Uống nước có muối, nghỉ giải lao và để ý dấu hiệu cảnh báo.",
    zh: "夏季在日本工地中暑致死案例每年都有。饮用含盐分的水，定时休息，注意身体警告信号。",
    id: "Sengatan panas merenggut nyawa pekerja konstruksi setiap musim panas di Jepang. Minum air bergaram, istirahat, dan amati gejala awal.",
  },
  checklist: [
    {
      id: "wbgt",
      text: {
        "ja-easy": "現場(げんば) の 暑(あつ)さ 指数(しすう) を 見(み)る",
        en: "Check the WBGT heat index posted at the site each morning.",
        vi: "Kiểm tra chỉ số nhiệt WBGT dán tại công trường mỗi sáng.",
        zh: "每天上午查看现场张贴的WBGT暑热指数。",
        id: "Periksa indeks panas WBGT yang dipasang di lokasi setiap pagi.",
      },
    },
    {
      id: "hydration",
      text: {
        "ja-easy": "20 分(ぷん) ごと に 水(みず) を 飲(の)む",
        en: "Drink water every 20 minutes, even if you do not feel thirsty.",
        vi: "Uống nước mỗi 20 phút, kể cả khi không khát.",
        zh: "每20分钟补水一次，即使不渴也要喝。",
        id: "Minum air setiap 20 menit, bahkan jika tidak haus.",
      },
    },
    {
      id: "salt-tablet",
      text: {
        "ja-easy": "塩(しお) タブレット や スポーツ ドリンク を 取(と)る",
        en: "Eat salt tablets or drink an electrolyte sports drink at each break.",
        vi: "Ăn viên muối hoặc uống nước thể thao chứa điện giải mỗi lần nghỉ.",
        zh: "每次休息时服用盐片或饮用电解质运动饮料。",
        id: "Konsumsi tablet garam atau minuman elektrolit setiap istirahat.",
      },
    },
    {
      id: "fan-vest",
      text: {
        "ja-easy": "ファン 付(つ)き 作業(さぎょう) 服(ふく) や 帽子(ぼうし) を 使(つか)う",
        en: "Wear a fan-equipped work vest, hat, or wet towel under the helmet.",
        vi: "Mặc áo có quạt, đội mũ hoặc lót khăn ướt dưới mũ bảo hộ.",
        zh: "穿戴风扇背心、帽子或在安全帽内垫湿毛巾。",
        id: "Pakai rompi berkipas, topi, atau handuk basah di bawah helm.",
      },
    },
    {
      id: "break-shade",
      text: {
        "ja-easy": "1 時間(じかん) に 1 回(かい) 日陰(ひかげ) で 休(やす)む",
        en: "Take a shade or air-conditioned break at least once per hour.",
        vi: "Nghỉ ngơi trong bóng râm hoặc nơi có điều hòa ít nhất 1 lần/giờ.",
        zh: "每小时至少在阴凉或空调处休息一次。",
        id: "Istirahat di tempat teduh atau ber-AC minimal sekali per jam.",
      },
    },
    {
      id: "buddy-check",
      text: {
        "ja-easy": "仲間(なかま) の 顔色(かおいろ) や 様子(ようす) を 見(み)る",
        en: "Watch your buddy for pale skin, confusion or stopping sweating.",
        vi: "Quan sát đồng nghiệp: da tái, lú lẫn, ngừng đổ mồ hôi.",
        zh: "互相留意：脸色苍白、神志不清、停止出汗。",
        id: "Awasi rekan: kulit pucat, bingung, atau berhenti berkeringat.",
      },
    },
  ],
  emergency: [
    {
      id: "cool-immediately",
      text: {
        "ja-easy": "急(きゅう)に 涼(すず)しい 所(ところ) に 連(つ)れて 行(い)き、体(からだ) を 冷(ひ)やす",
        en: "Move the person to a cool place and cool the body with water or ice packs.",
        vi: "Đưa nạn nhân vào nơi mát và làm mát cơ thể bằng nước hoặc đá.",
        zh: "立即移至阴凉处，用水或冰袋为身体降温。",
        id: "Pindahkan ke tempat sejuk, dinginkan tubuh dengan air atau es.",
      },
    },
    {
      id: "call-ambulance",
      text: {
        "ja-easy": "意識(いしき) が おかしい 時(とき) は すぐ 119",
        en: "Call 119 immediately if the person is confused, unconscious or convulsing.",
        vi: "Gọi 119 ngay nếu nạn nhân lú lẫn, bất tỉnh hoặc co giật.",
        zh: "若出现意识模糊、昏迷或抽搐，立即拨打119。",
        id: "Telepon 119 segera bila korban bingung, pingsan, atau kejang.",
      },
    },
  ],
  source: "厚生労働省「STOP！熱中症 クールワークキャンペーン」",
};

const construction_back: SafetyMaterial = {
  id: "construction-lower-back-injury",
  industry: "construction",
  topic: "lower-back-injury",
  title: {
    "ja-easy": "腰(こし) を 守(まも)って 重(おも)い 物(もの) を 運(はこ)ぶ",
    en: "Protecting your lower back when handling heavy loads",
    vi: "Bảo vệ lưng khi nâng vật nặng",
    zh: "搬运重物时保护腰部",
    id: "Melindungi punggung saat mengangkat beban berat",
  },
  intro: {
    "ja-easy":
      "重(おも)い 物(もの) を 急(きゅう)に 持(も)ち上(あ)げると 腰(こし) を 痛(いた)めます。膝(ひざ) を 曲(ま)げて、ゆっくり 持(も)ち上(あ)げて ください。",
    en: "Lifting heavy loads incorrectly is the top cause of long-term injury in construction. Bend your knees and lift slowly.",
    vi: "Nâng vật nặng sai cách là nguyên nhân hàng đầu gây chấn thương dài hạn trong xây dựng. Cong đầu gối và nâng từ từ.",
    zh: "搬运重物姿势错误是建筑业长期伤害的首要原因。弯曲膝盖，缓慢抬起。",
    id: "Mengangkat beban dengan salah adalah penyebab utama cedera jangka panjang. Tekuk lutut dan angkat perlahan.",
  },
  checklist: [
    {
      id: "weight-limit",
      text: {
        "ja-easy": "一人(ひとり) で 持(も)てる 重(おも)さ は 25 kg まで",
        en: "Single-worker limit is 25 kg (men) or about 15 kg (women).",
        vi: "Mỗi người tối đa 25 kg (nam) hoặc khoảng 15 kg (nữ).",
        zh: "单人搬运上限：男性25公斤，女性约15公斤。",
        id: "Batas seorang: 25 kg (pria) atau sekitar 15 kg (wanita).",
      },
    },
    {
      id: "knee-lift",
      text: {
        "ja-easy": "膝(ひざ) を 曲(ま)げて 腰(こし) を まっすぐ に する",
        en: "Bend at the knees, keep your back straight, and use your legs to lift.",
        vi: "Cong đầu gối, giữ lưng thẳng, dùng chân để nâng.",
        zh: "弯曲膝盖，保持腰背挺直，用腿部力量抬起。",
        id: "Tekuk lutut, jaga punggung lurus, gunakan kaki untuk mengangkat.",
      },
      illustrationHint: "Side-view comparison: round-back vs straight-back lift",
    },
    {
      id: "two-person",
      text: {
        "ja-easy": "25 kg より 重(おも)い 物(もの) は 二人(ふたり) で 運(はこ)ぶ",
        en: "Use two workers for any load above 25 kg.",
        vi: "Dùng hai người cho vật trên 25 kg.",
        zh: "超过25公斤的物品需两人搬运。",
        id: "Gunakan dua pekerja untuk beban di atas 25 kg.",
      },
    },
    {
      id: "use-cart",
      text: {
        "ja-easy": "台車(だいしゃ) や リフター を 使(つか)う",
        en: "Use carts, hand trolleys, or mechanical lifters whenever possible.",
        vi: "Sử dụng xe đẩy hoặc thiết bị nâng cơ học khi có thể.",
        zh: "尽量使用手推车、台车或机械升降装置。",
        id: "Gunakan troli atau pengangkat mekanis jika memungkinkan.",
      },
    },
    {
      id: "warm-up",
      text: {
        "ja-easy": "仕事(しごと) の 前(まえ) に 体操(たいそう) を する",
        en: "Do morning warm-up exercises (ラジオ体操) every shift.",
        vi: "Khởi động cơ thể (thể dục buổi sáng) trước mỗi ca làm.",
        zh: "每个班次开始前做晨间体操热身。",
        id: "Lakukan pemanasan (senam pagi) sebelum setiap shift.",
      },
    },
    {
      id: "pain-report",
      text: {
        "ja-easy": "腰(こし) が 痛(いた)い 時(とき) は 我慢(がまん) しない で 言(い)う",
        en: "Report any back pain immediately — do not push through it.",
        vi: "Báo ngay khi đau lưng — đừng cố gắng chịu đựng.",
        zh: "腰部疼痛立即上报，不要忍耐。",
        id: "Laporkan nyeri punggung segera — jangan ditahan.",
      },
    },
  ],
  emergency: [
    {
      id: "stop-work",
      text: {
        "ja-easy": "急(きゅう)に 強(つよ)い 痛(いた)み が あれば 作業(さぎょう) を 止(と)める",
        en: "Stop work immediately if you feel sudden sharp pain.",
        vi: "Dừng làm việc ngay khi đau lưng đột ngột.",
        zh: "突然剧痛立即停止作业。",
        id: "Hentikan kerja segera bila nyeri tajam mendadak.",
      },
    },
    {
      id: "rosai",
      text: {
        "ja-easy": "労災(ろうさい) の 申請(しんせい) は 会社(かいしゃ) が 必(かなら)ず する",
        en: "Work-related back injury qualifies for workers' compensation (Rōsai).",
        vi: "Chấn thương lưng do công việc được hưởng bảo hiểm tai nạn lao động (Rōsai).",
        zh: "工作引起的腰伤可申请劳灾保险（Rōsai）。",
        id: "Cedera punggung akibat kerja layak bagi asuransi kecelakaan kerja (Rōsai).",
      },
    },
  ],
  source: "厚生労働省「職場における腰痛予防対策指針」",
};

const construction_infection: SafetyMaterial = {
  id: "construction-infection-prevention",
  industry: "construction",
  topic: "infection-prevention",
  title: {
    "ja-easy": "現場(げんば) で 感染症(かんせんしょう) を 防(ふせ)ぐ",
    en: "Preventing infection on the construction site",
    vi: "Phòng chống lây nhiễm tại công trường",
    zh: "工地传染病预防",
    id: "Mencegah penularan penyakit di proyek",
  },
  intro: {
    "ja-easy":
      "工事(こうじ) 現場(げんば) でも 風邪(かぜ)、新型(しんがた) コロナ、破傷風(はしょうふう) などに 気(き) を つけ ましょう。",
    en: "Cuts, dust and shared facilities at construction sites can spread infection. Practice hand-washing and wound care.",
    vi: "Vết cắt, bụi và tiện ích chung tại công trường có thể lây bệnh. Rửa tay và chăm sóc vết thương đúng cách.",
    zh: "工地的伤口、粉尘和公共设施可能传播感染。注意洗手和伤口护理。",
    id: "Luka, debu, dan fasilitas bersama di proyek dapat menularkan penyakit. Cuci tangan dan rawat luka dengan benar.",
  },
  checklist: [
    {
      id: "hand-wash",
      text: {
        "ja-easy": "ご飯(はん) の 前(まえ) と トイレ の 後(あと) に 手(て) を 洗(あら)う",
        en: "Wash hands with soap before meals and after toilet use.",
        vi: "Rửa tay bằng xà phòng trước khi ăn và sau khi đi vệ sinh.",
        zh: "进餐前和如厕后用肥皂洗手。",
        id: "Cuci tangan dengan sabun sebelum makan dan setelah toilet.",
      },
    },
    {
      id: "wound-care",
      text: {
        "ja-easy": "小(ちい)さな 傷(きず) でも 消毒(しょうどく) して 絆創膏(ばんそうこう) を 貼(は)る",
        en: "Disinfect and bandage even small cuts to prevent tetanus.",
        vi: "Sát trùng và băng cả vết cắt nhỏ để phòng uốn ván.",
        zh: "即使小伤口也要消毒并贴创可贴，防止破伤风。",
        id: "Disinfeksi dan tutup luka kecil untuk mencegah tetanus.",
      },
    },
    {
      id: "tetanus-shot",
      text: {
        "ja-easy": "破傷風(はしょうふう) の 予防接種(よぼうせっしゅ) を 受(う)ける",
        en: "Get a tetanus booster shot every 10 years.",
        vi: "Tiêm nhắc vắc xin uốn ván mỗi 10 năm.",
        zh: "每10年接种一次破伤风加强针。",
        id: "Vaksin booster tetanus setiap 10 tahun.",
      },
    },
    {
      id: "mask-when-ill",
      text: {
        "ja-easy": "咳(せき) が 出(で)る 時(とき) は マスク を つける",
        en: "Wear a mask when you have a cough or runny nose.",
        vi: "Đeo khẩu trang khi ho hoặc sổ mũi.",
        zh: "咳嗽或流鼻涕时务必佩戴口罩。",
        id: "Pakai masker saat batuk atau pilek.",
      },
    },
    {
      id: "rest-station",
      text: {
        "ja-easy": "休憩所(きゅうけいじょ) は 風(かぜ) を 通(とお)す",
        en: "Keep the rest area well ventilated and clean tables daily.",
        vi: "Giữ khu vực nghỉ thông thoáng, lau bàn hằng ngày.",
        zh: "保持休息区通风，每日清洁桌面。",
        id: "Jaga area istirahat berventilasi dan bersihkan meja setiap hari.",
      },
    },
    {
      id: "no-share",
      text: {
        "ja-easy": "コップ・タオル・PPE を 共有(きょうゆう) しない",
        en: "Do not share cups, towels, or personal protective equipment.",
        vi: "Không dùng chung cốc, khăn hoặc thiết bị bảo hộ cá nhân.",
        zh: "不与他人共用水杯、毛巾或个人防护装备。",
        id: "Jangan berbagi gelas, handuk, atau APD pribadi.",
      },
    },
  ],
  emergency: [
    {
      id: "fever-report",
      text: {
        "ja-easy": "熱(ねつ) が 38℃ 以上(いじょう) なら 仕事(しごと) を 休(やす)む",
        en: "Stay home if your temperature is 38°C or higher and call your supervisor.",
        vi: "Nghỉ làm khi sốt từ 38°C trở lên và báo quản đốc.",
        zh: "体温38℃以上请休假并联系班长。",
        id: "Tetap di rumah jika suhu 38°C ke atas dan hubungi mandor.",
      },
    },
    {
      id: "deep-cut",
      text: {
        "ja-easy": "錆(さ)びた 鉄(てつ) で 深(ふか)く 切(き)ったら 病院(びょういん) へ",
        en: "Go to a hospital for any deep cut from rusty metal or contaminated tools.",
        vi: "Đi bệnh viện nếu bị cắt sâu bởi kim loại gỉ.",
        zh: "被生锈金属深度割伤需立即就医。",
        id: "Pergi ke rumah sakit jika luka dalam akibat logam berkarat.",
      },
    },
  ],
  source: "厚生労働省「建設現場感染症対策の手引」",
};

export const CONSTRUCTION_MATERIALS: SafetyMaterial[] = [
  construction_fall,
  construction_chemical,
  construction_heat,
  construction_back,
  construction_infection,
];
