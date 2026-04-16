"use client";

import { useMemo, useState } from "react";
import type { LawRevision, RevisionImpact } from "@/lib/types/domain";
import type { ServiceError } from "@/lib/types/api";
import { ErrorNotice } from "@/components/error-notice";
import { InputWithVoice } from "@/components/voice-input-field";

function formatDate(value: string) {
  if (!value) return null;
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

// #40: 影響度バッジ
const IMPACT_BADGE_CLASS: Record<RevisionImpact, string> = {
  高: "bg-red-100 text-red-700",
  中: "bg-amber-100 text-amber-700",
  低: "bg-slate-100 text-slate-500",
};

// main: 業種フィルタ
type IndustryFilter = "全業種" | "建設業" | "製造業";

const CONSTRUCTION_KEYWORDS = ["建設", "足場", "高所作業", "解体", "土木", "鉛", "石綿", "アスベスト", "掘削", "型枠"];
const MANUFACTURING_KEYWORDS = ["化学物質", "有機溶剤", "製造業", "機械", "プレス", "研削", "ボイラー", "特定化学", "粉じん", "爆発物"];

function resolveIndustry(revision: LawRevision): IndustryFilter[] {
  const text = `${revision.title} ${revision.summary} ${revision.category ?? ""}`.toLowerCase();
  const industries: IndustryFilter[] = [];
  if (CONSTRUCTION_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()))) {
    industries.push("建設業");
  }
  if (MANUFACTURING_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()))) {
    industries.push("製造業");
  }
  return industries.length > 0 ? industries : ["全業種"];
}

