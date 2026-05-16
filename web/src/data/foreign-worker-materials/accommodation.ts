import type { SafetyMaterial } from "@/types/foreign-worker";

const fall: SafetyMaterial = {
  id: "accommodation-fall-from-height",
  industry: "accommodation",
  topic: "fall-from-height",
  title: {
    "ja-easy": "宿(やど) で 滑(すべ)らない・落(お)ちない",
    en: "Preventing falls in hotels and ryokan",
    vi: "Phòng té ngã trong khách sạn và ryokan",
    zh: "酒店与温泉旅馆防坠落",
    id: "Mencegah jatuh di hotel dan ryokan",
  },
  intro: {
    "ja-easy":
      "客室(きゃくしつ) 清掃(せいそう) の 時(とき) や 高(たか)い 棚(たな) の 物(もの) を 取(と)る 時(とき) に 気(き) を つけて ください。",
    en: "Falls happen during room cleaning, high-shelf restocking, and on slippery bath floors.",
    vi: "Tai nạn ngã xảy ra khi dọn phòng, lấy đồ trên cao và sàn tắm trơn.",
    zh: "客房清扫、高架取物及浴室湿滑地面常发生坠落。",
    id: "Jatuh sering terjadi saat membersihkan kamar, mengambil rak tinggi, dan lantai kamar mandi.",
  },
  checklist: [
    {
      id: "step-stool",
      text: {
        "ja-easy": "踏(ふ)み 台(だい) を 使(つか)って 高(たか)い 所(ところ) に 手(て) を 伸(の)ばす",
        en: "Use a step stool to reach high shelves; do not climb on chairs or beds.",
        vi: "Dùng ghế bậc để với kệ cao; không trèo lên ghế hoặc giường.",
        zh: "用踏脚凳够取高架物，禁攀爬椅子或床。",
        id: "Pakai bangku injak untuk meraih rak; jangan naik kursi atau ranjang.",
      },
    },
    {
      id: "wet-bath",
      text: {
        "ja-easy": "お風呂(ふろ) の 床(ゆか) で 走(はし)らない",
        en: "Walk slowly on wet bath floors; wear waterproof non-slip shoes.",
        vi: "Đi chậm trên sàn tắm ướt, mang giày chống trượt không thấm.",
        zh: "湿滑浴室地面慢走，穿防水防滑工作鞋。",
        id: "Berjalan pelan di lantai kamar mandi basah, pakai sepatu antislip kedap air.",
      },
    },
    {
      id: "cleaning-cart",
      text: {
        "ja-easy": "清掃(せいそう) カート を 通路(つうろ) に 置(お)き、つまずかない ように",
        en: "Park cleaning carts so corridors and stairs stay clear.",
        vi: "Đặt xe đẩy dọn dẹp gọn để hành lang và cầu thang thông thoáng.",
        zh: "清扫车应停放在不挡通道与楼梯的位置。",
        id: "Letakkan kereta kebersihan agar lorong dan tangga tidak terhalang.",
      },
    },
    {
      id: "stair-rail",
      text: {
        "ja-easy": "階段(かいだん) で は 手(て)すり を 持(も)つ",
        en: "Use the handrail on stairs, especially while carrying linen.",
        vi: "Vịn tay khi lên xuống cầu thang, nhất là khi cầm khăn ga.",
        zh: "上下楼梯务必扶住扶手，尤其携带床品时。",
        id: "Pegang pegangan tangga, terutama saat membawa linen.",
      },
    },
    {
      id: "balcony",
      text: {
        "ja-easy": "客室(きゃくしつ) の ベランダ から 身(み) を 乗(の)り 出(だ)さない",
        en: "Never lean over balcony railings while cleaning windows.",
        vi: "Không vươn ra ngoài ban công khi lau cửa sổ.",
        zh: "擦窗时禁止从阳台栏杆向外探身。",
        id: "Jangan menjorok keluar pagar balkon saat mengelap jendela.",
      },
    },
    {
      id: "ladder-check",
      text: {
        "ja-easy": "脚立(きゃたつ) を 使(つか)う 前(まえ) に ストッパー を 見(み)る",
        en: "Check the lock on step ladders before climbing.",
        vi: "Kiểm tra khóa thang đôi trước khi leo.",
        zh: "登人字梯前确认锁扣到位。",
        id: "Periksa kunci tangga lipat sebelum naik.",
      },
    },
  ],
  emergency: [
    {
      id: "head-injury",
      text: {
        "ja-easy": "頭(あたま) を 打(う)ったら すぐ 病院(びょういん)",
        en: "Go to hospital immediately after any head impact.",
        vi: "Đến bệnh viện ngay khi va đập đầu.",
        zh: "头部撞击应立即就医。",
        id: "Segera ke rumah sakit setelah benturan kepala.",
      },
    },
    {
      id: "ankle",
      text: {
        "ja-easy": "足(あし) を ひねったら 仕事(しごと) を 止(と)めて 整形(せいけい) 外科(げか)",
        en: "Stop work for sprained ankles and visit an orthopaedic clinic.",
        vi: "Bong gân mắt cá: dừng làm và đi phòng khám chỉnh hình.",
        zh: "脚踝扭伤立即停工，前往骨科诊所。",
        id: "Berhenti kerja saat keseleo pergelangan, ke klinik ortopedi.",
      },
    },
  ],
  source: "厚生労働省「宿泊業における労働災害防止対策」",
};

