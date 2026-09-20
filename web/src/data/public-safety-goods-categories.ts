export type PublicSafetyGoodsCategory = {
  id: string;
  name: string;
  searchQuery: string;
  icon: string;
  selectionPrompt: string;
};

/**
 * 特定SKUの仕様・規格適合・価格を含まない、購入サイト検索用のカテゴリだけを公開する。
 * 選定可否は作業条件と一次資料を確認できる別工程で判断し、この一覧から推定しない。
 */
export const PUBLIC_SAFETY_GOODS_CATEGORIES: readonly PublicSafetyGoodsCategory[] = [
  { id: "fall-protection", name: "墜落制止用器具", searchQuery: "墜落制止用器具 フルハーネス", icon: "🪢", selectionPrompt: "作業高さ・落下距離・取付設備・使用可能質量を確認" },
  { id: "fall-accessories", name: "親綱・安全ブロック・取付設備", searchQuery: "親綱 安全ブロック 墜落防止", icon: "🧗", selectionPrompt: "器具だけでなく取付点・親綱・移動範囲を一体で確認" },
  { id: "respiratory", name: "呼吸用保護具", searchQuery: "呼吸用保護具 防じん 防毒", icon: "😷", selectionPrompt: "有害物質・濃度・酸素濃度・吸収缶の対象物質を確認" },
  { id: "head-protection", name: "保護帽", searchQuery: "産業用 保護帽 墜落時保護", icon: "⛑️", selectionPrompt: "飛来落下・墜落時保護・電気作業など使用区分を確認" },
  { id: "eye-face-protection", name: "目・顔面の保護具", searchQuery: "保護めがね フェイスシールド 作業用", icon: "🥽", selectionPrompt: "飛来物・粉じん・薬液・光線と、他の保護具との干渉を確認" },
  { id: "hearing", name: "聴覚保護具", searchQuery: "耳栓 イヤーマフ 騒音 作業用", icon: "🎧", selectionPrompt: "騒音ばく露・必要遮音量・会話や警報の聞こえ方を確認" },
  { id: "chemical-gloves", name: "化学防護手袋・防護服", searchQuery: "化学防護手袋 防護服 耐透過", icon: "🧤", selectionPrompt: "SDSと耐透過・劣化・浸透データ、使用時間を確認" },
  { id: "safety-footwear", name: "安全靴・作業靴", searchQuery: "安全靴 耐滑 踏抜き 作業用", icon: "🥾", selectionPrompt: "つま先保護・耐滑・踏抜き・静電気・足への適合を確認" },
  { id: "gas-detectors", name: "ガス検知器・酸素濃度計", searchQuery: "酸素濃度計 ガス検知器 校正", icon: "📟", selectionPrompt: "測定対象・警報値・校正・センサー寿命・測定位置を確認" },
  { id: "environment-meters", name: "騒音・照度・温湿度の測定器", searchQuery: "騒音計 照度計 温湿度計 作業環境", icon: "📏", selectionPrompt: "測定目的、必要精度、校正、記録方法を確認" },
  { id: "heat-cold", name: "暑熱・寒冷対策用品", searchQuery: "作業用 WBGT 暑熱 寒冷 対策", icon: "🌡️", selectionPrompt: "測定・休憩・作業変更を主にし、用品は補助として選ぶ" },
  { id: "machine-lockout", name: "ロックアウト・機械停止表示", searchQuery: "ロックアウト タグアウト 作業用", icon: "🔒", selectionPrompt: "エネルギー源、施錠箇所、復旧手順、責任者を確認" },
  { id: "harmful-organisms", name: "有害生物対策用品", searchQuery: "作業用 蜂 虫 動物 対策", icon: "🐝", selectionPrompt: "生物種・時期・アレルギー・緊急連絡手順を確認" },
  { id: "signs-barriers", name: "標識・バリケード・区画用品", searchQuery: "作業用 安全標識 バリケード 区画", icon: "🚧", selectionPrompt: "誰に何を禁止・指示するか、視認距離と設置場所を確認" },
  { id: "first-aid", name: "救急用品・AED周辺備品", searchQuery: "事業場 救急用品 AED 備品", icon: "🩹", selectionPrompt: "想定傷病・人数・使用期限・補充責任者・搬送手順を確認" },
] as const;
