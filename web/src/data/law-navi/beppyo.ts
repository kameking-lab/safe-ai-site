/**
 * 別表の意味インデックス（通し番号 →「何の表か」の逆引き）。
 *
 * e-Gov では安衛令の別表は番号でしか辿れず、「別表第3が特定化学物質の表」という
 * 意味の索引が無い。ここでは主要別表に意味（name/summary）とコーパス実在の
 * 定義条文への参照を持たせ、横断検索（「別表第3」「特化物 別表」「有機溶剤 別表」）
 * から /law-navi/beppyo#id へ着地させる。
 *
 * 正確性の方針:
 * - name/summary は e-Gov 掲載の現行安衛令の別表題名に基づく要旨（2026-07-11 レビュー）。
 *   本文の転記はしない（別表本文は膨大＝原文は e-Gov リンクで確認する建て付け）。
 * - relatedArticles は curated コーパス実在の条文のみ（beppyo-integrity テストで機械固定）。
 * - egovUrl は LAW_METADATA の egovLawId から法令トップへ。別表個別アンカーは e-Gov 新UIで
 *   安定形が確認できるまで張らない（幽霊アンカー 0 の既存方針）。
 */

export type BeppyoRelatedArticle = {
  readonly lawShort: string;
  readonly articleNum: string;
};

export type BeppyoEntry = {
  /** アンカーID（/law-navi/beppyo#id） */
  readonly id: string;
  /** 別表が属する法令の略称（例: 安衛令） */
  readonly lawShort: string;
  /** 表示ラベル（例: 別表第3） */
  readonly label: string;
  /** 意味（何の表か。例: 特定化学物質） */
  readonly name: string;
  /** 1〜2文の要旨 */
  readonly summary: string;
  /** 定義・根拠となるコーパス実在条文 */
  readonly relatedArticles: readonly BeppyoRelatedArticle[];
  /** 関連トピック（topics.ts の id） */
  readonly relatedTopicIds: readonly string[];
  /** 検索用キーワード（正式名・俗称・略称） */
  readonly keywords: readonly string[];
};

