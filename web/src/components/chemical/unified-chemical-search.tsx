"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FlaskConical, Search, ChevronDown } from "lucide-react";
import type { MergedChemical } from "@/lib/mhlw-chemicals";
import { searchMergedChemicalsSlim, MHLW_MERGED_CHEMICAL_COUNT_SLIM } from "@/lib/mhlw-chemicals-slim";
import { ChemicalNotFoundRescue } from "@/components/chemical/chemical-not-found-rescue";

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
  onQueryChange,
  onPickDb,
  onPickLegal,
  onAiSearch,
  loading = false,
}: {
  query: string;
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
  const abortRef = useRef<AbortController | null>(null);

  const q = query.trim();
  const candidates = q.length >= 1 ? searchMergedChemicalsSlim(q, 8) : [];
  const noDbHit = q.length >= 2 && candidates.length === 0;

  // DBに候補が無いときだけ、法令名称（CASレス告示名・群指定名）の解決を試す
  useEffect(() => {
    setLegalHit(null);
    setLegalChecked(false);
    if (!noDbHit) return;
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const res = await fetch(`/api/chemical/legal-profile?q=${encodeURIComponent(q)}`, {
          signal: ac.signal,
        });
        const j = await res.json();
        if (j.resolved && j.matchedBy === "name") {
          setLegalHit({ key: j.key, label: j.label, casless: !!j.casless });
        }
      } catch {
        // ネットワーク断でも収載外カードは出す（法令解決だけ諦める）
      } finally {
        setLegalChecked(true);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q, noDbHit]);

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-bold text-slate-800">
        物質名・CAS番号・製品名を入力（{MHLW_MERGED_CHEMICAL_COUNT_SLIM.toLocaleString()}
        物質＋法令名称に対応）
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open && candidates.length > 0}
          aria-controls={listId}
          autoComplete="off"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (candidates.length > 0) {
                onPickDb(candidates[0]);
                setOpen(false);
              } else if (legalHit) {
                onPickLegal(legalHit);
                setOpen(false);
              } else if (q) {
                onAiSearch();
              }
            }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="例: トルエン / 7664-93-9 / 溶接ヒューム / ラッカーシンナー"
          className="w-full rounded-2xl border-2 border-emerald-300 bg-white py-3.5 pl-10 pr-4 text-base shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      </div>

      {/* 候補リスト */}
      {open && candidates.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          {candidates.map((m, i) => (
            <li key={`${m.cas ?? m.primaryName}-${i}`} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => {
                  onPickDb(m);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2 border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-emerald-50"
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
                </span>
              </button>
            </li>
          ))}
        </ul>
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
              タップすると該当法令の結論を表示します
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
          catalogNote={`統合DB ${MHLW_MERGED_CHEMICAL_COUNT_SLIM.toLocaleString()}物質・法令名称索引のいずれにも見つかりません`}
        />
      )}
    </div>
  );
}
