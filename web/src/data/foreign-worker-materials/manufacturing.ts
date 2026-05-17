import type { SafetyMaterial } from "@/types/foreign-worker";

const fall: SafetyMaterial = {
  id: "manufacturing-fall-from-height",
  industry: "manufacturing",
  topic: "fall-from-height",
  title: {
    "ja-easy": "工場(こうじょう) で 高(たか)い 所(ところ) で 仕事(しごと) を する",
    en: "Working at height inside a factory",
    vi: "Làm việc trên cao trong nhà máy",
    zh: "工厂内高处作业",
    id: "Bekerja di ketinggian dalam pabrik",
  },
  intro: {
    "ja-easy":
      "棚(たな) や 機械(きかい) の 上(うえ) で 仕事(しごと) を する 時(とき) は、はしご や 脚立(きゃたつ) を 正(ただ)しく 使(つか)って ください。",
    en: "Mezzanines, racking, and machinery tops cause many factory falls. Use proper ladders and platforms.",
    vi: "Gác lửng, kệ và đỉnh máy là nơi nhiều tai nạn ngã trong nhà máy. Dùng đúng thang và bệ.",
    zh: "中层平台、货架和机器顶部是工厂坠落事故高发处。请使用合规的梯子和平台。",
    id: "Mezanin, rak, dan atas mesin sering jadi lokasi jatuh di pabrik. Gunakan tangga dan platform yang sesuai.",
  },
  checklist: [
    {
      id: "no-makeshift",
      text: {
        "ja-easy": "イス や 箱(はこ) に 乗(の)らない",
        en: "Never stand on chairs, crates, or pallets to reach things.",
        vi: "Không bao giờ đứng trên ghế, thùng hoặc pallet để với.",
        zh: "禁止站在椅子、纸箱或托盘上够取物品。",
        id: "Jangan berdiri di kursi, kotak, atau palet untuk meraih barang.",
      },
    },
    {
      id: "ladder-angle",
      text: {
        "ja-easy": "はしご は 75 度(ど) の 角度(かくど) で 使(つか)う",
        en: "Set ladders at a 75° angle (1 in 4 base-to-height ratio).",
        vi: "Đặt thang góc 75° (tỉ lệ 1:4 giữa chân và chiều cao).",
        zh: "梯子应以75度角架设（底与高比例1:4）。",
        id: "Pasang tangga sudut 75° (rasio 1:4 antara dasar dan tinggi).",
      },
    },
    {
      id: "three-points",
      text: {
        "ja-easy": "はしご に 3 点(てん) で 触(さわ)る",
        en: "Maintain three points of contact on the ladder at all times.",
        vi: "Luôn giữ ba điểm tiếp xúc với thang.",
        zh: "始终保持三点接触梯子。",
        id: "Selalu jaga tiga titik kontak dengan tangga.",
      },
    },
    {
      id: "mezzanine-gate",
      text: {
        "ja-easy": "中(ちゅう) 二階(にかい) の ゲート は 必(かなら)ず 閉(し)める",
        en: "Always close the mezzanine pallet gate after loading.",
        vi: "Luôn đóng cổng gác lửng sau khi xếp hàng.",
        zh: "完成搬运后请关闭中层平台护栏门。",
        id: "Selalu tutup pintu mezanin setelah memuat barang.",
      },
    },
    {
      id: "no-jumping",
      text: {
        "ja-easy": "プラットフォーム から 飛(と)び降(お)りない",
        en: "Do not jump from platforms or truck beds — use the stairs.",
        vi: "Không nhảy xuống từ bệ hay xe tải — dùng cầu thang.",
        zh: "禁止从平台或卡车上跳下，请走台阶。",
        id: "Jangan melompat dari platform atau truk — pakai tangga.",
      },
    },
    {
      id: "harness-mez",
      text: {
        "ja-easy": "2 m 以上(いじょう) の 高(たか)さ では ハーネス を つける",
        en: "Use a fall-arrest harness whenever working above 2 metres.",
        vi: "Đeo dây chống rơi khi làm việc trên 2 mét.",
        zh: "高度超过2米必须佩戴防坠落安全带。",
        id: "Pakai sabuk pencegah jatuh saat bekerja di atas 2 meter.",
      },
    },
  ],
  emergency: [
    {
      id: "first-aid",
      text: {
        "ja-easy": "倒(たお)れた 人(ひと) を 動(うご)かさない で すぐ 連絡(れんらく)",
        en: "Do not move a fallen worker; call for help immediately.",
        vi: "Không di chuyển người ngã, gọi cấp cứu ngay.",
        zh: "切勿移动跌落者，立即呼救。",
        id: "Jangan pindahkan korban jatuh, segera panggil bantuan.",
      },
    },
    {
      id: "call-119",
      text: {
        "ja-easy": "意識(いしき) や 出血(しゅっけつ) を 見(み)て 119 に 電話(でんわ)",
        en: "Call 119 if the person is unconscious or bleeding heavily.",
        vi: "Gọi 119 nếu nạn nhân bất tỉnh hoặc chảy máu nặng.",
        zh: "若昏迷或大量出血立即拨打119。",
        id: "Telepon 119 jika korban pingsan atau pendarahan parah.",
      },
    },
  ],
  source: "厚生労働省「製造業の安全衛生対策」",
};