export const BEPPYO_ENTRIES: readonly BeppyoEntry[] = [
  {
    id: "anei-rei-beppyo-1",
    lawShort: "安衛令",
    label: "別表第1",
    name: "危険物",
    summary:
      "爆発性の物・発火性の物・酸化性の物・引火性の物・可燃性のガスなど、製造・取扱いに危険を伴う物の区分を定める表。",
    relatedArticles: [{ lawShort: "安衛則", articleNum: "第256条" }],
    relatedTopicIds: [],
    keywords: ["危険物", "爆発性", "発火性", "酸化性", "引火性", "可燃性ガス"],
  },
  {
    id: "anei-rei-beppyo-2",
    lawShort: "安衛令",
    label: "別表第2",
    name: "放射線業務",
    summary: "電離放射線障害防止規則の適用対象となる放射線業務を列挙する表。",
    relatedArticles: [{ lawShort: "電離則", articleNum: "第2条" }],
    relatedTopicIds: [],
    keywords: ["放射線業務", "電離放射線", "エックス線", "X線", "ガンマ線"],
  },
  {
    id: "anei-rei-beppyo-3",
    lawShort: "安衛令",
    label: "別表第3",
    name: "特定化学物質",
    summary:
      "特定化学物質障害予防規則（特化則）の対象物質を第1類（許可物質）・第2類・第3類に区分して列挙する表。",
    relatedArticles: [
      { lawShort: "特化則", articleNum: "第2条" },
      { lawShort: "安衛法", articleNum: "第57条" },
    ],
    relatedTopicIds: ["tokka"],
    keywords: ["特定化学物質", "特化物", "特化則", "第1類物質", "第2類物質", "第3類物質", "許可物質"],
  },
  {
    id: "anei-rei-beppyo-4",
    lawShort: "安衛令",
    label: "別表第4",
    name: "鉛業務",
    summary: "鉛中毒予防規則（鉛則）の適用対象となる鉛業務を列挙する表。",
    relatedArticles: [{ lawShort: "鉛則", articleNum: "第5条" }],
    relatedTopicIds: [],
    keywords: ["鉛業務", "鉛則", "鉛中毒", "鉛製錬", "はんだ"],
  },
  {
    id: "anei-rei-beppyo-5",
    lawShort: "安衛令",
    label: "別表第5",
    name: "四アルキル鉛等業務",
    summary: "四アルキル鉛中毒予防規則の適用対象となる四アルキル鉛等業務を列挙する表。",
    relatedArticles: [{ lawShort: "四アルキル鉛則", articleNum: "第1条" }],
    relatedTopicIds: [],
    keywords: ["四アルキル鉛", "四アルキル鉛等業務", "加鉛ガソリン"],
  },
  {
    id: "anei-rei-beppyo-6",
    lawShort: "安衛令",
    label: "別表第6",
    name: "酸素欠乏危険場所",
    summary:
      "酸素欠乏症等防止規則（酸欠則）の適用対象となる酸素欠乏危険場所（第一種・第二種酸素欠乏危険作業の場所）を列挙する表。",
    relatedArticles: [
      { lawShort: "酸欠則", articleNum: "第2条" },
      { lawShort: "酸欠則", articleNum: "第11条" },
    ],
    relatedTopicIds: ["sanketsu"],
    keywords: ["酸素欠乏危険場所", "酸欠", "酸素欠乏", "硫化水素", "マンホール", "ピット", "タンク内作業"],
  },
  {
    id: "anei-rei-beppyo-6-2",
    lawShort: "安衛令",
    label: "別表第6の2",
    name: "有機溶剤",
    summary:
      "有機溶剤中毒予防規則（有機則）の対象となる有機溶剤を列挙する表。第1種・第2種・第3種の区分は有機則第1条が定める。",
    relatedArticles: [
      { lawShort: "有機則", articleNum: "第1条" },
      { lawShort: "有機則", articleNum: "第35条" },
    ],
    relatedTopicIds: ["yuki-solvent"],
    keywords: ["有機溶剤", "有機則", "トルエン", "キシレン", "アセトン", "シンナー", "第二種有機溶剤"],
  },
  {
    id: "anei-rei-beppyo-7",
    lawShort: "安衛令",
    label: "別表第7",
    name: "建設機械",
    summary:
      "動力を用いて自走できる建設機械（整地・運搬・積込み用、掘削用、基礎工事用、締固め用、コンクリート打設用、解体用）を列挙する表。車両系建設機械の範囲を画する。",
    relatedArticles: [{ lawShort: "安衛則", articleNum: "第164条" }],
    relatedTopicIds: ["kensetsu-kikai"],
    keywords: ["建設機械", "車両系建設機械", "ユンボ", "バックホウ", "ブルドーザー", "パワーショベル", "解体用機械"],
  },
  {
    id: "anei-rei-beppyo-8",
    lawShort: "安衛令",
    label: "別表第8",
    name: "鋼管足場用の部材・附属金具",
    summary: "鋼管足場に用いる部材および附属金具（わく組足場用の主わく・布わく・緊結金具等）を列挙する表。",
    relatedArticles: [],
    relatedTopicIds: ["ashiba"],
    keywords: ["鋼管足場", "足場部材", "緊結金具", "わく組足場", "クランプ"],
  },
  {
    id: "anei-rei-beppyo-9",
    lawShort: "安衛令",
    label: "別表第9",
    name: "名称等を表示・通知すべき危険物及び有害物",
    summary:
      "ラベル表示（安衛法第57条）とSDS交付（第57条の2）の義務対象となる危険物・有害物を列挙する表。裾切値は安衛則別表第2が定める。",
    relatedArticles: [
      { lawShort: "安衛法", articleNum: "第57条" },
      { lawShort: "安衛法", articleNum: "第57条の2" },
    ],
    relatedTopicIds: [],
    keywords: ["表示対象物質", "通知対象物質", "ラベル表示", "SDS", "リスクアセスメント対象物"],
  },
  // ── 安衛則の別表（2026-07-11 全展開。題名・関係条は e-Gov 生JSON 347M50002000032 と突合）
  {
    id: "anei-soku-beppyo-1",
    lawShort: "安衛則",
    label: "別表第1",
    name: "作業主任者の選任（作業区分・資格・名称）",
    summary:
      "作業主任者を選任すべき作業の区分ごとに、必要な資格（免許・技能講習）と作業主任者の名称を定める表（安衛則第16条・第17条関係）。",
    relatedArticles: [
      { lawShort: "安衛法", articleNum: "第14条" },
      { lawShort: "安衛則", articleNum: "第16条" },
    ],
    relatedTopicIds: [],
    keywords: ["作業主任者", "選任", "資格", "技能講習", "免許", "名称"],
  },
  {
    id: "anei-soku-beppyo-2",
    lawShort: "安衛則",
    label: "別表第2",
    name: "名称等を表示・通知すべき危険物及び有害物（裾切値）",
    summary:
      "ラベル表示（安衛法第57条）・SDS交付（第57条の2）の義務対象物と、その裾切値（含有量の下限）を定める表（安衛則第30条・第34条の2関係）。対象物質の一覧は安衛令別表第9とセットで参照する。",
    relatedArticles: [
      { lawShort: "安衛法", articleNum: "第57条" },
      { lawShort: "安衛法", articleNum: "第57条の2" },
    ],
    relatedTopicIds: [],
    keywords: ["裾切値", "SDS", "ラベル表示", "通知対象物", "表示対象物", "リスクアセスメント対象物", "含有量"],
  },
  {
    id: "anei-soku-beppyo-3",
    lawShort: "安衛則",
    label: "別表第3",
    name: "就業制限業務の資格",
    summary:
      "就業制限業務（安衛法第61条・安衛令第20条）ごとに、就くことができる者（免許・技能講習修了者等）を定める表（安衛則第41条関係）。クレーン運転士免許・フォークリフト技能講習等の根拠。",
    relatedArticles: [{ lawShort: "安衛法", articleNum: "第61条" }],
    relatedTopicIds: ["forklift", "crane", "tamagake", "kensetsu-kikai", "kosho-sagyosha"],
    keywords: ["就業制限", "免許", "技能講習", "資格", "運転士", "有資格者"],
  },
  {
    id: "anei-soku-beppyo-4",
    lawShort: "安衛則",
    label: "別表第4",
    name: "免許を受けることができる者",
    summary:
      "免許の種類（クレーン・デリック運転士、衛生管理者等）ごとに、免許を受けることができる者の要件を定める表（安衛則第62条関係）。",
    relatedArticles: [{ lawShort: "安衛法", articleNum: "第61条" }],
    relatedTopicIds: [],
    keywords: ["免許", "免許の種類", "交付要件", "運転士免許", "衛生管理者"],
  },
  {
    id: "anei-soku-beppyo-5",
    lawShort: "安衛則",
    label: "別表第5",
    name: "免許試験（受験資格・試験科目）",
    summary: "免許試験の種類ごとに受験資格・試験科目・科目免除を定める表（安衛則第70条関係）。",
    relatedArticles: [],
    relatedTopicIds: [],
    keywords: ["免許試験", "受験資格", "試験科目", "科目免除"],
  },
  {
    id: "anei-soku-beppyo-6",
    lawShort: "安衛則",
    label: "別表第6",
    name: "技能講習（受講資格・講習科目）",
    summary: "技能講習の区分ごとに受講資格・講習科目を定める表（安衛則第79条関係）。",
    relatedArticles: [],
    relatedTopicIds: [],
    keywords: ["技能講習", "受講資格", "講習科目"],
  },
  {
    id: "anei-soku-beppyo-7",
    lawShort: "安衛則",
    label: "別表第7",
    name: "計画の届出をすべき機械等",
    summary:
      "設置・移転・変更の30日前までに労働基準監督署長へ計画を届け出るべき機械等（安衛法第88条第1項）を定める表（安衛則第85条・第86条関係）。",
    relatedArticles: [
      { lawShort: "安衛法", articleNum: "第88条" },
      { lawShort: "安衛則", articleNum: "第86条" },
    ],
    relatedTopicIds: [],
    keywords: ["計画の届出", "88条申請", "設置届", "機械等", "労働基準監督署"],
  },
  {
    id: "anei-soku-beppyo-8",
    lawShort: "安衛則",
    label: "別表第8",
    name: "（削除）",
    summary:
      "現行の安衛則で別表第8は削除（欠番）。e-Gov 現行原文にも「削除」とだけ記載されている（2026-07-11 突合）。",
    relatedArticles: [],
    relatedTopicIds: [],
    keywords: ["削除", "欠番"],
  },
  {
    id: "anei-soku-beppyo-9",
    lawShort: "安衛則",
    label: "別表第9",
    name: "計画の作成に参画する者の資格",
    summary:
      "大規模建設工事等の計画届（安衛法第88条第4項）の作成に参画する者の資格を、工事・仕事の区分ごとに定める表（安衛則第92条の3関係）。",
    relatedArticles: [{ lawShort: "安衛法", articleNum: "第88条" }],
    relatedTopicIds: [],
    keywords: ["計画作成", "参画者", "資格", "建設工事", "計画届"],
  },
  // ── 粉じん則の別表（題名・関係条は e-Gov 生JSON 354M50002000018 と突合）
  {
    id: "funjin-soku-beppyo-1",
    lawShort: "粉じん則",
    label: "別表第1",
    name: "粉じん作業",
    summary:
      "粉じん障害防止規則の適用対象となる粉じん作業（坑内掘削・研磨・袋詰め等）を列挙する表（粉じん則第2条・第3条関係）。",
    relatedArticles: [{ lawShort: "粉じん則", articleNum: "第2条" }],
    relatedTopicIds: ["funjin"],
    keywords: ["粉じん作業", "粉じん則", "坑内", "研磨", "ずい道"],
  },
  {
    id: "funjin-soku-beppyo-2",
    lawShort: "粉じん則",
    label: "別表第2",
    name: "特定粉じん発生源",
    summary:
      "密閉・局所排気装置・湿潤化などの発生源対策（粉じん則第4条）を義務付ける特定粉じん発生源を列挙する表（第2条・第4条・第10条・第11条関係）。",
    relatedArticles: [
      { lawShort: "粉じん則", articleNum: "第2条" },
      { lawShort: "粉じん則", articleNum: "第4条" },
    ],
    relatedTopicIds: ["funjin"],
    keywords: ["特定粉じん発生源", "発生源対策", "局所排気", "湿潤化", "密閉"],
  },
  {
    id: "funjin-soku-beppyo-3",
    lawShort: "粉じん則",
    label: "別表第3",
    name: "呼吸用保護具の使用を要する作業",
    summary:
      "有効な呼吸用保護具（電動ファン付き含む）の使用を義務付ける粉じん作業を列挙する表（粉じん則第7条・第27条関係）。",
    relatedArticles: [{ lawShort: "粉じん則", articleNum: "第27条" }],
    relatedTopicIds: ["funjin"],
    keywords: ["呼吸用保護具", "防じんマスク", "電動ファン付き", "使用義務"],
  },
  // ── じん肺法施行規則の別表（題名・関係条は e-Gov 生JSON 335M50002000006 と突合）
  {
    id: "jinpai-soku-beppyo",
    lawShort: "じん肺則",
    label: "別表",
    name: "粉じん作業（じん肺法）",
    summary:
      "じん肺法の粉じん作業（じん肺健康診断・管理区分の対象となる作業。じん肺法第2条第1項第3号）を列挙する表（じん肺則第2条関係）。粉じん則別表第1の粉じん作業と対で参照する。",
    relatedArticles: [
      { lawShort: "じん肺法", articleNum: "第2条" },
      { lawShort: "じん肺則", articleNum: "第2条" },
    ],
    relatedTopicIds: ["funjin"],
    keywords: ["粉じん作業", "じん肺", "じん肺健康診断", "管理区分"],
  },
  // ── クレーン則の別表（内容は e-Gov 生JSON 347M50002000034 と突合）
  {
    id: "crane-soku-beppyo",
    lawShort: "クレーン則",
    label: "別表",
    name: "クレーン等の種類と構造部分",
    summary:
      "クレーン・移動式クレーン・デリック・エレベーター・建設用リフトの種類（天井クレーン・ジブクレーン等）ごとに、その構造部分（クレーンガーダ・ジブ等）を定める表。",
    relatedArticles: [{ lawShort: "クレーン則", articleNum: "第1条" }],
    relatedTopicIds: ["crane"],
    keywords: ["クレーンの種類", "構造部分", "天井クレーン", "ジブクレーン", "デリック", "エレベーター", "建設用リフト"],
  },
  // ── 電離則の別表（題名・関係条は e-Gov 生JSON 347M50002000041 と突合）
  {
    id: "denri-soku-beppyo-1",
    lawShort: "電離則",
    label: "別表第1",
    name: "放射性同位元素の数量・濃度（放射性物質の裾切値）",
    summary:
      "放射性同位元素の種類（核種・化学形等）ごとに、規制対象となる数量（Bq）・濃度（Bq/g）の下限を定める表（電離則第2条関係）。",
    relatedArticles: [{ lawShort: "電離則", articleNum: "第2条" }],
    relatedTopicIds: [],
    keywords: ["放射性同位元素", "放射性物質", "数量", "濃度", "ベクレル", "裾切値"],
  },
  {
    id: "denri-soku-beppyo-2",
    lawShort: "電離則",
    label: "別表第2",
    name: "トリウム・ウラン・プルトニウムの数量",
    summary: "トリウム（Th）・ウラン（U）・プルトニウム（Pu）について規制対象となる数量（Bq）を定める表（電離則第2条関係）。",
    relatedArticles: [{ lawShort: "電離則", articleNum: "第2条" }],
    relatedTopicIds: [],
    keywords: ["トリウム", "ウラン", "プルトニウム", "核燃料物質", "数量"],
  },
  {
    id: "denri-soku-beppyo-3",
    lawShort: "電離則",
    label: "別表第3",
    name: "表面汚染の限度",
    summary:
      "放射性物質の表面密度の限度（アルファ線を放出する核種4Bq/cm²・放出しない核種40Bq/cm²）を定める表（電離則第3条ほか管理区域・汚染検査関係）。",
    relatedArticles: [{ lawShort: "電離則", articleNum: "第3条" }],
    relatedTopicIds: [],
    keywords: ["表面汚染", "表面密度", "汚染限度", "管理区域", "汚染検査"],
  },
];

/** id → 別表エントリ。 */
export function findBeppyo(id: string): BeppyoEntry | undefined {
  return BEPPYO_ENTRIES.find((b) => b.id === id);
}
