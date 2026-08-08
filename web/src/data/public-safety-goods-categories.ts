export type PublicSafetyGoodsCategory = {
  id: string;
  name: string;
  searchQuery: string;
  icon: string;
};

/**
 * 特定SKUの仕様・規格適合・価格を含まない、購入サイト検索用のカテゴリだけを公開する。
 * 選定可否は作業条件と一次資料を確認できる別工程で判断し、この一覧から推定しない。
 */
export const PUBLIC_SAFETY_GOODS_CATEGORIES: readonly PublicSafetyGoodsCategory[] = [
  { id: "fall-protection", name: "墜落制止用器具", searchQuery: "墜落制止用器具", icon: "🪢" },
  { id: "respiratory", name: "呼吸用保護具", searchQuery: "呼吸用保護具", icon: "😷" },
  { id: "head-protection", name: "保護帽", searchQuery: "産業用 保護帽", icon: "⛑️" },
  { id: "eye-ear-protection", name: "目・耳の保護具", searchQuery: "保護めがね 聴覚保護具", icon: "🥽" },
  { id: "hand-foot", name: "手・足の保護具", searchQuery: "保護手袋 安全靴", icon: "🧤" },
  { id: "heat-cold", name: "暑熱・寒冷対策用品", searchQuery: "作業用 暑熱対策 寒冷対策", icon: "🌡️" },
  { id: "harmful-organisms", name: "有害生物対策用品", searchQuery: "作業用 有害生物 対策", icon: "🐝" },
  { id: "signs-barriers", name: "標識・区画用品", searchQuery: "作業用 安全標識 区画", icon: "🚧" },
  { id: "first-aid", name: "救急用品", searchQuery: "事業場 救急用品", icon: "🩹" },
] as const;
