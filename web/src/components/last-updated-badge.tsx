import { Clock } from "lucide-react";

interface Props {
  label?: string;
}

export function LastUpdatedBadge({ label = "2026年4月" }: Props) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-500">
      <Clock className="h-3 w-3" />
      最終更新: {label}
    </span>
  );
}
