import { Scale, ExternalLink, Calendar } from "lucide-react";
import type { EducationContext } from "@/data/education-context";
import { lawRevisionCores } from "@/data/mock/law-revisions";
import type { LawRevisionCore } from "@/lib/types/domain";

type Props = {
  context: EducationContext;
  /** 表示件数 */
  limit?: number;
};

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; chip: string }> = {
  amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", chip: "bg-amber-100 text-amber-800" },
  red: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", chip: "bg-red-100 text-red-800" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", chip: "bg-blue-100 text-blue-800" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", chip: "bg-orange-100 text-orange-800" },
  sky: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", chip: "bg-sky-100 text-sky-800" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", chip: "bg-indigo-100 text-indigo-800" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", chip: "bg-emerald-100 text-emerald-800" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", chip: "bg-purple-100 text-purple-800" },
};

function matchLaw(rev: LawRevisionCore, ctx: EducationContext): number {
  const text = `${rev.title} ${rev.summary} ${rev.category} ${rev.revisionNumber ?? ""}`;
  let score = 0;
  for (const kw of ctx.lawMatch.keywords) {
    if (text.includes(kw)) score += 1;
  }
  return score;
}

function dateKey(d?: string): number {
  if (!d) return 0;
  const m = d.match(/(\d{4})-?(\d{1,2})?-?(\d{1,2})?/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 10000 + Number(m[2] ?? 1) * 100 + Number(m[3] ?? 1);
}

export function RelatedLawUpdates({ context, limit = 4 }: Props) {
  const colors = COLOR_MAP[context.color] ?? COLOR_MAP.amber;
  const matched = lawRevisionCores
    .map((r) => ({ r, score: matchLaw(r, context) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return dateKey(b.r.publishedAt) - dateKey(a.r.publishedAt);
    })
    .slice(0, limit)
    .map((x) => x.r);

  if (matched.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <Scale className={`h-5 w-5 ${colors.text}`} />
        <h2 className="text-base font-bold text-slate-900">関連法令の最新改正</h2>
        <span className="text-xs text-slate-500">（直近10年・e-Gov／厚労省通達）</span>
      </div>
      <div className="space-y-3">
        {matched.map((r) => (
          <article key={r.id} className={`rounded-xl border ${colors.border} bg-white p-4`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${colors.chip}`}>
                {r.category}
              </span>
              {r.impact && (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  影響度: {r.impact}
                </span>
              )}
              <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-500">
                <Calendar className="h-3 w-3" />
                {r.publishedAt}
                {r.enforcement_date && r.enforcement_date !== r.publishedAt
                  ? `（施行 ${r.enforcement_date}）`
                  : ""}
              </span>
            </div>
            <h3 className="mt-2 text-sm font-bold text-slate-900">{r.title}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-600">{r.summary}</p>
            <p className="mt-1 text-[11px] text-slate-500">発出: {r.issuer}</p>
            {(r.source?.url ?? r.source_url) && (
              <a
                href={r.source?.url || r.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-2 inline-flex items-center gap-1 text-[11px] font-semibold ${colors.text} hover:underline`}
              >
                {r.source?.label || "出典"}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
