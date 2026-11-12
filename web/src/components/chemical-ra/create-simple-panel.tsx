"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileDown, Loader2, Plus, Printer, Save, Search, Trash2, X } from "lucide-react";
import { useOptionalTransientQueryBridge } from "@/components/home-safety-cockpit/transient-query-bridge";
import { KyHandoffLink } from "@/components/ky-handoff-link";
import { inspectChemicalNavigationQuery } from "@/lib/chemical/query-safety";
import { assessCreateSimple } from "@/lib/create-simple/assess";
import { loadSubstanceData, type LoadedSubstanceData } from "@/lib/create-simple/client-data";
import { planImprovements, suggestImprovements, summarize, worstLevel } from "@/lib/create-simple/improvements";
import {
  AMOUNT_LABEL,
  CONTACT_AREA_LABEL,
  GLOVE_LABEL,
  GLOVE_TRAINING_LABEL,
  RISK_LEVEL_MEANING,
  VENTILATION_LABEL,
  WORKING_HOURS_LABEL,
} from "@/lib/create-simple/labels";
import { substanceFromOfficial, volatilityAtProcessTemperature, type OfficialSubstanceRecord } from "@/lib/create-simple/official";
import { deleteRecord, loadRecords, recordsToCsv, saveRecord, type CsSavedRecord } from "@/lib/create-simple/records";
import { searchSubstances } from "@/lib/create-simple/search";
import type {
  CsAmountLevel,
  CsComponent,
  CsConditions,
  CsContactArea,
  CsGloveTraining,
  CsGloveUse,
  CsPropertyType,
  CsSubstance,
  CsVentilationLevel,
  CsVolatility,
  CsWorkingHours,
} from "@/lib/create-simple/types";
import { ChoiceChips, YesNoChips } from "./choice-chips";
import { ComponentCard } from "./component-card";
import { ManualSubstanceForm } from "./manual-substance-form";
import { PrintReport } from "./print-report";
import { LevelBadge, ResultView } from "./result-view";

const EXAMPLES = ["トルエン", "キシレン", "酢酸エチル"];

interface ComponentDraft {
  key: string;
  record: OfficialSubstanceRecord | null;
  manual: CsSubstance | null;
  contentText: string;
  volatilityOverride: CsVolatility | null;
  propertyTypeOverride: CsPropertyType | null;
}

interface ConditionDraft {
  productType: CsPropertyType;
  amountLevel: CsAmountLevel | null;
  spray: boolean;
  largeArea: boolean;
  ventilation: CsVentilationLevel | null;
  controlVelocityConfirmed: boolean | null;
  workingHours: CsWorkingHours | null;
  frequencyType: "weekly" | "monthly";
  frequencyDays: number | null;
  exposureVariation: "small" | "large";
  contactArea: CsContactArea | null;
  glove: CsGloveUse;
  gloveTraining: CsGloveTraining;
  aboveRoomTemperature: boolean;
  temperatureText: string;
  ignitionSourceRemoved: boolean;
  explosiveAtmospherePrevented: boolean;
  organicOrMetalNearby: boolean;
  airOrWaterContact: boolean;
}

const INITIAL_CONDITIONS: ConditionDraft = {
  productType: 1,
  amountLevel: null,
  spray: false,
  largeArea: false,
  ventilation: null,
  controlVelocityConfirmed: null,
  workingHours: null,
  frequencyType: "weekly",
  frequencyDays: null,
  exposureVariation: "small",
  contactArea: null,
  glove: "none",
  gloveTraining: "none",
  aboveRoomTemperature: false,
  temperatureText: "",
  ignitionSourceRemoved: false,
  explosiveAtmospherePrevented: false,
  organicOrMetalNearby: true,
  airOrWaterContact: true,
};

let keySeq = 0;
const nextKey = () => `c${++keySeq}`;

