import type { LawRevision } from "@/data/law-revisions";

function formatPublishedDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${year}/${month}/${day}`;
}

type LawRevisionListProps = {
  revisions: LawRevision[];
  selectedRevisionId: string;
  onSelectSummary: (revisionId: string) => void;
  onSelectForQuestion: (revisionId: string) => void;
};

export function LawRevisionList({
  revisions,
  selectedRevisionId,
  onSelectSummary,
  onSelectForQuestion,
}: LawRevisionListProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4" aria-label="法改正一覧">
      <h2 className="text-base font-bold text-slate-900">法改正一覧</h2>
      <ul className="mt-3 space-y-3">
        {revisions.map((revision) => {
          const isSelected = selectedRevisionId === revision.id;

          return (
            <li
              key={revision.id}
              className={`rounded-xl border bg-white p-4 transition ${
                isSelected ? "border-emerald-300 ring-1 ring-emerald-200" : "border-slate-200"
              }`}
            >
              <div className="space-y-2">
                <h3 className="text-sm font-semibold leading-6 text-slate-900">{revision.title}</h3>
                <p className="text-xs text-slate-500">
                  発行日: {formatPublishedDate(revision.publishedAt)}
                </p>
                <p className="text-sm leading-6 text-slate-700">{revision.summary}</p>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => onSelectSummary(revision.id)}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                >
                  AIで要約
                </button>
                <button
                  type="button"
                  onClick={() => onSelectForQuestion(revision.id)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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
