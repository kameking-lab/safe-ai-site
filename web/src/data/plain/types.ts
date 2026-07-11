/**
 * 現場ことば版（条文の わかりやすい言い換え）データ型。
 *
 * 設計（docs/plain-language-prompts/README.md 参照）:
 * - 条キー = egovLawId ＋ コーパスの articleNum（法令ナビの条ページと1:1）。
 * - 法令ごとに web/src/data/plain/<法令>.ts の1ファイル。並列執筆でも
 *   ファイル衝突ゼロ。
 * - fidelity ゲート（web/src/lib/plain/fidelity.ts）が原文との機械照合を行い、
 *   数値・単位・限度方向・義務主体×義務種別・参照条・罰則の欠落/改変/捏造を
 *   CI で検出する。省く内容は omissions に明示宣言する（黙って省くと CI が落ちる）。
 * - sourceTextHash はコーパス原文のスナップショット（lib/plain/text-hash.ts）。
 *   改正でコーパス側が更新されるとハッシュ不一致＝stale となり、UI から自動で
 *   非表示・再生成キュー入りする（誤った言い換えを見せ続けない）。
 */

export type PlainArticle = {
  /** e-Gov 法令番号（/law-navi/[lawId]/… と同一） */
  egovLawId: string;
  /** コーパス LawArticle.articleNum と完全一致（例: "第5条の2"） */
  articleNum: string;
  /**
   * 現場ことば版本文。です・ます体、主語明示、目安2〜4文（最大5文）。
   * 原文に無い義務・数値の追加は禁止（fidelity ゲートが検出）。
   */
  plainText: string;
  /**
   * 明示的な省略宣言。原文にある数値・参照条・義務のうち言い換えで省くものは
   * ここに当該トークンを含む形で書く（例: "参照条文（令第21条第9号）は省略"）。
   * fidelity ゲートは「plainText か omissions のどちらかに保存されているか」を検査する。
   */
  omissions?: string[];
  /** 言い換えの元にした原文のスナップショット・ハッシュ（plainSourceHash(text)） */
  sourceTextHash: string;
  /**
   * 言い換え時点の改正リビジョン識別子。
   * LAW_METADATA（laws/law-metadata.ts）の latestRevision か、
   * law-revisions/egov-revisions.json の id（例: lr-egov-347M50002000042-…）。
   */
  sourceRevisionId: string;
  /** 生成日（ISO yyyy-mm-dd） */
  generatedAt: string;
  /** 執筆モデル（例: "claude-sonnet-5"） */
  model: string;
  /** fidelity 全緑を執筆側で確認済みか。UI は verified のみ表示。 */
  checkStatus: "verified" | "draft";
};
