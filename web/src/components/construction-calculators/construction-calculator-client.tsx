"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calculator,
  ClipboardCopy,
  Download,
  FileText,
  History,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  buildCalculationCopyText,
  buildCalculationCsv,
} from "@/lib/construction-calculator-exports";
import {
  addConstructionCalculatorHistory,
  clearConstructionCalculatorHistory,
  loadConstructionCalculatorHistory,
  removeConstructionCalculatorHistory,
  type ConstructionCalculatorHistoryEntry,
} from "@/lib/construction-calculator-history";
import type {
  CalculationOutcome,
  CalculationResult,
  CalculatorFunction,
  FormulaRegistryEntry,
  InputDefinition,
  PortableValue,
  RoundingConfig,
  ValidationIssue,
} from "@/lib/construction-calculators/types";

type PublicFormulaDefinition = Omit<FormulaRegistryEntry, "testFixtures">;
type RawInput = Record<string, unknown>;
type GenericCalculator = CalculatorFunction<never>;

const loaders: Record<string, () => Promise<GenericCalculator>> = {
  "concrete-quantity": async () =>
    (await import("@/lib/construction-calculators/concrete")).calculateConcrete as GenericCalculator,
  "excavation-backfill": async () =>
    (await import("@/lib/construction-calculators/excavation")).calculateExcavation as GenericCalculator,
  "average-end-area": async () =>
    (await import("@/lib/construction-calculators/average-end-area")).calculateAverageEndArea as GenericCalculator,
  "earthwork-conversion-dump-trucks": async () =>
    (await import("@/lib/construction-calculators/earthwork-conversion")).calculateEarthworkConversion as GenericCalculator,
  "aggregate-base-quantity": async () =>
    (await import("@/lib/construction-calculators/material-quantity")).calculateAggregateBase as GenericCalculator,
  "asphalt-mixture-quantity": async () =>
    (await import("@/lib/construction-calculators/material-quantity")).calculateAsphaltMixture as GenericCalculator,
  "rebar-weight": async () =>
    (await import("@/lib/construction-calculators/rebar-weight")).calculateRebarWeight as GenericCalculator,
  "rebar-spacing": async () =>
    (await import("@/lib/construction-calculators/rebar-spacing")).calculateRebarSpacing as GenericCalculator,
  "formwork-area": async () =>
    (await import("@/lib/construction-calculators/formwork")).calculateFormwork as GenericCalculator,
  "slope-angle-length": async () =>
    (await import("@/lib/construction-calculators/slope")).calculateSlope as GenericCalculator,
  "drainage-slope": async () =>
    (await import("@/lib/construction-calculators/drainage-slope")).calculateDrainageSlope as GenericCalculator,
  "scale-coordinate": async () =>
    (await import("@/lib/construction-calculators/scale-coordinate")).calculateScaleCoordinate as GenericCalculator,
};

const OPTION_LABELS: Record<string, Record<string, string>> = {
  shape: {
    rectangular: "直方体",
    slab: "床版・土間",
    cylinder: "円柱",
    "circular-foundation": "円形基礎",
    vertical: "鉛直掘削",
    "sloped-trench": "法付き溝",
    "sloped-pit": "四辺法付き掘削",
    foundation: "基礎",
    column: "柱",
    beam: "梁",
    wall: "壁",
    "slab-edge": "床版端部",
    custom: "任意面",
  },
  mode: {
    "rise-run": "水平距離＋高低差",
    "percent-run": "勾配%＋水平距離",
    "angle-run": "角度＋水平距離",
    "ratio-run": "1:n＋水平距離",
    scale: "縮尺変換",
    coordinate: "座標距離・方位角",
  },
  densityState: { bank: "地山", loose: "ほぐし", compacted: "締固め後" },
  gradeMode: { percent: "%", permille: "‰", ratio: "1:n" },
  referencePoint: { start: "始点標高を入力", end: "終点標高を入力" },
  flowDirection: { "start-to-end": "始点から終点", "end-to-start": "終点から始点" },
  solveFor: { actual: "図上寸法から実寸", drawing: "実寸から図上寸法" },
  roundingMode: { round: "四捨五入", ceil: "切上げ", floor: "切捨て" },
};

function optionLabel(key: string, value: string) {
  return OPTION_LABELS[key]?.[value] ?? value.replace("m2", "m²").replace("m3", "m³");
}

