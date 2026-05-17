import type { SafetyMaterial } from "@/types/foreign-worker";

const fall: SafetyMaterial = {
  id: "care-fall-from-height",
  industry: "care",
  topic: "fall-from-height",
  title: {
    "ja-easy": "介護(かいご) の 仕事(しごと) で 高(たか)い 所(ところ) から 落(お)ちない",
    en: "Avoiding falls in caregiving work",
    vi: "Tránh té ngã trong công việc chăm sóc",
    zh: "护理工作中防止跌落",
    id: "Mencegah jatuh dalam pekerjaan perawatan",
  },
  intro: {
    "ja-easy":
      "介護(かいご) では 自分(じぶん) も 利用者(りようしゃ) も 転(ころ)ばない ように 気(き) を つけます。",
    en: "In caregiving, you must protect both yourself and the resident from falls — from beds, baths and corridors.",
    vi: "Trong chăm sóc, bạn phải bảo vệ bản thân và người được chăm sóc khỏi té ngã — từ giường, nhà tắm, hành lang.",
    zh: "护理工作中要防止自己和服务对象从床、浴室、走廊等处跌倒。",
    id: "Dalam perawatan, lindungi diri Anda dan lansia dari jatuh — dari ranjang, kamar mandi, lorong.",
  },
  checklist: [
    {
      id: "bed-height",
      text: {
        "ja-easy": "ベッド の 高(たか)さ を 低(ひく)く する",
        en: "Lower the bed to its lowest position when the resident is alone.",
        vi: "Hạ giường xuống vị trí thấp nhất khi không có người trông.",
        zh: "无人陪同时将床调至最低位置。",
        id: "Turunkan ranjang ke posisi terendah saat lansia sendirian.",
      },
    },
    {
      id: "bed-rail",
      text: {
        "ja-easy": "必要(ひつよう) な 時(とき) は ベッド 柵(さく) を つける",
        en: "Use bed rails when fall risk is assessed as high.",
        vi: "Sử dụng thanh chắn giường khi nguy cơ té cao.",
        zh: "评估为高跌倒风险者使用床栏。",
        id: "Gunakan pengaman ranjang bila risiko jatuh tinggi.",
      },
    },
    {
      id: "no-slipper",
      text: {
        "ja-easy": "滑(すべ)り にくい 靴(くつ) を 履(は)く",
        en: "Wear non-slip caregiving shoes — never slippers.",
        vi: "Mang giày chống trượt — không đi dép lê.",
        zh: "穿防滑工作鞋，禁穿拖鞋。",
        id: "Pakai sepatu antislip — bukan sandal.",
      },
    },
    {
      id: "wet-floor",
      text: {
        "ja-easy": "床(ゆか) が 濡(ぬ)れて いたら すぐ 拭(ふ)く",
        en: "Wipe wet floors immediately and set up a wet-floor sign.",
        vi: "Lau khô sàn ướt ngay và đặt biển báo.",
        zh: "地面湿滑应立即擦干并放置警示牌。",
        id: "Lap lantai basah segera dan pasang tanda peringatan.",
      },
    },
    {
      id: "bath-rail",
      text: {
        "ja-easy": "お風呂(ふろ) では 手(て)すり を 使(つか)う",
        en: "Have residents use the grab bar in the bath every time.",
        vi: "Để lão hộ luôn dùng thanh vịn khi tắm.",
        zh: "洗浴时让被照护者务必扶住扶手。",
        id: "Pastikan lansia memakai pegangan setiap mandi.",
      },
    },
    {
      id: "two-person-transfer",
      text: {
        "ja-easy": "移乗(いじょう) は 二人(ふたり) で する",
        en: "Use two staff for transfers if the resident cannot bear weight.",
        vi: "Hai nhân viên hỗ trợ khi người được chăm sóc không tự đứng được.",
        zh: "无法承重者由两名工作人员协助转移。",
        id: "Dua staf untuk memindahkan lansia yang tidak kuat berdiri.",
      },
    },
  ],
  emergency: [
    {
      id: "no-move",
      text: {
        "ja-easy": "転(ころ)んだ 人(ひと) を 動(うご)かさない",
        en: "Do not move a fallen resident until you check for injury.",
        vi: "Không di chuyển lão hộ ngã trước khi kiểm tra chấn thương.",
        zh: "未确认伤情前不要移动跌倒者。",
        id: "Jangan pindahkan lansia jatuh sebelum cek cedera.",
      },
    },
    {
      id: "notify-nurse",
      text: {
        "ja-easy": "看護師(かんごし) と 家族(かぞく) に すぐ 知(し)らせる",
        en: "Notify the nurse and the family immediately.",
        vi: "Báo y tá và gia đình ngay.",
        zh: "立即通知护士与家属。",
        id: "Beritahu perawat dan keluarga segera.",
      },
    },
  ],
  source: "厚生労働省「介護現場における外国人材の受入れ・活用ガイドブック」",
};

