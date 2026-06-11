/**
 * 保護具ピクトグラムの対応表（柱0・ビジュアルファースト）
 *
 * 現場の視覚言語=「青い丸の着用義務標識」（JIS Z 9103 安全色の青=指示 /
 * ISO 7010 M系標識と同じ文法）。保護具カテゴリ・保護具名をこの絵に変換する。
 *
 * - PPE_CATEGORY_ICON: equipment-categories の12カテゴリID → 絵ID（1対1・網羅）
 * - resolvePpeItemIcon: RA結果の保護具名（自由文）→ 絵ID（キーワード解決）
 */

export type PpeIconId =
  | "gas-mask" // 防毒マスク（吸収缶つき）
  | "dust-mask" // 防じんマスク
  | "helmet" // 保護帽
  | "goggles" // 保護メガネ・ゴーグル
  | "ear" // 防音保護具
  | "gloves" // 保護手袋
  | "clothing" // 保護衣・化学防護服
  | "boots" // 安全靴・耐薬品長靴
  | "harness" // フルハーネス
  | "life-jacket" // 救命胴衣
  | "visibility" // 高視認性ベスト
  | "shield"; // その他（汎用）

export const PPE_ICON_LABEL: Record<PpeIconId, string> = {
  "gas-mask": "防毒マスク着用",
  "dust-mask": "防じんマスク着用",
  helmet: "保護帽着用",
  goggles: "保護メガネ着用",
  ear: "防音保護具着用",
  gloves: "保護手袋着用",
  clothing: "保護衣着用",
  boots: "安全靴着用",
  harness: "フルハーネス着用",
  "life-jacket": "救命胴衣着用",
  visibility: "高視認性服着用",
  shield: "保護具着用",
};

/** equipment-categories の12カテゴリID → 絵ID（カード・チップの絵）。 */
export const PPE_CATEGORY_ICON: Record<string, PpeIconId> = {
  harness: "harness",
  "gas-mask": "gas-mask",
  "dust-mask": "dust-mask",
  helmet: "helmet",
  "safety-shoes": "boots",
  goggles: "goggles",
  "ear-protection": "ear",
  gloves: "gloves",
  "protective-clothing": "clothing",
  "life-saving": "life-jacket",
  visibility: "visibility",
  other: "shield",
};

type Rule = { icon: PpeIconId; pattern: RegExp };

// 上から順に評価（より特定的な語を先に）。
const ITEM_RULES: Rule[] = [
  { icon: "gas-mask", pattern: /防毒|吸収缶|送気マスク|空気呼吸器/ },
  { icon: "dust-mask", pattern: /防じん|防塵|電動ファン|N95|DS2|RS2/i },
  { icon: "gas-mask", pattern: /呼吸用保護具|マスク/ },
  { icon: "goggles", pattern: /ゴーグル|保護メガネ|保護めがね|保護眼鏡|フェイスシールド|顔面保護/ },
  { icon: "gloves", pattern: /手袋|グローブ/ },
  { icon: "boots", pattern: /長靴|安全靴|耐薬品靴|靴/ },
  { icon: "clothing", pattern: /保護衣|防護服|化学防護|エプロン|前掛|保護クリーム|腕カバー/ },
  { icon: "helmet", pattern: /ヘルメット|保護帽/ },
  { icon: "ear", pattern: /耳栓|イヤーマフ|防音/ },
  { icon: "harness", pattern: /ハーネス|安全帯|墜落制止/ },
  { icon: "life-jacket", pattern: /救命胴衣|ライフジャケット/ },
  { icon: "visibility", pattern: /高視認|反射ベスト/ },
];

/**
 * 保護具名（RA結果の自由文）から絵IDを解決する。該当なしは undefined
 * （表示側は汎用の shield にフォールバックしてよい）。
 */
export function resolvePpeItemIcon(item: string): PpeIconId | undefined {
  if (!item) return undefined;
  for (const { icon, pattern } of ITEM_RULES) {
    if (pattern.test(item)) return icon;
  }
  return undefined;
}