const chemical: SafetyMaterial = {
  id: "accommodation-chemical-handling",
  industry: "accommodation",
  topic: "chemical-handling",
  title: {
    "ja-easy": "宿(やど) で 洗剤(せんざい) を 安全(あんぜん)に 使(つか)う",
    en: "Safe handling of cleaning products in hotels",
    vi: "Sử dụng hóa chất tẩy rửa khách sạn an toàn",
    zh: "酒店清洁剂的安全使用",
    id: "Penggunaan bahan kimia pembersih di hotel",
  },
  intro: {
    "ja-easy":
      "宿(やど) の 業務(ぎょうむ) 用 洗剤(せんざい) は 強(つよ)い 薬品(やくひん) です。家(いえ) の 洗剤(せんざい) と 違(ちが)います。",
    en: "Commercial bathroom and laundry cleaners are highly concentrated. Use proper PPE every time.",
    vi: "Chất tẩy phòng tắm và giặt là thương mại rất đậm đặc. Luôn dùng PPE đúng.",
    zh: "商用浴室与洗衣清洁剂浓度高，必须每次佩戴适当防护具。",
    id: "Pembersih kamar mandi dan binatu komersial sangat pekat. Selalu pakai APD.",
  },
  checklist: [
    {
      id: "label-read",
      text: {
        "ja-easy": "ラベル を 読(よ)む",
        en: "Read the label before opening any new chemical.",
        vi: "Đọc nhãn trước khi mở bất kỳ hóa chất mới nào.",
        zh: "开新化学品前先看标签。",
        id: "Baca label sebelum membuka bahan kimia baru.",
      },
    },
    {
      id: "no-mix",
      text: {
        "ja-easy": "塩素(えんそ) と 酸性(さんせい) を 混(ま)ぜない",
        en: "Never mix chlorine bleach with acidic toilet cleaners.",
        vi: "Không pha lẫn nước Javel với chất tẩy bồn cầu axit.",
        zh: "禁止混合含氯漂白剂与酸性洁厕剂。",
        id: "Jangan campur pemutih klorin dengan pembersih toilet asam.",
      },
    },
    {
      id: "dilute",
      text: {
        "ja-easy": "薄(うす)めて 使(つか)う",
        en: "Dilute concentrated cleaners exactly to label specification.",
        vi: "Pha loãng chất tẩy đậm đặc đúng theo nhãn.",
        zh: "浓缩洗涤剂按标签精确稀释。",
        id: "Encerkan pembersih pekat sesuai label.",
      },
    },
    {
      id: "gloves-mask",
      text: {
        "ja-easy": "手袋(てぶくろ) と 必要(ひつよう) なら マスク",
        en: "Wear gloves; add a mask when cleaning enclosed showers.",
        vi: "Đeo găng; đeo thêm khẩu trang khi vệ sinh phòng tắm kín.",
        zh: "佩戴手套；清洁封闭淋浴间时加戴口罩。",
        id: "Pakai sarung tangan; tambah masker saat membersihkan shower tertutup.",
      },
    },
    {
      id: "ventilation",
      text: {
        "ja-easy": "窓(まど) と 排気扇(はいきせん) を 開(あ)ける",
        en: "Open windows and run the exhaust fan during chemical cleaning.",
        vi: "Mở cửa sổ và bật quạt hút khi vệ sinh hóa chất.",
        zh: "化学清洁时打开窗户与排风扇。",
        id: "Buka jendela dan exhaust saat membersihkan dengan bahan kimia.",
      },
    },
    {
      id: "no-bottle",
      text: {
        "ja-easy": "客(きゃく) の 飲(の)み 物(もの) の ボトル に 入(い)れない",
        en: "Never refill guest-water bottles with cleaning chemicals.",
        vi: "Không đổ hóa chất vào chai nước của khách.",
        zh: "禁止用清洁剂灌入客用水瓶。",
        id: "Jangan isi ulang botol air tamu dengan bahan kimia.",
      },
    },
  ],
  emergency: [
    {
      id: "skin",
      text: {
        "ja-easy": "肌(はだ) や 目(め) に かかったら 15 分(ふん) 水(みず) で 流(なが)す",
        en: "Flush skin or eyes with water for 15 minutes if splashed.",
        vi: "Rửa da hoặc mắt 15 phút nếu bị bắn.",
        zh: "溅到皮肤或眼睛冲水15分钟。",
        id: "Bilas kulit/mata 15 menit bila terkena.",
      },
    },
    {
      id: "fume",
      text: {
        "ja-easy": "嫌(いや) な におい が した ら 部屋(へや) を 離(はな)れる",
        en: "Evacuate the room if you smell an unusual fume; call supervisor.",
        vi: "Rời phòng nếu ngửi mùi lạ và báo quản lý.",
        zh: "闻到异常气味立即离开房间并联系主管。",
        id: "Tinggalkan ruangan bila tercium bau asing dan beri tahu atasan.",
      },
    },
  ],
  source: "厚生労働省「サービス業（宿泊業）における化学物質管理」",
};

