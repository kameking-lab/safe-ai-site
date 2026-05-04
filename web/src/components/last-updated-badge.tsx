import { Clock } from "lucide-react";
import { realLawRevisions } from "@/data/mock/real-law-revisions";

interface Props {
  /** カスタムラベル（指定があれば優先） */
  label?: string;
}

/**
 * realLawRevisions の publishedAt 最大日（=収録された改正のうち最新の公布／施行日）から
 * "YYYY年M月" 形式のラベルを動的生成する。改正データを足したら自動で追従する。
 */
function deriveLatestLabel(): string {
  let latest = "";
  for (const r of realLawRevisions) {
    const candidate =
      typeof r.enforcement_date === "string" && r.enforcement_date
        ? r.enforcement_date
        : r.publishedAt;
    if (candidate && candidate > latest) latest = candidate;
  }
  if (!latest) return "2026年4月";
  const m = latest.match(/^(\d{4})-(\d{2})/);
  if (!m) return latest;
  return `${m[1]}年${Number(m[2])}月`;
}

export function LastUpdatedBadge({ label }: Props) {
  const text = label ?? deriveLatestLabel();
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-500">
      <Clock className="h-3 w-3" />
      最終更新: {text}
    </span>
  );
}
