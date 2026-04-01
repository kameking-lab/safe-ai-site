import type { LawRevision } from "@/lib/types/domain";
import type { ServiceError } from "@/lib/types/api";
import { ErrorNotice } from "@/components/error-notice";

function formatPublishedDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${year}/${month}/${day}`;
}

function resolveSourceLabel(revision: LawRevision) {
  if (revision.source?.label) {
    return revision.source.label;
  }
  return revision.issuer ?? null;
}

function resolveKindLabel(revision: LawRevision) {
  switch (revision.kind) {
    case "ordinance":
      return "省令";
    case "law":
      return "法律";
    case "guideline":
      return "ガイドライン";
    case "notice":
    default:
      return "通達";
  }
}

type LawRevisionListProps = {
  revisions: LawRevision[];
  selectedRevisionId: string;
  loadingRevisionId: string | null;
  error?: ServiceError | null;
  status?: "idle" | "loading" | "success" | "error";
  onRetry?: () => void;
  retryLabel?: string;
  onSelectSummary: (revisionId: string) => void;
  onSelectForQuestion: (revisionId: string) => void;
};

export function LawRevisionList({
  revisions,
  selectedRevisionId,
  loadingRevisionId,
  error,
  status = "idle",
  onRetry,
  retryLabel = "一覧を再取得",
  onSelectSummary,
  onSelectForQuestion,
}: LawRevisionListProps) {
  const showEmptyState = status === "success" && !error && revisions.length === 0;

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-24"
      aria-label="法改正一覧"
    >
      <h2 className="text-base font-bold text-slate-900 sm:text-lg">法改正一覧</h2>
      <p className="mt-1 text-xs text-slate-500 sm:text-sm">
        改正内容を確認し、要約または質問に進んでください。
      </p>
      {error && (
        <ErrorNotice title="一覧の取得に失敗しました" error={error} onRetry={onRetry} retryLabel={retryLabel} />
      )}
      {status === "loading" && (
        <p className="mt-2 text-xs text-slate-500">法改正一覧を読み込み中です...</p>
      )}
      {showEmptyState && (
        <p className="mt-2 text-xs text-slate-500">表示できる法改正データがありません。</p>
      )}
      <ul className="mt-3 space-y-3">
        {revisions.map((revision) => {
          const isSelected = selectedRevisionId === revision.id;
          const isLoadingSummary = loadingRevisionId === revision.id;

          return (
            <li
              key={revision.id}
              className={`rounded-xl border bg-white p-4 transition ${
                isSelected
                  ? "border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-200"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="space-y-2">
                <h3 className="text-sm font-semibold leading-6 text-slate-900">{revision.title}</h3>
                <p className="text-xs text-slate-500">
                  発行日: {formatPublishedDate(revision.publishedAt)}
                </p>
                {(revision.kind || revision.revisionNumber) && (
                  <p className="text-xs text-slate-500">
                    {revision.kind ? resolveKindLabel(revision) : ""}
                    {revision.kind && revision.revisionNumber ? " / " : ""}
                    {revision.revisionNumber ?? ""}
                  </p>
                )}
                <p className="text-sm leading-6 text-slate-700">{revision.summary}</p>
                {resolveSourceLabel(revision) && (
                  <div className="text-xs text-slate-500">
                    出典:{" "}
                    {revision.source?.url ? (
                      <a
                        href={revision.source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-slate-700"
                      >
                        {resolveSourceLabel(revision)}
                      </a>
                    ) : (
                      <span>{resolveSourceLabel(revision)}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => onSelectSummary(revision.id)}
                  disabled={isLoadingSummary}
                  className={`rounded-lg px-3 py-2 text-sm font-medium text-white transition ${
                    isLoadingSummary
                      ? "cursor-not-allowed bg-emerald-300"
                      : "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]"
                  }`}
                >
                  {isLoadingSummary ? "要約を準備中..." : "AIで要約"}
                </button>
                <button
                  type="button"
                  onClick={() => onSelectForQuestion(revision.id)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.99]"
                >
                  質問する
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