function parseContent(text: string): number | null {
  const n = Number(text.normalize("NFKC").replace(/[%％\s]/g, ""));
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : null;
}

function processTemperature(d: ConditionDraft): number | null {
  if (!d.aboveRoomTemperature) return null;
  const n = Number(d.temperatureText.normalize("NFKC"));
  return Number.isFinite(n) ? n : null;
}

/** 成分の入力から、判定に使う STEP2 の1行を作る */
export function effectiveSubstance(c: ComponentDraft, productType: CsPropertyType, temperature: number | null): CsSubstance | null {
  const base = c.record ? substanceFromOfficial(c.record, productType) : c.manual;
  if (!base) return null;
  const s: CsSubstance = { ...base };
  if (s.propertyType === null && c.propertyTypeOverride !== null) s.propertyType = c.propertyTypeOverride;
  if (c.volatilityOverride !== null) {
    s.volatility = c.volatilityOverride;
  } else if (s.propertyType === 1 && s.boilingPoint !== null && temperature !== null && s.volatility !== null && s.volatility !== 4) {
    // 作業温度が室温以外の場合の揮発性（設計基準 3.1、公式の物質情報フォームの式）
    s.volatility = volatilityAtProcessTemperature(s.boilingPoint, temperature);
  }
  if (s.volatility === null && s.propertyType === 3) s.volatility = 0;
  return s;
}

function toConditions(d: ConditionDraft): { conditions: CsConditions | null; missing: string[] } {
  const missing: string[] = [];
  if (d.amountLevel === null) missing.push("取扱量");
  if (d.ventilation === null) missing.push("換気");
  if ((d.ventilation === "D" || d.ventilation === "E") && d.controlVelocityConfirmed === null) missing.push("制御風速の確認");
  if (d.workingHours === null) missing.push("1日の作業時間");
  if (d.frequencyDays === null) missing.push("頻度");
  if (d.aboveRoomTemperature && processTemperature(d) === null) missing.push("取扱温度");
  if (missing.length > 0 || d.amountLevel === null || d.ventilation === null || d.workingHours === null || d.frequencyDays === null) {
    return { conditions: null, missing };
  }
  return {
    missing,
    conditions: {
      productType: d.productType,
      amountLevel: d.amountLevel,
      spray: d.spray,
      largeArea: d.largeArea,
      ventilation: d.ventilation,
      controlVelocityConfirmed: d.controlVelocityConfirmed ?? false,
      workingHours: d.workingHours,
      frequencyType: d.frequencyType,
      frequencyDays: d.frequencyDays,
      exposureVariation: d.exposureVariation,
      contactArea: d.contactArea,
      glove: d.glove,
      gloveTraining: d.glove === "resistant" ? d.gloveTraining : "none",
      processTemperature: processTemperature(d),
      ignitionSourceRemoved: d.ignitionSourceRemoved,
      explosiveAtmospherePrevented: d.explosiveAtmospherePrevented,
      organicOrMetalNearby: d.organicOrMetalNearby,
      airOrWaterContact: d.airOrWaterContact,
    },
  };
}