/** 出典情報ボックス（詳細展開時に表示） */
function SourceInfoBox({ revision }: { revision: LawRevision }) {
  const eGovUrl = revision.source_url ?? revision.source?.url ?? null;
  const hasNoticeNumber = revision.official_notice_number && revision.official_notice_number !== "";
  const hasPubDate = revision.publication_date && revision.publication_date !== "";
  const hasEnfDate = revision.enforcement_date && revision.enforcement_date !== "";
  const hasEGovUrl = eGovUrl && eGovUrl !== "";

  if (!hasNoticeNumber && !hasPubDate && !hasEnfDate && !hasEGovUrl) return null;

  return (
    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs">
      <p className="mb-1.5 font-semibold text-blue-800">出典・施行情報</p>
      <dl className="space-y-1">
        {hasNoticeNumber && (
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-blue-700 font-medium whitespace-nowrap">告示番号</dt>
            <dd className="text-blue-900">{revision.official_notice_number}</dd>
          </div>
        )}
        {hasPubDate && (
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-blue-700 font-medium whitespace-nowrap">公布日</dt>
            <dd className="text-blue-900">{formatDate(revision.publication_date!)}</dd>
          </div>
        )}
        {hasEnfDate && (
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-blue-700 font-medium whitespace-nowrap">施行日</dt>
            <dd className="text-blue-900 font-semibold">{formatDate(revision.enforcement_date!)}</dd>
          </div>
        )}
        {hasEGovUrl && (
          <div className="mt-2">
            <a
              href={eGovUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 transition"
            >
              e-Govで原文を確認 →
            </a>
          </div>
        )}
      </dl>
    </div>
  );
}

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
  // #40: 影響度フィルタ + ソート
  const [selectedImpact, setSelectedImpact] = useState<RevisionImpact | "すべて">("すべて");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  // main: 業種フィルタ
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryFilter>("全業種");
  // 詳細展開中のカードID
  const [expandedDetailId, setExpandedDetailId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const results = revisions.filter((r) => {
      const y = Number(r.publishedAt.slice(0, 4));
      if (y < yearFrom || y > yearTo) return false;
      if (selectedKind !== "すべて" && resolveKindLabel(r) !== selectedKind) return false;
      // #40: 影響度フィルタ
      if (selectedImpact !== "すべて" && r.impact !== selectedImpact) return false;
      // main: 業種フィルタ
      if (selectedIndustry !== "全業種") {
        const industries = resolveIndustry(r);
        if (!industries.includes(selectedIndustry) && !industries.includes("全業種")) return false;
      }
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.issuer.toLowerCase().includes(q) ||
        r.revisionNumber.toLowerCase().includes(q)
      );
    });
    // #40: 施行日ソート
    return results.sort((a, b) => {
      const diff = a.publishedAt.localeCompare(b.publishedAt);
      return sortOrder === "desc" ? -diff : diff;
    });
  }, [revisions, search, yearFrom, yearTo, selectedKind, selectedImpact, sortOrder, selectedIndustry]);

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
        <p className="text-xs font-semibold text-slate-700">業種フィルタ</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {(["全業種", "建設業", "製造業"] as IndustryFilter[]).map((ind) => (
            <button
              key={ind}
              type="button"
              onClick={() => setSelectedIndustry(ind)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                selectedIndustry === ind
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {ind}
            </button>
          ))}
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

      {/* 影響度フィルタ + 施行日ソート */}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <p className="text-xs font-semibold text-slate-700">影響度</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {(["すべて", "高", "中", "低"] as const).map((imp) => (
              <button
                key={imp}
                type="button"
                onClick={() => setSelectedImpact(imp)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  selectedImpact === imp
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {imp === "すべて" ? "すべて" : `影響度：${imp}`}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-700">施行日順</p>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => setSortOrder("desc")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                sortOrder === "desc"
                  ? "bg-slate-700 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              新しい順
            </button>
            <button
              type="button"
              onClick={() => setSortOrder("asc")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                sortOrder === "asc"
                  ? "bg-slate-700 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              古い順
            </button>
          </div>
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
          const isDetailExpanded = expandedDetailId === revision.id;
          const hasEnfDate = revision.enforcement_date && revision.enforcement_date !== "";
          const hasPubDate = revision.publication_date && revision.publication_date !== "";
          const hasNoticeNum = revision.official_notice_number && revision.official_notice_number !== "";
          const eGovUrl = revision.source_url && revision.source_url !== "" ? revision.source_url : null;

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

                {/* 日付行：公布日 / 施行日を別表示 */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  {hasPubDate ? (
                    <span>公布日: {formatDate(revision.publication_date!)}</span>
                  ) : (
                    <span>発行日: {formatDate(revision.publishedAt)}</span>
                  )}
                  {hasEnfDate && (
                    <span className="font-medium text-slate-700">
                      施行日: {formatDate(revision.enforcement_date!)}
                    </span>
                  )}
                </div>

                {/* 種別・影響度・法令番号バッジ行 */}
                {(revision.kind || revision.revisionNumber || revision.impact) && (
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
                    {revision.impact && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          IMPACT_BADGE_CLASS[revision.impact]
                        }`}
                      >
                        影響度：{revision.impact}
                      </span>
                    )}
                    {revision.revisionNumber ?? ""}
                  </p>
                )}

                {/* 告示番号 */}
                {hasNoticeNum && (
                  <p className="text-xs text-slate-500">
                    <span className="font-medium">告示番号:</span> {revision.official_notice_number}
                  </p>
                )}

                <p className="text-sm leading-6 text-slate-700">{revision.summary}</p>

                {/* 出典リンク */}
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

                {/* e-Govボタン（source_urlがあれば表示） */}
                {eGovUrl && (
                  <a
                    href={eGovUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 underline decoration-blue-200 underline-offset-2 hover:text-blue-800"
                  >
                    e-Govで原文を確認 →
                  </a>
                )}
              </div>

              {/* 詳細展開ボタン */}
              <button
                type="button"
                onClick={() => setExpandedDetailId(isDetailExpanded ? null : revision.id)}
                className="mt-2 text-xs font-medium text-slate-500 hover:text-slate-700 transition"
              >
                {isDetailExpanded ? "▲ 出典情報を閉じる" : "▼ 出典情報を表示"}
              </button>

              {/* 詳細展開パネル */}
              {isDetailExpanded && <SourceInfoBox revision={revision} />}

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
