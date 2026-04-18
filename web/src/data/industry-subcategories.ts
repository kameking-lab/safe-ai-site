/**
 * 業種細分化辞書
 * 大分類 → 細分類のマッピング
 * 各パネル（法改正・事故DB・Eラーニング）の「業種フィルタ」で使用する
 */

export type IndustryParent =
  | "建設業"
  | "製造業"
  | "医療福祉"
  | "運輸"
  | "林業"
  | "食品"
  | "小売・サービス"
  | "化学"
  | "電気・ガス"
  | "農業"
  | "IT・情報"
  | "全業種";

export type IndustrySubcategory = {
  id: string;
  label: string;
  parent: IndustryParent;
  keywords: string[];
};

export const INDUSTRY_SUBCATEGORIES: IndustrySubcategory[] = [
  // ── 建設業 12分類 ───────────────────────────────────
  { id: "const-civil", label: "土木工事", parent: "建設業", keywords: ["土木", "掘削", "地盤", "管工事"] },
  { id: "const-building", label: "建築工事", parent: "建設業", keywords: ["建築", "RC造", "鉄骨", "大工"] },
  { id: "const-scaffold", label: "足場・仮設工事", parent: "建設業", keywords: ["足場", "仮設", "型枠"] },
  { id: "const-roof", label: "屋根・防水工事", parent: "建設業", keywords: ["屋根", "防水", "板金"] },
  { id: "const-electric", label: "電気工事", parent: "建設業", keywords: ["電気工事", "送配電", "電線", "活線"] },
  { id: "const-plumbing", label: "管工事・空調設備", parent: "建設業", keywords: ["管工事", "空調", "給排水", "冷暖房"] },
  { id: "const-demolition", label: "解体・撤去工事", parent: "建設業", keywords: ["解体", "撤去", "アスベスト", "石綿"] },
  { id: "const-tunnel", label: "トンネル・地下工事", parent: "建設業", keywords: ["トンネル", "地下", "シールド", "坑内"] },
  { id: "const-bridge", label: "橋梁・鉄塔工事", parent: "建設業", keywords: ["橋梁", "鉄塔", "高所鉄骨", "架橋"] },
  { id: "const-paint", label: "塗装工事", parent: "建設業", keywords: ["塗装", "有機溶剤", "スプレー"] },
  { id: "const-road", label: "道路工事・舗装", parent: "建設業", keywords: ["道路", "舗装", "アスファルト"] },
  { id: "const-landscaping", label: "造園・緑化工事", parent: "建設業", keywords: ["造園", "緑化", "植栽", "剪定"] },

  // ── 製造業 12分類 ───────────────────────────────────
  { id: "mfg-chemical", label: "化学・石油製品製造", parent: "製造業", keywords: ["化学物質", "石油", "有機溶剤", "特定化学"] },
  { id: "mfg-metal", label: "金属・機械加工", parent: "製造業", keywords: ["金属", "機械加工", "プレス", "研削", "旋盤"] },
  { id: "mfg-welding", label: "溶接・鋳造", parent: "製造業", keywords: ["溶接", "鋳造", "溶融", "アーク"] },
  { id: "mfg-food", label: "食品製造", parent: "製造業", keywords: ["食品製造", "食品加工", "食肉", "缶詰"] },
  { id: "mfg-textile", label: "繊維・縫製", parent: "製造業", keywords: ["繊維", "縫製", "紡績", "染色"] },
  { id: "mfg-paper", label: "木材・紙・印刷", parent: "製造業", keywords: ["木材", "紙", "印刷", "パルプ", "製材"] },
  { id: "mfg-plastic", label: "プラスチック・ゴム", parent: "製造業", keywords: ["プラスチック", "ゴム", "成形", "射出"] },
  { id: "mfg-electric", label: "電気・電子部品製造", parent: "製造業", keywords: ["電子部品", "半導体", "電機"] },
  { id: "mfg-auto", label: "自動車・輸送機器製造", parent: "製造業", keywords: ["自動車", "輸送機器", "車体", "組立"] },
  { id: "mfg-construction-material", label: "建設資材・コンクリート", parent: "製造業", keywords: ["コンクリート", "建材", "石材", "粉じん"] },
  { id: "mfg-boiler", label: "ボイラー・圧力容器", parent: "製造業", keywords: ["ボイラー", "圧力容器", "危険物"] },
  { id: "mfg-pharma", label: "医薬品・化粧品製造", parent: "製造業", keywords: ["医薬品", "化粧品", "GMP", "クリーンルーム"] },

  // ── 医療福祉 8分類 ──────────────────────────────────
  { id: "health-hospital", label: "病院・診療所", parent: "医療福祉", keywords: ["病院", "診療所", "クリニック", "手術室"] },
  { id: "health-nursing", label: "介護・老人福祉", parent: "医療福祉", keywords: ["介護", "老人福祉", "特養", "デイサービス"] },
  { id: "health-disability", label: "障害者支援施設", parent: "医療福祉", keywords: ["障害者", "支援施設", "グループホーム"] },
  { id: "health-childcare", label: "保育所・幼稚園", parent: "医療福祉", keywords: ["保育", "幼稚園", "保育士"] },
  { id: "health-pharmacy", label: "薬局・調剤", parent: "医療福祉", keywords: ["薬局", "調剤", "薬剤師"] },
  { id: "health-dental", label: "歯科医院", parent: "医療福祉", keywords: ["歯科", "歯医者"] },
  { id: "health-home-care", label: "訪問介護・訪問看護", parent: "医療福祉", keywords: ["訪問介護", "訪問看護", "在宅"] },
  { id: "health-mental", label: "精神科・メンタルケア", parent: "医療福祉", keywords: ["精神科", "メンタル", "心療内科"] },

  // ── 運輸 9分類 ──────────────────────────────────────
  { id: "trans-truck", label: "トラック運送", parent: "運輸", keywords: ["トラック", "貨物", "長距離運送"] },
  { id: "trans-taxi", label: "タクシー・バス", parent: "運輸", keywords: ["タクシー", "バス", "旅客"] },
  { id: "trans-rail", label: "鉄道", parent: "運輸", keywords: ["鉄道", "線路", "軌道", "電車"] },
  { id: "trans-air", label: "航空・空港", parent: "運輸", keywords: ["航空", "空港", "地上業務", "グランドハンドリング"] },
  { id: "trans-ship", label: "海運・港湾", parent: "運輸", keywords: ["海運", "港湾", "荷役", "船舶", "波止場"] },
  { id: "trans-warehouse", label: "倉庫・物流センター", parent: "運輸", keywords: ["倉庫", "物流", "フォークリフト", "荷扱い"] },
  { id: "trans-delivery", label: "宅配・配達", parent: "運輸", keywords: ["宅配", "配達", "ラストマイル"] },
  { id: "trans-crane", label: "クレーン・揚重作業", parent: "運輸", keywords: ["クレーン", "揚重", "玉掛け", "吊り荷"] },
  { id: "trans-postal", label: "郵便・郵便局業務", parent: "運輸", keywords: ["郵便", "郵便局"] },

  // ── 林業 ────────────────────────────────────────────
  { id: "forest-logging", label: "伐採・搬出", parent: "林業", keywords: ["伐採", "搬出", "チェーンソー", "林業機械"] },
  { id: "forest-planting", label: "植林・育林", parent: "林業", keywords: ["植林", "育林", "苗木"] },
  { id: "forest-mountain", label: "山林管理・測量", parent: "林業", keywords: ["山林", "測量", "法面", "急斜面"] },

  // ── 食品（飲食・小売向けに含む） ────────────────────
  { id: "food-restaurant", label: "飲食店・厨房", parent: "食品", keywords: ["飲食", "厨房", "調理場", "レストラン"] },
  { id: "food-processing", label: "食品加工場", parent: "食品", keywords: ["食品加工", "食肉処理", "魚介"] },
  { id: "food-bakery", label: "パン・菓子製造", parent: "食品", keywords: ["パン", "菓子", "製菓"] },

  // ── 小売・サービス ───────────────────────────────────
  { id: "retail-store", label: "スーパー・量販店", parent: "小売・サービス", keywords: ["スーパー", "量販", "小売", "倉庫作業"] },
  { id: "retail-convenience", label: "コンビニエンスストア", parent: "小売・サービス", keywords: ["コンビニ", "コンビニエンス"] },
  { id: "retail-hotel", label: "ホテル・宿泊施設", parent: "小売・サービス", keywords: ["ホテル", "宿泊", "旅館"] },
  { id: "retail-cleaning", label: "清掃・ビルメンテナンス", parent: "小売・サービス", keywords: ["清掃", "ビルメンテ", "除菌", "高所清掃"] },

  // ── 化学・石油 ───────────────────────────────────────
  { id: "chem-petroleum", label: "石油精製・石油化学", parent: "化学", keywords: ["石油精製", "石化", "爆発", "引火"] },
  { id: "chem-fertilizer", label: "肥料・農薬製造", parent: "化学", keywords: ["肥料", "農薬", "毒物", "劇物"] },
  { id: "chem-gas", label: "高圧ガス製造・貯蔵", parent: "化学", keywords: ["高圧ガス", "液化", "LPG", "ボンベ"] },

  // ── 電気・ガス ───────────────────────────────────────
  { id: "elec-power", label: "電力・発電所", parent: "電気・ガス", keywords: ["電力", "発電所", "電気設備", "高圧"] },
  { id: "elec-gas-supply", label: "都市ガス・LNG", parent: "電気・ガス", keywords: ["都市ガス", "LNG", "ガス漏れ"] },

  // ── 農業 ────────────────────────────────────────────
  { id: "agri-crop", label: "農耕・畑作", parent: "農業", keywords: ["農耕", "畑作", "農業機械", "農薬散布"] },
  { id: "agri-livestock", label: "畜産・酪農", parent: "農業", keywords: ["畜産", "酪農", "家畜", "人獣共通感染"] },

  // ── IT・情報 ────────────────────────────────────────
  { id: "it-datacenter", label: "データセンター", parent: "IT・情報", keywords: ["データセンター", "サーバー室", "電気設備"] },
  { id: "it-tower", label: "鉄塔・アンテナ工事", parent: "IT・情報", keywords: ["鉄塔", "アンテナ", "通信設備", "高所"] },
];

/** 大分類リスト（セレクトボックス用） */
export const INDUSTRY_PARENTS: IndustryParent[] = [
  "全業種",
  "建設業",
  "製造業",
  "医療福祉",
  "運輸",
  "林業",
  "食品",
  "小売・サービス",
  "化学",
  "電気・ガス",
  "農業",
  "IT・情報",
];

/** 親業種に対応する細分類を返す */
export function getSubcategories(parent: IndustryParent): IndustrySubcategory[] {
  if (parent === "全業種") return [];
  return INDUSTRY_SUBCATEGORIES.filter((s) => s.parent === parent);
}

/** テキストから最適な細分類IDを推定する（データ移行・自動タグ付け用） */
export function inferSubcategoryId(text: string, parent: IndustryParent): string | undefined {
  const subcats = getSubcategories(parent);
  const lower = text.toLowerCase();
  let bestMatch: IndustrySubcategory | undefined;
  let bestCount = 0;
  for (const sub of subcats) {
    const count = sub.keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
    if (count > bestCount) {
      bestCount = count;
      bestMatch = sub;
    }
  }
  return bestMatch?.id;
}
