export const SAFETY_IMAGE_LIBRARY_PATH = "/materials/safety-images";
export const SAFETY_IMAGE_LIBRARY_RIGHTS_PATH =
  "/materials/safety-images/terms";

export const SAFETY_IMAGE_LANGUAGES = ["ja", "en", "vi", "zh-CN", "id"] as const;
export type SafetyImageLanguage = (typeof SAFETY_IMAGE_LANGUAGES)[number];

export const SAFETY_IMAGE_LANGUAGE_LABELS: Record<SafetyImageLanguage, string> = {
  ja: "日本語",
  en: "English",
  vi: "Tiếng Việt",
  "zh-CN": "简体中文",
  id: "Bahasa Indonesia",
};

export const SAFETY_IMAGE_CATEGORIES = [
  {
    id: "safety-signs",
    label: "現場掲示・安全看板",
    shortLabel: "安全看板",
    description: "現場入口や作業場所で、危険・禁止・保護具をひと目で伝える安全画像です。",
  },
  {
    id: "rules",
    label: "制限・ルール掲示",
    shortLabel: "ルール掲示",
    description: "荷重、点検、入場、衛生など、現場ルールを分かりやすく伝える画像です。",
  },
  {
    id: "construction-illustrations",
    label: "施工計画・報告書用イラスト",
    shortLabel: "施工計画・報告書",
    description: "施工計画書、作業手順書、報告書へ貼りやすい作業イラストです。",
  },
  {
    id: "heat-health",
    label: "熱中症・健康安全",
    shortLabel: "熱中症・健康",
    description: "水分補給、体調確認、救急対応を直感的に伝える健康安全画像です。",
  },
  {
    id: "general",
    label: "その他汎用",
    shortLabel: "汎用",
    description: "安全活動の記録、共有、確認に使える汎用イラストです。",
  },
] as const;

export type SafetyImageCategory =
  (typeof SAFETY_IMAGE_CATEGORIES)[number]["id"];
export type SafetyImageOrientation = "portrait" | "landscape";
export type SafetyImageUse = "掲示" | "報告書" | "施工計画" | "教育" | "朝礼";

type ThemeRow = readonly [
  slug: string,
  ja: string,
  en: string,
  vi: string,
  zhCn: string,
  id: string,
];

