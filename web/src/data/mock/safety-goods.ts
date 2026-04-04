export type SafetyGoodsCategory = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

export type SafetyGoodsItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: string;
  imageAlt: string;
  amazonUrl: string;
  rakutenUrl: string;
  tags: string[];
};

export const safetyGoodsCategories: SafetyGoodsCategory[] = [
  {
    id: "fall-protection",
    name: "墜落制止用器具",
    description: "フルハーネス・安全帯・ランヤード・親綱など、高所作業に必須の墜落防止器具。2019年の法改正で6.75m超はフルハーネス型が原則義務化。",
    icon: "🪢",
  },
  {
    id: "respiratory",
    name: "防塵・防毒マスク",
    description: "粉塵・溶接ヒューム・有機溶剤対策に。DS2規格の使い捨てマスクから電動ファン付き呼吸用保護具（PAPR）まで。",
    icon: "😷",
  },
  {
    id: "head-protection",
    name: "保護帽・ヘルメット",
    description: "飛来落下物・墜落時保護兼用の産業用ヘルメット。通気性・軽量性・内装の快適性で現場の着用率を維持。",
    icon: "⛑️",
  },
  {
    id: "mountain-outdoor",
    name: "山岳グッズ",
    description: "林業・法面作業・測量など山間部作業向け。クライミングハーネス・スパイク・ヘッドランプ・登山用ロープなど。",
    icon: "🏔️",
  },
  {
    id: "harmful-organisms",
    name: "有害生物対策",
    description: "スズメバチ・マダニ・ヘビ・ヒル対策。防虫ネット・殺虫剤・ポイズンリムーバー・防蜂服など。",
    icon: "🐝",
  },
  {
    id: "heat-cold",
    name: "暑さ・寒さ対策",
    description: "熱中症予防の空調服・冷却ベスト・WBGT計から、防寒作業服・使い捨てカイロ・防寒手袋まで。",
    icon: "🌡️",
  },
  {
    id: "eye-ear-protection",
    name: "目・耳の保護具",
    description: "保護メガネ・ゴーグル・フェイスシールド・耳栓・イヤーマフ。溶接遮光・粉塵・騒音対策に。",
    icon: "🥽",
  },
  {
    id: "hand-foot",
    name: "手・足の保護",
    description: "切創防止手袋・耐油手袋・安全靴・踏み抜き防止インソール。作業内容に合わせた適切な選定が重要。",
    icon: "🧤",
  },
  {
    id: "first-aid",
    name: "救急・応急処置",
    description: "現場常備の救急箱・AED・担架・三角巾・止血帯。労働安全衛生規則で義務付けられる備品を網羅。",
    icon: "🩹",
  },
  {
    id: "signs-barriers",
    name: "標識・バリケード",
    description: "安全標識・カラーコーン・バリケードテープ・LED回転灯。第三者侵入防止と作業区画の明示に。",
    icon: "🚧",
  },
];

