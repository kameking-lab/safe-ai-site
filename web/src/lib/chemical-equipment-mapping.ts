// 化学物質 → 推奨保護具カテゴリのマッピング
//
// /chemical-ra（化学物質RA）から /equipment-finder（保護具AIファインダー）への
// 動線で「この物質に必要な保護具」をハイライトするための辞書。
//
// hazards: GHS分類由来のキーワード（受信側で表示・絞り込みの初期値に使う）
// recommendedCategories: equipment-categories の id（'gas-mask', 'goggles' 等）
// gasMaskAbsorber: 該当する場合に防毒マスクの吸収缶種別ヒント
// rationale: なぜそれを推奨するかの一行説明（受信側でバナーに表示）

export type ChemicalEquipmentProfile = {
  /** 物質の代表名（日本語） */
  name: string;
  /** 別名（英語名・俗称・英字小文字も含めた検索キー） */
  aliases: string[];
  /** GHSハザード由来のキーワード（皮膚刺激／引火性／中枢神経毒性 等） */
  hazards: string[];
  /** equipment-categories の id 配列（推奨カテゴリ。優先度順） */
  recommendedCategories: string[];
  /** 防毒マスクを推奨する場合の吸収缶種別（gas-mask の gasType に対応） */
  gasMaskAbsorber?: "有機ガス" | "ハロゲン" | "硫化水素" | "アンモニア";
  /** 一行説明（バナー表示用） */
  rationale: string;
};