const THEME_ROWS: readonly ThemeRow[] = [
  ["full-harness-required", "ここではフルハーネスを使用", "Use a full-body harness here", "Sử dụng dây đai toàn thân tại đây", "此处须使用全身式安全带", "Gunakan sabuk pengaman tubuh penuh di sini"],
  ["helmet-required", "保護帽を着用", "Wear a safety helmet", "Đội mũ bảo hộ", "佩戴安全帽", "Gunakan helm keselamatan"],
  ["safety-glasses-required", "保護メガネ着用", "Wear safety glasses", "Đeo kính bảo hộ", "佩戴防护眼镜", "Gunakan kacamata keselamatan"],
  ["hearing-protection-required", "耳栓・イヤーマフ着用", "Wear hearing protection", "Đeo thiết bị bảo vệ thính giác", "佩戴听力防护用品", "Gunakan pelindung pendengaran"],
  ["safety-shoes-required", "安全靴着用", "Wear safety footwear", "Mang giày bảo hộ", "穿安全鞋", "Gunakan sepatu keselamatan"],
  ["protective-gloves-required", "保護手袋着用", "Wear protective gloves", "Đeo găng tay bảo hộ", "佩戴防护手套", "Gunakan sarung tangan pelindung"],
  ["dust-mask-required", "防じんマスク着用", "Wear a dust mask", "Đeo khẩu trang chống bụi", "佩戴防尘口罩", "Gunakan masker debu"],
  ["face-shield-required", "フェイスシールド着用", "Wear a face shield", "Đeo tấm che mặt", "佩戴防护面罩", "Gunakan pelindung wajah"],
  ["no-entry", "立入禁止", "No entry", "Cấm vào", "禁止入内", "Dilarang masuk"],
  ["no-open-flame", "火気厳禁", "No open flames", "Cấm lửa", "严禁烟火", "Dilarang menyalakan api"],
  ["no-smoking", "禁煙", "No smoking", "Cấm hút thuốc", "禁止吸烟", "Dilarang merokok"],
  ["opening-caution", "開口部注意", "Caution: floor opening", "Chú ý lỗ mở", "当心洞口", "Awas bukaan lantai"],
  ["fall-caution", "墜落注意", "Caution: fall hazard", "Chú ý nguy cơ ngã cao", "当心坠落", "Awas bahaya jatuh"],
  ["overhead-load-caution", "上部吊り荷注意", "Caution: overhead load", "Chú ý tải treo phía trên", "当心上方吊物", "Awas beban tergantung di atas"],
  ["rigging-in-progress", "玉掛け作業中", "Rigging work in progress", "Đang thực hiện công tác móc cáp", "正在进行吊装索具作业", "Pekerjaan rigging sedang berlangsung"],
  ["working-at-height", "高所作業中", "Work at height in progress", "Đang làm việc trên cao", "正在进行高处作业", "Pekerjaan di ketinggian sedang berlangsung"],
  ["heavy-equipment-operating", "重機作業中", "Heavy equipment operating", "Thiết bị hạng nặng đang hoạt động", "重型机械作业中", "Alat berat sedang beroperasi"],
  ["electric-shock-caution", "感電注意", "Caution: electric shock", "Chú ý điện giật", "当心触电", "Awas sengatan listrik"],
  ["oxygen-deficiency-caution", "酸欠注意", "Caution: oxygen deficiency", "Chú ý thiếu oxy", "当心缺氧", "Awas kekurangan oksigen"],
  ["organic-solvent-caution", "有機溶剤取扱い注意", "Caution: organic solvents", "Chú ý dung môi hữu cơ", "当心有机溶剂", "Awas pelarut organik"],
  ["asbestos-work-area", "石綿作業区域", "Asbestos work area", "Khu vực làm việc với amiăng", "石棉作业区域", "Area kerja asbes"],
  ["forklift-traffic", "フォークリフト通行注意", "Caution: forklift traffic", "Chú ý xe nâng qua lại", "当心叉车通行", "Awas lalu lintas forklift"],
  ["watch-your-step", "足元注意", "Watch your step", "Chú ý bước chân", "小心脚下", "Perhatikan langkah Anda"],
  ["slippery-surface", "滑りやすい床面", "Caution: slippery surface", "Chú ý sàn trơn", "小心地滑", "Awas permukaan licin"],
  ["keep-tidy", "整理整頓", "Keep the area tidy", "Giữ khu vực gọn gàng", "整理整顿", "Jaga area tetap rapi"],
  ["point-and-call", "指差呼称", "Point and call", "Chỉ tay và hô xác nhận", "指差呼唤确认", "Tunjuk dan sebutkan"],
  ["safety-passage", "安全通路", "Safety walkway", "Lối đi an toàn", "安全通道", "Jalur aman"],
  ["crane-slewing-range", "クレーン旋回範囲 立入注意", "Keep clear of the crane slewing area", "Tránh xa vùng quay của cần cẩu", "请勿进入起重机回转范围", "Jauhi area putar derek"],
  ["excavation-edge", "掘削端部 接近注意", "Keep away from excavation edges", "Tránh xa mép hố đào", "请勿靠近开挖边缘", "Jauhi tepi galian"],
  ["suspended-load", "吊り荷の下に入らない", "Keep out from under suspended loads", "Không đứng dưới tải treo", "严禁进入吊物下方", "Jangan berada di bawah beban tergantung"],
  ["welding-arc", "溶接アーク光 注意", "Caution: welding arc", "Chú ý hồ quang hàn", "当心焊接弧光", "Awas cahaya busur las"],
  ["hot-surface", "高温部 接触注意", "Caution: hot surface", "Chú ý bề mặt nóng", "当心高温表面", "Awas permukaan panas"],
  ["high-noise-area", "高騒音区域", "High-noise area", "Khu vực tiếng ồn cao", "高噪声区域", "Area kebisingan tinggi"],
  ["low-headroom", "頭上注意", "Mind your head", "Chú ý phía trên đầu", "小心碰头", "Awas kepala"],
  ["falling-objects", "飛来・落下物注意", "Caution: falling objects", "Chú ý vật rơi", "当心飞落物", "Awas benda jatuh"],
  ["pinch-point", "はさまれ注意", "Caution: pinch point", "Chú ý điểm kẹp", "当心夹伤", "Awas titik jepit"],
  ["rotating-parts", "回転部に触れない", "Do not touch rotating parts", "Không chạm vào bộ phận quay", "请勿触摸旋转部件", "Jangan sentuh bagian berputar"],
  ["chemical-splash", "薬液飛散注意", "Caution: chemical splash", "Chú ý hóa chất bắn tóe", "当心化学品飞溅", "Awas percikan bahan kimia"],
  ["gas-cylinder-storage", "ボンベ転倒防止", "Secure gas cylinders", "Cố định bình khí chống đổ", "固定气瓶防止倾倒", "Amankan tabung gas agar tidak jatuh"],
  ["fire-extinguisher", "消火器", "Fire extinguisher", "Bình chữa cháy", "灭火器", "Alat pemadam api"],
  ["emergency-exit", "非常口", "Emergency exit", "Lối thoát hiểm", "紧急出口", "Pintu keluar darurat"],
  ["first-aid-station", "救急用品", "First-aid supplies", "Dụng cụ sơ cứu", "急救用品", "Perlengkapan P3K"],
  ["eyewash-station", "洗眼設備", "Emergency eyewash", "Thiết bị rửa mắt", "洗眼设备", "Pencuci mata darurat"],
  ["assembly-point", "緊急集合場所", "Emergency assembly point", "Điểm tập kết khẩn cấp", "紧急集合点", "Titik kumpul darurat"],
  ["pedestrian-crossing", "歩行者横断箇所", "Pedestrian crossing", "Lối qua đường cho người đi bộ", "行人横穿处", "Penyeberangan pejalan kaki"],
  ["floor-load-limit", "作業床の制限荷重 ○○ t/㎡", "Floor load limit: ○○ t/m²", "Tải trọng sàn giới hạn: ○○ t/m²", "作业平台限载：○○ t/㎡", "Batas beban lantai: ○○ t/m²"],
  ["maximum-load", "最大積載荷重 ○○ kg", "Maximum load: ○○ kg", "Tải trọng tối đa: ○○ kg", "最大载荷：○○ kg", "Beban maksimum: ○○ kg"],
  ["ppe-rules", "この区域の保護具ルール", "PPE rules for this area", "Quy định PPE tại khu vực này", "本区域个人防护用品规定", "Aturan APD di area ini"],
  ["hydration-break", "休憩・水分補給を忘れずに", "Take breaks and stay hydrated", "Nghỉ giải lao và uống đủ nước", "注意休息和补充水分", "Istirahat dan cukup minum"],
  ["emergency-contacts", "緊急連絡体制", "Emergency contact procedure", "Quy trình liên lạc khẩn cấp", "紧急联络流程", "Prosedur kontak darurat"],
  ["ky-in-progress", "KY実施中", "Hazard prediction meeting in progress", "Đang họp dự đoán nguy cơ", "危险预知活动进行中", "Pertemuan prediksi bahaya sedang berlangsung"],
  ["morning-meeting", "安全朝礼 実施中", "Safety morning meeting in progress", "Đang họp an toàn đầu ca", "安全早会进行中", "Briefing keselamatan pagi sedang berlangsung"],
  ["tool-inspected", "持込工具 点検済", "Brought-in tools inspected", "Dụng cụ mang vào đã được kiểm tra", "自带工具已检查", "Peralatan bawaan telah diperiksa"],
  ["charging-area", "充電設備 使用中", "Charging equipment in use", "Thiết bị sạc đang được sử dụng", "充电设备使用中", "Peralatan pengisian daya sedang digunakan"],
  ["hygiene-rules", "手洗い・衛生を徹底", "Wash hands and maintain hygiene", "Rửa tay và giữ vệ sinh", "彻底洗手并保持卫生", "Cuci tangan dan jaga kebersihan"],
  ["site-speed-limit", "場内制限速度 ○○ km/h", "Site speed limit: ○○ km/h", "Tốc độ giới hạn trong công trường: ○○ km/h", "场内限速：○○ km/h", "Batas kecepatan lokasi: ○○ km/jam"],
  ["one-way-route", "場内一方通行", "One-way site route", "Đường một chiều trong công trường", "场内单向通行", "Jalur satu arah di lokasi"],
  ["visitor-check-in", "入場前に受付をお願いします", "Check in before entering", "Vui lòng đăng ký trước khi vào", "进入前请登记", "Harap lapor sebelum masuk"],
  ["permit-to-work", "作業許可を確認", "Confirm the work permit", "Xác nhận giấy phép làm việc", "确认作业许可证", "Pastikan izin kerja"],
  ["lockout-tagout", "停止・遮断・表示を確認", "Confirm stop, isolation and tagging", "Xác nhận dừng, cách ly và gắn thẻ", "确认停机、隔离和挂牌", "Pastikan berhenti, isolasi, dan penandaan"],
  ["housekeeping-zone", "資材は区画内へ", "Keep materials inside the marked area", "Để vật liệu trong khu vực quy định", "材料请放在划定区域内", "Simpan material di dalam area yang ditandai"],
  ["waste-sorting", "分別して廃棄", "Sort waste before disposal", "Phân loại trước khi thải bỏ", "分类后丢弃", "Pilah sebelum dibuang"],
  ["fire-watch", "火気作業後の確認", "Check after hot work", "Kiểm tra sau công việc phát sinh nhiệt", "动火作业后检查", "Periksa setelah pekerjaan panas"],
  ["delivery-zone", "荷受け・荷降ろし場所", "Loading and unloading zone", "Khu vực nhận và dỡ hàng", "收货及卸货区", "Area bongkar muat"],
  ["daily-inspection", "始業前点検を実施", "Perform a pre-start inspection", "Kiểm tra trước khi bắt đầu", "进行作业前检查", "Lakukan pemeriksaan sebelum mulai"],
  ["scaffold-work-illustration", "足場作業", "Scaffold work", "Công việc giàn giáo", "脚手架作业", "Pekerjaan perancah"],
  ["mobile-crane-illustration", "移動式クレーン", "Mobile crane", "Cần cẩu di động", "移动式起重机", "Derek bergerak"],
  ["rigging-work-illustration", "玉掛け作業", "Rigging work", "Công việc móc cáp", "吊装索具作业", "Pekerjaan rigging"],
  ["aerial-work-platform-illustration", "高所作業車", "Aerial work platform", "Xe nâng người làm việc trên cao", "高空作业平台", "Platform kerja udara"],
  ["full-harness-illustration", "フルハーネス使用", "Using a full-body harness", "Sử dụng dây đai toàn thân", "使用全身式安全带", "Penggunaan sabuk pengaman tubuh penuh"],
  ["traffic-guidance-illustration", "交通誘導", "Traffic guidance", "Điều tiết giao thông", "交通引导", "Pengaturan lalu lintas"],
  ["dump-excavator-illustration", "ダンプ・バックホウ連携", "Dump truck and excavator coordination", "Phối hợp xe ben và máy xúc", "自卸车与挖掘机协同", "Koordinasi truk jungkit dan ekskavator"],
  ["excavation-work-illustration", "掘削作業", "Excavation work", "Công việc đào đất", "开挖作业", "Pekerjaan penggalian"],
  ["formwork-illustration", "型枠組立", "Formwork assembly", "Lắp dựng ván khuôn", "模板组装", "Perakitan bekisting"],
  ["rebar-work-illustration", "鉄筋組立", "Rebar assembly", "Lắp dựng cốt thép", "钢筋组装", "Perakitan tulangan"],
  ["concrete-placement-illustration", "コンクリート打設", "Concrete placement", "Đổ bê tông", "混凝土浇筑", "Pengecoran beton"],
  ["temporary-electric-illustration", "仮設電気設備", "Temporary electrical equipment", "Thiết bị điện tạm thời", "临时电气设备", "Peralatan listrik sementara"],
  ["welding-work-illustration", "溶接作業", "Welding work", "Công việc hàn", "焊接作业", "Pekerjaan pengelasan"],
  ["cutting-work-illustration", "切断作業", "Cutting work", "Công việc cắt", "切割作业", "Pekerjaan pemotongan"],
  ["material-hoisting-illustration", "資材荷揚げ", "Material hoisting", "Nâng vật liệu", "材料吊运", "Pengangkatan material"],
  ["opening-protection-illustration", "開口部養生", "Floor opening protection", "Bảo vệ lỗ mở sàn", "洞口防护", "Perlindungan bukaan lantai"],
  ["stepladder-illustration", "脚立作業", "Stepladder work", "Công việc trên thang chữ A", "人字梯作业", "Pekerjaan dengan tangga lipat"],
  ["rolling-tower-illustration", "ローリングタワー", "Mobile scaffold tower", "Tháp giàn giáo di động", "移动脚手架塔", "Menara perancah bergerak"],
  ["safety-morning-meeting-illustration", "安全朝礼", "Safety morning meeting", "Họp an toàn đầu ca", "安全早会", "Briefing keselamatan pagi"],
  ["site-inspection-illustration", "現場点検", "Site inspection", "Kiểm tra công trường", "现场检查", "Inspeksi lokasi"],
  ["heat-illness-alert", "熱中症警戒", "Heat illness alert", "Cảnh báo sốc nhiệt", "谨防中暑", "Waspada penyakit akibat panas"],
  ["drink-water", "こまめに水分補給", "Drink water frequently", "Uống nước thường xuyên", "及时补充水分", "Minum air secara teratur"],
  ["salt-intake", "適度に塩分補給", "Replenish salt appropriately", "Bổ sung muối hợp lý", "适量补充盐分", "Cukupi asupan garam"],
  ["cool-rest-area", "涼しい休憩所", "Cool rest area", "Khu nghỉ mát", "清凉休息区", "Tempat istirahat sejuk"],
  ["check-wbgt", "WBGTを確認", "Check the WBGT", "Kiểm tra chỉ số WBGT", "确认WBGT指数", "Periksa WBGT"],
  ["health-check", "作業前に体調確認", "Check your condition before work", "Kiểm tra sức khỏe trước khi làm việc", "作业前确认身体状况", "Periksa kondisi tubuh sebelum bekerja"],
  ["buddy-system", "単独作業を避ける", "Avoid working alone", "Tránh làm việc một mình", "避免单独作业", "Hindari bekerja sendirian"],
  ["first-aid-response", "異変時はすぐ救急対応", "Respond immediately when someone feels unwell", "Sơ cứu ngay khi có bất thường", "发现异常立即急救", "Segera tangani jika ada gangguan kesehatan"],
  ["cool-down", "体を冷やして休む", "Cool down and rest", "Làm mát cơ thể và nghỉ ngơi", "降温并休息", "Dinginkan tubuh dan beristirahat"],
  ["emergency-call", "迷わず緊急連絡", "Call for emergency help without delay", "Gọi hỗ trợ khẩn cấp ngay", "立即进行紧急联络", "Segera hubungi bantuan darurat"],
  ["safety-calendar", "安全活動カレンダー", "Safety activity calendar", "Lịch hoạt động an toàn", "安全活动日历", "Kalender kegiatan keselamatan"],
  ["near-miss-share", "ヒヤリハットを共有", "Share near-miss reports", "Chia sẻ sự cố suýt xảy ra", "分享未遂事件", "Bagikan laporan nyaris celaka"],
  ["photo-record", "写真で作業記録", "Record the work with photos", "Ghi lại công việc bằng ảnh", "用照片记录作业", "Catat pekerjaan dengan foto"],
  ["toolbox-meeting", "作業前のひと声", "Speak up before starting work", "Nhắc nhau trước khi bắt đầu", "作业前相互提醒", "Saling mengingatkan sebelum bekerja"],
  ["completion-check", "作業完了を確認", "Confirm work completion", "Xác nhận công việc đã hoàn thành", "确认作业完成", "Pastikan pekerjaan selesai"],
] as const;