const chemical: SafetyMaterial = {
  id: "manufacturing-chemical-handling",
  industry: "manufacturing",
  topic: "chemical-handling",
  title: {
    "ja-easy": "工場(こうじょう) で 化学物質(かがくぶっしつ) を 安全(あんぜん)に 扱(あつか)う",
    en: "Safe handling of chemicals in manufacturing",
    vi: "Xử lý hóa chất an toàn trong sản xuất",
    zh: "制造业化学品安全处理",
    id: "Penanganan bahan kimia di pabrik secara aman",
  },
  intro: {
    "ja-easy":
      "工場(こうじょう) では たくさん の 化学(かがく) 薬品(やくひん) を 使(つか)います。ラベル を 必(かなら)ず 読(よ)んで ください。",
    en: "Factories use cleaning solvents, lubricants, acids and resins daily. Always read the GHS label and SDS.",
    vi: "Nhà máy sử dụng dung môi, dầu nhớt, axit, nhựa mỗi ngày. Luôn đọc nhãn GHS và SDS.",
    zh: "工厂每日使用清洗剂、润滑油、酸和树脂等。务必查阅GHS标签和SDS。",
    id: "Pabrik menggunakan pelarut, oli, asam, dan resin setiap hari. Selalu baca label GHS dan SDS.",
  },
  checklist: [
    {
      id: "ghs",
      text: {
        "ja-easy": "GHS の ラベル を 必(かなら)ず 読(よ)む",
        en: "Read the GHS pictograms and hazard statements on every container.",
        vi: "Đọc biểu tượng GHS và thông tin nguy hại trên mỗi thùng chứa.",
        zh: "认真阅读每个容器上的GHS象形图和危害提示。",
        id: "Baca piktogram GHS dan pernyataan bahaya di setiap wadah.",
      },
      illustrationHint: "Nine GHS pictograms in a row",
    },
    {
      id: "ppe-set",
      text: {
        "ja-easy": "ゴーグル・手袋(てぶくろ)・前掛(まえか)け を 着(つ)ける",
        en: "Wear chemical goggles, gloves, and a chemical-resistant apron.",
        vi: "Đeo kính, găng tay và tạp dề chống hóa chất.",
        zh: "佩戴防化学护目镜、手套和围裙。",
        id: "Pakai kacamata, sarung tangan, dan celemek tahan kimia.",
      },
    },
    {
      id: "local-exhaust",
      text: {
        "ja-easy": "局所(きょくしょ) 排気(はいき) 装置(そうち) を 使(つか)う",
        en: "Use the local exhaust ventilation hood when dispensing solvents.",
        vi: "Sử dụng hệ thống hút cục bộ khi chiết dung môi.",
        zh: "分装溶剂时务必启动局部排风装置。",
        id: "Gunakan exhaust lokal saat menuang pelarut.",
      },
    },
    {
      id: "no-eat",
      text: {
        "ja-easy": "作業(さぎょう) 場所(ばしょ) で 飲(の)んだり 食(た)べたり しない",
        en: "Never eat, drink or smoke in the chemical handling area.",
        vi: "Không ăn, uống hay hút thuốc trong khu hóa chất.",
        zh: "化学品作业区禁止饮食和吸烟。",
        id: "Jangan makan, minum, atau merokok di area kimia.",
      },
    },
    {
      id: "incompatibility",
      text: {
        "ja-easy": "違(ちが)う 薬品(やくひん) を 混(ま)ぜない",
        en: "Never mix incompatible chemicals (e.g. bleach and acid).",
        vi: "Không trộn lẫn các hóa chất không tương thích (vd: thuốc tẩy + axit).",
        zh: "不可混合不兼容的化学品（如漂白剂与酸）。",
        id: "Jangan campur bahan kimia yang tidak kompatibel (mis. pemutih + asam).",
      },
    },
    {
      id: "spill-kit",
      text: {
        "ja-easy": "こぼれたら スピル キット で すぐ 処理(しょり)",
        en: "If a spill occurs, use the spill kit immediately and notify the supervisor.",
        vi: "Khi tràn đổ, dùng ngay bộ xử lý tràn và báo quản đốc.",
        zh: "发生泄漏立即使用泄漏处理包并报告。",
        id: "Bila tumpah, segera gunakan spill kit dan beritahu mandor.",
      },
    },
  ],
  emergency: [
    {
      id: "shower-15min",
      text: {
        "ja-easy": "体(からだ) に かかったら 15 分(ふん) 水(みず) で 流(なが)す",
        en: "If chemicals contact skin, flush with water for at least 15 minutes.",
        vi: "Tiếp xúc da, rửa nước ít nhất 15 phút.",
        zh: "化学品接触皮肤，用水冲洗15分钟以上。",
        id: "Bila kena kulit, bilas air minimal 15 menit.",
      },
    },
    {
      id: "sds-doctor",
      text: {
        "ja-easy": "病院(びょういん) では SDS を 見(み)せる",
        en: "Bring the SDS to the doctor for proper treatment.",
        vi: "Mang SDS theo khi đi bác sĩ.",
        zh: "就医时携带SDS给医生参考。",
        id: "Bawa SDS ke dokter untuk penanganan tepat.",
      },
    },
  ],
  source: "厚生労働省「化学物質管理者講習テキスト（外国人版）」",
};

