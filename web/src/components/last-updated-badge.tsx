import { Clock } from "lucide-react";

interface Props {
  /** カスタムラベル（指定があれば優先） */
  label?: string;
}

/**
 * 現在月（YYYY年M月）を返す。SSR/CSR 双方でビルド時または描画時の
 * 実時刻から導出するため、固定文字列のように陳腐化しない。
 */
function deriveCurrentMonthLabel(): string {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月`;
}

export function LastUpdatedBadge({ label }: Props) {
  const text = label ?? deriveCurrentMonthLabel();
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-500">
      <Clock className="h-3 w-3" />
      最終更新: {text}
    </span>
  );
}
