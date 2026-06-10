/**
 * 共通視覚言語の基盤: JIS安全色の「文法」トークン（柱0-0・社長指示 2026-06-10）
 *
 * 現場の人は標識の色で読む。サイトも同じ文法で話す:
 *   赤   = 危険・停止・期限超過（JIS Z 9103 の安全色「赤」= 禁止・停止・危険）
 *   黄   = 注意・要対応       （同「黄」= 注意・警告）
 *   緑   = 安全・OK・完了     （同「緑」= 安全状態・進行）
 *   青   = 指示・案内・情報   （同「青」= 指示・誘導）
 *   無彩 = 補足・参考         （意味を持たせない地の色）
 *
 * 実装色は JIS の物理色票そのものではなく、サイト全体で既に使われている
 * Tailwind パレットの対応色（rose / amber / emerald / sky / slate）に正規化する。
 * 画面 UI では「色の使い分けの一貫性」が伝達力の本体であり、
 * 印刷標識用の色票値に合わせるより既存画面との連続性を優先する。
 *
 * ルール（全機能ロールアウト時の約束事）:
 * - 状態を伝える色は必ずこのトークン経由で塗る。場当たりな直書きをしない。
 * - 赤・黄は「ユーザーが対応すべきこと」がある時だけ使う（色のオオカミ少年化を防ぐ）。
 * - 色だけに頼らない: バッジ・カードには必ずアイコンと短いラベル（漢字2〜4文字目安）を併記する。
 *
 * 設計記録: docs/visual-language-2026-06-10.md
 */

export type SafetyTone = "danger" | "warning" | "safe" | "info" | "neutral";

export type SafetyToneClasses = {
  /** トーンの意味（日本語短ラベル・UIの既定文言にも使える） */
  label: string;
  /**
   * 塗りバッジ・チップ: 背景+文字のペアで WCAG AA (コントラスト比4.5:1以上) を満たすこと
   * （safety-tone.test.ts で機械検証。warning は JIS の現物標識と同じ「黄地に黒文字」）
   */
  solid: string;
  /** 淡色面: 結論カード・行のハイライトに使う背景+枠+文字 */
  soft: string;
  /** 枠線のみ */
  border: string;
  /** 文字色のみ */
  text: string;
  /** アイコン色 */
  icon: string;
  /** 行の左帯（リスト行の重大度表示） */
  leftBar: string;
};

export const SAFETY_TONE: Record<SafetyTone, SafetyToneClasses> = {
  danger: {
    label: "危険・期限超過",
    solid: "bg-rose-600 text-white",
    soft: "border-rose-300 bg-rose-50 text-rose-900",
    border: "border-rose-300",
    text: "text-rose-700",
    icon: "text-rose-600",
    leftBar: "border-l-rose-500",
  },
  warning: {
    label: "注意・要対応",
    solid: "bg-amber-500 text-amber-950",
    soft: "border-amber-300 bg-amber-50 text-amber-900",
    border: "border-amber-300",
    text: "text-amber-700",
    icon: "text-amber-600",
    leftBar: "border-l-amber-500",
  },
  safe: {
    label: "良好・対応済",
    solid: "bg-emerald-700 text-white",
    soft: "border-emerald-300 bg-emerald-50 text-emerald-900",
    border: "border-emerald-300",
    text: "text-emerald-700",
    icon: "text-emerald-600",
    leftBar: "border-l-emerald-500",
  },
  info: {
    label: "指示・案内",
    solid: "bg-sky-700 text-white",
    soft: "border-sky-300 bg-sky-50 text-sky-900",
    border: "border-sky-300",
    text: "text-sky-700",
    icon: "text-sky-600",
    leftBar: "border-l-sky-500",
  },
  neutral: {
    label: "参考",
    solid: "bg-slate-600 text-white",
    soft: "border-slate-200 bg-slate-50 text-slate-700",
    border: "border-slate-200",
    text: "text-slate-600",
    icon: "text-slate-500",
    leftBar: "border-l-slate-300",
  },
};

export const SAFETY_TONES: readonly SafetyTone[] = [
  "danger",
  "warning",
  "safe",
  "info",
  "neutral",
] as const;

/**
 * 件数から画面の「いまの状態」1トーンを決める標準ロジック。
 * 1画面1メッセージの原則: 期限超過が1件でもあれば赤、なければ要対応で黄、どちらも無ければ緑。
 */
export function dominantTone(counts: { danger?: number; warning?: number }): SafetyTone {
  if ((counts.danger ?? 0) > 0) return "danger";
  if ((counts.warning ?? 0) > 0) return "warning";
  return "safe";
}