const PROFILES: ChemicalEquipmentProfile[] = [
  {
    name: "トルエン",
    aliases: ["toluene", "メチルベンゼン", "108-88-3"],
    hazards: ["引火性", "中枢神経毒性", "有機溶剤"],
    recommendedCategories: ["gas-mask", "gloves", "goggles"],
    gasMaskAbsorber: "有機ガス",
    rationale: "有機溶剤・引火性液体。有機ガス用防毒マスク・耐溶剤手袋・密閉ゴーグルが必要。",
  },
  {
    name: "キシレン",
    aliases: ["xylene", "ジメチルベンゼン", "1330-20-7"],
    hazards: ["引火性", "中枢神経毒性", "有機溶剤"],
    recommendedCategories: ["gas-mask", "gloves", "goggles"],
    gasMaskAbsorber: "有機ガス",
    rationale: "有機溶剤・引火性液体。有機ガス用防毒マスク・耐溶剤手袋が必要。",
  },
  {
    name: "ベンゼン",
    aliases: ["benzene", "71-43-2"],
    hazards: ["発がん性", "引火性", "有機溶剤"],
    recommendedCategories: ["gas-mask", "gloves", "goggles", "protective-clothing"],
    gasMaskAbsorber: "有機ガス",
    rationale: "発がん性物質。密閉化を最優先。やむを得ず取扱う場合は有機ガス防毒マスク＋全身保護衣。",
  },
  {
    name: "メタノール",
    aliases: ["methanol", "メチルアルコール", "67-56-1"],
    hazards: ["引火性", "急性毒性", "失明リスク", "有機溶剤"],
    recommendedCategories: ["gas-mask", "gloves", "goggles"],
    gasMaskAbsorber: "有機ガス",
    rationale: "引火性かつ急性毒性。眼への接触で失明の恐れ。密閉ゴーグル必須。",
  },
  {
    name: "エタノール",
    aliases: ["ethanol", "エチルアルコール", "64-17-5"],
    hazards: ["引火性", "有機溶剤"],
    recommendedCategories: ["gas-mask", "gloves", "goggles"],
    gasMaskAbsorber: "有機ガス",
    rationale: "引火性液体。長時間取扱時は有機ガス防毒マスク＋耐溶剤手袋。",
  },
  {
    name: "塩酸",
    aliases: ["hydrochloric acid", "塩化水素", "hydrogen chloride", "7647-01-0"],
    hazards: ["腐食性", "酸性", "皮膚障害"],
    recommendedCategories: ["gas-mask", "gloves", "goggles", "protective-clothing"],
    gasMaskAbsorber: "ハロゲン",
    rationale: "強酸・腐食性。耐酸手袋・密閉ゴーグル・耐酸保護衣・酸性ガス用吸収缶が必要。",
  },
  {
    name: "硫酸",
    aliases: ["sulfuric acid", "7664-93-9"],
    hazards: ["腐食性", "酸性", "皮膚障害", "発熱反応"],
    recommendedCategories: ["gloves", "goggles", "protective-clothing", "gas-mask"],
    rationale: "強酸・腐食性。希釈時の発熱に注意。耐酸手袋・フェイスシールド・耐酸保護衣が必要。",
  },
  {
    name: "硝酸",
    aliases: ["nitric acid", "7697-37-2"],
    hazards: ["腐食性", "酸化性", "酸性", "皮膚障害"],
    recommendedCategories: ["gloves", "goggles", "protective-clothing", "gas-mask"],
    gasMaskAbsorber: "ハロゲン",
    rationale: "強酸・酸化性。皮膚接触で重度のやけど。耐酸保護衣・密閉ゴーグル必須。",
  },
  {
    name: "水酸化ナトリウム",
    aliases: ["sodium hydroxide", "苛性ソーダ", "caustic soda", "1310-73-2"],
    hazards: ["腐食性", "アルカリ性", "皮膚障害", "失明リスク"],
    recommendedCategories: ["gloves", "goggles", "protective-clothing"],
    rationale: "強アルカリ・腐食性。眼接触で失明の恐れ。耐アルカリ手袋・密閉ゴーグル必須。",
  },
  {
    name: "アンモニア",
    aliases: ["ammonia", "7664-41-7"],
    hazards: ["刺激性", "腐食性", "毒性ガス"],
    recommendedCategories: ["gas-mask", "gloves", "goggles", "protective-clothing"],
    gasMaskAbsorber: "アンモニア",
    rationale: "刺激性ガス。アンモニア用吸収缶（緑色）の防毒マスクが必要。漏えい時は隔離式。",
  },
  {
    name: "ホルムアルデヒド",
    aliases: ["formaldehyde", "ホルマリン", "formalin", "50-00-0"],
    hazards: ["発がん性", "刺激性", "アレルギー性"],
    recommendedCategories: ["gas-mask", "gloves", "goggles", "protective-clothing"],
    gasMaskAbsorber: "有機ガス",
    rationale: "発がん性物質（特化則第2類）。有機ガス＋ホルムアルデヒド対応吸収缶＋密閉ゴーグル。",
  },
  {
    name: "ジクロロメタン",
    aliases: ["dichloromethane", "塩化メチレン", "methylene chloride", "75-09-2"],
    hazards: ["発がん性", "中枢神経毒性", "有機溶剤"],
    recommendedCategories: ["gas-mask", "gloves", "goggles"],
    gasMaskAbsorber: "有機ガス",
    rationale: "発がん性（特化則特別有機溶剤）。有機ガス防毒マスク＋耐溶剤手袋。短時間でも防護必須。",
  },
  {
    name: "アセトン",
    aliases: ["acetone", "67-64-1"],
    hazards: ["引火性", "刺激性", "有機溶剤"],
    recommendedCategories: ["gas-mask", "gloves", "goggles"],
    gasMaskAbsorber: "有機ガス",
    rationale: "強い引火性液体。有機ガス防毒マスク＋耐溶剤手袋（ニトリル等）。",
  },
  {
    name: "テトラヒドロフラン",
    aliases: ["tetrahydrofuran", "THF", "109-99-9"],
    hazards: ["引火性", "刺激性", "有機溶剤", "過酸化物生成"],
    recommendedCategories: ["gas-mask", "gloves", "goggles"],
    gasMaskAbsorber: "有機ガス",
    rationale: "引火性・過酸化物生成リスク。有機ガス防毒マスク＋耐溶剤手袋＋密閉ゴーグル。",
  },
  {
    name: "酢酸エチル",
    aliases: ["ethyl acetate", "141-78-6"],
    hazards: ["引火性", "刺激性", "有機溶剤"],
    recommendedCategories: ["gas-mask", "gloves", "goggles"],
    gasMaskAbsorber: "有機ガス",
    rationale: "引火性液体（有機則第2種）。有機ガス防毒マスク＋耐溶剤手袋。",
  },
  {
    name: "シクロヘキサン",
    aliases: ["cyclohexane", "110-82-7"],
    hazards: ["引火性", "中枢神経毒性", "有機溶剤"],
    recommendedCategories: ["gas-mask", "gloves", "goggles"],
    gasMaskAbsorber: "有機ガス",
    rationale: "強い引火性。有機ガス防毒マスク＋耐溶剤手袋。",
  },
  {
    name: "ノルマルヘキサン",
    aliases: ["n-hexane", "ヘキサン", "hexane", "110-54-3"],
    hazards: ["引火性", "末梢神経障害", "有機溶剤"],
    recommendedCategories: ["gas-mask", "gloves", "goggles"],
    gasMaskAbsorber: "有機ガス",
    rationale: "末梢神経障害の原因物質（有機則）。有機ガス防毒マスク＋耐溶剤手袋。",
  },
  {
    name: "エチレングリコール",
    aliases: ["ethylene glycol", "107-21-1"],
    hazards: ["急性毒性", "腎障害"],
    recommendedCategories: ["gloves", "goggles", "protective-clothing"],
    rationale: "経口・経皮で急性毒性。耐薬品手袋＋密閉ゴーグル。蒸気は通常は微量。",
  },
  {
    name: "イソプロピルアルコール",
    aliases: ["isopropyl alcohol", "IPA", "2-propanol", "67-63-0"],
    hazards: ["引火性", "刺激性", "有機溶剤"],
    recommendedCategories: ["gas-mask", "gloves", "goggles"],
    gasMaskAbsorber: "有機ガス",
    rationale: "引火性液体。長時間取扱時は有機ガス防毒マスク＋耐溶剤手袋。",
  },
  {
    name: "過酸化水素",
    aliases: ["hydrogen peroxide", "オキシドール", "7722-84-1"],
    hazards: ["酸化性", "腐食性", "皮膚障害"],
    recommendedCategories: ["gloves", "goggles", "protective-clothing"],
    rationale: "強い酸化性。高濃度では爆発・発火リスク。耐薬品手袋＋密閉ゴーグル＋耐薬品保護衣。",
  },
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[（(].*?[)）]/g, "")
    .replace(/[、,／/]/g, "");
}

/**
 * 物質名（日本語名・英名・別名・CAS）から保護具プロファイルを引く。
 * 部分一致と正規化マッチで取得し、見つからなければ undefined。
 */
export function findChemicalEquipmentProfile(query: string): ChemicalEquipmentProfile | undefined {
  if (!query) return undefined;
  const q = normalize(query);
  if (!q) return undefined;
  // 完全一致 → 部分一致 の順で探す
  for (const p of PROFILES) {
    if (normalize(p.name) === q) return p;
    for (const a of p.aliases) {
      if (normalize(a) === q) return p;
    }
  }
  for (const p of PROFILES) {
    if (normalize(p.name).includes(q) || q.includes(normalize(p.name))) return p;
    for (const a of p.aliases) {
      const na = normalize(a);
      if (na && (na.includes(q) || q.includes(na))) return p;
    }
  }
  return undefined;
}

export function getAllChemicalProfiles(): ChemicalEquipmentProfile[] {
  return PROFILES;
}
