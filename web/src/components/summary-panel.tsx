import type { RevisionSummary } from "@/lib/types/domain";

type SummaryPanelProps = {
  selectedRevisionId: string | null;
  selectedRevisionTitle: string;
  summaryContent: RevisionSummary | null;
  isLoading: boolean;
};

export function SummaryPanel({
  selectedRevisionId,
  selectedRevisionTitle,
  summaryContent,
  isLoading,
}: SummaryPanelProps) {
  if (isLoading) {
    return (
      <section
        aria-label="AI要約"
        className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm lg:sticky lg:top-24"
      >
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">AI要約</h2>
        <div className="mt-3 space-y-3">
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-10/12 animate-pulse rounded bg-slate-200" />
          <div className="h-20 w-full animate-pulse rounded bg-slate-100" />
        </div>
      </section>
    );
  }

  if (!selectedRevisionId || !summaryContent) {
    return (
      <section
        aria-label="AI要約"
        className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm lg:sticky lg:top-24"
      >
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">AI要約</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          法改正カードの「AIで要約」ボタンを押すと、ここに要約が表示されます。
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="AI要約"
      className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm lg:sticky lg:top-24"
    >
      <h2 className="text-base font-bold text-slate-900 sm:text-lg">AI要約</h2>
      <p className="mt-1 text-sm font-medium text-slate-700">{selectedRevisionTitle}</p>

      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
        <h3 className="text-sm font-semibold text-slate-900">3行要約</h3>
        <ul className="mt-2 space-y-2">
          {summaryContent.threeLineSummary.map((line) => (
            <li
              key={line}
              className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm leading-6 text-slate-800"
            >
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
        <h3 className="text-sm font-semibold text-slate-900">現場でやること</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
          {summaryContent.workplaceActions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
        <h3 className="text-sm font-semibold text-slate-900">対象業種</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {summaryContent.targetIndustries.map((industry) => (
            <span
              key={industry}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700"
            >
              {industry}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
