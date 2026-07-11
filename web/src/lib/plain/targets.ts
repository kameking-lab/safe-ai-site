/**
 * 現場ことば版の対象法令（安衛法体系）と優先順・部隊割。
 *
 * 「コーパス収載の安衛法体系全法令」を正本（web/src/data/laws/*.ts）の
 * lawShort で列挙する。優先順は 法律 → 政令 → 安衛則 → 各特別則 → 関連法。
 *
 * squad = 執筆部隊（Sonnet 5×5セッション）の担当割（オーナー指定・2026-07-11）:
 *   部隊1 = 安衛法＋安衛令
 *   部隊2 = 安衛則（全編・足場等含む）
 *   部隊3 = 有機則＋鉛則＋四アルキル鉛則＋特化則
 *   部隊4 = 粉じん則＋じん肺則＋電離則＋石綿則
 *   部隊5 = クレーン則＋ゴンドラ則＋ボイラー則＋事務所則＋機械等検定規則
 *   0     = 部隊割当外（酸欠則=完成済み見本／じん肺法・作環測法・高圧則=後続の未割当）
 * ローカル並列レーン（loop-config.json の plain-N）と BACKLOG-plain-N.md も
 * この部隊番号に1:1で対応する。
 *
 * カバレッジレポート（lib/plain/coverage.ts → npm run plain:status）は
 * このリストを正とする。
 */

export type PlainTarget = {
  /** LawArticle.lawShort ＝ LAW_METADATA のキー */
  lawShort: string;
  /** plain データファイル名（web/src/data/plain/<file>.ts） */
  file: string;
  /** 執筆部隊（BACKLOG-plain-N.md／loop-config の plain-N）。0=部隊割当外 */
  squad: 0 | 1 | 2 | 3 | 4 | 5;
};

export const PLAIN_TARGETS: readonly PlainTarget[] = [
  { lawShort: "安衛法", file: "rodo-anzen-eisei-ho", squad: 1 },
  { lawShort: "安衛令", file: "rodo-anzen-eisei-ho-sikokiregu", squad: 1 },
  { lawShort: "安衛則", file: "anzen-eisei-kisoku", squad: 2 },
  { lawShort: "酸欠則", file: "sankketsu-kisoku", squad: 0 }, // 完成済み見本
  { lawShort: "有機則", file: "yuki-kisoku", squad: 3 },
  { lawShort: "鉛則", file: "en-kisoku", squad: 3 },
  { lawShort: "四アルキル鉛則", file: "shi-alkyl-en-kisoku", squad: 3 },
  { lawShort: "特化則", file: "tokka-kisoku", squad: 3 },
  { lawShort: "粉じん則", file: "funjin-kisoku", squad: 4 },
  { lawShort: "じん肺則", file: "jinpai-ho-sikokiregu", squad: 4 },
  { lawShort: "電離則", file: "denri-houshasen-kisoku", squad: 4 },
  { lawShort: "石綿則", file: "sekimen-kisoku", squad: 4 },
  { lawShort: "クレーン則", file: "crane-kisoku", squad: 5 },
  { lawShort: "ゴンドラ則", file: "gondola-anzen-kisoku", squad: 5 },
  { lawShort: "ボイラー則", file: "boiler-atsuryoku-yoki-anzen-kisoku", squad: 5 },
  { lawShort: "事務所則", file: "jimusho-eisei-kijun-kisoku", squad: 5 },
  { lawShort: "機械等検定規則", file: "kikai-kentei-kisoku", squad: 5 },
  { lawShort: "高圧則", file: "koa-atsu-sagyo-anzen-eisei-kisoku", squad: 0 }, // 未割当（後続）
  { lawShort: "じん肺法", file: "jinpai-ho", squad: 0 }, // 未割当（後続）
  { lawShort: "作環測法", file: "sagyokankyo-sokuteiho", squad: 0 }, // 未割当（後続）
] as const;
