"use client";

import { ErrorNotice } from "@/components/error-notice";
import { EasyJapaneseText } from "@/components/easy-japanese-text";
import type { ServiceError, ServiceStatus } from "@/lib/types/api";
import type { RevisionSummary } from "@/lib/types/domain";

type SummaryPanelProps = {
  selectedRevisionId: string | null;
  selectedRevisionTitle: string;
  summaryContent: RevisionSummary | null;
  isLoading: boolean;
  status: ServiceStatus;
  error: ServiceError | null;
  onRetry: () => void;
};

export function SummaryPanel({
  selectedRevisionId,
  selectedRevisionTitle,
  summaryContent,
  isLoading,
  status,
  error,
  onRetry,
}: SummaryPanelProps) {
  if (isLoading) {
    return (
      <section
        aria-label="収録要点"
        className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm lg:sticky lg:top-24"
      >
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">収録要点</h2>
        <div className="mt-3 space-y-3">
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-10/12 animate-pulse rounded bg-slate-200" />
          <div className="h-20 w-full animate-pulse rounded bg-slate-100" />
        </div>
      </section>
    );
  }

  if (status === "error" && error) {
    return (
      <section
        aria-label="収録要点"
        className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm lg:sticky lg:top-24"
      >
        <h2 className="text-base font-bold text-rose-900 sm:text-lg">収録要点</h2>
        <ErrorNotice
          title="要約の取得に失敗しました"
          error={error}
          onRetry={onRetry}
          retryLabel="要約を再取得"
          className="mt-4"
        />
        <a
          href="/law-search"
          className="mt-3 inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
        >
          法令検索で一次資料を確認する →
        </a>
      </section>
    );
  }

  if (!selectedRevisionId || !summaryContent) {
    return (
      <section
        aria-label="収録要点"
        className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm lg:sticky lg:top-24"
      >
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">収録要点</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          法改正カードの「収録要点を見る」を押すと、登録済みの要点が表示されます。
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="収録要点"
      className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm lg:sticky lg:top-24"
    >
      <h2 className="text-base font-bold text-slate-900 sm:text-lg">収録要点</h2>
      <p className="mt-1 text-sm font-medium text-slate-700">{selectedRevisionTitle}</p>

      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
        <h3 className="text-sm font-semibold text-slate-900">{summaryContent.verification ? "変更点と適用条件" : "収録されている改正情報"}</h3>
        <ul className="mt-2 space-y-2">
          {summaryContent.threeLineSummary.map((line) => (
            <li
              key={line}
              className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm leading-6 text-slate-800"
            >
              <EasyJapaneseText>{line}</EasyJapaneseText>
            </li>
          ))}
        </ul>
      </div>

      {summaryContent.workplaceActions.length > 0 && <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
        <h3 className="text-sm font-semibold text-slate-900">現場でやること</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
          {summaryContent.workplaceActions.map((action) => (
            <li key={action}><EasyJapaneseText>{action}</EasyJapaneseText></li>
          ))}
        </ul>
      </div>}

      {summaryContent.targetIndustries.length > 0 && <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
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
      </div>}
      {summaryContent.verification ? <div className="mt-4 space-y-2 text-xs leading-5 text-slate-700">
        <p>一次資料の照合日: {summaryContent.verification.checkedOn}</p>
        <p>確認範囲: {summaryContent.verification.scope}</p>
        <p>対象は業種名だけでは決まりません。上の作業場・測定条件を確認してください。</p>
        <ul className="space-y-2">{summaryContent.verification.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="text-emerald-800 underline">{source.label}</a></li>)}</ul>
      </div> : <p className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
        収録した改正情報の抜粋です。変更箇所・適用条件・対応事項の解説は未収録です。カードの公式原文から対象の条文と改正資料を確認してください。
      </p>}
    </section>
  );
}
