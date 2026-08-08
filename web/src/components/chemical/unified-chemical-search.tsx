"use client";

import { useEffect, useId, useState } from "react";
import { FlaskConical, Search, ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import type { MergedChemical } from "@/lib/mhlw-chemicals";
import { SITE_STATS } from "@/data/site-stats";
import {
  confirmChemicalCatalogSelection,
  searchChemicalCatalog,
} from "@/lib/chemical/search-client";
import { fetchChemicalLegalProfile } from "@/lib/chemical/legal-profile-client";

const ChemicalNotFoundRescue = dynamic(
  () =>
    import("@/components/chemical/chemical-not-found-rescue").then(
      (module) => module.ChemicalNotFoundRescue,
    ),
  {
    ssr: false,
    loading: () => (
      <p
        role="status"
        className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700"
      >
        収載状況と確認手順を準備しています。
      </p>
    ),
  },
);

/**
 * 一窓検索（一窓化 2026-07-11）: 物質名・CAS番号・法令上の名称（溶接ヒューム等の
 * CASレス告示名・群指定名）・製品名らしき入力を、1つの入力窓で受ける。
 *
 * - 統合DB（3,695物質）はクライアント側スリム索引で即時候補
 * - DBに無い名称は legal-profile API で法令名称解決（マンガン化合物 等）
 * - それでも無ければ「収載外」を正直に明示し、次の一歩（SDSのCAS確認・
 *   製品検索・AI調査）とリスクアセスメントの一般案内を返す（空白で欺かない）
 */

export type LegalNameHit = { key: string; label: string; casless: boolean };

export function UnifiedChemicalSearch({
  query,
  selectedChemical = null,
  onQueryChange,
  onPickDb,
  onPickLegal,
  onAiSearch,
  loading = false,
}: {
  query: string;
  selectedChemical?: MergedChemical | null;
  onQueryChange: (v: string) => void;
  onPickDb: (m: MergedChemical) => void;
  onPickLegal: (hit: LegalNameHit) => void;
  onAiSearch: () => void;
  loading?: boolean;
}) {
  const listId = useId();
  const inputId = "chemical-onebox-input";
  const [open, setOpen] = useState(false);
  const [legalHit, setLegalHit] = useState<LegalNameHit | null>(null);
  const [legalChecked, setLegalChecked] = useState(false);
  const [candidates, setCandidates] = useState<MergedChemical[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [pendingCandidate, setPendingCandidate] =
    useState<MergedChemical | null>(null);
  const [confirmationError, setConfirmationError] = useState<string | null>(
    null,
  );
  const [confirming, setConfirming] = useState(false);
  const [databaseChecked, setDatabaseChecked] = useState(false);
  const [databaseUnavailable, setDatabaseUnavailable] = useState(false);

  const q = query.trim();
  const normalizedQuery = q.normalize("NFKC").toLocaleLowerCase("ja-JP");
  const selectedMatchesQuery = Boolean(
    selectedChemical &&
      [
        selectedChemical.cas,
        selectedChemical.primaryName,
        ...selectedChemical.aliases,
      ].some(
        (identity) =>
          identity
            ?.normalize("NFKC")
            .trim()
            .toLocaleLowerCase("ja-JP") === normalizedQuery,
      ),
  );
  const noDbHit =
    q.length >= 2 && databaseChecked && candidates.length === 0;

  useEffect(() => {
    setCandidates([]);
    setHighlightedIndex(-1);
    setPendingCandidate(null);
    setConfirmationError(null);
    setDatabaseChecked(false);
    setDatabaseUnavailable(false);
    if (!q) return;
    if (selectedChemical && selectedMatchesQuery) {
      setCandidates([selectedChemical]);
      setDatabaseChecked(true);
      setOpen(false);
      return;
    }
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      const resultLimit = /^\d{2,7}-\d{2,3}-\d{1,2}$/.test(
        q.normalize("NFKC"),
      )
        ? 30
        : 8;
      void searchChemicalCatalog(q, resultLimit, ac.signal)
        .then((items) => {
          if (ac.signal.aborted) return;
          setCandidates(items);
          setDatabaseChecked(true);
          setDatabaseUnavailable(false);
          if (items.length > 0) setOpen(true);
        })
        .catch((error: unknown) => {
          if (
            ac.signal.aborted ||
            (error instanceof DOMException && error.name === "AbortError")
          ) {
            return;
          }
          setCandidates([]);
          setDatabaseChecked(false);
          setDatabaseUnavailable(true);
        });
    }, 180);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [q, selectedChemical, selectedMatchesQuery]);

  // DBに候補が無いときだけ、法令名称（CASレス告示名・群指定名）の解決を試す
  useEffect(() => {
    setLegalHit(null);
    setLegalChecked(false);
    if (!noDbHit) return;
    let active = true;
    const t = setTimeout(async () => {
      try {
        const j = await fetchChemicalLegalProfile<{
          resolved?: boolean;
          matchedBy?: string;
          key: string;
          label: string;
          casless?: boolean;
        }>(q);
        if (!active) return;
        if (j.resolved && j.matchedBy === "name") {
          setLegalHit({ key: j.key, label: j.label, casless: !!j.casless });
        }
      } catch {
        // ネットワーク断でも収載外カードは出す（法令解決だけ諦める）
      } finally {
        if (active) setLegalChecked(true);
      }
    }, 350);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q, noDbHit]);

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-bold text-slate-800">
        物質名・CAS番号・SDS記載名
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          id={inputId}
          data-primary-focus=""
          type="text"
          role="combobox"
          aria-expanded={open && candidates.length > 0}
          aria-controls={listId}
          aria-activedescendant={
            highlightedIndex >= 0
              ? `${listId}-option-${highlightedIndex}`
              : undefined
          }
          autoComplete="off"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && candidates.length > 0) {
              e.preventDefault();
              setOpen(true);
              setHighlightedIndex((current) =>
                current < candidates.length - 1 ? current + 1 : 0,
              );
              return;
            }
            if (e.key === "ArrowUp" && candidates.length > 0) {
              e.preventDefault();
              setOpen(true);
              setHighlightedIndex((current) =>
                current > 0 ? current - 1 : candidates.length - 1,
              );
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (
                highlightedIndex >= 0 &&
                highlightedIndex < candidates.length
              ) {
                setPendingCandidate(candidates[highlightedIndex]!);
                setConfirmationError(null);
              } else if (legalHit) {
                onPickLegal(legalHit);
                setOpen(false);
              } else if (
                candidates.length === 0 &&
                q &&
                databaseChecked &&
                !databaseUnavailable
              ) {
                onAiSearch();
              }
            }
            if (e.key === "Escape") {
              setOpen(false);
              setHighlightedIndex(-1);
              setPendingCandidate(null);
            }
          }}
          placeholder="例: トルエン / 7664-93-9 / 溶接ヒューム / ラッカーシンナー"
          className="w-full rounded-2xl border-2 border-emerald-300 bg-white py-3.5 pl-10 pr-4 text-base shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      {open && candidates.length > 1 && highlightedIndex < 0 && (
        <p role="status" className="text-sm font-semibold text-amber-800">
          複数候補があります。CAS番号とSDS記載名を確認して選んでください。
        </p>
      )}

      {q.length >= 2 && databaseUnavailable && (
        <div
          role="alert"
          data-chemical-catalog-unavailable
          className="rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
        >
          <p className="font-bold">
            化学物質データベースを現在検索できないため、収載有無を判定できません。
          </p>
          <p className="mt-1">
            「収載外」とは扱わず、通信回復後に再検索してください。作業判断は、製品固有の最新SDS、CAS番号、厚生労働省の公式ツールで確認してください。
          </p>
        </div>
      )}

      {/* 候補リスト */}
      {open && candidates.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          {candidates.map((m, i) => {
            const identity =
              m.cas === "95-47-6"
                ? "o-キシレン（オルト異性体）"
                : m.cas === "106-42-3"
                  ? "p-キシレン（パラ異性体）"
                  : m.cas === "108-38-3"
                    ? "m-キシレン（メタ異性体）"
                    : m.cas === "1330-20-7"
                      ? "キシレン（異性体混合物）"
                      : m.cas
                        ? "CASで識別する単一候補"
                        : "混合物・群指定名（CASなし）";
            const highlighted = highlightedIndex === i;
            return (
            <li
              id={`${listId}-option-${i}`}
              key={`${m.cas ?? m.primaryName}-${i}`}
              role="option"
              aria-selected={highlighted}
            >
              <button
                type="button"
                onClick={() => {
                  setHighlightedIndex(i);
                  setPendingCandidate(m);
                  setConfirmationError(null);
                }}
                className={`flex min-h-11 w-full items-start gap-2 border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-emerald-50 ${
                  highlighted ? "bg-emerald-100 outline outline-2 outline-emerald-700" : ""
                }`}
              >
                <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-800">
                    {m.primaryName}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {m.cas ? `CAS ${m.cas}` : "CAS番号なし（混合物・告示名）"}
                    {m.flags.concentration && " ・濃度基準値"}
                    {m.flags.label_sds && " ・SDS義務"}
                  </span>
                  <span className="block text-[11px] font-semibold text-slate-700">
                    識別: {identity} ／ SDS記載名候補: {m.primaryName}
                  </span>
                </span>
              </button>
            </li>
          )})}
        </ul>
      )}

      {pendingCandidate && (
        <section
          aria-labelledby={`${listId}-confirmation-title`}
          className="rounded-xl border-2 border-amber-500 bg-amber-50 p-4"
        >
          <h3
            id={`${listId}-confirmation-title`}
            className="font-bold text-amber-950"
          >
            この物質候補を確認してください
          </h3>
          <dl className="mt-2 grid gap-1 text-sm text-amber-950 sm:grid-cols-[8rem_1fr]">
            <dt className="font-bold">SDS記載名候補</dt>
            <dd>{pendingCandidate.primaryName}</dd>
            <dt className="font-bold">CAS番号</dt>
            <dd>{pendingCandidate.cas ?? "なし（混合物・群指定のため一意判定不能）"}</dd>
          </dl>
          <p className="mt-2 text-sm text-amber-950">
            手元の最新SDSに記載された名称とCAS番号の両方が一致する場合だけ続行してください。
          </p>
          {confirmationError && (
            <p role="alert" className="mt-2 font-bold text-red-800">
              {confirmationError}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={confirming || !pendingCandidate.cas}
              onClick={async () => {
                if (!pendingCandidate.cas) {
                  setConfirmationError(
                    "CAS番号がないため、この検索だけでは一意に判定できません。",
                  );
                  return;
                }
                setConfirming(true);
                setConfirmationError(null);
                try {
                  const verified = await confirmChemicalCatalogSelection(
                    pendingCandidate.cas,
                    pendingCandidate.primaryName,
                  );
                  // Keep the controlled one-box value and the confirmed
                  // identity in the same transition. This runs only after the
                  // server has verified the typed name/CAS against one unique
                  // catalog record; a raw or ambiguous query is never promoted.
                  onQueryChange(verified.primaryName);
                  onPickDb(verified);
                  setOpen(false);
                  setPendingCandidate(null);
                  setHighlightedIndex(-1);
                } catch {
                  setConfirmationError(
                    "サーバー側の一意性確認を完了できません。通信回復後に再確認してください。",
                  );
                } finally {
                  setConfirming(false);
                }
              }}
              className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {confirming ? "一意性を確認中…" : "名称とCASを確認して続行"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingCandidate(null);
                setConfirmationError(null);
              }}
              className="min-h-11 rounded-lg border border-slate-500 bg-white px-4 py-2 font-bold text-slate-800"
            >
              候補を選び直す
            </button>
          </div>
        </section>
      )}

      {/* 法令名称ヒット（DBに無いが法令索引で解決できた） */}
      {noDbHit && legalHit && (
        <button
          type="button"
          onClick={() => onPickLegal(legalHit)}
          className="flex w-full items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-left text-sm hover:bg-amber-100"
        >
          <ChevronDown className="h-4 w-4 rotate-[-90deg] text-amber-700" aria-hidden="true" />
          <span>
            <span className="font-semibold text-amber-900">法令上の名称に一致: {legalHit.label}</span>
            <span className="block text-[11px] text-amber-800">
              タップすると物質名から確認できる法令区分候補を表示します
            </span>
          </span>
        </button>
      )}

      {/* 収載外（正直な明示＋次の一歩）— 共通コンポーネント（CR2-T1）。
          RAは AI詳細調査を in-page action、SDSは同一ページ内 #sds-upload アンカーで解決。 */}
      {noDbHit && legalChecked && !legalHit && (
        <ChemicalNotFoundRescue
          query={q}
          ai={{ onClick: onAiSearch, loading }}
          sdsHref="#sds-upload"
          catalogNote={`統合DB ${SITE_STATS.mhlwMergedChemicalCount}物質・法令名称索引のいずれにも見つかりません`}
        />
      )}
    </div>
  );
}