const heat: SafetyMaterial = {
  id: "manufacturing-heatstroke",
  industry: "manufacturing",
  topic: "heatstroke",
  title: {
    "ja-easy": "工場(こうじょう) の 暑(あつ)い 場所(ばしょ) で 熱中症(ねっちゅうしょう) を 防(ふせ)ぐ",
    en: "Preventing heatstroke in hot factory areas",
    vi: "Phòng sốc nhiệt tại khu vực nóng trong nhà máy",
    zh: "工厂高温区中暑预防",
    id: "Mencegah sengatan panas di area panas pabrik",
  },
  intro: {
    "ja-easy":
      "鉄(てつ) を 溶(と)かす 場所(ばしょ)、ボイラー 室(しつ)、塗装(とそう) ブース は とても 暑(あつ)く なります。気(き) を つけて ください。",
    en: "Smelting, boiler rooms, painting booths and dryers create high indoor heat. Heatstroke can happen even without sun exposure.",
    vi: "Lò nung, phòng nồi hơi, buồng sơn và máy sấy gây nhiệt rất cao. Sốc nhiệt có thể xảy ra ngay cả khi không nắng.",
    zh: "熔炼、锅炉房、喷漆室和干燥机内热量极高。即使没有阳光也可能中暑。",
    id: "Peleburan, ruang boiler, ruang cat, dan pengering sangat panas. Sengatan panas bisa terjadi tanpa matahari.",
  },
  checklist: [
    {
      id: "wbgt-indoor",
      text: {
        "ja-easy": "工場(こうじょう) の WBGT を 見(み)る",
        en: "Check the indoor WBGT meter posted near hot zones.",
        vi: "Theo dõi nhiệt kế WBGT trong nhà máy gần khu nóng.",
        zh: "查看张贴在高温区附近的室内WBGT温度计。",
        id: "Periksa meter WBGT yang dipasang dekat zona panas.",
      },
    },
    {
      id: "cool-vest",
      text: {
        "ja-easy": "ファン 付(つ)き 服(ふく) や 冷却(れいきゃく) ベスト を 着(き)る",
        en: "Wear fan-equipped or cooling vests near furnaces and dryers.",
        vi: "Mặc áo có quạt hoặc áo làm mát gần lò và máy sấy.",
        zh: "在炉具和干燥机附近穿着风扇服或降温背心。",
        id: "Pakai rompi berkipas atau pendingin di dekat tungku dan pengering.",
      },
    },
    {
      id: "rotation",
      text: {
        "ja-easy": "暑(あつ)い 場所(ばしょ) は 仲間(なかま) と 交代(こうたい) する",
        en: "Rotate workers in hot zones every 30–60 minutes.",
        vi: "Luân phiên công nhân ở khu nóng mỗi 30–60 phút.",
        zh: "高温区每30至60分钟轮换作业人员。",
        id: "Bergantian pekerja di zona panas tiap 30–60 menit.",
      },
    },
    {
      id: "hydration",
      text: {
        "ja-easy": "塩分(えんぶん) と 水(みず) を 取(と)る",
        en: "Drink water with electrolytes every 20 minutes.",
        vi: "Uống nước có điện giải mỗi 20 phút.",
        zh: "每20分钟补充电解质水。",
        id: "Minum air berlektrolit setiap 20 menit.",
      },
    },
    {
      id: "no-alone",
      text: {
        "ja-easy": "一人(ひとり) で 暑(あつ)い 場所(ばしょ) に 入(はい)らない",
        en: "Never work alone in confined hot spaces such as boilers or tanks.",
        vi: "Không làm việc một mình trong không gian nóng kín như nồi hơi.",
        zh: "禁止单独进入锅炉或储罐等密闭高温空间。",
        id: "Jangan bekerja sendiri di ruang panas tertutup seperti boiler.",
      },
    },
    {
      id: "early-sign",
      text: {
        "ja-easy": "めまい や 頭痛(ずつう) が あれば すぐ 休(やす)む",
        en: "Stop working immediately if you feel dizziness, headache, or nausea.",
        vi: "Ngừng làm việc ngay khi chóng mặt, nhức đầu hay buồn nôn.",
        zh: "出现头晕、头痛、恶心时立即停止作业。",
        id: "Hentikan kerja segera jika pusing, sakit kepala, atau mual.",
      },
    },
  ],
  emergency: [
    {
      id: "cool-down",
      text: {
        "ja-easy": "涼(すず)しい 場所(ばしょ) で 体(からだ) を 冷(ひ)やす",
        en: "Move to a cool area and apply ice to neck, armpits, and groin.",
        vi: "Đưa đến nơi mát và chườm đá lên cổ, nách, bẹn.",
        zh: "移至阴凉处，在颈部、腋下和腹股沟敷冰。",
        id: "Pindahkan ke tempat sejuk, kompres es di leher, ketiak, selangkangan.",
      },
    },
    {
      id: "call-119",
      text: {
        "ja-easy": "意識(いしき) が おかしい なら 119",
        en: "Call 119 if the person is confused or unconscious.",
        vi: "Gọi 119 nếu nạn nhân lú lẫn hoặc bất tỉnh.",
        zh: "意识异常或昏迷时立即拨打119。",
        id: "Telepon 119 jika korban bingung atau pingsan.",
      },
    },
  ],
  source: "厚生労働省「職場における熱中症予防対策マニュアル」",
};

