import { Clock } from "lucide-react";
import { realLawRevisions } from "@/data/mock/real-law-revisions";

interface Props {
  /** カスタムラベル（指定があれば優先） */
  label?: string;
}

/**
 * realLawRevisions のうち「現時点で既に公布／施行された」最新日から
 * "YYYY年M月" 形式のラベルを動的生成する。
 *
 * 未来日（施行予定の改正）は「最終更新」には含めない。
 * これがないと、たとえば 2027-04-01 施行予定の改正が登録されると
 * 「最終更新: 2027年4月」のように現実より先の日付が表示されてしまう。
 */
function deriveLatestLabel(): string {
  const todayIso = new Date().toISOString().slice(0, 10);
  let latest = "";
  for (const r of realLawRevisions) {
    const candidate =
      typeof r.enforcement_date === "string" && r.enforcement_date
        ? r.enforcement_date
        : r.publishedAt;
    if (!candidate) continue;
    if (candidate > todayIso) continue;
    if (candidate > latest) latest = candidate;
  }
  if (!latest) {
    const m = todayIso.match(/^(\d{4})-(\d{2})/);
    if (m) return `${m[1]}年${Number(m[2])}月`;
    return "2026年4月";
  }
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
