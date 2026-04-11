"use client";

import { useMemo, useState } from "react";
import type { LawRevision } from "@/lib/types/domain";
import type { ServiceError } from "@/lib/types/api";
import { ErrorNotice } from "@/components/error-notice";
import { InputWithVoice } from "@/components/voice-input-field";

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
    case "other":
      return "告示";
    case "notice":
    default:
      return "通達";
  }
}

const KIND_BADGE_CLASS: Record<string, string> = {
  法律: "bg-red-100 text-red-800",
  省令: "bg-orange-100 text-orange-800",
  通達: "bg-blue-100 text-blue-800",
  告示: "bg-purple-100 text-purple-800",
  ガイドライン: "bg-green-100 text-green-800",
};

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
  const [search, setSearch] = useState("");
  const [yearFrom, setYearFrom] = useState(2016);
  const [yearTo, setYearTo] = useState(2026);
  const [selectedKind, setSelectedKind] = useState<string>("すべて");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return revisions.filter((r) => {
      const y = Number(r.publishedAt.slice(0, 4));
      if (y < yearFrom || y > yearTo) return false;
      if (selectedKind !== "すべて" && resolveKindLabel(r) !== selectedKind) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.issuer.toLowerCase().includes(q) ||
        r.revisionNumber.toLowerCase().includes(q)
      );
    });
  }, [revisions, search, yearFrom, yearTo, selectedKind]);

  const showEmptyState = status === "success" && !error && filtered.length === 0;

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-24"
      aria-label="法改正一覧"
    >
      <h2 className="text-base font-bold text-slate-900 sm:text-lg">法改正一覧</h2>
      <p className="mt-1 text-xs text-slate-500 sm:text-sm">
        直近10年の主要な労働安全衛生関連の改正を収録。キーワード・年で絞り込みできます（音声入力対応）。
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-700" htmlFor="law-search">
            キーワード
          </label>
          <InputWithVoice
            className="mt-1"
            id="law-search"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="タイトル・概要・発出元で検索"
            value={search}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold text-slate-700">
            年（自）
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
              max={2026}
              min={1990}
              onChange={(e) => setYearFrom(Number(e.target.value))}
              type="number"
              value={yearFrom}
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            年（至）
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
              max={2030}
              min={1990}
              onChange={(e) => setYearTo(Number(e.target.value))}
              type="number"
              value={yearTo}
            />
          </label>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-xs font-semibold text-slate-700">種別フィルタ</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {["すべて", "法律", "省令", "通達", "告示", "ガイドライン"].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSelectedKind(k)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                selectedKind === k
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <ErrorNotice title="一覧の取得に失敗しました" error={error} onRetry={onRetry} retryLabel={retryLabel} />
      )}
      {status === "loading" && (
        <p className="mt-2 text-xs text-slate-500">法改正一覧を読み込み中です...</p>
      )}
      {showEmptyState && (
        <p className="mt-2 text-xs text-slate-500">表示できる法改正データがありません。</p>
      )}
      <ul className="mt-3 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
        {filtered.map((revision) => {
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
                  <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {revision.kind && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          KIND_BADGE_CLASS[resolveKindLabel(revision)] ?? "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {resolveKindLabel(revision)}
                      </span>
                    )}
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