const back: SafetyMaterial = {
  id: "manufacturing-lower-back-injury",
  industry: "manufacturing",
  topic: "lower-back-injury",
  title: {
    "ja-easy": "工場(こうじょう) で 腰痛(ようつう) を 防(ふせ)ぐ",
    en: "Lower-back injury prevention in manufacturing",
    vi: "Phòng đau lưng trong sản xuất",
    zh: "制造业腰痛预防",
    id: "Mencegah nyeri punggung di pabrik",
  },
  intro: {
    "ja-easy":
      "同(おな)じ 姿勢(しせい) を 長(なが)く 続(つづ)けたり、重(おも)い 物(もの) を 何回(なんかい)も 持(も)ち上(あ)げると 腰(こし) が 痛(いた)く なります。",
    en: "Repeated lifting, awkward postures, and long-standing work all cause back pain in factories.",
    vi: "Nâng vật lặp đi lặp lại, tư thế không tự nhiên và đứng lâu đều gây đau lưng.",
    zh: "反复搬运、不良姿势和长时间站立都会引起腰痛。",
    id: "Mengangkat berulang, postur janggal, dan berdiri lama dapat menyebabkan nyeri punggung.",
  },
  checklist: [
    {
      id: "lift-from-knees",
      text: {
        "ja-easy": "膝(ひざ) で 持(も)ち上(あ)げる",
        en: "Lift with your knees, not your back.",
        vi: "Nâng bằng đầu gối, không phải bằng lưng.",
        zh: "用膝盖发力，而不是腰背。",
        id: "Angkat dengan lutut, bukan punggung.",
      },
    },
    {
      id: "no-twist",
      text: {
        "ja-easy": "持(も)って いる 時(とき) に 体(からだ) を ねじらない",
        en: "Do not twist your torso while carrying — move your feet instead.",
        vi: "Không xoay người khi đang mang vật — di chuyển bằng chân.",
        zh: "搬运时不要扭转身体，应转动脚部。",
        id: "Jangan memutar badan saat membawa — putar kaki saja.",
      },
    },
    {
      id: "conveyor-height",
      text: {
        "ja-easy": "コンベア の 高(たか)さ を 自分(じぶん) に 合(あ)わせる",
        en: "Adjust conveyor and workbench height to match your waist.",
        vi: "Điều chỉnh chiều cao băng tải và bàn làm việc ngang thắt lưng.",
        zh: "调整传送带和工作台高度至腰部位置。",
        id: "Sesuaikan tinggi konveyor dan meja kerja setinggi pinggang.",
      },
    },
    {
      id: "anti-fatigue",
      text: {
        "ja-easy": "立(た)ち 仕事(しごと) に 疲労(ひろう) マット を 使(つか)う",
        en: "Use an anti-fatigue mat when standing for long shifts.",
        vi: "Sử dụng thảm chống mỏi khi đứng làm việc lâu.",
        zh: "长时间站立时使用防疲劳垫。",
        id: "Gunakan matras anti-lelah untuk berdiri lama.",
      },
    },
    {
      id: "stretch-breaks",
      text: {
        "ja-easy": "1 時間(じかん) に 1 回(かい) ストレッチ を する",
        en: "Stretch for 1–2 minutes every hour to reset posture.",
        vi: "Giãn cơ 1–2 phút mỗi giờ để cân chỉnh tư thế.",
        zh: "每小时做1至2分钟伸展运动调整姿势。",
        id: "Peregangan 1–2 menit setiap jam untuk mengatur postur.",
      },
    },
    {
      id: "report-early",
      text: {
        "ja-easy": "腰(こし) が 重(おも)い と 感(かん)じたら 早(はや)く 言(い)う",
        en: "Tell your supervisor as soon as you feel back stiffness.",
        vi: "Báo quản đốc ngay khi thấy cứng lưng.",
        zh: "感到腰部僵硬应立即上报班长。",
        id: "Beritahu mandor segera saat punggung kaku.",
      },
    },
  ],
  emergency: [
    {
      id: "rosai",
      text: {
        "ja-easy": "労災(ろうさい) は 国籍(こくせき) に 関係(かんけい) なく 使(つか)える",
        en: "Workers' compensation (Rōsai) applies to all workers regardless of nationality.",
        vi: "Bảo hiểm tai nạn lao động (Rōsai) áp dụng cho mọi quốc tịch.",
        zh: "劳灾保险（Rōsai）适用于所有国籍。",
        id: "Asuransi Rōsai berlaku untuk semua kebangsaan.",
      },
    },
    {
      id: "rehab",
      text: {
        "ja-easy": "整形(せいけい) 外科(げか) で リハビリ を 受(う)ける",
        en: "Visit an orthopaedic clinic for rehabilitation.",
        vi: "Đến phòng khám chỉnh hình để phục hồi chức năng.",
        zh: "前往骨科诊所接受康复治疗。",
        id: "Kunjungi klinik ortopedi untuk rehabilitasi.",
      },
    },
  ],
  source: "厚生労働省「職場における腰痛予防対策指針」",
};

