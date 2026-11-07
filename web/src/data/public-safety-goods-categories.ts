export type PublicSafetyGoodsCategory = {
  id: string;
  name: string;
  group: "ppe" | "support";
  keywords?: string;
  searchQuery: string;
  icon: string;
  image: string;
  selectionPrompt: string;
};

export const PUBLIC_GOODS_RATING_DISCLOSURE = {
  sourceLabel: "楽天市場商品検索API",
  sourceUrl: "https://webservice.rakuten.co.jp/documentation/ichiba-item-search",
  checkedAt: "2026-09-23",
  ratingDisplayRequiresApi: true,
  note: "公式APIで実画像・購入者評価・レビュー件数を取得できた商品のみサイト内に表示し、最新情報と安全規格の適合は販売ページと一次資料で確認する。",
} as const;

/**
 * 特定SKUの仕様・規格適合・価格を含まない、購入サイト検索用のカテゴリだけを公開する。
 * 選定可否は作業条件と一次資料を確認できる別工程で判断し、この一覧から推定しない。
 */
export const PUBLIC_SAFETY_GOODS_CATEGORIES: readonly PublicSafetyGoodsCategory[] =
  [
    {
      id: "fall-protection",
      name: "墜落制止用器具",
      group: "ppe",
      keywords: "フルハーネス 安全帯 高所",
      searchQuery: "墜落制止用器具 フルハーネス",
      icon: "🪢",
      image: "/safety-images/library/previews/full-body-harness-required.webp",
      selectionPrompt: "作業高さ・落下距離・取付設備・使用可能質量を確認",
    },
    {
      id: "fall-accessories",
      name: "親綱・安全ブロック・取付設備",
      group: "support",
      searchQuery: "親綱 安全ブロック 墜落防止",
      icon: "🧗",
      image: "/safety-images/library/previews/fall-restraint-required.webp",
      selectionPrompt: "器具だけでなく取付点・親綱・移動範囲を一体で確認",
    },
    {
      id: "respiratory",
      name: "呼吸用保護具",
      group: "ppe",
      keywords: "防じん 防塵マスク 防毒マスク 粉じん ガス 研削 塗装",
      searchQuery: "呼吸用保護具 防じん 防毒",
      icon: "😷",
      image:
        "/safety-images/library/previews/respiratory-protection-required.webp",
      selectionPrompt: "有害物質・濃度・酸素濃度・吸収缶の対象物質を確認",
    },
    {
      id: "head-protection",
      name: "保護帽",
      group: "ppe",
      keywords: "ヘルメット",
      searchQuery: "産業用 保護帽 墜落時保護",
      icon: "⛑️",
      image: "/safety-images/library/previews/helmet-required.webp",
      selectionPrompt: "飛来落下・墜落時保護・電気作業など使用区分を確認",
    },
    {
      id: "eye-face-protection",
      name: "目・顔面の保護具",
      group: "ppe",
      keywords: "保護メガネ ゴーグル フェイスシールド 研削 切断",
      searchQuery: "保護めがね フェイスシールド 作業用",
      icon: "🥽",
      image: "/safety-images/library/previews/goggles-required.webp",
      selectionPrompt: "飛来物・粉じん・薬液・光線と、他の保護具との干渉を確認",
    },
    {
      id: "hearing",
      name: "聴覚保護具",
      group: "ppe",
      keywords: "耳栓 耳せん イヤーマフ 耳当て 騒音",
      searchQuery: "耳栓 イヤーマフ 騒音 作業用",
      icon: "🎧",
      image: "/safety-images/library/previews/earplugs-required.webp",
      selectionPrompt: "騒音ばく露・必要遮音量・会話や警報の聞こえ方を確認",
    },
    {
      id: "chemical-gloves",
      name: "化学防護手袋",
      group: "ppe",
      keywords: "保護手袋 耐薬品 手袋 グローブ",
      searchQuery: "化学防護手袋 耐透過",
      icon: "🧤",
      image: "/safety-images/library/previews/protective-gloves-required.webp",
      selectionPrompt: "SDSと耐透過・劣化・浸透データ、使用時間を確認",
    },
    {
      id: "chemical-clothing",
      name: "化学防護服",
      group: "ppe",
      keywords: "防護服 防護衣 エプロン つなぎ",
      searchQuery: "化学防護服 作業用",
      icon: "🥼",
      image: "/safety-images/library/previews/protective-clothing-required.webp",
      selectionPrompt: "SDSの皮膚ばく露条件と素材の耐透過性、縫い目、脱衣方法を確認",
    },
    {
      id: "safety-footwear",
      name: "安全靴・作業靴",
      group: "ppe",
      keywords: "長靴 滑り 耐滑 踏抜き 先芯",
      searchQuery: "安全靴 耐滑 踏抜き 作業用",
      icon: "🥾",
      image: "/safety-images/library/previews/safety-shoes-required.webp",
      selectionPrompt: "つま先保護・耐滑・踏抜き・静電気・足への適合を確認",
    },
    {
      id: "gas-detectors",
      name: "ガス検知器・酸素濃度計",
      group: "support",
      searchQuery: "酸素濃度計 ガス検知器 校正",
      icon: "📟",
      image: "/safety-images/library/previews/oxygen-deficiency-hazard.webp",
      selectionPrompt: "測定対象・警報値・校正・センサー寿命・測定位置を確認",
    },
    {
      id: "environment-meters",
      name: "騒音・照度・温湿度の測定器",
      group: "support",
      searchQuery: "騒音計 照度計 温湿度計 作業環境",
      icon: "📏",
      image: "/safety-images/library/previews/wbgt-display.webp",
      selectionPrompt: "測定目的、必要精度、校正、記録方法を確認",
    },
    {
      id: "heat-cold",
      name: "暑熱・寒冷対策用品",
      group: "support",
      searchQuery: "作業用 WBGT 暑熱 寒冷 対策",
      icon: "🌡️",
      image: "/safety-images/library/previews/heat-illness-prevention.webp",
      selectionPrompt: "測定・休憩・作業変更を主にし、用品は補助として選ぶ",
    },
    {
      id: "machine-lockout",
      name: "ロックアウト・機械停止表示",
      group: "support",
      searchQuery: "ロックアウト タグアウト 作業用",
      icon: "🔒",
      image: "/safety-images/library/previews/do-not-operate.webp",
      selectionPrompt: "エネルギー源、施錠箇所、復旧手順、責任者を確認",
    },
    {
      id: "harmful-organisms",
      name: "有害生物対策用品",
      group: "support",
      searchQuery: "作業用 蜂 虫 動物 対策",
      icon: "🐝",
      image:
        "/safety-images/library/previews/protective-clothing-required.webp",
      selectionPrompt: "生物種・時期・アレルギー・緊急連絡手順を確認",
    },
    {
      id: "signs-barriers",
      name: "標識・バリケード・区画用品",
      group: "support",
      searchQuery: "作業用 安全標識 バリケード 区画",
      icon: "🚧",
      image: "/safety-images/library/previews/no-entry.webp",
      selectionPrompt: "誰に何を禁止・指示するか、視認距離と設置場所を確認",
    },
    {
      id: "first-aid",
      name: "救急用品・AED周辺備品",
      group: "support",
      searchQuery: "事業場 救急用品 AED 備品",
      icon: "🩹",
      image: "/safety-images/library/previews/first-aid-kit.webp",
      selectionPrompt: "想定傷病・人数・使用期限・補充責任者・搬送手順を確認",
    },
  ] as const;