export type SafetyImageNumericTemplate = {
  label: string;
  placeholder: string;
  unit: string;
};

const NUMERIC_TEMPLATES: Partial<Record<string, SafetyImageNumericTemplate>> = {
  "floor-load-limit": { label: "制限荷重", placeholder: "○○", unit: "t/㎡" },
  "maximum-load": { label: "最大積載荷重", placeholder: "○○", unit: "kg" },
  "site-speed-limit": { label: "場内制限速度", placeholder: "○○", unit: "km/h" },
  "emergency-contacts": { label: "緊急連絡先", placeholder: "", unit: "" },
};

export type SafetyImageTheme = {
  id: string;
  order: number;
  slug: string;
  title: string;
  category: SafetyImageCategory;
  categoryLabel: string;
  texts: Record<SafetyImageLanguage, string>;
  tags: string[];
  uses: SafetyImageUse[];
  orientation: SafetyImageOrientation;
  recommended: boolean;
  multilingual: true;
  pngAvailable: boolean;
  numericTemplate?: SafetyImageNumericTemplate;
  previewPath: string;
  originalPath: string;
  detailPath: string;
  rights: "portal-owned-commercial-editable";
};

function categoryForOrder(order: number): SafetyImageCategory {
  if (order <= 45) return "safety-signs";
  if (order <= 65) return "rules";
  if (order <= 85) return "construction-illustrations";
  if (order <= 95) return "heat-health";
  return "general";
}