export const safetyGoodsItems: SafetyGoodsItem[] = [
  // 墜落制止用器具
  {
    id: "fg-001",
    categoryId: "fall-protection",
    name: "フルハーネス型墜落制止用器具セット",
    description: "新規格適合のフルハーネス + ショックアブソーバ付きランヤードのセット。胴ベルト不要で軽量設計。特別教育修了者向け。",
    price: "¥15,000〜¥25,000",
    imageAlt: "フルハーネスセットの製品イメージ",
    amazonUrl: "https://www.amazon.co.jp/s?k=%E3%83%95%E3%83%AB%E3%83%8F%E3%83%BC%E3%83%8D%E3%82%B9+%E5%A2%9C%E8%90%BD%E5%88%B6%E6%AD%A2",
    rakutenUrl: "https://search.rakuten.co.jp/search/mall/%E3%83%95%E3%83%AB%E3%83%8F%E3%83%BC%E3%83%8D%E3%82%B9+%E5%A2%9C%E8%90%BD%E5%88%B6%E6%AD%A2/",
    tags: ["新規格適合", "6.75m超必須"],
  },
  {
    id: "fg-002",
    categoryId: "fall-protection",
    name: "ダブルランヤード（ショックアブソーバ付）",
    description: "常時接続を維持できるダブルフック方式。移動時もどちらかが必ず接続状態を保ちます。",
    price: "¥8,000〜¥15,000",
    imageAlt: "ダブルランヤードの製品イメージ",
    amazonUrl: "https://www.amazon.co.jp/s?k=%E3%83%80%E3%83%96%E3%83%AB%E3%83%A9%E3%83%B3%E3%83%A4%E3%83%BC%E3%83%89",
    rakutenUrl: "https://search.rakuten.co.jp/search/mall/%E3%83%80%E3%83%96%E3%83%AB%E3%83%A9%E3%83%B3%E3%83%A4%E3%83%BC%E3%83%89/",
    tags: ["常時接続", "移動時安全"],
  },
  {
    id: "fg-003",
    categoryId: "fall-protection",
    name: "親綱・水平ライフライン設置キット",
    description: "屋根作業・鉄骨作業の移動範囲全体に安全な接続点を確保。支柱・親綱・緊張器のセット。",
    price: "¥20,000〜¥50,000",
    imageAlt: "親綱設置キットの製品イメージ",
    amazonUrl: "https://www.amazon.co.jp/s?k=%E8%A6%AA%E7%B6%B1+%E6%B0%B4%E5%B9%B3%E3%83%A9%E3%82%A4%E3%83%95%E3%83%A9%E3%82%A4%E3%83%B3",
    rakutenUrl: "https://search.rakuten.co.jp/search/mall/%E8%A6%AA%E7%B6%B1+%E6%B0%B4%E5%B9%B3%E3%83%A9%E3%82%A4%E3%83%95%E3%83%A9%E3%82%A4%E3%83%B3/",
    tags: ["屋根作業", "鉄骨作業"],
  },
  // 防塵・防毒マスク
  {
    id: "rm-001",
    categoryId: "respiratory",
    name: "DS2防塵マスク（使い捨て・20枚入）",
    description: "溶接ヒューム・粉塵・アスベスト除去作業対応のDS2規格マスク。排気弁付きで息苦しさを軽減。",
    price: "¥2,500〜¥4,000",
    imageAlt: "DS2防塵マスクの製品イメージ",
    amazonUrl: "https://www.amazon.co.jp/s?k=DS2+%E9%98%B2%E5%A1%B5%E3%83%9E%E3%82%B9%E3%82%AF",
    rakutenUrl: "https://search.rakuten.co.jp/search/mall/DS2+%E9%98%B2%E5%A1%B5%E3%83%9E%E3%82%B9%E3%82%AF/",
    tags: ["DS2規格", "溶接ヒューム"],
  },
  {
    id: "rm-002",
    categoryId: "respiratory",
    name: "防毒マスク（直結式小型・有機ガス用）",
    description: "塗装作業・有機溶剤取扱いに。吸収缶交換式で繰り返し使用可能。JIS T 8152適合。",
    price: "¥3,000〜¥6,000",
    imageAlt: "防毒マスクの製品イメージ",
    amazonUrl: "https://www.amazon.co.jp/s?k=%E9%98%B2%E6%AF%92%E3%83%9E%E3%82%B9%E3%82%AF+%E6%9C%89%E6%A9%9F%E3%82%AC%E3%82%B9",
    rakutenUrl: "https://search.rakuten.co.jp/search/mall/%E9%98%B2%E6%AF%92%E3%83%9E%E3%82%B9%E3%82%AF+%E6%9C%89%E6%A9%9F%E3%82%AC%E3%82%B9/",
    tags: ["塗装作業", "有機溶剤"],
  },
  {
    id: "rm-003",
    categoryId: "respiratory",
    name: "電動ファン付き呼吸用保護具（PAPR）",
    description: "電動ファンで給気し、長時間作業でも負担が少ない。溶接・解体・トンネル工事に最適。",
    price: "¥30,000〜¥80,000",
    imageAlt: "電動ファン付き呼吸用保護具の製品イメージ",
    amazonUrl: "https://www.amazon.co.jp/s?k=%E9%9B%BB%E5%8B%95%E3%83%95%E3%82%A1%E3%83%B3%E4%BB%98%E3%81%8D+%E5%91%BC%E5%90%B8%E7%94%A8%E4%BF%9D%E8%AD%B7%E5%85%B7",
    rakutenUrl: "https://search.rakuten.co.jp/search/mall/%E9%9B%BB%E5%8B%95%E3%83%95%E3%82%A1%E3%83%B3%E4%BB%98%E3%81%8D+%E5%91%BC%E5%90%B8%E7%94%A8%E4%BF%9D%E8%AD%B7%E5%85%B7/",
    tags: ["PAPR", "長時間作業"],
  },
  // 保護帽・ヘルメット
  {
    id: "hp-001",
    categoryId: "head-protection",
    name: "飛来・墜落兼用 産業用ヘルメット（通気孔付き）",
    description: "ABS樹脂製・軽量280g。通気孔付きで夏場も蒸れにくい。内装は洗えるライナー。",
    price: "¥2,500〜¥5,000",
    imageAlt: "産業用ヘルメットの製品イメージ",
    amazonUrl: "https://www.amazon.co.jp/s?k=%E7%94%A3%E6%A5%AD%E7%94%A8+%E3%83%98%E3%83%AB%E3%83%A1%E3%83%83%E3%83%88+%E9%80%9A%E6%B0%97",
    rakutenUrl: "https://search.rakuten.co.jp/search/mall/%E7%94%A3%E6%A5%AD%E7%94%A8+%E3%83%98%E3%83%AB%E3%83%A1%E3%83%83%E3%83%88+%E9%80%9A%E6%B0%97/",
    tags: ["軽量", "通気性"],
  },
  // 山岳グッズ
  {
    id: "mt-001",
    categoryId: "mountain-outdoor",
    name: "産業用クライミングハーネス",
    description: "林業・法面作業・高所点検向けのシットハーネス。ギアループ付きで工具類を携帯可能。",
    price: "¥12,000〜¥25,000",
    imageAlt: "クライミングハーネスの製品イメージ",
    amazonUrl: "https://www.amazon.co.jp/s?k=%E7%94%A3%E6%A5%AD%E7%94%A8+%E3%82%AF%E3%83%A9%E3%82%A4%E3%83%9F%E3%83%B3%E3%82%B0%E3%83%8F%E3%83%BC%E3%83%8D%E3%82%B9",
    rakutenUrl: "https://search.rakuten.co.jp/search/mall/%E7%94%A3%E6%A5%AD%E7%94%A8+%E3%82%AF%E3%83%A9%E3%82%A4%E3%83%9F%E3%83%B3%E3%82%B0%E3%83%8F%E3%83%BC%E3%83%8D%E3%82%B9/",
    tags: ["林業", "法面作業"],
  },
  {
    id: "mt-002",
    categoryId: "mountain-outdoor",
    name: "LEDヘッドランプ（充電式・防水IP68）",
    description: "トンネル・暗所作業に。1000ルーメン・ワイド/スポット切替。USB-C充電で8時間持続。",
    price: "¥3,000〜¥8,000",
    imageAlt: "LEDヘッドランプの製品イメージ",
    amazonUrl: "https://www.amazon.co.jp/s?k=LED+%E3%83%98%E3%83%83%E3%83%89%E3%83%A9%E3%83%B3%E3%83%97+%E5%85%85%E9%9B%BB%E5%BC%8F+%E9%98%B2%E6%B0%B4",
    rakutenUrl: "https://search.rakuten.co.jp/search/mall/LED+%E3%83%98%E3%83%83%E3%83%89%E3%83%A9%E3%83%B3%E3%83%97+%E5%85%85%E9%9B%BB%E5%BC%8F+%E9%98%B2%E6%B0%B4/",
    tags: ["充電式", "防水IP68"],
  },
  // 有害生物対策
  {
    id: "ho-001",
    categoryId: "harmful-organisms",
    name: "防蜂ネット付きヘルメットカバー",
    description: "スズメバチ・アシナガバチ対策。既存ヘルメットに装着可能な防蜂ネット。林業・造園作業に必須。",
    price: "¥1,500〜¥3,500",
    imageAlt: "防蜂ネットの製品イメージ",
    amazonUrl: "https://www.amazon.co.jp/s?k=%E9%98%B2%E8%9C%82%E3%83%8D%E3%83%83%E3%83%88+%E3%83%98%E3%83%AB%E3%83%A1%E3%83%83%E3%83%88",
    rakutenUrl: "https://search.rakuten.co.jp/search/mall/%E9%98%B2%E8%9C%82%E3%83%8D%E3%83%83%E3%83%88+%E3%83%98%E3%83%AB%E3%83%A1%E3%83%83%E3%83%88/",
    tags: ["スズメバチ", "造園作業"],
  },
  {
    id: "ho-002",
    categoryId: "harmful-organisms",
    name: "ポイズンリムーバー（応急処置用吸引器）",
    description: "蜂・蛇・蜘蛛の刺咬傷に。ポンプ式で毒液を吸引。救急箱に1つは常備したい必須アイテム。",
    price: "¥1,000〜¥2,000",
    imageAlt: "ポイズンリムーバーの製品イメージ",
    amazonUrl: "https://www.amazon.co.jp/s?k=%E3%83%9D%E3%82%A4%E3%82%BA%E3%83%B3%E3%83%AA%E3%83%A0%E3%83%BC%E3%83%90%E3%83%BC",
    rakutenUrl: "https://search.rakuten.co.jp/search/mall/%E3%83%9D%E3%82%A4%E3%82%BA%E3%83%B3%E3%83%AA%E3%83%A0%E3%83%BC%E3%83%90%E3%83%BC/",
    tags: ["蜂刺され", "救急箱"],
  },
  {
    id: "ho-003",
    categoryId: "harmful-organisms",
    name: "マダニ忌避スプレー（ディート30%）",
    description: "山林作業・草刈り前に衣服と露出肌に噴霧。ディート30%で8時間持続。厚労省認可の医薬品。",
    price: "¥800〜¥1,500",
    imageAlt: "マダニ忌避スプレーの製品イメージ",
    amazonUrl: "https://www.amazon.co.jp/s?k=%E3%83%9E%E3%83%80%E3%83%8B+%E5%BF%8C%E9%81%BF+%E3%82%B9%E3%83%97%E3%83%AC%E3%83%BC+%E3%83%87%E3%82%A3%E3%83%BC%E3%83%88",
    rakutenUrl: "https://search.rakuten.co.jp/search/mall/%E3%83%9E%E3%83%80%E3%83%8B+%E5%BF%8C%E9%81%BF+%E3%82%B9%E3%83%97%E3%83%AC%E3%83%BC/",
    tags: ["山林作業", "8時間持続"],
  },
  // 暑さ・寒さ対策
  {
    id: "hc-001",
    categoryId: "heat-cold",
    name: "空調服（ファン付き作業服・バッテリーセット）",
    description: "ファンで外気を取り込み汗を気化冷却。WBGT高い日の屋外作業に。バッテリーで8時間駆動。",
    price: "¥10,000〜¥25,000",
    imageAlt: "空調服の製品イメージ",
    amazonUrl: "https://www.amazon.co.jp/s?k=%E7%A9%BA%E8%AA%BF%E6%9C%8D+%E3%83%95%E3%82%A1%E3%83%B3%E4%BB%98%E3%81%8D+%E3%83%90%E3%83%83%E3%83%86%E3%83%AA%E3%83%BC%E3%82%BB%E3%83%83%E3%83%88",
    rakutenUrl: "https://search.rakuten.co.jp/search/mall/%E7%A9%BA%E8%AA%BF%E6%9C%8D+%E3%83%95%E3%82%A1%E3%83%B3%E4%BB%98%E3%81%8D+%E3%83%90%E3%83%83%E3%83%86%E3%83%AA%E3%83%BC%E3%82%BB%E3%83%83%E3%83%88/",
    tags: ["熱中症予防", "屋外作業"],
  },
  // 目・耳の保護具
  {
    id: "ee-001",
    categoryId: "eye-ear-protection",
    name: "保護メガネ（曇り止め・UVカット）",
    description: "ポリカーボネートレンズで飛来物・粉塵から目を保護。曇り止めコートで作業中もクリアな視界。",
    price: "¥800〜¥2,500",
    imageAlt: "保護メガネの製品イメージ",
    amazonUrl: "https://www.amazon.co.jp/s?k=%E4%BF%9D%E8%AD%B7%E3%83%A1%E3%82%AC%E3%83%8D+%E6%9B%87%E3%82%8A%E6%AD%A2%E3%82%81",
    rakutenUrl: "https://search.rakuten.co.jp/search/mall/%E4%BF%9D%E8%AD%B7%E3%83%A1%E3%82%AC%E3%83%8D+%E6%9B%87%E3%82%8A%E6%AD%A2%E3%82%81/",
    tags: ["曇り止め", "UVカット"],
  },
  // 手・足の保護
  {
    id: "hf-001",
    categoryId: "hand-foot",
    name: "耐切創手袋（レベル5・EN388）",
    description: "ガラス・金属板の取扱いに。ニトリルコーティングでグリップ力も確保。洗って繰り返し使用可能。",
    price: "¥800〜¥2,000",
    imageAlt: "耐切創手袋の製品イメージ",
    amazonUrl: "https://www.amazon.co.jp/s?k=%E8%80%90%E5%88%87%E5%89%B5%E6%89%8B%E8%A2%8B+%E3%83%AC%E3%83%99%E3%83%AB5",
    rakutenUrl: "https://search.rakuten.co.jp/search/mall/%E8%80%90%E5%88%87%E5%89%B5%E6%89%8B%E8%A2%8B+%E3%83%AC%E3%83%99%E3%83%AB5/",
    tags: ["切創防止", "ニトリル"],
  },
  {
    id: "hf-002",
    categoryId: "hand-foot",
    name: "安全靴（JSAA A種・耐油・軽量）",
    description: "先芯入りで足先を保護。耐油底で油まみれの現場でも滑りにくい。スニーカータイプで軽量。",
    price: "¥4,000〜¥10,000",
    imageAlt: "安全靴の製品イメージ",
    amazonUrl: "https://www.amazon.co.jp/s?k=%E5%AE%89%E5%85%A8%E9%9D%B4+JSAA+A%E7%A8%AE+%E8%BB%BD%E9%87%8F",
    rakutenUrl: "https://search.rakuten.co.jp/search/mall/%E5%AE%89%E5%85%A8%E9%9D%B4+JSAA+A%E7%A8%AE+%E8%BB%BD%E9%87%8F/",
    tags: ["JSAA A種", "耐油底"],
  },
  // 救急・応急処置
  {
    id: "fa-001",
    categoryId: "first-aid",
    name: "現場用救急箱（50人用・労安則対応）",
    description: "労働安全衛生規則に基づく備品を網羅したセット。包帯・消毒液・三角巾・ピンセット・はさみ等。",
    price: "¥5,000〜¥12,000",
    imageAlt: "現場用救急箱の製品イメージ",
    amazonUrl: "https://www.amazon.co.jp/s?k=%E7%8F%BE%E5%A0%B4%E7%94%A8+%E6%95%91%E6%80%A5%E7%AE%B1+%E5%8A%B4%E5%AE%89%E5%89%87",
    rakutenUrl: "https://search.rakuten.co.jp/search/mall/%E7%8F%BE%E5%A0%B4%E7%94%A8+%E6%95%91%E6%80%A5%E7%AE%B1+%E5%8A%B4%E5%AE%89%E5%89%87/",
    tags: ["50人用", "労安則対応"],
  },
  // 標識・バリケード
  {
    id: "sb-001",
    categoryId: "signs-barriers",
    name: "LED矢印板（ソーラー充電・折りたたみ式）",
    description: "道路工事・現場誘導に。ソーラー充電で電源不要。折りたたみ式で持ち運びに便利。",
    price: "¥15,000〜¥30,000",
    imageAlt: "LED矢印板の製品イメージ",
    amazonUrl: "https://www.amazon.co.jp/s?k=LED+%E7%9F%A2%E5%8D%B0%E6%9D%BF+%E3%82%BD%E3%83%BC%E3%83%A9%E3%83%BC",
    rakutenUrl: "https://search.rakuten.co.jp/search/mall/LED+%E7%9F%A2%E5%8D%B0%E6%9D%BF+%E3%82%BD%E3%83%BC%E3%83%A9%E3%83%BC/",
    tags: ["ソーラー充電", "折りたたみ"],
  },
];
