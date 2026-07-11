/**
 * 法令ナビ 分野インデックス（分野・機械・作業 → 法/令/則/通達の条文群マッピング）。
 *
 * 二層生成（docs/horei-navi-foundation-2026-07-11/01-diagnosis-and-design.md §2-2）:
 * - 候補列挙は `web/scripts/law-navi-topic-scan.mjs`（コーパス keywords/本文・synonyms・
 *   通達タイトルの機械走査）。本ファイルはその候補を人手レビューして採録した正本层。
 *   各トピックの `reviewNote` に走査根拠と採用判断を残す。
 * - 参照整合は topics-integrity.test.ts で機械固定:
 *   articles は curated コーパスに、circularIds は mhlwNotices に実在しなければ CI が落ちる
 *   （幽霊参照 0＝正本突合の思想。O18 リンカ・article-registry と同型）。
 *
 * aliases の方針（俗称ゆらぎ解決・O5型の固定フレーズ過学習は禁止）:
 * - 「爪のやつ」のような言い回しそのものは辞書に入れない。名詞の語幹（爪・ツメ・フォーク…）
 *   だけを持ち、横断検索エンジンの部分一致（variant.includes(k)）と query-expansion の
 *   正規表現ルールが言い回し差を吸収する。
 */

export type TopicArticleRef = {
  /** LawArticle.lawShort（例: 安衛則） */
  readonly lawShort: string;
  /** LawArticle.articleNum（例: 第151条の2） */
  readonly articleNum: string;
  /** 現場向けの役割ラベル（例: 定義・資格・点検） */
  readonly role: string;
};

export type LawNaviTopic = {
  /** URL用ID（/law-navi/topics/[id]） */
  readonly id: string;
  /** 表示名（現場の呼び名の代表形） */
  readonly name: string;
  /** 分野グループ（安衛則の節に相当する現場区分） */
  readonly fieldGroup: string;
  /** 1〜2文の説明（何がここにまとまっているか） */
  readonly description: string;
  /** 現場語・俗称・別名（横断検索 keywords と query-expansion に供給） */
  readonly aliases: readonly string[];
  /** 法→令→則の体系順の条文参照 */
  readonly articles: readonly TopicArticleRef[];
  /** 関連通達・告示・指針（mhlwNotices の id） */
  readonly circularIds: readonly string[];
  /** 関連する別表（beppyo.ts の id） */
  readonly beppyoIds: readonly string[];
  /** 二層生成の人手レビュー記録（機械走査の根拠と採用判断） */
  readonly reviewNote: string;
};

export const LAW_NAVI_TOPICS: readonly LawNaviTopic[] = [
  {
    id: "forklift",
    name: "フォークリフト",
    fieldGroup: "荷役運搬機械等",
    description:
      "フォークリフト（車両系荷役運搬機械等）の資格・作業ルール・機械の要件・点検を、法律→政令→省令→通達の体系順でまとめた分野ページ。",
    aliases: [
      "フォークリフト",
      "フォーク",
      "爪",
      "ツメ",
      "リフト",
      "パレット",
      "荷役",
      "荷役運搬",
      "車両系荷役運搬機械",
      "リーチリフト",
      "カウンターリフト",
      "構内運搬車",
    ],
    articles: [
      // ── 法律（労働安全衛生法）
      { lawShort: "安衛法", articleNum: "第59条", role: "安全衛生教育（特別教育の根拠）" },
      { lawShort: "安衛法", articleNum: "第61条", role: "就業制限（技能講習の根拠）" },
      { lawShort: "安衛法", articleNum: "第45条", role: "定期自主検査の根拠" },
      { lawShort: "安衛法", articleNum: "第35条", role: "重量表示（1トン以上の貨物）" },
      // ── 政令（労働安全衛生法施行令）
      { lawShort: "安衛令", articleNum: "第20条", role: "技能講習が必要な業務（第11号: 最大荷重1トン以上）" },
      // ── 省令（労働安全衛生規則 第2編第1章の2 車両系荷役運搬機械等）
      { lawShort: "安衛則", articleNum: "第36条", role: "特別教育が必要な業務（第5号: 最大荷重1トン未満）" },
      { lawShort: "安衛則", articleNum: "第151条の2", role: "車両系荷役運搬機械等の定義" },
      { lawShort: "安衛則", articleNum: "第151条の3", role: "作業計画" },
      { lawShort: "安衛則", articleNum: "第151条の4", role: "作業指揮者" },
      { lawShort: "安衛則", articleNum: "第151条の5", role: "制限速度" },
      { lawShort: "安衛則", articleNum: "第151条の6", role: "転落等の防止" },
      { lawShort: "安衛則", articleNum: "第151条の7", role: "接触の防止（立入禁止・誘導者）" },
      { lawShort: "安衛則", articleNum: "第151条の11", role: "運転位置から離れる場合の措置" },
      { lawShort: "安衛則", articleNum: "第151条の14", role: "主たる用途以外の使用の制限（爪に人を乗せる昇降の禁止）" },
      { lawShort: "安衛則", articleNum: "第151条の15", role: "修理・アタッチメント交換" },
      { lawShort: "安衛則", articleNum: "第151条の16", role: "前照灯・後照灯" },
      { lawShort: "安衛則", articleNum: "第151条の20", role: "使用の制限（最大荷重超え禁止）" },
      { lawShort: "安衛則", articleNum: "第151条の21", role: "定期自主検査（1年以内ごと）" },
    ],
    circularIds: [
      "mhlw-notice-0734", // フォークリフト構造規格（告示）
      "mhlw-notice-0757", // フォークリフト特定自主検査基準（告示）
      "mhlw-notice-0837", // フオークリフト運転技能講習規程（告示）
      "mhlw-notice-0273", // 技能講習規程等の一部改正（通達）
      "mhlw-notice-0488", // 1トン以上の運転業務に就くことができる者（通達）
      "mhlw-notice-0768", // 定期自主検査指針（則151条の21関係）
      "mhlw-notice-0984", // 安全管理の徹底（転倒・人身事故防止）（通達）
      "mhlw-notice-0985", // 荷役作業における安全管理の徹底（通達）
    ],
    beppyoIds: [],
    reviewNote:
      "2026-07-11 topic-scan: コーパス keywords『フォークリフト』『車両系荷役運搬機械』一致18条・通達タイトル一致10件から、貨物自動車固有条（151条の67・151条の74）と廃止済み指針（mhlw-notice-0778）・旧指針（0769）を人手で除外し採録。",
  },
];

/** id → トピック。 */
export function findLawNaviTopic(id: string): LawNaviTopic | undefined {
  return LAW_NAVI_TOPICS.find((t) => t.id === id);
}

/** 指定条文（lawShort+articleNum）を含むトピック一覧（条文ページの「この条文が属する分野」用）。 */
export function topicsForArticle(lawShort: string, articleNum: string): LawNaviTopic[] {
  return LAW_NAVI_TOPICS.filter((t) =>
    t.articles.some((a) => a.lawShort === lawShort && a.articleNum === articleNum)
  );
}
