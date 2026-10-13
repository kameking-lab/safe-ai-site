import { normalizeSourceProvenance, sourceCheckLabel, sourceDateLabel, type SourceProvenance } from "@/lib/source-provenance";

export function SourceProvenanceView({ source }: { source: SourceProvenance | undefined }) {
  const facts = normalizeSourceProvenance(source);
  return (
    <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      <summary className="flex min-h-11 cursor-pointer items-center px-3 font-semibold">原典情報<span aria-hidden="true" className="ml-auto">⌄</span></summary>
      <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-2 gap-y-2 px-3 pb-3 leading-5">
        <dt>原典URL</dt>
        <dd className="min-w-0 [overflow-wrap:anywhere]">
          {facts?.url ? <a href={facts.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-blue-800 underline dark:text-blue-300">{facts.url}</a> : "未登録"}
        </dd>
        <dt>原典版</dt><dd className="min-w-0 [overflow-wrap:anywhere]">{facts?.version ?? "未登録"}</dd>
        <dt>取得日</dt><dd>{facts?.fetchedAt ? sourceDateLabel(facts.fetchedAt) : "未登録"}</dd>
        <dt>最終確認</dt><dd>{facts?.checkedAt ? <>{sourceDateLabel(facts.checkedAt)}<br />{sourceCheckLabel(facts.checkKind)}</> : "未確認"}</dd>
      </dl>
    </details>
  );
}