function usesForCategory(category: SafetyImageCategory): SafetyImageUse[] {
  switch (category) {
    case "safety-signs":
      return ["掲示", "教育"];
    case "rules":
      return ["掲示", "朝礼"];
    case "construction-illustrations":
      return ["施工計画", "報告書", "教育"];
    case "heat-health":
      return ["掲示", "朝礼", "教育"];
    case "general":
      return ["朝礼", "教育", "報告書"];
  }
}

const RECOMMENDED_ORDERS = new Set([2, 9, 12, 13, 17, 18, 22, 25, 26, 27, 46, 47, 49, 50, 51, 52, 65, 66, 68, 70, 71, 86, 87, 90, 91]);

export const SAFETY_IMAGE_THEMES: readonly SafetyImageTheme[] = THEME_ROWS.map(
  ([slug, ja, en, vi, zhCn, idText], index) => {
    const order = index + 1;
    const category = categoryForOrder(order);
    const categoryDefinition = SAFETY_IMAGE_CATEGORIES.find(
      (item) => item.id === category,
    );
    if (!categoryDefinition) throw new Error(`Unknown safety image category: ${category}`);
    return {
      id: `safety-image-${String(order).padStart(3, "0")}`,
      order,
      slug,
      title: ja,
      category,
      categoryLabel: categoryDefinition.label,
      texts: { ja, en, vi, "zh-CN": zhCn, id: idText },
      tags: [
        ja,
        categoryDefinition.shortLabel,
        ...slug.split("-"),
        ...(category === "construction-illustrations" ? ["施工計画", "報告書"] : ["安全掲示"]),
      ],
      uses: usesForCategory(category),
      orientation: category === "construction-illustrations" ? "landscape" : "portrait",
      recommended: RECOMMENDED_ORDERS.has(order),
      multilingual: true as const,
      pngAvailable: category === "construction-illustrations",
      numericTemplate: NUMERIC_TEMPLATES[slug],
      previewPath: `/safety-images/library/previews/${slug}.webp`,
      originalPath: `/safety-images/library/originals/${slug}.png`,
      detailPath: `${SAFETY_IMAGE_LIBRARY_PATH}/${slug}`,
      rights: "portal-owned-commercial-editable" as const,
    } satisfies SafetyImageTheme;
  },
);

export const SAFETY_IMAGE_THEME_BY_SLUG = new Map(
  SAFETY_IMAGE_THEMES.map((theme) => [theme.slug, theme]),
);

export function getSafetyImageCategory(category: string) {
  return SAFETY_IMAGE_CATEGORIES.find((item) => item.id === category);
}

export function getSafetyImageTheme(slug: string) {
  return SAFETY_IMAGE_THEME_BY_SLUG.get(slug);
}

export const SAFETY_IMAGE_LAYOUTS = {
  portrait: {
    safeMarginRatio: 0.055,
    textWidthRatio: 0.89,
    defaultPosition: "top",
    defaultBandColor: "#ffffff",
    defaultTextColor: "#082f49",
  },
  landscape: {
    safeMarginRatio: 0.05,
    textWidthRatio: 0.9,
    defaultPosition: "bottom",
    defaultBandColor: "#ffffff",
    defaultTextColor: "#082f49",
  },
} as const;

if (SAFETY_IMAGE_THEMES.length !== 100) {
  throw new Error(`Safety image manifest must contain 100 themes, found ${SAFETY_IMAGE_THEMES.length}`);
}