const heat: SafetyMaterial = {
  id: "accommodation-heatstroke",
  industry: "accommodation",
  topic: "heatstroke",
  title: {
    "ja-easy": "夏(なつ) の 旅館(りょかん) や ホテル で 熱中症(ねっちゅうしょう) を 防(ふせ)ぐ",
    en: "Heatstroke prevention for hotel and ryokan staff",
    vi: "Phòng sốc nhiệt cho nhân viên khách sạn và ryokan",
    zh: "夏季酒店与旅馆员工的中暑预防",
    id: "Pencegahan sengatan panas untuk staf hotel dan ryokan",
  },
  intro: {
    "ja-easy":
      "客室(きゃくしつ) 清掃(せいそう) や 厨房(ちゅうぼう)、屋外(おくがい) の 案内(あんない) で 暑(あつ)く なります。",
    en: "Room cleaning, kitchen work and outdoor guest reception all create heat exposure.",
    vi: "Dọn phòng, nhà bếp và đón khách ngoài trời đều gây nóng.",
    zh: "客房清扫、厨房作业及户外迎宾都易致暑热暴露。",
    id: "Membersihkan kamar, dapur, dan menyambut tamu di luar memicu paparan panas.",
  },
  checklist: [
    {
      id: "room-ac",
      text: {
        "ja-easy": "客室(きゃくしつ) の エアコン を つけて 清掃(せいそう)",
        en: "Turn on the room AC before cleaning; do not work in still hot air.",
        vi: "Bật điều hòa phòng trước khi dọn, không làm trong không khí nóng tù.",
        zh: "清扫前先开客房空调，避免在闷热静风中作业。",
        id: "Nyalakan AC kamar sebelum membersihkan; jangan kerja dalam udara panas tertutup.",
      },
    },
    {
      id: "linen-cart",
      text: {
        "ja-easy": "リネン カート を 押(お)す 時(とき) は こまめ に 休(やす)む",
        en: "Take short breaks while pushing heavy linen carts.",
        vi: "Nghỉ ngắn khi đẩy xe vải nặng.",
        zh: "推沉重布草车时频繁短歇。",
        id: "Sering istirahat saat mendorong troli linen berat.",
      },
    },
    {
      id: "hydration",
      text: {
        "ja-easy": "30 分(ぷん) に 1 回(かい) 水(みず) を 飲(の)む",
        en: "Drink water every 30 minutes — keep a bottle on the cleaning cart.",
        vi: "Uống nước mỗi 30 phút, để chai trên xe đẩy.",
        zh: "每30分钟饮水，可在清扫车上放置水瓶。",
        id: "Minum air setiap 30 menit, simpan botol di troli kebersihan.",
      },
    },
    {
      id: "uniform-light",
      text: {
        "ja-easy": "夏(なつ) の 制服(せいふく) に する",
        en: "Switch to summer uniform; consider cooling vests for kitchen staff.",
        vi: "Đổi sang đồng phục mùa hè; nhân viên bếp có thể mặc áo làm mát.",
        zh: "更换夏季制服，厨房员工可加用降温背心。",
        id: "Ganti seragam musim panas; staf dapur bisa pakai rompi pendingin.",
      },
    },
    {
      id: "outdoor-shade",
      text: {
        "ja-easy": "屋外(おくがい) の 案内(あんない) は 日陰(ひかげ) の ローテーション",
        en: "Rotate outdoor reception staff every 30 minutes; use parasols.",
        vi: "Luân phiên nhân viên đón khách ngoài trời mỗi 30 phút, dùng dù che.",
        zh: "户外接待每30分钟轮换，使用遮阳伞。",
        id: "Bergantian staf resepsi luar setiap 30 menit, gunakan payung.",
      },
    },
    {
      id: "watch-coworker",
      text: {
        "ja-easy": "仲間(なかま) が ふらふら して いたら 声(こえ) を かける",
        en: "Check on coworkers; ask if they feel dizzy or unwell.",
        vi: "Theo dõi đồng nghiệp; hỏi xem có chóng mặt hay khó chịu không.",
        zh: "留意同事，询问是否头晕或不适。",
        id: "Awasi rekan; tanyakan jika pusing atau tidak enak badan.",
      },
    },
  ],
  emergency: [
    {
      id: "first-aid",
      text: {
        "ja-easy": "涼(すず)しい 場所(ばしょ) で 体(からだ) を 冷(ひ)やし、水(みず) を 飲(の)ませる",
        en: "Move worker to cool place, apply ice, give water with salt.",
        vi: "Đưa đến nơi mát, chườm đá, uống nước có muối.",
        zh: "移至阴凉处降温，给予含盐水。",
        id: "Pindahkan ke tempat sejuk, kompres es, beri air bergaram.",
      },
    },
    {
      id: "call-119",
      text: {
        "ja-easy": "意識(いしき) が 戻(もど)らない 時(とき) は 119",
        en: "Call 119 if consciousness does not return quickly.",
        vi: "Gọi 119 nếu không tỉnh lại nhanh.",
        zh: "意识未恢复立即拨打119。",
        id: "Telepon 119 jika kesadaran tidak pulih cepat.",
      },
    },
  ],
  source: "厚生労働省「STOP！熱中症 クールワーク（宿泊業）」",
};

