import { Clock } from "lucide-react";

interface Props {
  /** カスタムラベル（指定があれば優先） */
  label?: string;
}

export function LastUpdatedBadge({ label }: Props) {
  // 現在時刻はデータを確認した証拠ではない。確認記録が渡されない場合は
  // 推測日を表示せず、明示的に未登録として安全側に倒す。
  const text = label?.trim() || "未登録（確認記録待ち）";
  return (
    <span
      data-verification={label?.trim() ? "recorded" : "pending"}
      className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-700"
    >
      <Clock className="h-3 w-3" />
      最終人手確認: {text}
    </span>
  );
}