const chemical: SafetyMaterial = {
  id: "care-chemical-handling",
  industry: "care",
  topic: "chemical-handling",
  title: {
    "ja-easy": "介護(かいご) の 仕事(しごと) で 薬品(やくひん) を 安全(あんぜん)に 使(つか)う",
    en: "Safe use of cleaning chemicals in caregiving",
    vi: "Sử dụng hóa chất tẩy rửa an toàn trong chăm sóc",
    zh: "护理工作中清洁剂的安全使用",
    id: "Penggunaan bahan kimia pembersih dalam perawatan",
  },
  intro: {
    "ja-easy":
      "介護(かいご) 施設(しせつ) で 使(つか)う 消毒(しょうどく) 液(えき) や 漂白剤(ひょうはくざい) は 強(つよ)い 薬品(やくひん) です。",
    en: "Disinfectants and bleach used in care facilities are strong chemicals — wear gloves and ventilate.",
    vi: "Chất tẩy và thuốc tẩy ở viện chăm sóc rất mạnh — đeo găng và thông gió.",
    zh: "护理设施使用的消毒剂和漂白剂为强化学品，需戴手套并保持通风。",
    id: "Disinfektan dan pemutih di fasilitas perawatan tergolong keras — pakai sarung tangan dan ventilasi.",
  },
  checklist: [
    {
      id: "no-mix",
      text: {
        "ja-easy": "塩素(えんそ) と 酸性(さんせい) を 混(ま)ぜない",
        en: "Never mix chlorine bleach with acidic cleaners — toxic gas results.",
        vi: "Không trộn lẫn nước Javel với chất tẩy axit — sinh khí độc.",
        zh: "禁止混合含氯漂白剂与酸性清洁剂，会产生毒气。",
        id: "Jangan campur pemutih klorin dengan pembersih asam — menghasilkan gas beracun.",
      },
    },
    {
      id: "dilute-correctly",
      text: {
        "ja-easy": "ラベル の 薄(うす)め 方(かた) を 守(まも)る",
        en: "Follow the label dilution ratio exactly.",
        vi: "Pha loãng đúng tỉ lệ trên nhãn.",
        zh: "严格按标签稀释比例配制。",
        id: "Encerkan sesuai rasio yang tertera pada label.",
      },
    },
    {
      id: "ventilation",
      text: {
        "ja-easy": "窓(まど) を 開(あ)けて 換気(かんき) する",
        en: "Open windows for ventilation when cleaning bathrooms and toilets.",
        vi: "Mở cửa sổ thông gió khi vệ sinh nhà tắm và toilet.",
        zh: "清洁卫生间和浴室时打开窗户通风。",
        id: "Buka jendela saat membersihkan kamar mandi dan toilet.",
      },
    },
    {
      id: "gloves",
      text: {
        "ja-easy": "ニトリル 手袋(てぶくろ) を 着(つ)ける",
        en: "Wear nitrile gloves while handling cleaning chemicals.",
        vi: "Đeo găng tay nitrile khi xử lý hóa chất tẩy rửa.",
        zh: "处理清洁剂时佩戴丁腈手套。",
        id: "Pakai sarung tangan nitril saat menangani bahan pembersih.",
      },
    },
    {
      id: "store-locked",
      text: {
        "ja-easy": "薬品(やくひん) は 鍵(かぎ) の かかる 棚(たな) に しまう",
        en: "Store chemicals in a locked cabinet away from residents.",
        vi: "Lưu trữ hóa chất trong tủ có khóa, xa người được chăm sóc.",
        zh: "化学品须存放于上锁柜内，远离被照护者。",
        id: "Simpan bahan kimia di lemari terkunci, jauh dari lansia.",
      },
    },
    {
      id: "label-original",
      text: {
        "ja-easy": "ペットボトル に 移(うつ)し 替(か)えない",
        en: "Never decant cleaning chemicals into drink bottles.",
        vi: "Không sang chiết hóa chất sang chai nước uống.",
        zh: "禁止将清洁剂分装至饮料瓶。",
        id: "Jangan tuang bahan kimia ke botol minuman.",
      },
    },
  ],
  emergency: [
    {
      id: "swallow",
      text: {
        "ja-easy": "口(くち) に 入(はい)ったら 水(みず) で うがい して 119",
        en: "If swallowed, rinse mouth with water and call 119.",
        vi: "Nếu nuốt phải, súc miệng và gọi 119.",
        zh: "误食后请用水漱口并拨打119。",
        id: "Bila tertelan, kumur air dan telepon 119.",
      },
    },
    {
      id: "skin-eye",
      text: {
        "ja-easy": "肌(はだ) や 目(め) に かかったら 15 分(ふん) 水(みず) で 流(なが)す",
        en: "Flush skin or eyes with water for 15 minutes if splashed.",
        vi: "Rửa da hoặc mắt bằng nước 15 phút khi bị bắn.",
        zh: "溅到皮肤或眼睛冲水15分钟。",
        id: "Bilas kulit/mata 15 menit bila terkena cipratan.",
      },
    },
  ],
  source: "厚生労働省「社会福祉施設における安全衛生対策の手引」",
};

