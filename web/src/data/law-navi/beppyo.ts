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
];

/** id → 別表エントリ。 */
export function findBeppyo(id: string): BeppyoEntry | undefined {
  return BEPPYO_ENTRIES.find((b) => b.id === id);
}
