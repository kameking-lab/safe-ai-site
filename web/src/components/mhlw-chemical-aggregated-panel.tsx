"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FlaskConical, Search, ExternalLink, ClipboardCheck } from "lucide-react";
import {
  getAllMergedChemicals,
  normalizeText,
  casMatches,
  CATEGORY_LABELS_JA,
  CATEGORY_BADGE,
  CATEGORY_TO_LAW,
  CONCENTRATION_LIMITS,
  MHLW_CHEMICALS_SOURCE,
  SOURCE_LABEL,
  SOURCE_BADGE,
  TIER_LABEL,
  TIER_BADGE,
  PRIMARY_SOURCE_LABEL,
  PRIMARY_SOURCE_BADGE,
  IARC_BADGE,
  IARC_LABEL,
  rawCompact,
  type DataTier,
  type MergedChemical,
  type MhlwChemicalCategory,
  type LimitSource,
  type IarcGroup,
} from "@/lib/mhlw-chemicals";

const PAGE_SIZE = 40;

const FLAG_FILTERS: { key: keyof MergedChemical["flags"]; label: string; legal: string }[] = [
  { key: "label_sds", label: "SDS交付義務", legal: "安衛法 57・57の2" },
  { key: "skin", label: "皮膚等障害", legal: "安衛則 594の2" },
  { key: "carcinogenic", label: "がん原性物質", legal: "安衛則 577の2 Ⅲ" },
  { key: "concentration", label: "濃度基準値", legal: "安衛則 577の2" },
];

const SOURCE_FILTERS: { key: LimitSource; label: string; hint: string }[] = [
  { key: "mhlw", label: "公式（厚労告示）", hint: "厚生労働省告示第177号" },
  { key: "jsoh", label: "学会（産衛）", hint: "日本産業衛生学会 許容濃度" },
  { key: "acgih", label: "参考（ACGIH）", hint: "ACGIH TLV（参考値）" },
  { key: "reference", label: "参考値", hint: "出典は参考のみ" },
];

