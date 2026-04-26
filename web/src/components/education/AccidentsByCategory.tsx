import { AlertTriangle, ExternalLink, BarChart3 } from "lucide-react";
import type { EducationContext } from "@/data/education-context";
import type { AccidentCase } from "@/lib/types/domain";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import { resolveAccidentSource } from "@/lib/accident-source";

type Props = {
  context: EducationContext;
  /** 表示件数 (3〜5) */
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

function matchAccident(c: AccidentCase, ctx: EducationContext): number {
  let score = 0;
  const m = ctx.accidentMatch;
  if (m.types?.includes(c.type)) score += 3;
  if (m.industries?.includes(c.workCategory)) score += 2;
  if (m.keywords?.length) {
    const text = `${c.title} ${c.summary}`;
    for (const kw of m.keywords) {
      if (text.includes(kw)) score += 1;
    }
  }
  return score;
}

export function AccidentsByCategory({ context, limit = 4 }: Props) {
  const colors = COLOR_MAP[context.color] ?? COLOR_MAP.amber;
  const all = getAccidentCasesDataset();
  const matched = all
    .map((c) => ({ c, score: matchAccident(c, context) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.c);

  if (matched.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className={`h-5 w-5 ${colors.text}`} />
        <h2 className="text-base font-bold text-slate-900">業種別発生統計</h2>
      </div>

      {/* 統計カード */}
      <div className={`mb-4 rounded-2xl border ${colors.border} ${colors.bg} p-5`}>
        <p className={`text-sm font-bold ${colors.text}`}>{context.stats.annualCases}</p>
        <p className="mt-0.5 text-xs text-slate-600">出典: {context.stats.source}</p>

        <div className="mt-4 space-y-1.5">
          <p className="text-xs font-semibold text-slate-700">業種別ランキング（上位5）</p>
          <ol className="space-y-1">
            {context.stats.industryRanking.map((r) => (
              <li key={r.rank} className="flex items-center gap-3 rounded-md bg-white/70 px-3 py-1.5 text-xs">
                <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${colors.chip} text-[11px] font-bold`}>
                  {r.rank}
                </span>
                <span className="flex-1 text-slate-700">{r.industry}</span>
                <span className="font-mono text-slate-600">{r.metric}</span>
              </li>
            ))}
          </ol>
        </div>

        {context.stats.trend && (
          <p className="mt-4 rounded-md bg-white/80 p-3 text-xs leading-5 text-slate-700">
            <span className="font-semibold">傾向: </span>
            {context.stats.trend}
          </p>
        )}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className={`h-5 w-5 ${colors.text}`} />
        <h2 className="text-base font-bold text-slate-900">関連する実事故事例</h2>
        <span className="text-xs text-slate-500">（厚労省 職場のあんぜんサイト等より）</span>
      </div>
      <div className="space-y-3">
        {matched.map((c) => {
          const src = resolveAccidentSource(c);
          return (
            <article key={c.id} className={`rounded-xl border ${colors.border} bg-white p-4`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${colors.chip}`}>
                  {c.type}
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {c.workCategory}
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {c.severity}
                </span>
                <span className="text-[11px] text-slate-500">{c.occurredOn}</span>
              </div>
              <h3 className="mt-2 text-sm font-bold text-slate-900">{c.title}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">{c.summary}</p>
              {c.preventionPoints?.length > 0 && (
                <div className="mt-3 rounded-md bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold text-slate-700">主な再発防止策</p>
                  <ul className="mt-1 space-y-0.5">
                    {c.preventionPoints.slice(0, 3).map((p, i) => (
                      <li key={i} className="text-[11px] leading-5 text-slate-600">
                        ・{p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {src?.url && (
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-2 inline-flex items-center gap-1 text-[11px] font-semibold ${colors.text} hover:underline`}
                >
                  出典: {src.site}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
