"use client";

import { useState } from "react";
import type { CsGhs, CsGhsKey, CsOelUnit, CsPropertyType, CsSubstance, CsVolatility } from "@/lib/create-simple/types";
import { GHS_LABEL, VOLATILITY_LABEL } from "@/lib/create-simple/labels";
import { ChoiceChips } from "./choice-chips";

/** SDS の2項（GHS分類）から入力する区分の候補（公式 SelectList と同じ選択肢） */
const GHS_OPTIONS: Partial<Record<CsGhsKey, string[]>> = {
  acuteToxOral: ["1", "2", "3", "4"],
  acuteToxDermal: ["1", "2", "3", "4"],
  acuteToxInhalationGases: ["1", "2", "3", "4"],
  acuteToxInhalationVapors: ["1", "2", "3", "4"],
  acuteToxInhalationDustOrMist: ["1", "2", "3", "4"],
  skinCorrOrIrrit: ["1", "1A", "1B", "1C", "2"],
  eyeCorrOrIrrit: ["1", "2", "2A", "2B"],
  respSens: ["1", "1A", "1B"],
  skinSens: ["1", "1A", "1B"],
  muta: ["1A", "1B", "2"],
  carc: ["1A", "1B", "2"],
  repr: ["1A", "1B", "2"],
  stotSe: ["1", "2", "3"],
  stotRe: ["1", "2"],
  aspTox: ["1"],
  flamLiq: ["1", "2", "3", "4"],
  flamSol: ["1", "2"],
  flamGas: ["1", "2"],
  oxLiq: ["1", "2", "3"],
  oxSol: ["1", "2", "3"],
};

function num(text: string): number | null {
  if (text.trim() === "") return null;
  const n = Number(text.normalize("NFKC"));
  return Number.isFinite(n) ? n : null;
}

const inputClass =
  "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base dark:border-slate-600 dark:bg-slate-950 dark:text-white";

export function ManualSubstanceForm({
  productType,
  onAdd,
  onCancel,
}: {
  productType: CsPropertyType;
  onAdd: (substance: CsSubstance) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [cas, setCas] = useState("");
  const [propertyType, setPropertyType] = useState<CsPropertyType>(productType);
  const [volatility, setVolatility] = useState<CsVolatility | null>(null);
  const [oel8, setOel8] = useState("");
  const [oelShort, setOelShort] = useState("");
  const [ghs, setGhs] = useState<CsGhs>({});
  const [flashPoint, setFlashPoint] = useState("");
  const [mw, setMw] = useState("");
  const [logKow, setLogKow] = useState("");
  const [solubility, setSolubility] = useState("");
  const [vaporPressure, setVaporPressure] = useState("");

  const unit: CsOelUnit = propertyType === 2 ? "mg/m3" : "ppm";
  const ready = name.trim() !== "" && (propertyType === 3 || volatility !== null);

  const submit = () => {
    if (!ready) return;
    const o8 = num(oel8);
    const os = num(oelShort);
    const sol = num(solubility);
    const vp = num(vaporPressure);
    onAdd({
      name: name.trim(),
      cas: cas.trim() || undefined,
      propertyType,
      volatility: propertyType === 3 ? 0 : volatility,
      ghs,
      oel: {
        ...(o8 !== null && o8 > 0 ? { other8: { value: o8, unit } } : {}),
        ...(os !== null && os > 0 ? { otherShort: { value: os, unit } } : {}),
      },
      oelSource: 0,
      molecularWeight: num(mw),
      boilingPoint: null,
      logKow: num(logKow),
      flashPoint: num(flashPoint),
      solubility: sol !== null ? { value: sol, unit: "g/L" } : null,
      vaporPressure: vp !== null ? { value: vp, unit: "Pa" } : null,
      regulatory: null,
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
      <p className="text-sm font-bold text-slate-900 dark:text-white">一覧にない物質（SDSの値を入力）</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          物質名
          <input value={name} onChange={(e) => setName(e.target.value)} className={`mt-1 ${inputClass}`} />
        </label>
        <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          CAS番号（任意）
          <input value={cas} onChange={(e) => setCas(e.target.value)} inputMode="numeric" className={`mt-1 ${inputClass}`} />
        </label>
      </div>
      <ChoiceChips<CsPropertyType>
        label="物質の状態"
        columns={3}
        options={[
          { value: 1, label: "液体" },
          { value: 2, label: "粉体" },
          { value: 3, label: "気体" },
        ]}
        value={propertyType}
        onChange={(v) => {
          setPropertyType(v);
          setVolatility(null);
        }}
      />
      {propertyType !== 3 && (
        <ChoiceChips<CsVolatility>
          label={propertyType === 2 ? "飛散性" : "揮発性"}
          columns={1}
          required
          options={(propertyType === 2 ? [1, 2, 3] : [1, 2, 3, 4]).map((v) => ({
            value: v as CsVolatility,
            label: VOLATILITY_LABEL[propertyType === 2 ? 2 : 1][v],
          }))}
          value={volatility}
          onChange={setVolatility}
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          ばく露限界値 8時間（{unit}）
          <input value={oel8} onChange={(e) => setOel8(e.target.value)} inputMode="decimal" className={`mt-1 ${inputClass}`} />
        </label>
        <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          短時間（{unit}・任意）
          <input value={oelShort} onChange={(e) => setOelShort(e.target.value)} inputMode="decimal" className={`mt-1 ${inputClass}`} />
        </label>
      </div>
      <details>
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-slate-800 dark:text-slate-100">GHS分類（SDSの2項）</summary>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(GHS_OPTIONS) as CsGhsKey[]).map((key) => (
            <label key={key} className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {GHS_LABEL[key]}
              <select
                value={ghs[key] ?? ""}
                onChange={(e) =>
                  setGhs((prev) => {
                    const next = { ...prev };
                    if (e.target.value === "") delete next[key];
                    else next[key] = e.target.value;
                    return next;
                  })
                }
                className={`mt-1 ${inputClass}`}
              >
                <option value="">区分なし</option>
                {GHS_OPTIONS[key]!.map((v) => (
                  <option key={v} value={v}>
                    区分{v}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </details>
      <details>
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-slate-800 dark:text-slate-100">物性（SDSの9項・経皮吸収と引火の判定に使用）</summary>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            引火点（℃）
            <input value={flashPoint} onChange={(e) => setFlashPoint(e.target.value)} inputMode="decimal" className={`mt-1 ${inputClass}`} />
          </label>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            分子量
            <input value={mw} onChange={(e) => setMw(e.target.value)} inputMode="decimal" className={`mt-1 ${inputClass}`} />
          </label>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            logKow（オクタノール/水分配係数）
            <input value={logKow} onChange={(e) => setLogKow(e.target.value)} inputMode="decimal" className={`mt-1 ${inputClass}`} />
          </label>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            水溶解度（g/L）
            <input value={solubility} onChange={(e) => setSolubility(e.target.value)} inputMode="decimal" className={`mt-1 ${inputClass}`} />
          </label>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            蒸気圧（Pa）
            <input value={vaporPressure} onChange={(e) => setVaporPressure(e.target.value)} inputMode="decimal" className={`mt-1 ${inputClass}`} />
          </label>
        </div>
      </details>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!ready}
          className="min-h-12 flex-1 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-50"
        >
          この物質を追加
        </button>
        <button type="button" onClick={onCancel} className="min-h-12 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-800 dark:border-slate-600 dark:text-slate-100">
          やめる
        </button>
      </div>
    </div>
  );
}