const heat: SafetyMaterial = {
  id: "care-heatstroke",
  industry: "care",
  topic: "heatstroke",
  title: {
    "ja-easy": "介護(かいご) 施設(しせつ) で 熱中症(ねっちゅうしょう) を 防(ふせ)ぐ",
    en: "Heatstroke prevention in care facilities",
    vi: "Phòng sốc nhiệt tại cơ sở chăm sóc",
    zh: "护理设施的中暑预防",
    id: "Pencegahan sengatan panas di fasilitas perawatan",
  },
  intro: {
    "ja-easy":
      "高齢者(こうれいしゃ) は 体温(たいおん) が 上(あ)がりやすい です。エアコン を 必(かなら)ず つけて ください。",
    en: "Elderly residents are very vulnerable to heat. Air conditioning is essential in summer.",
    vi: "Người cao tuổi rất dễ bị sốc nhiệt. Phải dùng điều hòa vào mùa hè.",
    zh: "高龄者特别容易中暑，夏季务必开空调。",
    id: "Lansia sangat rentan sengatan panas. Pendingin udara wajib di musim panas.",
  },
  checklist: [
    {
      id: "ac-always",
      text: {
        "ja-easy": "夏(なつ) は エアコン を つけたまま に する",
        en: "Keep air conditioning running 24 h in summer; set 26–28°C.",
        vi: "Bật điều hòa 24/7 vào mùa hè, đặt 26–28°C.",
        zh: "夏季空调全天开启，温度设定26至28摄氏度。",
        id: "Nyalakan AC 24 jam saat musim panas, suhu 26–28°C.",
      },
    },
    {
      id: "drink-schedule",
      text: {
        "ja-easy": "利用者(りようしゃ) に 1 時間(じかん) ごと に 水分(すいぶん) を 勧(すす)める",
        en: "Offer drinks to residents every hour, even if they refuse.",
        vi: "Mời người được chăm sóc uống nước mỗi giờ, ngay cả khi họ từ chối.",
        zh: "每小时主动为被照护者提供饮水。",
        id: "Tawarkan minuman ke lansia setiap jam meski menolak.",
      },
    },
    {
      id: "bath-watch",
      text: {
        "ja-easy": "お風呂(ふろ) の あと は 涼(すず)しい 部屋(へや) で 休(やす)む",
        en: "After bathing, rest in a cool room and offer water.",
        vi: "Sau khi tắm, nghỉ trong phòng mát và uống nước.",
        zh: "洗浴后在凉爽房间休息并补水。",
        id: "Setelah mandi, istirahat di ruangan sejuk dan minum.",
      },
    },
    {
      id: "skin-cool",
      text: {
        "ja-easy": "首(くび) や 脇(わき) を 冷(ひ)やす タオル を 使(つか)う",
        en: "Apply cooling towels to neck and underarms during hot afternoons.",
        vi: "Dùng khăn lạnh ở cổ và nách vào buổi chiều nóng.",
        zh: "炎热午后在颈部、腋下使用降温毛巾。",
        id: "Pasang handuk dingin di leher dan ketiak saat siang panas.",
      },
    },
    {
      id: "staff-rotation",
      text: {
        "ja-easy": "職員(しょくいん) も 水分(すいぶん) を 取(と)る",
        en: "Staff must also hydrate — use buddy reminders.",
        vi: "Nhân viên cũng cần bổ sung nước — nhắc nhau.",
        zh: "护理人员也要补水，互相提醒。",
        id: "Staf juga harus minum — saling mengingatkan.",
      },
    },
    {
      id: "wbgt",
      text: {
        "ja-easy": "屋外(おくがい) の 散歩(さんぽ) は WBGT を 見(み)てから",
        en: "Check WBGT before outdoor walks; cancel if above 28.",
        vi: "Kiểm tra WBGT trước khi đi dạo ngoài trời, hủy nếu trên 28.",
        zh: "户外散步前查看WBGT，超过28即取消。",
        id: "Periksa WBGT sebelum jalan-jalan; batalkan jika di atas 28.",
      },
    },
  ],
  emergency: [
    {
      id: "cool-call",
      text: {
        "ja-easy": "ぐったり して いたら 体(からだ) を 冷(ひ)やして 119",
        en: "If a resident is limp or confused, cool the body and call 119.",
        vi: "Nếu người được chăm sóc bơ phờ hoặc lú lẫn, làm mát và gọi 119.",
        zh: "出现虚脱或意识模糊时降温并拨打119。",
        id: "Jika lansia lemas atau bingung, dinginkan dan telepon 119.",
      },
    },
    {
      id: "report-nurse",
      text: {
        "ja-easy": "看護師(かんごし) に すぐ 報告(ほうこく)",
        en: "Report to the on-duty nurse immediately.",
        vi: "Báo y tá trực ngay.",
        zh: "立即报告值班护士。",
        id: "Laporkan ke perawat jaga segera.",
      },
    },
  ],
  source: "厚生労働省「介護施設のための感染症・熱中症対策ガイド」",
};

