export interface ELearningChoice {
  label: string; // "1"〜"5"
  text: string;
  isCorrect: boolean;
  explanation: string;
}

export interface ELearningQuestion {
  id: string; // 例: "fall-001"
  category: string; // disaster type key
  categoryLabel: string; // 日本語表示名
  questionText: string;
  choices: ELearningChoice[];
  difficulty: "basic" | "intermediate" | "advanced";
}

export interface ELearningCategory {
  key: string;
  label: string;
  icon: string;
  description: string;
}

export const ELEARNING_CATEGORIES: ELearningCategory[] = [
  { key: "fall-height",       label: "墜落・転落",             icon: "🏗️", description: "高所からの墜落・転落事故の防止" },
  { key: "stumble",           label: "転倒",                   icon: "🦶", description: "転倒事故の原因と予防対策" },
  { key: "collision",         label: "激突",                   icon: "🚧", description: "固定物・機械への激突事故防止" },
  { key: "flying-falling",    label: "飛来・落下",             icon: "⚠️", description: "物の飛来・落下による被災防止" },
  { key: "collapse",          label: "崩壊・倒壊",             icon: "🏚️", description: "土砂・構造物の崩壊・倒壊防止" },
  { key: "struck-by",         label: "激突され",               icon: "🔄", description: "動く機械・荷物への激突防止" },
  { key: "caught-in",         label: "はさまれ・巻き込まれ",  icon: "⚙️", description: "機械の回転部などへの巻き込まれ防止" },
  { key: "cut-abrasion",      label: "切れ・こすれ",           icon: "✂️", description: "刃物・鋭利物による切れ・こすれ防止" },
  { key: "stepping-through",  label: "踏み抜き",               icon: "🪜", description: "屋根・床板などの踏み抜き事故防止" },
  { key: "drowning",          label: "おぼれ",                 icon: "🌊", description: "水辺・水中作業での溺水防止" },
  { key: "heat-cold-contact", label: "高温・低温物との接触",   icon: "🔥", description: "高温・低温物に触れることによる熱傷等の防止" },
  { key: "harmful-substance", label: "有害物等との接触",       icon: "☣️", description: "有害化学物質・粉じん等への曝露防止" },
  { key: "electrocution",     label: "感電",                   icon: "⚡", description: "電気による感電事故の防止" },
  { key: "explosion",         label: "爆発",                   icon: "💥", description: "爆発事故の原因と予防対策" },
  { key: "rupture",           label: "破裂",                   icon: "🫧", description: "圧力容器・配管の破裂事故防止" },
  { key: "fire",              label: "火災",                   icon: "🧯", description: "職場における火災の予防と初期対応" },
  { key: "traffic-road",      label: "交通事故（道路）",       icon: "🚗", description: "道路における交通事故の防止" },
  { key: "traffic-other",     label: "交通事故（その他）",     icon: "🚜", description: "構内・鉄道等の交通事故防止" },
  { key: "overexertion",      label: "動作の反動・無理な動作", icon: "💪", description: "腰痛・筋骨格系障害の予防" },
  { key: "other",             label: "その他の災害",           icon: "🌡️", description: "熱中症・騒音・その他の労働災害防止" },
];