function fromConditions(c: CsConditions): ConditionDraft {
  return {
    ...c,
    controlVelocityConfirmed: c.ventilation === "D" || c.ventilation === "E" ? c.controlVelocityConfirmed : null,
    aboveRoomTemperature: c.processTemperature !== null,
    temperatureText: c.processTemperature !== null ? String(c.processTemperature) : "",
  };
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CreateSimplePanel({ initialQuery = "" }: { initialQuery?: string }) {
  const bridge = useOptionalTransientQueryBridge();
  const [data, setData] = useState<LoadedSubstanceData | null>(null);
  const [dataError, setDataError] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [components, setComponents] = useState<ComponentDraft[]>([]);
  const [draft, setDraft] = useState<ConditionDraft>(INITIAL_CONDITIONS);
  const [showManual, setShowManual] = useState(false);
  const [title, setTitle] = useState("");
  const [records, setRecords] = useState<CsSavedRecord[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const pendingCasRef = useRef<string | null>(null);

  const ensureData = useCallback(() => {
    if (data) return;
    loadSubstanceData()
      .then((loaded) => {
        setData(loaded);
        setDataError(false);
      })
      .catch(() => setDataError(true));
  }, [data]);

  useEffect(() => {
    setRecords(loadRecords());
    if (initialQuery) ensureData();
    else {
      const cas = new URLSearchParams(window.location.search).get('cas');
      if (cas && /^\d{2,7}-\d{2}-\d$/.test(cas)) {setQuery(cas);pendingCasRef.current=cas;ensureData();}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ホームの検索などから渡された物質名（メモリ上の一回限りの受け渡し）
  useEffect(() => {
    if (!bridge) return;
    const pending = bridge.peekChemicalQuery();
    if (!pending) return;
    const inspection = inspectChemicalNavigationQuery(pending.query);
    if (!inspection.allowed) {
      bridge.discardChemicalQuery(pending.id);
      return;
    }
    bridge.consumeChemicalQuery(pending.id);
    setQuery(inspection.normalized);
    pendingCasRef.current = pending.confirmedCas;
    ensureData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridge?.revision]);

  const candidates = useMemo(() => (data ? searchSubstances(data.index, query, 8) : []), [data, query]);

  const addRecord = useCallback((record: OfficialSubstanceRecord) => {
    setComponents((prev) => {
      if (prev.some((c) => c.record?.[0] === record[0])) return prev;
      if (prev.length === 0) {
        const type = record[5][0];
        if (type === 1 || type === 2 || type === 3) setDraft((d) => ({ ...d, productType: type }));
      }
      return [
        ...prev,
        { key: nextKey(), record, manual: null, contentText: prev.length === 0 ? "100" : "", volatilityOverride: null, propertyTypeOverride: null },
      ];
    });
    setQuery("");
  }, []);

  // 確認済み CAS か、CAS 番号で1件だけ一致したら自動で追加する
  useEffect(() => {
    if (!data) return;
    const cas = pendingCasRef.current ?? (/^\d{2,7}-\d{2}-\d$/.test(query.trim()) ? query.trim() : null);
    if (!cas) return;
    pendingCasRef.current = null;
    const record = data.byCas.get(cas);
    if (record) addRecord(record);
  }, [data, query, addRecord]);

  const temperature = processTemperature(draft);
  const substances = useMemo(
    () => components.map((c) => ({ draft: c, substance: effectiveSubstance(c, draft.productType, temperature) })),
    [components, draft.productType, temperature],
  );
  const contentMissing = components.some((c) => parseContent(c.contentText) === null);
  // CREATE-SIMPLE excludes liquid/gas components in a powder product. A product
  // containing only these components would otherwise show five empty results.
  const powderUnsupported = substances.length > 0 && substances.every(({substance}) =>
    substance?.propertyType === 1 || substance?.propertyType === 3,
  );
  const productStateMissing = draft.productType === 2 && powderUnsupported;
  const converted = toConditions(draft);
  const conditions = productStateMissing ? null : converted.conditions;
  const missing = [...converted.missing, ...(productStateMissing ? ["製品の状態（液体または気体）"] : [])];

  const input = useMemo(() => {
    if (!conditions || components.length === 0 || contentMissing) return null;
    const comps: CsComponent[] = [];
    for (const s of substances) {
      const content = parseContent(s.draft.contentText);
      if (!s.substance || content === null) return null;
      comps.push({ substance: s.substance, contentPercent: content });
    }
    return { conditions, components: comps };
  }, [conditions, components.length, contentMissing, substances]);

  const result = useMemo(() => (input ? assessCreateSimple(input) : null), [input]);
  const improvements = useMemo(() => (input ? suggestImprovements(input) : []), [input]);
  const plan = useMemo(() => (input ? planImprovements(input) : null), [input]);
  const worst = useMemo(() => (result ? worstLevel(summarize(result)) : null), [result]);

  const update = <K extends keyof ConditionDraft>(key: K, value: ConditionDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const applyConditions = (c: CsConditions) => {
    setDraft(fromConditions(c));
    setNotice("対策後の条件にしました。結果が更新されています。");
  };

  const missingAll = [
    ...(components.length === 0 ? ["物質"] : []),
    ...(contentMissing ? ["含有率"] : []),
    ...missing,
  ];

  const onSave = () => {
    if (!input) return;
    const saved = saveRecord({
      title: title.trim() || `${input.components[0].substance.name}の作業`,
      conditions: input.conditions,
      components: input.components,
    });
    setRecords(loadRecords());
    setNotice(`「${saved.title}」をこの端末に保存しました。`);
  };

  const openRecord = (r: CsSavedRecord) => {
    setDraft(fromConditions(r.conditions));
    setComponents(
      r.components.map((c) => ({
        key: nextKey(),
        record: null,
        manual: c.substance,
        contentText: String(c.contentPercent),
        volatilityOverride: null,
        propertyTypeOverride: null,
      })),
    );
    setTitle(r.title);
    setNotice(`「${r.title}」を開きました。`);
  };

  const amountOptions = ([1, 2, 3, 4, 5] as CsAmountLevel[]).map((v) => {
    const [name, range] = AMOUNT_LABEL[draft.productType][v].split("（");
    return { value: v, label: name, hint: range ? range.replace("）", "") : undefined };
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-10 sm:px-6 lg:px-8">
      <div className="space-y-5 print:hidden">
        {/* ① 物質 */}
        <section aria-labelledby="cs-step1" className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h2 id="cs-step1" className="text-lg font-black text-slate-950 dark:text-white">
            ① 扱う物質
          </h2>
          <div className="mt-3">
            <label htmlFor="chemical-onebox-input" className="text-sm font-bold text-slate-900 dark:text-slate-100">
              物質名またはCAS番号
            </label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="chemical-onebox-input"
                data-primary-focus="true"
                type="search"
                inputMode="search"
                autoComplete="off"
                value={query}
                onFocus={ensureData}
                onChange={(e) => {
                  setQuery(e.target.value);
                  ensureData();
                }}
                placeholder="例: トルエン / 108-88-3"
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-base text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
              />
            </div>
            {query.trim() === "" && components.length === 0 && (
              <div className="mt-2 flex flex-wrap gap-2" aria-label="よく使われる物質">
                {EXAMPLES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    data-service-candidate-chip="true"
                    onClick={() => {
                      setQuery(name);
                      ensureData();
                    }}
                    className="min-h-10 rounded-full border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:border-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            {query.trim() !== "" && (
              <div className="mt-2" aria-live="polite">
                {!data && !dataError && (
                  <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    物質データを読み込み中…
                  </p>
                )}
                {dataError && (
                  <p role="alert" className="text-sm font-semibold text-rose-700">
                    物質データを読み込めませんでした。通信状況を確認して、もう一度入力してください。
                  </p>
                )}
                {data && candidates.length === 0 && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    見つかりません。SDSのCAS番号で探すか、下の「一覧にない物質を入力」から入れてください。
                  </p>
                )}
                {candidates.length > 0 && (
                  <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                    {candidates.map((r) => (
                      <li key={r[0]}>
                        <button
                          type="button"
                          onClick={() => addRecord(r)}
                          className="flex min-h-12 w-full items-center gap-3 bg-white px-3 py-2 text-left hover:bg-emerald-50 dark:bg-slate-900 dark:hover:bg-slate-800"
                        >
                          <Plus className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{r[1]}</span>
                            <span className="block text-xs text-slate-600 dark:text-slate-400">CAS {r[0]}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {components.length > 0 && (
            <ul className="mt-4 space-y-3" aria-label="判定する物質">
              {substances.map(({ draft: c, substance }) => (
                <li key={c.key}>
                  <ComponentCard
                    substance={substance}
                    productType={draft.productType}
                    contentText={c.contentText}
                    temperature={temperature}
                    volatilityOverridden={c.volatilityOverride !== null}
                    onContentChange={(text) =>
                      setComponents((prev) => prev.map((x) => (x.key === c.key ? { ...x, contentText: text } : x)))
                    }
                    onVolatilityChange={(v) =>
                      setComponents((prev) => prev.map((x) => (x.key === c.key ? { ...x, volatilityOverride: v } : x)))
                    }
                    onPropertyTypeChange={(v) =>
                      setComponents((prev) =>
                        prev.map((x) => (x.key === c.key ? { ...x, propertyTypeOverride: v, volatilityOverride: v === 3 ? 0 : null } : x)),
                      )
                    }
                    onRemove={() => setComponents((prev) => prev.filter((x) => x.key !== c.key))}
                  />
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3">
            {showManual ? (
              <ManualSubstanceForm
                productType={draft.productType}
                onCancel={() => setShowManual(false)}
                onAdd={(substance) => {
                  setComponents((prev) => [
                    ...prev,
                    { key: nextKey(), record: null, manual: substance, contentText: prev.length === 0 ? "100" : "", volatilityOverride: null, propertyTypeOverride: null },
                  ]);
                  setShowManual(false);
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowManual(true)}
                className="min-h-11 text-sm font-semibold text-emerald-800 underline underline-offset-4 dark:text-emerald-300"
              >
                一覧にない物質を入力
              </button>
            )}
          </div>
        </section>

        {components.length > 0 && (
          <>
            {/* ② 作業条件 */}
            <section aria-labelledby="cs-step2" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <h2 id="cs-step2" className="text-lg font-black text-slate-950 dark:text-white">
                ② 作業のようす
              </h2>
              <ChoiceChips<CsPropertyType>
                label="製品の状態"
                columns={3}
                options={[
                  { value: 1, label: "液体" },
                  { value: 2, label: "粉体", disabled: powderUnsupported },
                  { value: 3, label: "気体" },
                ]}
                value={draft.productType}
                onChange={(v) => update("productType", v)}
              />
              <ChoiceChips<CsAmountLevel>
                label="1回（1日）に扱う量"
                options={amountOptions}
                value={draft.amountLevel}
                onChange={(v) => update("amountLevel", v)}
                required
              />
              <ChoiceChips<CsVentilationLevel>
                label="換気"
                options={(["A", "B", "C", "D", "E", "F"] as CsVentilationLevel[]).map((v) => ({ value: v, label: VENTILATION_LABEL[v], hint: `レベル${v}` }))}
                value={draft.ventilation}
                onChange={(v) => update("ventilation", v)}
                required
              />
              {(draft.ventilation === "D" || draft.ventilation === "E") && (
                <ChoiceChips<"yes" | "no">
                  label="局所排気装置の制御風速"
                  description="液体 0.4〜1.0 m/s、粉体 0.7〜1.2 m/s が目安。プッシュプル型は外付け式・確認済みを選びます。"
                  options={[
                    { value: "yes", label: "測って確認している" },
                    { value: "no", label: "確認していない" },
                  ]}
                  value={draft.controlVelocityConfirmed === null ? null : draft.controlVelocityConfirmed ? "yes" : "no"}
                  onChange={(v) => update("controlVelocityConfirmed", v === "yes")}
                  required
                />
              )}
              <div>
                <label htmlFor="cs-hours" className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                  1日の作業時間（準備・片付けを含む）
                  {draft.workingHours === null && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">選択してください</span>
                  )}
                </label>
                <select
                  id="cs-hours"
                  value={draft.workingHours ?? ""}
                  onChange={(e) => update("workingHours", e.target.value === "" ? null : (Number(e.target.value) as CsWorkingHours))}
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">選ぶ</option>
                  {([10, 8, 7, 6, 5, 4, 3, 2, 1, 0.5] as CsWorkingHours[]).map((h) => (
                    <option key={h} value={h}>
                      {WORKING_HOURS_LABEL[h]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <ChoiceChips<"weekly" | "monthly">
                  label="頻度"
                  options={[
                    { value: "weekly", label: "週1回以上" },
                    { value: "monthly", label: "週1回未満" },
                  ]}
                  value={draft.frequencyType}
                  onChange={(v) => setDraft((d) => ({ ...d, frequencyType: v, frequencyDays: null }))}
                />
                <label htmlFor="cs-days" className="sr-only">
                  日数
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <select
                    id="cs-days"
                    value={draft.frequencyDays ?? ""}
                    onChange={(e) => update("frequencyDays", e.target.value === "" ? null : Number(e.target.value))}
                    className="min-h-12 w-32 rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="">日数</option>
                    {Array.from({ length: draft.frequencyType === "weekly" ? 7 : 31 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-slate-700 dark:text-slate-200">{draft.frequencyType === "weekly" ? "日／週" : "日／月"}</span>
                  {draft.frequencyDays === null && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">選択してください</span>
                  )}
                </div>
              </div>
              <YesNoChips
                label={draft.productType === 2 ? "粉体塗装・研磨など粉が舞いやすい作業" : "スプレーなど空気中に飛び散りやすい作業"}
                value={draft.spray}
                onChange={(v) => update("spray", v)}
              />
              {draft.productType === 1 && (draft.amountLevel === 1 || draft.amountLevel === 2) && (
                <YesNoChips label="塗る面積の合計が 1m² 以上" value={draft.largeArea} onChange={(v) => update("largeArea", v)} />
              )}
              <ChoiceChips<CsContactArea>
                label="皮膚に付く範囲"
                description="経皮吸収の判定に使います。付かない作業でも、こぼれ・飛沫を想定して選びます。"
                options={([10, 240, 480, 960, 1500, 1980] as CsContactArea[]).map((v) => ({ value: v, label: CONTACT_AREA_LABEL[v] }))}
                value={draft.contactArea}
                onChange={(v) => update("contactArea", v)}
              />
            </section>

            {/* 条件を選んでいる間も、画面の下に結果（リスクレベル）を出し続ける。 */}
            <a
              href="#cs-step3"
              data-cs-result-bar=""
              aria-live="polite"
              className="sticky bottom-[calc(var(--mobile-bottom-nav-h,0px)+env(safe-area-inset-bottom,0px)+8px)] z-20 flex min-h-14 items-center gap-3 rounded-2xl border-2 border-slate-900 bg-white px-3 py-2 shadow-lg dark:border-slate-200 dark:bg-slate-900"
            >
              {worst ? (
                <>
                  <LevelBadge level={worst} />
                  <span className="min-w-0 flex-1 text-sm font-black text-slate-950 dark:text-white">{RISK_LEVEL_MEANING[worst]}</span>
                  <span className="shrink-0 text-xs font-bold text-emerald-800 dark:text-emerald-300">下げ方↓</span>
                </>
              ) : missingAll.length > 0 ? (
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  リスクレベルは「{missingAll.join("・")}」を選ぶと出ます
                </span>
              ) : (
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">判定できない項目は、下の物質ごとの内訳を確認してください。</span>
              )}
            </a>

            <details className="group rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2">
                <span>
                  <span className="block text-base font-black text-slate-950 dark:text-white">手袋・爆発火災などの条件</span>
                  <span className="block text-xs text-slate-600 dark:text-slate-300">
                    手袋: {GLOVE_LABEL[draft.glove]}／着火源対策: {draft.ignitionSourceRemoved ? "あり" : "なし"}／爆発性雰囲気対策: {draft.explosiveAtmospherePrevented ? "あり" : "なし"}／温度: {draft.aboveRoomTemperature ? `${draft.temperatureText || "?"}℃` : "室温"}
                  </span>
                </span>
                <span className="shrink-0 whitespace-nowrap text-sm font-bold text-emerald-800 group-open:hidden dark:text-emerald-300">変更</span>
              </summary>
              <div className="mt-4 space-y-5">
                <ChoiceChips<"small" | "large">
                  label="濃度の変動"
                  description="作業中に濃度が大きく上下する作業（投入・開放・清掃など）は「大きい」"
                  options={[
                    { value: "small", label: "小さい" },
                    { value: "large", label: "大きい" },
                  ]}
                  value={draft.exposureVariation}
                  onChange={(v) => update("exposureVariation", v)}
                />
                <ChoiceChips<CsGloveUse>
                  label="手袋"
                  columns={1}
                  options={(["none", "noInfo", "resistant"] as CsGloveUse[]).map((v) => ({ value: v, label: GLOVE_LABEL[v] }))}
                  value={draft.glove}
                  onChange={(v) => update("glove", v)}
                />
                {draft.glove === "resistant" && (
                  <ChoiceChips<CsGloveTraining>
                    label="手袋の使い方の教育"
                    columns={1}
                    options={(["none", "basic", "thorough"] as CsGloveTraining[]).map((v) => ({ value: v, label: GLOVE_TRAINING_LABEL[v] }))}
                    value={draft.gloveTraining}
                    onChange={(v) => update("gloveTraining", v)}
                  />
                )}
                <div>
                  <ChoiceChips<"room" | "above">
                    label="取扱温度"
                    options={[
                      { value: "room", label: "室温" },
                      { value: "above", label: "室温より高い" },
                    ]}
                    value={draft.aboveRoomTemperature ? "above" : "room"}
                    onChange={(v) => update("aboveRoomTemperature", v === "above")}
                  />
                  {draft.aboveRoomTemperature && (
                    <div className="mt-2 flex items-center gap-2">
                      <label htmlFor="cs-temp" className="sr-only">
                        取扱温度（℃）
                      </label>
                      <input
                        id="cs-temp"
                        inputMode="decimal"
                        value={draft.temperatureText}
                        onChange={(e) => update("temperatureText", e.target.value)}
                        placeholder="例: 60"
                        className="min-h-12 w-28 rounded-xl border border-slate-300 px-3 text-base dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-200">℃</span>
                    </div>
                  )}
                </div>
                <YesNoChips label="着火源を取り除く対策をしている" value={draft.ignitionSourceRemoved} onChange={(v) => update("ignitionSourceRemoved", v)} />
                <YesNoChips label="爆発性雰囲気をつくらない対策をしている" value={draft.explosiveAtmospherePrevented} onChange={(v) => update("explosiveAtmospherePrevented", v)} />
                <YesNoChips label="近くで有機物や金属を扱っている" value={draft.organicOrMetalNearby} onChange={(v) => update("organicOrMetalNearby", v)} />
                <YesNoChips label="空気や水に触れる可能性がある" value={draft.airOrWaterContact} onChange={(v) => update("airOrWaterContact", v)} />
              </div>
            </details>

            {/* ③ 結果 */}
            <section aria-labelledby="cs-step3" aria-live="polite" className="rounded-2xl border-2 border-slate-900 bg-white p-4 dark:border-slate-200 dark:bg-slate-900">
              <h2 id="cs-step3" className="text-lg font-black text-slate-950 dark:text-white">
                ③ リスクレベル
              </h2>
              {!result || !input ? (
                <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {missingAll.length > 0 ? `あと「${missingAll.join("・")}」を入れると、その場で判定します。` : "物質の情報を確認してください。"}
                </p>
              ) : (
                <ResultView
                  result={result}
                  improvements={improvements}
                  plan={plan}
                  onApply={applyConditions}
                />
              )}
              {notice && (
                <p role="status" className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <span className="flex-1">{notice}</span>
                  <button type="button" aria-label="閉じる" onClick={() => setNotice(null)} className="min-h-8 min-w-8">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </p>
              )}
              {result && input && (
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <label htmlFor="cs-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    記録の名前（作業名）
                  </label>
                  <input
                    id="cs-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={`${input.components[0].substance.name}の作業`}
                    className="min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={onSave} className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-2 text-sm font-bold text-white hover:bg-emerald-800">
                      <Save className="h-4 w-4" aria-hidden="true" />
                      保存
                    </button>
                    <button type="button" onClick={() => window.print()} className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-2 text-sm font-bold text-slate-800 hover:border-emerald-600 dark:border-slate-600 dark:text-slate-100">
                      <Printer className="h-4 w-4" aria-hidden="true" />
                      印刷・PDF
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadCsv(
                          `化学物質RA_${new Date().toISOString().slice(0, 10)}.csv`,
                          recordsToCsv([{ id: "current", savedAt: new Date().toISOString(), title: title.trim() || `${input.components[0].substance.name}の作業`, conditions: input.conditions, components: input.components }]),
                        )
                      }
                      className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-2 text-sm font-bold text-slate-800 hover:border-emerald-600 dark:border-slate-600 dark:text-slate-100"
                    >
                      <FileDown className="h-4 w-4" aria-hidden="true" />
                      CSV
                    </button>
                  </div>
                  {input.components[0].substance.cas && (
                    <KyHandoffLink
                      handoff={{
                        source: "chemical-ra",
                        chemicalId: `cas:${input.components[0].substance.cas}`,
                        cas: input.components[0].substance.cas,
                        workCategory: "chemical",
                        hazardIds: ["chemical-exposure", "chemical-splash"],
                        measureIds: ["chemical-substitute", "chemical-local-exhaust", "chemical-sds"],
                        ...(title.trim() ? { workDraft: title.trim() } : {}),
                      }}
                      className="inline-flex min-h-11 items-center text-sm font-bold text-emerald-800 underline underline-offset-4 dark:text-emerald-300"
                    >
                      この作業条件をKYへ
                    </KyHandoffLink>
                  )}
                </div>
              )}
            </section>

          </>
        )}

        {records.length > 0 && (
          <section aria-labelledby="cs-records" className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2">
              <h2 id="cs-records" className="text-base font-black text-slate-950 dark:text-white">
                保存した記録（{records.length}）
              </h2>
              <button
                type="button"
                onClick={() => downloadCsv(`化学物質RA_記録一覧_${new Date().toISOString().slice(0, 10)}.csv`, recordsToCsv(records))}
                className="flex min-h-11 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-800 dark:border-slate-600 dark:text-slate-100"
              >
                <FileDown className="h-4 w-4" aria-hidden="true" />
                全件CSV
              </button>
            </div>
            <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {records.map((r) => (
                <li key={r.id} className="flex items-center gap-2 py-2">
                  <button type="button" onClick={() => openRecord(r)} className="min-h-11 min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{r.title}</span>
                    <span className="block text-xs text-slate-600 dark:text-slate-400">
                      {new Date(r.savedAt).toLocaleString("ja-JP")}・{r.components.map((c) => c.substance.name).join("、")}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`「${r.title}」を削除`}
                    onClick={() => {
                      if (!window.confirm(`「${r.title}」を削除します。元に戻せません。`)) return;
                      deleteRecord(r.id);
                      setRecords(loadRecords());
                    }}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-xs text-slate-600 dark:text-slate-400">厚生労働省 CREATE-SIMPLE の手法に基づく計算</p>
      </div>

      {result && input && (
        <PrintReport
          title={title.trim() || `${input.components[0].substance.name}の作業`}
          input={input}
          result={result}
          improvements={improvements}
        />
      )}
    </div>
  );
}
