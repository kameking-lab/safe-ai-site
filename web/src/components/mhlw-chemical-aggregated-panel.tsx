"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FlaskConical, Search, ExternalLink, ClipboardCheck } from "lucide-react";
import {
  rawCompact,
  mergeByCas,
  normalizeText,
  casMatches,
  CATEGORY_LABELS_JA,
  CATEGORY_BADGE,
  CATEGORY_TO_LAW,
  MHLW_CHEMICALS_SOURCE,
  type MergedChemical,
  type MhlwChemicalCategory,
} from "@/lib/mhlw-chemicals";

const PAGE_SIZE = 40;

const FLAG_FILTERS: { key: keyof MergedChemical["flags"]; label: string; legal: string }[] = [
  { key: "label_sds", label: "SDS交付義務", legal: "安衛法 57・57の2" },
  { key: "skin", label: "皮膚等障害", legal: "安衛則 594の2" },
  { key: "carcinogenic", label: "がん原性物質", legal: "安衛則 577の2 Ⅲ" },
  { key: "concentration", label: "濃度基準値", legal: "安衛則 577の2" },
];

function formatUpdatedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

export function MhlwChemicalAggregatedPanel() {
  const merged = useMemo(() => mergeByCas(rawCompact.entries), []);
  const totals = useMemo(() => {
    return {
      label_sds: merged.filter((m) => m.flags.label_sds).length,
      skin: merged.filter((m) => m.flags.skin).length,
      carcinogenic: merged.filter((m) => m.flags.carcinogenic).length,
      concentration: merged.filter((m) => m.flags.concentration).length,
      unique: merged.length,
      withCas: merged.filter((m) => m.cas).length,
    };
  }, [merged]);

  const [query, setQuery] = useState("");
  const [activeFlags, setActiveFlags] = useState<Record<keyof MergedChemical["flags"], boolean>>({
    label_sds: false,
    skin: false,
    carcinogenic: false,
    concentration: false,
  });
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const anyFlagActive = Object.values(activeFlags).some(Boolean);

  const filtered = useMemo(() => {
    const nq = normalizeText(query);
    return merged.filter((m) => {
      if (anyFlagActive) {
        // OR 検索: いずれかのフラグに該当
        let ok = false;
        (Object.keys(activeFlags) as (keyof MergedChemical["flags"])[]).forEach((k) => {
          if (activeFlags[k] && m.flags[k]) ok = true;
        });
        if (!ok) return false;
      }
      if (!nq) return true;
      if (casMatches(query, m.cas)) return true;
      const hay = normalizeText(
        [m.primaryName, ...m.aliases, ...m.notes, m.cas ?? ""].join(" ")
      );
      return hay.includes(nq);
    });
  }, [merged, query, activeFlags, anyFlagActive]);

  // フィルタ変更時にページを 1 に戻す（useEffect ではなくレンダー中の同期更新）
  const filterKey = `${query}|${activeFlags.label_sds}|${activeFlags.skin}|${activeFlags.carcinogenic}|${activeFlags.concentration}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  function toggleFlag(k: keyof MergedChemical["flags"]) {
    setActiveFlags((prev) => ({ ...prev, [k]: !prev[k] }));
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー: 出典 + 最終更新 */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-sky-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
            <FlaskConical className="h-4 w-4" />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-800">
              MHLW 化学物質 {totals.unique.toLocaleString()} 件（CAS統合）
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              厚労省公開 4 リストを CAS 番号でマージ。SDS 義務・皮膚障害・がん原性・濃度基準値の該当区分を 1 画面で確認できます。
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              出典: {MHLW_CHEMICALS_SOURCE}　｜　最終更新: {formatUpdatedAt(rawCompact.generatedAt)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
              <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 font-semibold text-emerald-800">
                SDS義務 {totals.label_sds.toLocaleString()}
              </span>
              <span className="rounded-full border border-blue-200 bg-white px-2 py-0.5 font-semibold text-blue-800">
                皮膚等障害 {totals.skin.toLocaleString()}
              </span>
              <span className="rounded-full border border-rose-200 bg-white px-2 py-0.5 font-semibold text-rose-800">
                がん原性 {totals.carcinogenic.toLocaleString()}
              </span>
              <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 font-semibold text-amber-800">
                濃度基準値 {totals.concentration.toLocaleString()}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-700">
                CAS登録 {totals.withCas.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 検索 + 複数選択フィルタ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="relative block">
          <span className="sr-only">物質名・CAS番号で検索</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例: ベンゼン / 71-43-2 / 7143-2（ハイフン省略可）"
            className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs font-semibold text-slate-600 self-center">
            規制区分（複数選択可 / OR）:
          </span>
          {FLAG_FILTERS.map((f) => {
            const active = activeFlags[f.key];
            const key = f.key as MhlwChemicalCategory;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => toggleFlag(f.key)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  active
                    ? `${CATEGORY_BADGE[key]} ring-2 ring-offset-1 ring-current`
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
                aria-pressed={active}
                title={f.legal}
              >
                {active ? "☑" : "☐"} {f.label}
              </button>
            );
          })}
          {anyFlagActive && (
            <button
              type="button"
              onClick={() =>
                setActiveFlags({ label_sds: false, skin: false, carcinogenic: false, concentration: false })
              }
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
            >
              クリア
            </button>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          該当 <span className="font-semibold text-slate-700">{filtered.length.toLocaleString()}</span> 件 /
          全 {totals.unique.toLocaleString()} 物質
        </p>
      </div>

      {/* 結果 */}
      <ul className="space-y-2">
        {pageItems.map((item) => {
          const keyId = item.cas ?? `name:${item.primaryName}`;
          const isOpen = expanded === keyId;
          return (
            <li
              key={keyId}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : keyId)}
                className="flex w-full flex-wrap items-start gap-2 text-left"
                aria-expanded={isOpen}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{item.primaryName}</h4>
                    {item.cas ? (
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                        CAS {item.cas}
                      </span>
                    ) : (
                      <span className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-400">
                        CAS 未登録
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(Object.keys(item.flags) as (keyof MergedChemical["flags"])[]).map((k) =>
                      item.flags[k] ? (
                        <span
                          key={k}
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGE[k as MhlwChemicalCategory]}`}
                        >
                          {CATEGORY_LABELS_JA[k as MhlwChemicalCategory]}
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
                <span className="text-xs text-slate-400">{isOpen ? "▲閉じる" : "▼詳細"}</span>
              </button>

              {isOpen && (
                <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-700 space-y-2">
                  {item.aliases.length > 0 && (
                    <div>
                      <dt className="font-semibold text-slate-500">別名・表記揺れ</dt>
                      <dd>{item.aliases.join(" / ")}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="font-semibold text-slate-500">該当する規制区分</dt>
                    <dd className="mt-1 space-y-1">
                      {(Object.keys(item.flags) as (keyof MergedChemical["flags"])[]).map((k) => {
                        if (!item.flags[k]) return null;
                        const cat = k as MhlwChemicalCategory;
                        const applied = item.appliedDates[cat];
                        return (
                          <div key={k} className="flex flex-wrap gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGE[cat]}`}
                            >
                              {CATEGORY_LABELS_JA[cat]}
                            </span>
                            <span className="text-slate-600">{CATEGORY_TO_LAW[cat]}</span>
                            {applied && (
                              <span className="text-slate-400">適用: {applied}</span>
                            )}
                          </div>
                        );
                      })}
                    </dd>
                  </div>
                  {item.notes.length > 0 && (
                    <div>
                      <dt className="font-semibold text-slate-500">備考</dt>
                      <dd className="break-words">{item.notes.slice(0, 6).join(" / ")}</dd>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link
                      href={
                        item.cas
                          ? `/chemical-ra?cas=${encodeURIComponent(item.cas)}`
                          : `/chemical-ra?name=${encodeURIComponent(item.primaryName)}`
                      }
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white shadow hover:bg-emerald-700"
                    >
                      <ClipboardCheck className="h-3 w-3" />
                      この物質のリスクアセスメントを実施
                    </Link>
                    {item.cas && (
                      <>
                        <a
                          href={`https://anzeninfo.mhlw.go.jp/anzen_pg/KAG_FND.aspx?mc=&wd=${encodeURIComponent(item.cas)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <ExternalLink className="h-3 w-3" />
                          職場のあんぜんサイトで検索
                        </a>
                        <a
                          href={`https://commonchemistry.cas.org/results?q=${encodeURIComponent(item.cas)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <ExternalLink className="h-3 w-3" />
                          CAS Common Chemistry
                        </a>
                      </>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          該当する物質が見つかりませんでした。検索語・フィルタを変更してください。
        </p>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pageSafe <= 1}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
          >
            前へ
          </button>
          <span className="text-xs text-slate-500">
            {pageSafe} / {totalPages}（{PAGE_SIZE}件ずつ表示）
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={pageSafe >= totalPages}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