function visibleField(slug: string, field: InputDefinition, raw: RawInput) {
  if (field.type === "segments") return true;
  if (slug === "concrete-quantity") {
    const circular = raw.shape === "cylinder" || raw.shape === "circular-foundation";
    if (field.key === "diameter") return circular;
    if (field.key === "length" || field.key === "width") return !circular;
  }
  if (slug === "excavation-backfill" && field.key === "sideSlopeHorizontalPerVertical") {
    return raw.shape !== "vertical";
  }
  if (slug === "formwork-area") {
    if (field.key === "width") return ["foundation", "column", "beam", "custom"].includes(String(raw.shape));
    if (field.key === "height") return raw.shape !== "custom";
    if (field.key === "faces") return ["wall", "slab-edge", "custom"].includes(String(raw.shape));
  }
  if (slug === "slope-angle-length") {
    const byMode: Record<string, string> = {
      rise: "rise-run",
      slopePercent: "percent-run",
      angleDegrees: "angle-run",
      ratioN: "ratio-run",
    };
    if (field.key in byMode) return raw.mode === byMode[field.key];
  }
  if (slug === "scale-coordinate") {
    const coordinateKeys = new Set(["x1", "y1", "x2", "y2", "coordinateUnit"]);
    const scaleKeys = new Set(["solveFor", "scaleDenominator", "drawingLength", "drawingUnit", "actualLength", "actualUnit"]);
    if (coordinateKeys.has(field.key)) return raw.mode === "coordinate";
    if (scaleKeys.has(field.key)) {
      if (raw.mode !== "scale") return false;
      if (field.key === "drawingLength") return raw.solveFor === "actual";
      if (field.key === "actualLength") return raw.solveFor === "drawing";
    }
  }
  return true;
}

function prepareInput(definition: PublicFormulaDefinition, raw: RawInput, rounding: RoundingConfig): Record<string, unknown> {
  const prepared: Record<string, unknown> = {};
  for (const field of definition.inputDefinitions) {
    const value = raw[field.key];
    if (field.type === "number" || field.type === "integer") prepared[field.key] = Number(value);
    else if (field.type === "segments") {
      prepared[field.key] = (Array.isArray(value) ? value : []).map((segment) => {
        const record = segment as Record<string, unknown>;
        return {
          startArea: Number(record.startArea),
          endArea: Number(record.endArea),
          length: Number(record.length),
        };
      });
    } else prepared[field.key] = String(value ?? "");
  }
  prepared.rounding = rounding;
  return prepared;
}

function portableInput(input: Record<string, unknown>): Record<string, PortableValue> {
  return JSON.parse(JSON.stringify(input)) as Record<string, PortableValue>;
}

function Field({
  field,
  value,
  onChange,
}: {
  field: InputDefinition;
  value: unknown;
  onChange: (value: string) => void;
}) {
  const id = `construction-calculator-${field.key}`;
  if (field.type === "select") {
    return (
      <label className="block" htmlFor={id}>
        <span className="text-sm font-black text-slate-900 dark:text-white">{field.label}</span>
        <select
          id={id}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-xl border-2 border-slate-300 bg-white px-3 text-base text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
        >
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>{optionLabel(field.key, option)}</option>
          ))}
        </select>
        <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-300">{field.help}</span>
      </label>
    );
  }
  return (
    <label className="block" htmlFor={id}>
      <span className="text-sm font-black text-slate-900 dark:text-white">
        {field.label}{field.units?.length === 1 ? `（${optionLabel(field.key, field.units[0])}）` : ""}
      </span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={typeof value === "number" || typeof value === "string" ? value : ""}
        min={field.min}
        max={field.max}
        step={field.type === "integer" ? 1 : "any"}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-11 w-full rounded-xl border-2 border-slate-300 bg-white px-3 text-base text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
      />
      <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-300">{field.help}</span>
    </label>
  );
}