const back: SafetyMaterial = {
  id: "accommodation-lower-back-injury",
  industry: "accommodation",
  topic: "lower-back-injury",
  title: {
    "ja-easy": "宿(やど) の 仕事(しごと) で 腰痛(ようつう) を 防(ふせ)ぐ",
    en: "Lower-back injury prevention in hospitality",
    vi: "Phòng đau lưng cho nhân viên khách sạn",
    zh: "酒店服务业腰痛预防",
    id: "Pencegahan nyeri punggung di hotel",
  },
  intro: {
    "ja-easy":
      "ベッド を 整(ととの)える、シーツ を 変(か)える、布団(ふとん) を 上(あ)げ 下(お)ろし する 時(とき) は 腰(こし) に 注意(ちゅうい)。",
    en: "Bed making, sheet changes, and laying out futon stress the back. Use proper technique.",
    vi: "Dọn giường, thay ga, trải futon gây áp lực lưng. Dùng kỹ thuật đúng.",
    zh: "整理床铺、换床单与铺撤被褥对腰部有压力，请用正确姿势。",
    id: "Merapikan ranjang, ganti sprei, dan menggelar futon membebani punggung — pakai teknik benar.",
  },
  checklist: [
    {
      id: "bed-knee",
      text: {
        "ja-easy": "ベッド の 端(はし) で 膝(ひざ) を 床(ゆか) に 付(つ)けて 作業(さぎょう)",
        en: "Kneel beside the bed instead of bending over to make corners.",
        vi: "Quỳ bên giường thay vì cúi để gấp góc ga.",
        zh: "整理床角时跪在床边而非弯腰。",
        id: "Berlutut di samping ranjang daripada membungkuk untuk merapikan.",
      },
    },
    {
      id: "futon-team",
      text: {
        "ja-easy": "重(おも)い 布団(ふとん) は 二人(ふたり) で 運(はこ)ぶ",
        en: "Move heavy futon sets with two staff.",
        vi: "Hai người di chuyển bộ futon nặng.",
        zh: "重型被褥两人协同搬运。",
        id: "Pindahkan futon berat dengan dua staf.",
      },
    },
    {
      id: "linen-cart-low",
      text: {
        "ja-easy": "リネン カート の 上(うえ) に 積(つ)み 過(す)ぎない",
        en: "Do not stack linen carts above shoulder height.",
        vi: "Không chất xe vải cao quá vai.",
        zh: "布草车堆放高度不超过肩部。",
        id: "Jangan tumpuk troli linen melebihi bahu.",
      },
    },
    {
      id: "vacuum-posture",
      text: {
        "ja-easy": "掃除機(そうじき) は 体(からだ) を まっすぐ に",
        en: "Vacuum with back straight; move feet, not just the arm.",
        vi: "Hút bụi với lưng thẳng, di chuyển bằng chân chứ không chỉ tay.",
        zh: "吸尘时保持腰背挺直，靠脚步移动而非仅手臂。",
        id: "Vakum dengan punggung lurus, bergerak dengan kaki bukan hanya lengan.",
      },
    },
    {
      id: "stretch-break",
      text: {
        "ja-easy": "1 時間(じかん) に 1 回(かい) ストレッチ",
        en: "Stretch for 1–2 minutes every hour.",
        vi: "Giãn cơ 1–2 phút mỗi giờ.",
        zh: "每小时伸展1至2分钟。",
        id: "Peregangan 1–2 menit setiap jam.",
      },
    },
    {
      id: "report",
      text: {
        "ja-easy": "腰(こし) の 痛(いた)み を 我慢(がまん) しない",
        en: "Do not push through back pain — report it the same day.",
        vi: "Không cố chịu đau lưng — báo trong ngày.",
        zh: "腰痛切勿忍耐，当天上报。",
        id: "Jangan tahan nyeri punggung — laporkan hari itu juga.",
      },
    },
  ],
  emergency: [
    {
      id: "rest",
      text: {
        "ja-easy": "急(きゅう) に 強(つよ)い 痛(いた)み が 出(で)たら 仕事(しごと) を 止(と)める",
        en: "Stop work if you feel sudden sharp pain or numbness.",
        vi: "Dừng việc khi đau nhói hoặc tê đột ngột.",
        zh: "突发剧痛或麻木立即停工。",
        id: "Hentikan kerja saat nyeri tajam atau mati rasa mendadak.",
      },
    },
    {
      id: "rosai",
      text: {
        "ja-easy": "労災(ろうさい) は 申請(しんせい) できる",
        en: "Workers' compensation is available regardless of nationality.",
        vi: "Bảo hiểm Rōsai có thể đăng ký bất kể quốc tịch.",
        zh: "劳灾保险与国籍无关均可申请。",
        id: "Asuransi Rōsai dapat diklaim tanpa pandang kebangsaan.",
      },
    },
  ],
  source: "厚生労働省「宿泊業のための腰痛予防対策」",
};