const back: SafetyMaterial = {
  id: "care-lower-back-injury",
  industry: "care",
  topic: "lower-back-injury",
  title: {
    "ja-easy": "介護(かいご) で 腰痛(ようつう) を 防(ふせ)ぐ",
    en: "Lower-back injury prevention in caregiving",
    vi: "Phòng đau lưng trong chăm sóc",
    zh: "护理工作的腰痛预防",
    id: "Pencegahan nyeri punggung dalam perawatan",
  },
  intro: {
    "ja-easy":
      "人(ひと) を 抱(だ)き 上(あ)げる 仕事(しごと) は 腰(こし) を いためやすい です。リフター を 使(つか)って ください。",
    en: "Lifting residents by hand is the top cause of back injury in caregiving. Use mechanical lifts wherever possible.",
    vi: "Bồng người được chăm sóc bằng tay là nguyên nhân chính gây đau lưng. Sử dụng thiết bị nâng cơ học.",
    zh: "徒手抱起被照护者是腰痛主因，请尽量使用机械升降设备。",
    id: "Mengangkat lansia dengan tangan adalah penyebab utama nyeri punggung. Gunakan lift mekanis bila memungkinkan.",
  },
  checklist: [
    {
      id: "no-manual-lift",
      text: {
        "ja-easy": "原則(げんそく) として 手(て) で 持(も)ち上(あ)げない",
        en: "Adopt a 'no lifting' policy — use a hoist or slide sheet.",
        vi: "Áp dụng chính sách 'không nâng tay' — dùng tời hoặc tấm trượt.",
        zh: "原则禁止徒手抬起，使用吊具或滑动垫。",
        id: "Terapkan kebijakan 'tanpa angkat tangan' — gunakan hoist atau slide sheet.",
      },
    },
    {
      id: "lifter-train",
      text: {
        "ja-easy": "リフター の 使(つか)い 方(かた) を 教(おそ)わる",
        en: "Complete formal training before using transfer lifts.",
        vi: "Hoàn thành tập huấn trước khi dùng thiết bị nâng.",
        zh: "使用升降设备前需接受正规培训。",
        id: "Selesaikan pelatihan resmi sebelum memakai alat angkat.",
      },
    },
    {
      id: "slide-sheet",
      text: {
        "ja-easy": "ベッド 上(じょう) で は スライディング シート を 使(つか)う",
        en: "Use a slide sheet for in-bed repositioning.",
        vi: "Dùng tấm trượt khi xoay người trên giường.",
        zh: "在床上调整体位时使用滑动垫。",
        id: "Gunakan slide sheet untuk reposisi di ranjang.",
      },
    },
    {
      id: "bed-height-up",
      text: {
        "ja-easy": "ケア の 時(とき) は ベッド を 高(たか)く する",
        en: "Raise the bed to your waist height during care tasks.",
        vi: "Nâng giường cao ngang thắt lưng khi chăm sóc.",
        zh: "护理时将床调至腰部高度。",
        id: "Naikkan ranjang setinggi pinggang saat merawat.",
      },
    },
    {
      id: "two-staff",
      text: {
        "ja-easy": "難(むずか)しい 介助(かいじょ) は 二人(ふたり) で",
        en: "Use two staff for difficult transfers; never struggle alone.",
        vi: "Hai nhân viên cho lần di chuyển khó, không cố một mình.",
        zh: "复杂转移由两人协作，禁止单独硬撑。",
        id: "Dua staf untuk pemindahan sulit, jangan paksa sendiri.",
      },
    },
    {
      id: "exercise",
      text: {
        "ja-easy": "始(はじ)め と 終(お)わり に ストレッチ を する",
        en: "Stretch your core and back at the start and end of each shift.",
        vi: "Giãn cơ lõi và lưng đầu và cuối ca làm.",
        zh: "每班开始和结束前进行核心与腰背伸展。",
        id: "Peregangan inti dan punggung di awal dan akhir shift.",
      },
    },
  ],
  emergency: [
    {
      id: "tell-supervisor",
      text: {
        "ja-easy": "腰(こし) が 痛(いた)い なら すぐ 上司(じょうし) に 言(い)う",
        en: "Report any new back pain to your supervisor the same day.",
        vi: "Báo cấp trên ngay khi đau lưng mới phát sinh.",
        zh: "新出现腰痛立即上报上司。",
        id: "Laporkan nyeri punggung baru kepada atasan hari itu juga.",
      },
    },
    {
      id: "rosai-care",
      text: {
        "ja-easy": "介護(かいご) の 腰痛(ようつう) も 労災(ろうさい) の 対象(たいしょう)",
        en: "Caregiving-related back injury qualifies for workers' compensation.",
        vi: "Đau lưng do chăm sóc thuộc bảo hiểm tai nạn lao động.",
        zh: "护理引起的腰痛属于劳灾保险范围。",
        id: "Nyeri punggung akibat merawat termasuk dalam asuransi Rōsai.",
      },
    },
  ],
  source: "厚生労働省「社会福祉施設における腰痛予防対策チェックリスト」",
};