export function ConstructionCalculatorClient({
  definition,
  defaultInput,
}: {
  definition: PublicFormulaDefinition;
  defaultInput: Record<string, unknown>;
}) {
  const [mounted, setMounted] = useState(false);
  const [raw, setRaw] = useState<RawInput>(() => ({ ...defaultInput }));
  const defaultRounding = (defaultInput.rounding as RoundingConfig | undefined) ?? { decimalPlaces: 2, mode: "round" };
  const [rounding, setRounding] = useState<RoundingConfig>(defaultRounding);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [errors, setErrors] = useState<ValidationIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<ConstructionCalculatorHistoryEntry[]>([]);
  const [printReady, setPrintReady] = useState(false);
  const resultRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setMounted(true);
    setHistory(loadConstructionCalculatorHistory(window.localStorage));
  }, []);

  useEffect(() => {
    if (result) window.requestAnimationFrame(() => resultRef.current?.focus());
  }, [result]);

  useEffect(() => {
    if (!printReady) return;
    const frame = window.requestAnimationFrame(() => {
      window.print();
      setPrintReady(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [printReady]);

  const visibleDefinitions = useMemo(
    () => definition.inputDefinitions.filter(
      (field) => field.key !== "rounding" && visibleField(definition.slug, field, raw),
    ),
    [definition, raw],
  );

  const change = (key: string, value: unknown) => {
    setRaw((current) => ({ ...current, [key]: value }));
    setResult(null);
    setErrors([]);
    setCopied(false);
  };

  const submit = async () => {
    setLoading(true);
    setErrors([]);
    setCopied(false);
    const input = prepareInput(definition, raw, rounding);
    try {
      const loader = loaders[definition.slug];
      if (!loader) throw new Error("calculator loader missing");
      const calculate = await loader();
      const outcome = calculate(input as never) as CalculationOutcome;
      if (!outcome.ok) {
        setResult(null);
        setErrors(outcome.errors);
        const first = outcome.errors[0]?.field.replaceAll(".", "-");
        window.requestAnimationFrame(() =>
          document.getElementById(`construction-calculator-${first}`)?.focus(),
        );
        return;
      }
      setResult(outcome.result);
      const createdAt = new Date().toISOString();
      const entry: ConstructionCalculatorHistoryEntry = {
        id: `${definition.slug}:${createdAt}:${Math.random().toString(36).slice(2, 8)}`,
        slug: definition.slug,
        title: definition.title,
        createdAt,
        input: portableInput(input),
        result: outcome.result,
      };
      setHistory(addConstructionCalculatorHistory(window.localStorage, entry));
    } catch {
      setResult(null);
      setErrors([{ field: "calculator", code: "not-finite", message: "計算できません。入力値と単位を確認してください。" }]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setRaw({ ...defaultInput });
    setRounding(defaultRounding);
    setResult(null);
    setErrors([]);
    setCopied(false);
  };

  const copy = async () => {
    if (!result) return;
    const text = buildCalculationCopyText(definition.title, result);
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(true);
  };

  const downloadCsv = () => {
    if (!result) return;
    const blob = new Blob([buildCalculationCsv(definition.title, result)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${definition.slug}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!mounted) {
    return <p data-calculator-loading className="rounded-xl border border-slate-300 p-4 font-bold">計算フォームを準備しています。</p>;
  }

  const segments = Array.isArray(raw.segments) ? (raw.segments as Record<string, unknown>[]) : [];

  return (
    <div className="construction-calculator-interactive">
      <div className="space-y-6 print:hidden">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          noValidate
          className="rounded-2xl border-2 border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-6"
        >
          <h2 className="flex items-center gap-2 text-2xl font-black">
            <Calculator className="h-6 w-6 text-emerald-800 dark:text-emerald-300" aria-hidden="true" />
            条件を入力
          </h2>
          {errors.length ? (
            <div role="alert" aria-labelledby="calculation-error-title" className="mt-4 rounded-xl border-2 border-rose-500 bg-rose-50 p-4 text-rose-950">
              <h3 id="calculation-error-title" className="font-black">計算できません</h3>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {errors.map((error) => <li key={`${error.field}-${error.code}`}>{error.message}</li>)}
              </ul>
            </div>
          ) : null}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {visibleDefinitions.filter((field) => field.type !== "segments").map((field) => (
              <Field key={field.key} field={field} value={raw[field.key]} onChange={(value) => change(field.key, value)} />
            ))}
          </div>
          {visibleDefinitions.some((field) => field.type === "segments") ? (
            <fieldset className="mt-5 rounded-xl border border-slate-300 p-4 dark:border-slate-600">
              <legend className="px-2 font-black">複数区間</legend>
              <div className="space-y-3">
                {segments.map((segment, index) => (
                  <div key={index} className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_1fr_auto] dark:bg-slate-800">
                    {[
                      ["startArea", "前断面積"],
                      ["endArea", "後断面積"],
                      ["length", "区間長"],
                    ].map(([key, label]) => (
                      <label key={key} htmlFor={`construction-calculator-segments-${index}-${key}`} className="text-sm font-black">
                        {label}
                        <input
                          id={`construction-calculator-segments-${index}-${key}`}
                          type="number"
                          inputMode="decimal"
                          value={String(segment[key] ?? "")}
                          onChange={(event) => {
                            const next = segments.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: event.target.value } : item);
                            change("segments", next);
                          }}
                          className="mt-1 min-h-11 w-full rounded-xl border-2 border-slate-300 bg-white px-3 text-base dark:border-slate-600 dark:bg-slate-950"
                        />
                      </label>
                    ))}
                    <button
                      type="button"
                      disabled={segments.length === 1}
                      onClick={() => change("segments", segments.filter((_, itemIndex) => itemIndex !== index))}
                      className="min-h-11 self-end rounded-xl border-2 border-slate-400 px-3 font-black disabled:opacity-40"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => change("segments", [...segments, { startArea: "", endArea: "", length: "" }])}
                className="mt-3 min-h-11 rounded-xl border-2 border-emerald-700 px-4 font-black text-emerald-900 dark:text-emerald-200"
              >
                区間を追加
              </button>
            </fieldset>
          ) : null}
          <fieldset className="mt-5 grid gap-4 rounded-xl border border-slate-300 p-4 sm:grid-cols-2 dark:border-slate-600">
            <legend className="px-2 font-black">丸め方法</legend>
            <label className="text-sm font-black">
              小数点桁数
              <select
                value={rounding.decimalPlaces}
                onChange={(event) => {
                  setRounding((current) => ({ ...current, decimalPlaces: Number(event.target.value) }));
                  setResult(null);
                }}
                className="mt-1 min-h-11 w-full rounded-xl border-2 border-slate-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-950"
              >
                {[0, 1, 2, 3, 4, 5, 6].map((places) => <option key={places} value={places}>{places}桁</option>)}
              </select>
            </label>
            <label className="text-sm font-black">
              方法
              <select
                value={rounding.mode}
                onChange={(event) => {
                  setRounding((current) => ({ ...current, mode: event.target.value as RoundingConfig["mode"] }));
                  setResult(null);
                }}
                className="mt-1 min-h-11 w-full rounded-xl border-2 border-slate-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-950"
              >
                {(["round", "ceil", "floor"] as const).map((mode) => <option key={mode} value={mode}>{optionLabel("roundingMode", mode)}</option>)}
              </select>
            </label>
          </fieldset>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="submit" disabled={loading} className="min-h-12 rounded-xl bg-emerald-800 px-6 py-3 font-black text-white hover:bg-emerald-900 disabled:bg-slate-400">
              {loading ? "計算中…" : "計算する"}
            </button>
            <button type="button" onClick={reset} className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-slate-500 px-5 py-3 font-black">
              <RotateCcw className="h-5 w-5" aria-hidden="true" />入力をリセット
            </button>
          </div>
        </form>

        {result ? (
          <section aria-labelledby="calculation-result-title" className="rounded-2xl border-2 border-emerald-700 bg-emerald-50 p-5 text-slate-950 dark:bg-emerald-950 dark:text-white sm:p-6">
            <h2 id="calculation-result-title" ref={resultRef} tabIndex={-1} className="text-2xl font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400">
              結果
            </h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {result.displayValues.map((item) => (
                <div key={item.key} className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
                  <dt className="text-sm font-black text-slate-600 dark:text-slate-300">{item.label}</dt>
                  <dd className="mt-1 text-3xl font-black">{String(item.value)}<span className="ml-1 text-base">{item.unit}</span></dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 rounded-lg bg-amber-100 px-3 py-2 text-sm font-black text-amber-950">
              概算結果です。設計図書、仕様書、実測値を確認してください。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => void copy()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 font-black text-white">
                <ClipboardCopy className="h-5 w-5" aria-hidden="true" />{copied ? "コピーしました" : "結果をコピー"}
              </button>
              <button type="button" onClick={() => setPrintReady(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-slate-700 bg-white px-4 py-2 font-black text-slate-950">
                <FileText className="h-5 w-5" aria-hidden="true" />PDF・印刷
              </button>
              <button type="button" onClick={downloadCsv} className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-slate-700 bg-white px-4 py-2 font-black text-slate-950">
                <Download className="h-5 w-5" aria-hidden="true" />CSV
              </button>
            </div>
            <details className="mt-5 rounded-xl border border-emerald-800 bg-white p-4 dark:bg-slate-900">
              <summary className="min-h-11 cursor-pointer font-black">使用した入力値・式・前提</summary>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {Object.entries(result.usedInputs).map(([key, value]) => (
                  <div key={key} className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800"><dt className="font-black">{key}</dt><dd className="break-words">{typeof value === "object" ? JSON.stringify(value) : String(value)}</dd></div>
                ))}
              </dl>
              <h3 className="mt-4 font-black">計算式</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">{result.formula.map((line) => <li key={line}>{line}</li>)}</ol>
              <p className="mt-3 text-sm font-bold">丸め：{optionLabel("roundingMode", result.rounding.mode)}・小数{result.rounding.decimalPlaces}桁</p>
              <h3 className="mt-4 font-black">使用した仮定</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{result.assumptions.map((line) => <li key={line}>{line}</li>)}</ul>
              {result.warnings.length ? <ul className="mt-3 list-disc space-y-1 rounded-lg bg-amber-100 p-3 pl-8 text-sm text-amber-950">{result.warnings.map((line) => <li key={line}>{line}</li>)}</ul> : null}
            </details>
          </section>
        ) : null}

        <section aria-labelledby="calculator-history-title" className="rounded-2xl border-2 border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="calculator-history-title" className="flex items-center gap-2 text-xl font-black"><History className="h-5 w-5" aria-hidden="true" />最近の計算</h2>
            <button type="button" onClick={() => setHistory(clearConstructionCalculatorHistory(window.localStorage))} disabled={!history.length} className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-slate-400 px-3 text-sm font-black disabled:opacity-40"><Trash2 className="h-4 w-4" aria-hidden="true" />すべて削除</button>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">この端末だけに31日間、最大20件保存します。入力値をサーバー、analytics、RUMへ送りません。</p>
          {history.filter((entry) => entry.slug === definition.slug).length ? (
            <ul className="mt-4 space-y-2">
              {history.filter((entry) => entry.slug === definition.slug).map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                  <div><p className="font-black">{entry.result.displayValues[0]?.label}: {entry.result.displayValues[0]?.value}{entry.result.displayValues[0]?.unit}</p><p className="text-xs text-slate-600 dark:text-slate-300">{new Date(entry.createdAt).toLocaleString("ja-JP")}</p></div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setRaw(entry.input); setRounding((entry.input.rounding as unknown as RoundingConfig) ?? defaultRounding); setResult(null); setErrors([]); }} className="min-h-11 rounded-xl border-2 border-emerald-700 px-3 text-sm font-black">入力を復元</button>
                    <button type="button" aria-label="この履歴を削除" onClick={() => setHistory(removeConstructionCalculatorHistory(window.localStorage, entry.id))} className="min-h-11 rounded-xl border-2 border-slate-400 px-3"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">この計算の履歴はまだありません。</p>}
        </section>
      </div>

      {result ? (
        <article className="construction-calculator-print hidden bg-white p-8 text-black print:block">
          <h1 className="text-2xl font-black">{definition.title} 計算結果</h1>
          <p className="mt-1 text-sm">安全AIポータル / {new Date().toLocaleString("ja-JP")}</p>
          <h2 className="mt-5 text-lg font-black">結果</h2>
          <table className="mt-2 w-full border-collapse text-sm"><tbody>{result.displayValues.map((item) => <tr key={item.key}><th className="border border-black p-2 text-left">{item.label}</th><td className="border border-black p-2">{String(item.value)} {item.unit}</td></tr>)}</tbody></table>
          <h2 className="mt-5 text-lg font-black">使用した入力値</h2>
          <pre className="mt-2 whitespace-pre-wrap border border-black p-3 text-xs">{JSON.stringify(result.usedInputs, null, 2)}</pre>
          <h2 className="mt-5 text-lg font-black">計算式</h2>
          <ol className="mt-2 list-decimal pl-6 text-sm">{result.formula.map((line) => <li key={line}>{line}</li>)}</ol>
          <p className="mt-4 text-sm font-bold">丸め：{optionLabel("roundingMode", result.rounding.mode)}・小数{result.rounding.decimalPlaces}桁</p>
          <h2 className="mt-5 text-lg font-black">前提</h2>
          <ul className="mt-2 list-disc pl-6 text-sm">{result.assumptions.map((line) => <li key={line}>{line}</li>)}</ul>
          <p className="mt-5 border-2 border-black p-3 font-black">概算結果です。設計図書、仕様書、実測値を確認してください。</p>
        </article>
      ) : null}
      <style jsx global>{`@media print { body * { visibility: hidden !important; } .construction-calculator-print, .construction-calculator-print * { visibility: visible !important; } .construction-calculator-print { display: block !important; position: absolute; inset: 0; width: 100%; } }`}</style>
    </div>
  );
}
