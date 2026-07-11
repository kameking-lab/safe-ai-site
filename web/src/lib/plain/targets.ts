/**
 * 現場ことば版の対象法令（安衛法体系）と優先順。
 *
 * 「コーパス収載の安衛法体系全法令」を正本（web/src/data/laws/*.ts）の
 * lawShort で列挙する。優先順は 法律 → 政令 → 安衛則 → 各特別則
 * （酸欠・粉じん・有機・特化・クレーン・石綿・鉛・電離・四アルキル鉛・
 * 高圧・ボイラー・ゴンドラ・事務所・機械検定）→ 関連法（じん肺・作環測）。
 *
 * カバレッジレポート（lib/plain/coverage.ts）と執筆レーンの配分
 * （BACKLOG-plain-1〜4.md）はこのリストを正とする。
 */

export type PlainTarget = {
  /** LawArticle.lawShort ＝ LAW_METADATA のキー */
  lawShort: string;
  /** plain データファイル名（web/src/data/plain/<file>.ts） */
  file: string;
  /** 執筆レーン（BACKLOG-plain-N.md）の割当 */
  lane: 1 | 2 | 3 | 4;
};

export const PLAIN_TARGETS: readonly PlainTarget[] = [
  { lawShort: "安衛法", file: "rodo-anzen-eisei-ho", lane: 1 },
  { lawShort: "安衛令", file: "rodo-anzen-eisei-ho-sikokiregu", lane: 1 },
  { lawShort: "安衛則", file: "anzen-eisei-kisoku", lane: 2 },
  { lawShort: "酸欠則", file: "sankketsu-kisoku", lane: 3 },
  { lawShort: "粉じん則", file: "funjin-kisoku", lane: 3 },
  { lawShort: "有機則", file: "yuki-kisoku", lane: 3 },
  { lawShort: "特化則", file: "tokka-kisoku", lane: 3 },
  { lawShort: "クレーン則", file: "crane-kisoku", lane: 4 },
  { lawShort: "石綿則", file: "sekimen-kisoku", lane: 3 },
  { lawShort: "鉛則", file: "en-kisoku", lane: 3 },
  { lawShort: "電離則", file: "denri-houshasen-kisoku", lane: 4 },
  { lawShort: "四アルキル鉛則", file: "shi-alkyl-en-kisoku", lane: 3 },
  { lawShort: "高圧則", file: "koa-atsu-sagyo-anzen-eisei-kisoku", lane: 4 },
  { lawShort: "ボイラー則", file: "boiler-atsuryoku-yoki-anzen-kisoku", lane: 4 },
  { lawShort: "ゴンドラ則", file: "gondola-anzen-kisoku", lane: 4 },
  { lawShort: "事務所則", file: "jimusho-eisei-kijun-kisoku", lane: 1 },
  { lawShort: "機械等検定規則", file: "kikai-kentei-kisoku", lane: 1 },
  { lawShort: "じん肺法", file: "jinpai-ho", lane: 1 },
  { lawShort: "じん肺則", file: "jinpai-ho-sikokiregu", lane: 1 },
  { lawShort: "作環測法", file: "sagyokankyo-sokuteiho", lane: 1 },
] as const;