const infection: SafetyMaterial = {
  id: "care-infection-prevention",
  industry: "care",
  topic: "infection-prevention",
  title: {
    "ja-easy": "介護(かいご) 施設(しせつ) で 感染症(かんせんしょう) を 防(ふせ)ぐ",
    en: "Infection prevention in care facilities",
    vi: "Phòng lây nhiễm tại cơ sở chăm sóc",
    zh: "护理设施感染症预防",
    id: "Pencegahan infeksi di fasilitas perawatan",
  },
  intro: {
    "ja-easy":
      "ノロウイルス や インフルエンザ、新型(しんがた) コロナ は すぐ 広(ひろ)がります。手洗(てあら)い と マスク を 守(まも)って ください。",
    en: "Norovirus, influenza and COVID-19 spread quickly in care facilities. Hand-washing and masks are essential.",
    vi: "Norovirus, cúm và COVID-19 lây nhanh trong cơ sở chăm sóc. Rửa tay và đeo khẩu trang là bắt buộc.",
    zh: "诺如病毒、流感和新冠在护理设施传播极快，洗手和口罩必不可少。",
    id: "Norovirus, flu, dan COVID-19 mudah menyebar di fasilitas perawatan. Cuci tangan dan masker wajib.",
  },
  checklist: [
    {
      id: "standard-precaution",
      text: {
        "ja-easy": "全員(ぜんいん) に 標準(ひょうじゅん) 予防策(よぼうさく) を する",
        en: "Apply Standard Precautions to every resident, every time.",
        vi: "Áp dụng biện pháp phòng ngừa chuẩn cho mọi người, mọi lúc.",
        zh: "对每位被照护者每次都执行标准预防措施。",
        id: "Terapkan Standar Pencegahan untuk setiap lansia, setiap saat.",
      },
    },
    {
      id: "diaper-glove",
      text: {
        "ja-easy": "おむつ 交換(こうかん) は 手袋(てぶくろ) と エプロン",
        en: "Wear gloves and apron during every diaper change.",
        vi: "Mang găng và tạp dề mỗi lần thay tã.",
        zh: "更换尿布时务必戴手套和围裙。",
        id: "Pakai sarung tangan dan apron tiap ganti popok.",
      },
    },
    {
      id: "vomit-cleanup",
      text: {
        "ja-easy": "嘔吐物(おうとぶつ) は 次亜塩素酸(じあえんそさん) で 消毒(しょうどく)",
        en: "Clean vomit with diluted sodium hypochlorite, not just water.",
        vi: "Lau chất nôn bằng dung dịch natri hypochlorite, không chỉ nước.",
        zh: "呕吐物用次氯酸钠稀释液消毒，不可仅用清水。",
        id: "Bersihkan muntahan dengan natrium hipoklorit, bukan air saja.",
      },
    },
    {
      id: "ppe-doffing",
      text: {
        "ja-easy": "PPE は 正(ただ)しい 順番(じゅんばん) で 外(はず)す",
        en: "Remove PPE in the correct order: gloves → eyewear → gown → mask.",
        vi: "Tháo PPE đúng thứ tự: găng → kính → áo choàng → khẩu trang.",
        zh: "脱卸防护装备顺序：手套→护目镜→隔离衣→口罩。",
        id: "Lepas APD berurutan: sarung tangan → kacamata → gaun → masker.",
      },
    },
    {
      id: "vax-staff",
      text: {
        "ja-easy": "職員(しょくいん) は 毎年(まいとし) インフルエンザ 接種(せっしゅ)",
        en: "Staff get annual flu and seasonal vaccinations.",
        vi: "Nhân viên tiêm phòng cúm hàng năm và vaccine theo mùa.",
        zh: "全体员工每年接种流感和季节性疫苗。",
        id: "Staf vaksinasi flu tahunan dan musiman.",
      },
    },
    {
      id: "isolation",
      text: {
        "ja-easy": "症状(しょうじょう) が ある 人(ひと) は 個室(こしつ) で ケア",
        en: "Isolate symptomatic residents in a private room.",
        vi: "Cách ly lão hộ có triệu chứng trong phòng riêng.",
        zh: "对有症状者实施单间隔离照护。",
        id: "Isolasi lansia bergejala di kamar pribadi.",
      },
    },
  ],
  emergency: [
    {
      id: "outbreak-report",
      text: {
        "ja-easy": "2 人(にん) 以上(いじょう) 続(つづ)けて 症状(しょうじょう) が 出(で)たら 報告(ほうこく)",
        en: "Report to the public health office if 2 or more residents develop the same symptoms.",
        vi: "Báo cơ quan y tế nếu 2 hoặc nhiều người cùng triệu chứng.",
        zh: "2人以上出现相同症状须报告保健所。",
        id: "Lapor dinas kesehatan bila 2 atau lebih bergejala sama.",
      },
    },
    {
      id: "staff-isolation",
      text: {
        "ja-easy": "職員(しょくいん) も 症状(しょうじょう) が あれば 出勤(しゅっきん) 停止(ていし)",
        en: "Symptomatic staff must stay home, no exceptions.",
        vi: "Nhân viên có triệu chứng phải nghỉ ở nhà, không ngoại lệ.",
        zh: "出现症状的员工必须居家，绝无例外。",
        id: "Staf bergejala wajib di rumah, tanpa pengecualian.",
      },
    },
  ],
  source: "厚生労働省「高齢者介護施設における感染対策マニュアル」",
};

export const CARE_MATERIALS: SafetyMaterial[] = [fall, chemical, heat, back, infection];
