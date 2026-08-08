import {
  FRESHNESS_LABELS,
  INFORMATION_KIND_LABELS,
  VERIFICATION_LABELS,
  type EvidenceRecord,
  type EvidenceSource,
} from "@/lib/evidence/types";

const EMPTY_VALUE = "未登録・確認待ち";

function valueOrPending(value: string | null | undefined) {
  return value?.trim() ? value : EMPTY_VALUE;
}

function SourceList({
  sources,
  emptyLabel,
}: {
  sources: EvidenceSource[];
  emptyLabel: string;
}) {
  if (sources.length === 0) {
    return <span className="font-semibold text-amber-800">{emptyLabel}</span>;
  }

  return (
    <ul className="space-y-1">
      {sources.map((source) => (
        <li key={`${source.url}:${source.title}`}>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-sky-800 underline decoration-sky-300 underline-offset-2 hover:text-sky-950"
          >
            {source.title}
          </a>
          {source.publisher ? `（${source.publisher}）` : ""}
          {source.documentNumber ? ` 文書番号: ${source.documentNumber}` : ""}
          {source.role ? <span className="block text-xs text-slate-600">{source.role}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function Field({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-slate-200 py-2 first:border-t-0 sm:grid sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-xs font-bold text-slate-600">{term}</dt>
      <dd className="mt-0.5 min-w-0 text-sm leading-6 text-slate-900 sm:mt-0">
        {children}
      </dd>
    </div>
  );
}

export function EvidenceCard({
  evidence,
  heading = "根拠・鮮度・確認状態",
  defaultOpen = false,
}: {
  evidence: EvidenceRecord;
  heading?: string;
  defaultOpen?: boolean;
}) {
  const kind = INFORMATION_KIND_LABELS[evidence.informationKind];
  const freshness = FRESHNESS_LABELS[evidence.freshness];
  const verification = VERIFICATION_LABELS[evidence.verification];
  const needsAttention =
    evidence.freshness !== "current" ||
    evidence.verification !== "humanVerified" ||
    evidence.humanReviewRequired;

  return (
    <section
      aria-labelledby={`${evidence.id}-evidence-heading`}
      data-evidence-kind={evidence.informationKind}
      data-evidence-freshness={evidence.freshness}
      data-evidence-verification={evidence.verification}
      className="rounded-xl border border-slate-300 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 p-4">
        <div>
          <h2
            id={`${evidence.id}-evidence-heading`}
            className="text-base font-bold text-slate-950"
          >
            {heading}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            公式資料を正本として確認するための記録です。不明値は推測せず確認待ちと表示します。
          </p>
        </div>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="情報の状態"
        >
          <span className="rounded-full border border-slate-400 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-800">
            種別: {kind}
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
              needsAttention
                ? "border-amber-500 bg-amber-50 text-amber-950"
                : "border-emerald-500 bg-emerald-50 text-emerald-950"
            }`}
          >
            鮮度: {freshness}
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
              evidence.verification === "humanVerified"
                ? "border-emerald-500 bg-emerald-50 text-emerald-950"
                : "border-amber-500 bg-amber-50 text-amber-950"
            }`}
          >
            検証: {verification}
          </span>
          <span className="rounded-full border border-violet-400 bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-950">
            AI生成: {evidence.aiGenerated ? "あり" : "なし"}
          </span>
        </div>
      </div>

      <div className="p-4">
        {evidence.primarySources.length === 0 ? (
          <p role="status" className="mb-3 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-950">
            公式一次資料を個別確認できていません。この情報だけで法令判断・安全判断を確定しないでください。
          </p>
        ) : null}

        <dl>
          <Field term="情報種別">{kind}</Field>
          <Field term="公式一次資料">
            <SourceList
              sources={evidence.primarySources}
              emptyLabel="個別の公式一次資料は未確認"
            />
          </Field>
          <Field term="二次資料">
            <SourceList
              sources={evidence.secondarySources}
              emptyLabel="二次資料は未登録"
            />
          </Field>
          <Field term="法的位置付け">{valueOrPending(evidence.legalPosition)}</Field>
          <Field term="対象時点">{valueOrPending(evidence.asOf)}</Field>
        </dl>

        <details className="mt-2" open={defaultOpen}>
          <summary className="min-h-11 cursor-pointer rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
            日付・適用範囲・訂正履歴を確認
          </summary>
          <dl className="mt-2">
            <Field term="公布日">{valueOrPending(evidence.promulgatedAt)}</Field>
            <Field term="施行日">{valueOrPending(evidence.effectiveAt)}</Field>
            <Field term="取得日時">{valueOrPending(evidence.retrievedAt)}</Field>
            <Field term="最終人手確認日">
              {valueOrPending(evidence.humanReviewedAt)}
            </Field>
            <Field term="データ版">{valueOrPending(evidence.dataVersion)}</Field>
            <Field term="適用範囲">{valueOrPending(evidence.scope)}</Field>
            <Field term="対象外">
              {evidence.exclusions.length > 0
                ? evidence.exclusions.join("／")
                : EMPTY_VALUE}
            </Field>
            <Field term="人間確認の必要性">
              {evidence.humanReviewRequired
                ? "必要。判断・帳票転記前に確認してください"
                : "この表示上は追加確認必須としていません"}
            </Field>
            <Field term="情報の鮮度">{freshness}</Field>
            <Field term="検証状態">{verification}</Field>
            <Field term="後継資料">
              {evidence.supersededBy ? (
                <SourceList sources={[evidence.supersededBy]} emptyLabel="" />
              ) : (
                EMPTY_VALUE
              )}
            </Field>
            <Field term="訂正履歴">
              {evidence.corrections.length > 0 ? (
                <ul className="space-y-2">
                  {evidence.corrections.map((correction) => (
                    <li key={`${correction.correctedAt}:${correction.summary}`}>
                      <span className="font-semibold">{correction.correctedAt}</span>
                      {` — ${correction.summary}`}
                      {correction.affectedArea
                        ? `（影響範囲: ${correction.affectedArea}）`
                        : ""}
                      {correction.previousState ? (
                        <span className="block text-xs text-slate-600">
                          旧状態: {correction.previousState}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                "登録された訂正はありません"
              )}
            </Field>
          </dl>
        </details>
      </div>
    </section>
  );
}