const infection: SafetyMaterial = {
  id: "accommodation-infection-prevention",
  industry: "accommodation",
  topic: "infection-prevention",
  title: {
    "ja-easy": "宿泊(しゅくはく) 業(ぎょう) で 感染症(かんせんしょう) を 防(ふせ)ぐ",
    en: "Infection prevention in accommodation",
    vi: "Phòng lây nhiễm trong dịch vụ lưu trú",
    zh: "住宿业传染病预防",
    id: "Pencegahan infeksi di akomodasi",
  },
  intro: {
    "ja-easy":
      "たくさん の 客(きゃく) が 出入(でい)り します。共用(きょうよう) の 場所(ばしょ) を きれい に 保(たも)って ください。",
    en: "Many guests pass through daily. Clean shared areas and use proper PPE for laundry handling.",
    vi: "Nhiều khách qua lại mỗi ngày. Giữ khu vực chung sạch và dùng PPE đúng khi xử lý vải.",
    zh: "客流量大，需保持公共区域清洁，处理布草穿戴防护装备。",
    id: "Banyak tamu lalu lalang. Jaga area umum bersih dan pakai APD saat menangani linen.",
  },
  checklist: [
    {
      id: "linen-glove",
      text: {
        "ja-easy": "使用済(しようず)み リネン は 手袋(てぶくろ) を つけて 触(さわ)る",
        en: "Wear gloves and apron when handling used linen; do not shake sheets.",
        vi: "Đeo găng và tạp dề khi xử lý vải đã dùng; không giũ ga.",
        zh: "处理已使用布草时戴手套和围裙，禁止抖动床单。",
        id: "Pakai sarung tangan dan apron saat memegang linen kotor; jangan dikibaskan.",
      },
    },
    {
      id: "hot-water",
      text: {
        "ja-easy": "リネン は 60 度(ど) 以上(いじょう) で 洗(あら)う",
        en: "Wash linen at 60°C or above to kill pathogens.",
        vi: "Giặt vải ở ≥60°C để diệt mầm bệnh.",
        zh: "布草使用60℃以上水温清洗以杀灭病原体。",
        id: "Cuci linen di suhu 60°C atau lebih untuk membunuh patogen.",
      },
    },
    {
      id: "high-touch",
      text: {
        "ja-easy": "ドア の 取(と)っ手・リモコン・スイッチ を 拭(ふ)く",
        en: "Disinfect door handles, remotes, and light switches in every room.",
        vi: "Khử khuẩn tay nắm cửa, điều khiển, công tắc đèn ở mỗi phòng.",
        zh: "每间客房消毒门把手、遥控器、灯开关。",
        id: "Disinfeksi gagang pintu, remote, dan saklar lampu setiap kamar.",
      },
    },
    {
      id: "vomit-procedure",
      text: {
        "ja-easy": "嘔吐物(おうとぶつ) は 次亜塩素酸(じあえんそさん) で 処理(しょり)",
        en: "Treat any vomit with sodium hypochlorite solution and dispose in sealed bag.",
        vi: "Xử lý chất nôn bằng dung dịch natri hypochlorite, bỏ vào túi kín.",
        zh: "呕吐物用次氯酸钠处理，封袋丢弃。",
        id: "Tangani muntahan dengan natrium hipoklorit dan buang ke kantong tertutup.",
      },
    },
    {
      id: "hand-wash",
      text: {
        "ja-easy": "客室(きゃくしつ) 出(で)入(い)り の たび に 手(て) を 洗(あら)う",
        en: "Wash hands after every room and before meals.",
        vi: "Rửa tay sau mỗi phòng và trước bữa ăn.",
        zh: "每完成一间客房及用餐前洗手。",
        id: "Cuci tangan setelah setiap kamar dan sebelum makan.",
      },
    },
    {
      id: "mask",
      text: {
        "ja-easy": "風邪(かぜ) や 咳(せき) の 時(とき) は マスク",
        en: "Wear a mask when you have cough or cold symptoms.",
        vi: "Đeo khẩu trang khi ho hoặc cảm.",
        zh: "出现咳嗽或感冒症状须佩戴口罩。",
        id: "Pakai masker saat batuk atau pilek.",
      },
    },
  ],
  emergency: [
    {
      id: "guest-illness",
      text: {
        "ja-easy": "客(きゃく) が 嘔吐(おうと) や 高熱(こうねつ) の 時(とき) は 上司(じょうし) に 連絡(れんらく)",
        en: "Notify the manager when a guest reports vomiting or high fever.",
        vi: "Báo quản lý khi khách nôn ói hoặc sốt cao.",
        zh: "客人呕吐或高热应通知上司。",
        id: "Beritahu manajer bila tamu muntah atau demam tinggi.",
      },
    },
    {
      id: "phc",
      text: {
        "ja-easy": "同(おな)じ 症状(しょうじょう) が 続(つづ)いたら 保健所(ほけんじょ) へ",
        en: "If similar illness clusters appear, notify the public health office.",
        vi: "Nếu nhiều ca cùng triệu chứng, báo cơ quan y tế công cộng.",
        zh: "出现群体相同症状须报告保健所。",
        id: "Bila ada klaster gejala serupa, lapor dinas kesehatan.",
      },
    },
  ],
  source: "厚生労働省「旅館・ホテルにおける感染症対策の手引」",
};

export const ACCOMMODATION_MATERIALS: SafetyMaterial[] = [
  fall,
  chemical,
  heat,
  back,
  infection,
];