const IARC_FILTERS: { key: IarcGroup; label: string; hint: string }[] = [
  { key: "1", label: "Group 1", hint: "発がん性あり" },
  { key: "2A", label: "Group 2A", hint: "おそらく発がん性" },
  { key: "2B", label: "Group 2B", hint: "発がん性の可能性" },
  { key: "3", label: "Group 3", hint: "分類できない" },
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
  // CAS統合 + 濃度基準値・許容濃度・IARC のオーバーレイを反映
  const merged = useMemo(() => getAllMergedChemicals(), []);
  const totals = useMemo(() => {
    return {
      label_sds: merged.filter((m) => m.flags.label_sds).length,
      skin: merged.filter((m) => m.flags.skin).length,
      carcinogenic: merged.filter((m) => m.flags.carcinogenic).length,
      concentration: merged.filter((m) => m.flags.concentration).length,
      unique: merged.length,
      withCas: merged.filter((m) => m.cas).length,
      withMhlw177: merged.filter((m) => m.details?.tier === "mhlw_177").length,
      withIarc: merged.filter((m) => m.details?.limits?.carcinogenicity).length,
      withJsoh: merged.filter((m) => m.details?.limits?.jsoh).length,
    };
  }, [merged]);

  const [query, setQuery] = useState("");
  const [activeFlags, setActiveFlags] = useState<Record<keyof MergedChemical["flags"], boolean>>({
    label_sds: false,
    skin: false,
    carcinogenic: false,
    concentration: false,
  });
  const [activeSources, setActiveSources] = useState<Record<LimitSource, boolean>>({
    mhlw: false,
    jsoh: false,
    acgih: false,
    reference: false,
  });
  const [activeIarc, setActiveIarc] = useState<Record<IarcGroup, boolean>>({
    "1": false,
    "2A": false,
    "2B": false,
    "3": false,
  });
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const anyFlagActive = Object.values(activeFlags).some(Boolean);
  const anySourceActive = Object.values(activeSources).some(Boolean);
  const anyIarcActive = Object.values(activeIarc).some(Boolean);

  const filtered = useMemo(() => {
    const nq = normalizeText(query);
    return merged.filter((m) => {
      if (anyFlagActive) {
        let ok = false;
        (Object.keys(activeFlags) as (keyof MergedChemical["flags"])[]).forEach((k) => {
          if (activeFlags[k] && m.flags[k]) ok = true;
        });
        if (!ok) return false;
      }
      if (anySourceActive) {
        const src = m.details?.limits?.source;
        if (!src || !activeSources[src]) return false;
      }
      if (anyIarcActive) {
        const g = m.details?.limits?.iarcGroup;
        if (!g || !activeIarc[g]) return false;
      }
      if (!nq) return true;
      if (casMatches(query, m.cas)) return true;
      const hay = normalizeText(
        [m.primaryName, ...m.aliases, ...m.notes, m.cas ?? ""].join(" ")
      );
      return hay.includes(nq);
    });
  }, [merged, query, activeFlags, anyFlagActive, activeSources, anySourceActive, activeIarc, anyIarcActive]);

  // フィルタ変更時にページを 1 に戻す
  const filterKey = `${query}|${Object.values(activeFlags).join(",")}|${Object.values(activeSources).join(",")}|${Object.values(activeIarc).join(",")}`;
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
  function toggleSource(k: LimitSource) {
    setActiveSources((prev) => ({ ...prev, [k]: !prev[k] }));
  }
  function toggleIarc(k: IarcGroup) {
    setActiveIarc((prev) => ({ ...prev, [k]: !prev[k] }));
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
              <span className="rounded-full border border-violet-200 bg-white px-2 py-0.5 font-semibold text-violet-800">
                IARC分類 {totals.withIarc.toLocaleString()}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-700">
                CAS登録 {totals.withCas.toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              濃度・発がん性データ出典: 厚労告示第177号 / 産業衛生学会許容濃度（{CONCENTRATION_LIMITS.summary.withJsoh}物質） /
              IARC Monographs（{CONCENTRATION_LIMITS.summary.withIarc}物質） / ACGIH TLV（参考）
            </p>
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
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs font-semibold text-slate-600 self-center">
            データ出典（複数選択可 / OR）:
          </span>
          {SOURCE_FILTERS.map((f) => {
            const active = activeSources[f.key];
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => toggleSource(f.key)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  active
                    ? `${PRIMARY_SOURCE_BADGE[f.key]} ring-2 ring-offset-1 ring-current`
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
                aria-pressed={active}
                title={f.hint}
              >
                {active ? "☑" : "☐"} {f.label}
              </button>
            );
          })}
          {anySourceActive && (
            <button
              type="button"
              onClick={() =>
                setActiveSources({ mhlw: false, jsoh: false, acgih: false, reference: false })
              }
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
            >
              クリア
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs font-semibold text-slate-600 self-center">
            IARC発がん性分類（複数選択可 / OR）:
          </span>
          {IARC_FILTERS.map((f) => {
            const active = activeIarc[f.key];
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => toggleIarc(f.key)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  active
                    ? `${IARC_BADGE[f.key]} ring-2 ring-offset-1 ring-current`
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
                aria-pressed={active}
                title={f.hint}
              >
                {active ? "☑" : "☐"} {f.label}
              </button>
            );
          })}
          {anyIarcActive && (
            <button
              type="button"
              onClick={() =>
                setActiveIarc({ "1": false, "2A": false, "2B": false, "3": false })
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
                    {item.details?.tier && item.details.tier !== "none" && (
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TIER_BADGE[item.details.tier as DataTier]}`}
                        title="数値データの階層: 厚労告示 > 産業衛生学会 > ACGIH"
                      >
                        {TIER_LABEL[item.details.tier as DataTier]}
                      </span>
                    )}
                    {item.details?.limits?.source && (
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PRIMARY_SOURCE_BADGE[item.details.limits.source]}`}
                        title="主要データ出典"
                      >
                        {PRIMARY_SOURCE_LABEL[item.details.limits.source]}
                      </span>
                    )}
                    {item.details?.limits?.iarcGroup && (
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${IARC_BADGE[item.details.limits.iarcGroup]}`}
                        title={IARC_LABEL[item.details.limits.iarcGroup]}
                      >
                        IARC {item.details.limits.iarcGroup}
                      </span>
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
                  {item.details?.limits && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-2">
                      <dt className="mb-1 font-semibold text-amber-900">濃度値・発がん性（出典明示）</dt>
                      <dd className="space-y-1">
                        {item.details.limits.twa && (
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-semibold">8時間TWA:</span>
                            <span>{item.details.limits.twa.value} {item.details.limits.twa.unit}</span>
                            {item.details.limits.twa.source && (
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${SOURCE_BADGE[item.details.limits.twa.source] ?? ""}`}>
                                {SOURCE_LABEL[item.details.limits.twa.source] ?? item.details.limits.twa.source}
                              </span>
                            )}
                          </div>
                        )}
                        {item.details.limits.stel && (
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-semibold">短時間STEL:</span>
                            <span>{item.details.limits.stel.value} {item.details.limits.stel.unit}</span>
                            {item.details.limits.stel.source && (
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${SOURCE_BADGE[item.details.limits.stel.source] ?? ""}`}>
                                {SOURCE_LABEL[item.details.limits.stel.source] ?? item.details.limits.stel.source}
                              </span>
                            )}
                          </div>
                        )}
                        {item.details.limits.ceiling && (
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-semibold">天井値:</span>
                            <span>{item.details.limits.ceiling.value} {item.details.limits.ceiling.unit}</span>
                            {item.details.limits.ceiling.source && (
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${SOURCE_BADGE[item.details.limits.ceiling.source] ?? ""}`}>
                                {SOURCE_LABEL[item.details.limits.ceiling.source] ?? item.details.limits.ceiling.source}
                              </span>
                            )}
                          </div>
                        )}
                        {item.details.limits.carcinogenicity?.iarc && (
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-semibold">IARC発がん性:</span>
                            <span>Group {item.details.limits.carcinogenicity.iarc}</span>
                            {item.details.limits.carcinogenicity.monograph && (
                              <span className="text-slate-500">
                                （{item.details.limits.carcinogenicity.monograph}）
                              </span>
                            )}
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${SOURCE_BADGE.IARC}`}>
                              {SOURCE_LABEL.IARC}
                            </span>
                          </div>
                        )}
                        {item.details.limits.jsoh && (
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-semibold">産業衛生学会:</span>
                            <span>
                              {item.details.limits.jsoh.twa && `TWA ${item.details.limits.jsoh.twa.value} ${item.details.limits.jsoh.twa.unit}`}
                              {item.details.limits.jsoh.stel && ` / STEL ${item.details.limits.jsoh.stel.value} ${item.details.limits.jsoh.stel.unit}`}
                              {item.details.limits.jsoh.ceiling && ` / 天井 ${item.details.limits.jsoh.ceiling.value} ${item.details.limits.jsoh.ceiling.unit}`}
                            </span>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${SOURCE_BADGE.JSOH}`}>
                              {SOURCE_LABEL.JSOH}
                            </span>
                          </div>
                        )}
                        {item.details.limits.acgih && (
                          <div className="flex flex-wrap items-baseline gap-2 text-slate-600">
                            <span className="font-semibold">ACGIH（参考）:</span>
                            <span>
                              {item.details.limits.acgih.twa && `TWA ${item.details.limits.acgih.twa.value} ${item.details.limits.acgih.twa.unit}`}
                              {item.details.limits.acgih.stel && ` / STEL ${item.details.limits.acgih.stel.value} ${item.details.limits.acgih.stel.unit}`}
                              {item.details.limits.acgih.ceiling && ` / 天井 ${item.details.limits.acgih.ceiling.value} ${item.details.limits.acgih.ceiling.unit}`}
                            </span>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${SOURCE_BADGE.ACGIH}`}>
                              {SOURCE_LABEL.ACGIH}
                            </span>
                          </div>
                        )}
                      </dd>
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