const infection: SafetyMaterial = {
  id: "manufacturing-infection-prevention",
  industry: "manufacturing",
  topic: "infection-prevention",
  title: {
    "ja-easy": "工場(こうじょう) で 感染症(かんせんしょう) を 防(ふせ)ぐ",
    en: "Infection prevention in manufacturing",
    vi: "Phòng lây nhiễm trong sản xuất",
    zh: "制造业传染病预防",
    id: "Pencegahan infeksi di pabrik",
  },
  intro: {
    "ja-easy":
      "更衣室(こういしつ) や 食堂(しょくどう)、寮(りょう) で 感染症(かんせんしょう) が 広(ひろ)がりやすい です。",
    en: "Locker rooms, canteens and dormitories spread infections quickly in factories.",
    vi: "Phòng thay đồ, căng tin và ký túc xá dễ lây bệnh trong nhà máy.",
    zh: "更衣室、食堂、宿舍是工厂传染高发地。",
    id: "Ruang ganti, kantin, dan asrama mempercepat penularan di pabrik.",
  },
  checklist: [
    {
      id: "hand-wash",
      text: {
        "ja-easy": "ご飯(はん) の 前(まえ) に 30 秒(びょう) 手(て) を 洗(あら)う",
        en: "Wash hands with soap for 30 seconds before eating.",
        vi: "Rửa tay bằng xà phòng 30 giây trước khi ăn.",
        zh: "用餐前用肥皂洗手30秒。",
        id: "Cuci tangan dengan sabun 30 detik sebelum makan.",
      },
    },
    {
      id: "uniform-laundry",
      text: {
        "ja-easy": "作業(さぎょう) 服(ふく) は 毎日(まいにち) 洗(あら)う",
        en: "Launder your work uniform daily; do not bring it home dirty.",
        vi: "Giặt đồng phục mỗi ngày, không mang về nhà khi còn bẩn.",
        zh: "工作服每日清洗，禁止将脏工作服带回家。",
        id: "Cuci seragam kerja setiap hari, jangan dibawa pulang dalam keadaan kotor.",
      },
    },
    {
      id: "shared-tools",
      text: {
        "ja-easy": "工具(こうぐ) を 触(さわ)った後(あと) は 手(て) を 洗(あら)う",
        en: "Wash hands after using shared tools, keypads, or door handles.",
        vi: "Rửa tay sau khi dùng chung dụng cụ, bàn phím hoặc tay nắm cửa.",
        zh: "使用公共工具、键盘或门把手后请洗手。",
        id: "Cuci tangan setelah pakai alat bersama, keypad, atau gagang pintu.",
      },
    },
    {
      id: "rest-when-ill",
      text: {
        "ja-easy": "風邪(かぜ) や 熱(ねつ) の 時(とき) は 休(やす)む",
        en: "Stay home and notify your supervisor when you have cold symptoms or fever.",
        vi: "Nghỉ ở nhà và báo quản đốc khi có triệu chứng cảm hoặc sốt.",
        zh: "感冒症状或发热时请休假并告知班长。",
        id: "Tetap di rumah dan beri tahu mandor saat gejala flu atau demam.",
      },
    },
    {
      id: "vaccine-flu",
      text: {
        "ja-easy": "毎年(まいとし) インフルエンザ の 注射(ちゅうしゃ) を 打(う)つ",
        en: "Get an annual flu shot — companies often subsidise it.",
        vi: "Tiêm phòng cúm hàng năm — công ty thường hỗ trợ chi phí.",
        zh: "每年接种流感疫苗，公司通常会补贴。",
        id: "Vaksin flu tahunan — perusahaan biasanya mensubsidi.",
      },
    },
    {
      id: "dorm-ventilation",
      text: {
        "ja-easy": "寮(りょう) の 部屋(へや) を 窓(まど) で 換気(かんき) する",
        en: "Ventilate dormitory rooms by opening a window twice daily.",
        vi: "Thông gió phòng ký túc bằng cách mở cửa sổ 2 lần/ngày.",
        zh: "宿舍每天开窗通风2次。",
        id: "Buka jendela asrama dua kali sehari untuk ventilasi.",
      },
    },
  ],
  emergency: [
    {
      id: "fever-line",
      text: {
        "ja-easy": "発熱(はつねつ) 38℃ 以上(いじょう) なら 産業医(さんぎょうい) や 病院(びょういん) へ",
        en: "Fever above 38°C: consult the occupational physician or local clinic.",
        vi: "Sốt trên 38°C: liên hệ bác sĩ chuyên khoa lao động hoặc phòng khám.",
        zh: "体温超过38℃应联系产业医或诊所。",
        id: "Demam di atas 38°C: hubungi dokter perusahaan atau klinik.",
      },
    },
    {
      id: "cluster",
      text: {
        "ja-easy": "同(おな)じ 部屋(へや) で 何人(なんにん)も 熱(ねつ) が 出(で)たら 保健所(ほけんじょ) に 連絡(れんらく)",
        en: "Notify the public health office if several roommates develop fever.",
        vi: "Báo cơ quan y tế công cộng nếu nhiều người cùng phòng sốt.",
        zh: "若同寮多人发热请联系保健所。",
        id: "Lapor ke dinas kesehatan bila beberapa teman sekamar demam.",
      },
    },
  ],
  source: "厚生労働省「事業者・従業員のための感染症対策」",
};

export const MANUFACTURING_MATERIALS: SafetyMaterial[] = [
  fall,
  chemical,
  heat,
  back,
  infection,
];
