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
  clearConstructionCalculatorHistoryForSlug,
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

import { additionalQuantitySpecs } from "@/lib/construction-calculators/additional-quantity";
import { CalculatorInputGuide, INPUT_COLORS, inputUnit } from "./calculator-input-guide";

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

for (const spec of additionalQuantitySpecs) loaders[spec.slug] = async () => {
 const { calculateAdditionalQuantity } = await import("@/lib/construction-calculators/additional-quantity");
 return ((input: Record<string,unknown>) => calculateAdditionalQuantity(spec.slug,input)) as GenericCalculator;
};

const calculatorPromises = new Map<string, Promise<GenericCalculator>>();

function loadCalculator(slug: string): Promise<GenericCalculator> {
  const cached = calculatorPromises.get(slug);
  if (cached) return cached;
  const loader = loaders[slug];
  if (!loader) return Promise.reject(new Error("calculator loader missing"));
  const promise = loader().catch((error: unknown) => {
    calculatorPromises.delete(slug);
    throw error;
  });
  calculatorPromises.set(slug, promise);
  return promise;
}

const OPTION_LABELS: Record<string, Record<string, string>> = {
  barType: { deformed: "異形鉄筋（規格表）", round: "丸鋼（直径から概算）" },
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
  roundingMode: {
    round: "四捨五入",
    ceil: "切上げ（+∞方向）",
    floor: "切捨て（−∞方向）",
  },
};

function optionLabel(key: string, value: string) {
  return OPTION_LABELS[key]?.[value] ?? value.replace("m2", "m²").replace("m3", "m³");
}

function visibleField(slug: string, field: InputDefinition, raw: RawInput) {
  if (field.type === "segments" || field.type === "points") return true;
  if (["rebar-weight","rebar-spacing"].includes(slug)) {
    if(field.key === "diameterMm") return raw.barType !== "deformed";
    if(field.key === "barDesignation") return raw.barType === "deformed";
  }
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

function inputNumber(value: unknown): number {
 return value === null || value === undefined || (typeof value === "string" && value.trim() === "") ? Number.NaN : Number(value);
}

function emptyInput(definition: PublicFormulaDefinition, input: RawInput): RawInput {
 return Object.fromEntries(definition.inputDefinitions.map(field=>[field.key, field.type==="number"||field.type==="integer"?"":field.type==="points"?[{x:"",y:""},{x:"",y:""},{x:"",y:""}]:field.type==="segments"?[{startArea:"",endArea:"",length:""}]:input[field.key]]));
}

function prepareInput(definition: PublicFormulaDefinition, raw: RawInput, rounding: RoundingConfig): Record<string, unknown> {
  const prepared: Record<string, unknown> = {};
  for (const field of definition.inputDefinitions) {
    const value = raw[field.key];
    if (field.type === "number" || field.type === "integer") prepared[field.key] = inputNumber(value);
    else if (field.type === "points") prepared[field.key] = (Array.isArray(value) ? value : []).map((p)=>({x:inputNumber((p as Record<string,unknown>).x),y:inputNumber((p as Record<string,unknown>).y)}));
    else if (field.type === "segments") {
      prepared[field.key] = (Array.isArray(value) ? value : []).map((segment) => {
        const record = segment as Record<string, unknown>;
        return {
          startArea: inputNumber(record.startArea),
          endArea: inputNumber(record.endArea),
          length: inputNumber(record.length),
        };
      });
    } else prepared[field.key] = String(value ?? "");
  }
  if(definition.slug==="excavation-backfill" && raw.shape==="vertical") prepared.sideSlopeHorizontalPerVertical=0;
  prepared.rounding = rounding;
  return prepared;
}

function portableInput(input: Record<string, unknown>): Record<string, PortableValue> {
  return JSON.parse(JSON.stringify(input)) as Record<string, PortableValue>;
}

function issueLabel(definition: PublicFormulaDefinition, field: string): string {
  const segmentMatch = /^segments\.(\d+)\.(startArea|endArea|length)$/u.exec(field);
  if (segmentMatch) {
    const labels = { startArea: "前断面積", endArea: "後断面積", length: "区間長" };
    return `区間${Number(segmentMatch[1]) + 1}の${labels[segmentMatch[2] as keyof typeof labels]}`;
  }
  return definition.inputDefinitions.find((item) => item.key === field)?.label
    ?? definition.outputDefinitions.find((item) => item.key === field)?.label
    ?? (field === "calculator" ? "計算" : "入力値");
}

function issueMessage(definition: PublicFormulaDefinition, issue: ValidationIssue): string {
  const label = issueLabel(definition, issue.field);
  if (issue.message.startsWith(issue.field)) return `${label}${issue.message.slice(issue.field.length)}`;
  return issue.field === "calculator" ? issue.message : `${label}：${issue.message}`;
}

function Field({
  field,
  value,
  onChange,
  issue,
  number,
  unit,
  example,
}: {
  field: InputDefinition;
  value: unknown;
  onChange: (value: string) => void;
  issue?: string;
  number?: number;
  unit?: string;
  example?: unknown;
}) {
  const id = `construction-calculator-${field.key}`;
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = issue ? `${helpId} ${errorId}` : helpId;
  if (field.type === "select") {
    return (
      <label className="block" htmlFor={id}>
        <span className="text-sm font-black text-slate-900 dark:text-white">{field.label}</span>
        <select
          id={id}
          required={field.required}
          aria-required={field.required ? true : undefined}
          aria-invalid={issue ? true : undefined}
          aria-describedby={describedBy}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-xl border-2 border-slate-300 bg-white px-3 text-base text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
        >
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>{optionLabel(field.key, option)}</option>
          ))}
        </select>
        <details className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300"><summary className="cursor-pointer">入力のヒント</summary><span id={helpId}>{field.help}</span></details>
        {issue ? <span id={errorId} className="mt-1 block text-sm font-bold text-rose-700 dark:text-rose-300">{issue}</span> : null}
      </label>
    );
  }
  return (
    <label className={"block rounded-xl border-l-4 p-3 " + INPUT_COLORS[((number ?? 1)-1)%4]} htmlFor={id}>
      <span className="text-sm font-black text-slate-900 dark:text-white">
        {number ? <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs text-slate-950">{number}</span> : null}{field.label}{unit ? `（${unit}）` : ""}
      </span>
      <input
        id={id}
        required={field.required}
        aria-required={field.required ? true : undefined}
        aria-invalid={issue ? true : undefined}
        aria-describedby={describedBy}
        type="number"
        placeholder={example === undefined ? undefined : `例：${String(example)}`}
        inputMode="decimal"
        value={typeof value === "number" || typeof value === "string" ? value : ""}
        min={field.min}
        max={field.max}
        step={field.type === "integer" ? 1 : "any"}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-11 w-full rounded-xl border-2 border-slate-300 bg-white px-3 text-base text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
      />
      <details className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300"><summary className="cursor-pointer">入力のヒント</summary><span id={helpId}>{field.help}</span></details>
      {issue ? <span id={errorId} className="mt-1 block text-sm font-bold text-rose-700 dark:text-rose-300">{issue}</span> : null}
    </label>
  );
}

export function ConstructionCalculatorClient({
  definition,
  defaultInput,
  startEmpty = false,
}: {
  definition: PublicFormulaDefinition;
  defaultInput: Record<string, unknown>;
  startEmpty?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [raw, setRaw] = useState<RawInput>(() => startEmpty ? emptyInput(definition, defaultInput) : ({ ...defaultInput }));
  const defaultRounding = (defaultInput.rounding as RoundingConfig | undefined) ?? { decimalPlaces: 2, mode: "round" };
  const [rounding, setRounding] = useState<RoundingConfig>(defaultRounding);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [errors, setErrors] = useState<ValidationIssue[]>([]);
  const [usingExample, setUsingExample] = useState(!startEmpty);
  const [exampleEdited, setExampleEdited] = useState(false);
  const focusResult = useRef(false);
  const liveRevision = useRef(0);
  const [loading, setLoading] = useState(false);
  const inputOrigin = usingExample ? (exampleEdited ? "例の数字を一部変更（残りの例も要確認）" : "例の数字（実測値ではありません）") : "入力した数値による概算";
  const annotateResult = (value: CalculationResult): CalculationResult => ({...value,usedInputs:{...value.usedInputs,inputOrigin}});
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<ConstructionCalculatorHistoryEntry[]>([]);
  const [printReady, setPrintReady] = useState(false);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setHistory(loadConstructionCalculatorHistory(window.localStorage));
  }, []);

  useEffect(() => {
    void loadCalculator(definition.slug).catch(() => undefined);
  }, [definition.slug]);

  useEffect(() => {
    if (result && focusResult.current) { focusResult.current = false; window.requestAnimationFrame(() => resultRef.current?.focus()); }
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
  const currentHistory = useMemo(
    () => history.filter((entry) => entry.slug === definition.slug),
    [definition.slug, history],
  );
  const issuesByField = useMemo(
    () => new Map(errors.map((issue) => [issue.field, issueMessage(definition, issue)])),
    [definition, errors],
  );

  useEffect(() => {
    if (!mounted) return;
    const revision = ++liveRevision.current;
    const timer = window.setTimeout(() => {
      void loadCalculator(definition.slug).then(calculate => {
        if(revision !== liveRevision.current) return;
        const input = prepareInput(definition, raw, rounding);
        const missing = definition.inputDefinitions.some(f=>visibleField(definition.slug,f,raw)&&f.required&&(f.type==="number"||f.type==="integer")&&!Number.isFinite(input[f.key] as number));
        const outcome = missing ? null : calculate(input as never);
        setResult(outcome?.ok ? {...outcome.result,usedInputs:{...outcome.result.usedInputs,inputOrigin}} : null);
      }).catch(()=>setResult(null));
    }, 300);
    return () => { window.clearTimeout(timer); ++liveRevision.current; };
  }, [mounted, definition, raw, rounding, inputOrigin]);

  const change = (key: string, value: unknown) => {
    if(usingExample) setExampleEdited(true);
    ++liveRevision.current;
    setRaw((current) => ({ ...current, [key]: value }));
    setResult(null);
    setErrors([]);
    setCopied(false);
  };

  const submit = async () => {
    focusResult.current = true;
    ++liveRevision.current;
    setLoading(true);
    setErrors([]);
    setCopied(false);
    const input = prepareInput(definition, raw, rounding);
    try {
      const calculate = await loadCalculator(definition.slug);
      const missing = definition.inputDefinitions.filter(f=>visibleField(definition.slug,f,raw)&&f.required&&(f.type==="number"||f.type==="integer")&&!Number.isFinite(input[f.key] as number)).map(f=>({field:f.key,code:"required" as const,message:"数値を入力してください。0の場合は0を入力します。"}));
      const outcome: CalculationOutcome = missing.length ? {ok:false,errors:missing} : calculate(input as never);
      if (!outcome.ok) {
        focusResult.current = false;
        setResult(null);
        setErrors(outcome.errors);
        const first = outcome.errors[0]?.field.replaceAll(".", "-");
        window.requestAnimationFrame(() => {
          const input = first
            ? document.getElementById(`construction-calculator-${first}`)
            : null;
          if (input instanceof HTMLElement) input.focus();
          else errorSummaryRef.current?.focus();
        });
        return;
      }
      const finalResult = annotateResult(outcome.result);
      setResult(finalResult);
      const createdAt = new Date().toISOString();
      const entry: ConstructionCalculatorHistoryEntry = {
        id: `${definition.slug}:${createdAt}:${Math.random().toString(36).slice(2, 8)}`,
        slug: definition.slug,
        title: definition.title,
        createdAt,
        input: {...portableInput(input),_exampleInput:usingExample,_exampleEdited:exampleEdited},
        result: finalResult,
      };
      setHistory(addConstructionCalculatorHistory(window.localStorage, entry));
    } catch {
      focusResult.current = false;
      setResult(null);
      setErrors([{ field: "calculator", code: "not-finite", message: "計算できません。入力値と単位を確認してください。" }]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setRaw(startEmpty ? emptyInput(definition, defaultInput) : { ...defaultInput });
    setUsingExample(!startEmpty);
    setExampleEdited(false);
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

  const points = Array.isArray(raw.points) ? raw.points as Record<string,unknown>[] : [];
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
          <fieldset disabled={!mounted} aria-label="計算入力" className="m-0 min-w-0 border-0 p-0">
          <h2 className="flex items-center gap-2 text-2xl font-black">
            <Calculator className="h-6 w-6 text-emerald-800 dark:text-emerald-300" aria-hidden="true" />
            数字を入れる
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={()=>{setRaw({...defaultInput});setUsingExample(true);setExampleEdited(false);setErrors([]);}} className="min-h-11 rounded-lg border-2 border-emerald-700 px-3 text-sm font-bold">例の数字で試す</button>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{usingExample?(exampleEdited?"例の数字を一部変更した概算です。残りの例も確認してください。":"例の数字です。現場の実測値ではありません。"):"図の番号と同じ欄に、現場の数字を入れます。"}</span>
          </div>
          <CalculatorInputGuide slug={definition.slug} fields={visibleDefinitions} raw={raw}/>
          {errors.length ? (
            <div
              ref={errorSummaryRef}
              role="alert"
              tabIndex={-1}
              aria-labelledby="calculation-error-title"
              className="mt-4 rounded-xl border-2 border-rose-500 bg-rose-50 p-4 text-rose-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-300"
            >
              <h3 id="calculation-error-title" className="font-black">計算できません</h3>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {errors.map((error) => <li key={`${error.field}-${error.code}`}>{issueMessage(definition, error)}</li>)}
              </ul>
            </div>
          ) : null}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {visibleDefinitions.filter((field) => field.type !== "segments" && field.type !== "points").map((field) => (
              <Field
                key={field.key}
                field={field}
                value={raw[field.key]}
                number={field.type === "select" ? undefined : visibleDefinitions.filter(f=>f.type === "number" || f.type === "integer").findIndex(f=>f.key===field.key)+1}
                unit={inputUnit(field,raw)}
                example={defaultInput[field.key]}
                issue={issuesByField.get(field.key)}
                onChange={(value) => change(field.key, value)}
              />
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
                    ].map(([key, label]) => {
                      const id = `construction-calculator-segments-${index}-${key}`;
                      const issue = issuesByField.get(`segments.${index}.${key}`);
                      const errorId = `${id}-error`;
                      return (
                        <label key={key} htmlFor={id} className="text-sm font-black">
                          {label}（{key === "length" ? String(raw.lengthUnit ?? "m") : String(raw.areaUnit ?? "m2").replace("m2","m²")}）
                          <input
                            id={id}
                            required
                            aria-required="true"
                            aria-invalid={issue ? true : undefined}
                            aria-describedby={issue ? errorId : undefined}
                            type="number"
                            inputMode="decimal"
                            value={String(segment[key] ?? "")}
                            onChange={(event) => {
                              const next = segments.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: event.target.value } : item);
                              change("segments", next);
                            }}
                            className="mt-1 min-h-11 w-full rounded-xl border-2 border-slate-300 bg-white px-3 text-base dark:border-slate-600 dark:bg-slate-950"
                          />
                          {issue ? <span id={errorId} className="mt-1 block text-sm font-bold text-rose-700 dark:text-rose-300">{issue}</span> : null}
                        </label>
                      );
                    })}
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
          {visibleDefinitions.some(f=>f.type==="points")?<fieldset id="construction-calculator-points" className="mt-4 rounded-xl border p-3">
            <legend className="font-bold">角の座標を外周順に入力（m）</legend>
            <p className="mb-2 text-xs">X＝北方向、Y＝東方向。緯度・経度は使えません。</p>
            {points.map((point,index)=><div key={index} className="mb-2 grid grid-cols-[1.8rem_1fr_1fr_auto] items-end gap-2"><span className="pb-3 font-bold">{index+1}</span>{["x","y"].map(axis=><label key={axis} className="text-xs font-bold">{axis==="x"?"X 北":"Y 東"}（m）<input id={"construction-calculator-point-"+index+"-"+axis} aria-label={"点"+(index+1)+" "+axis.toUpperCase()+"（m）"} type="number" step="any" inputMode="decimal" value={String(point[axis]??"")} onChange={e=>change("points",points.map((p,i)=>i===index?{...p,[axis]:e.target.value}:p))} className="mt-1 min-h-11 w-full rounded-lg border-2 bg-white px-2 text-base dark:bg-slate-950"/></label>)}<button type="button" disabled={points.length<=3} aria-label={"点"+(index+1)+"を削除"} onClick={()=>change("points",points.filter((_,i)=>i!==index))} className="min-h-11 rounded-lg border px-2 disabled:opacity-40">削除</button></div>)}
            <button type="button" disabled={points.length>=100} onClick={()=>change("points",[...points,{x:"",y:""}])} className="min-h-11 rounded-lg border-2 px-3 font-bold">点を追加</button>
            {issuesByField.get("points")?<p role="alert" className="mt-2 text-sm font-bold text-rose-700">{issuesByField.get("points")}</p>:null}
          </fieldset>:null}
          <details className="mt-5 rounded-xl border border-slate-300 p-3 dark:border-slate-600"><summary className="min-h-8 cursor-pointer text-sm font-bold">表示の丸め：小数{rounding.decimalPlaces}桁・{optionLabel("roundingMode",rounding.mode)}</summary><fieldset className="mt-3 grid gap-4 sm:grid-cols-2">
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
          </fieldset></details>
          <p className="mt-4 text-xs font-bold text-slate-600 dark:text-slate-300">入力に合わせて概算を更新。計算ボタンで結果を履歴に保存します。</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="submit" disabled={loading} className="min-h-12 rounded-xl bg-emerald-800 px-6 py-3 font-black text-white hover:bg-emerald-900 disabled:bg-slate-400">
              {loading ? "計算中…" : "計算する"}
            </button>
            <button type="button" onClick={reset} className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-slate-500 px-5 py-3 font-black">
              <RotateCcw className="h-5 w-5" aria-hidden="true" />入力をリセット（現場の数字を入れる）
            </button>
          </div>
          </fieldset>
        </form>

        {result ? (
          <section aria-labelledby="calculation-result-title" className="rounded-2xl border-2 border-emerald-700 bg-emerald-50 p-5 text-slate-950 dark:bg-emerald-950 dark:text-white sm:p-6">
            <h2 id="calculation-result-title" ref={resultRef} tabIndex={-1} className="text-2xl font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400">
              結果{usingExample ? (exampleEdited ? "（例から一部変更）" : "（例の数字）") : "（入力に連動）"}
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
                <FileText className="h-5 w-5" aria-hidden="true" />PDF保存（印刷画面）
              </button>
              <button type="button" onClick={downloadCsv} className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-slate-700 bg-white px-4 py-2 font-black text-slate-950">
                <Download className="h-5 w-5" aria-hidden="true" />CSV
              </button>
            </div>
            <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              ブラウザーの印刷画面で「PDFに保存」を選べます。
            </p>
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
            <button
              type="button"
              onClick={() => setHistory(clearConstructionCalculatorHistoryForSlug(window.localStorage, definition.slug))}
              disabled={!currentHistory.length}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-slate-400 px-3 text-sm font-black disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />この計算の履歴をすべて削除
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">この端末だけに31日間、最大20件保存します。入力値をサーバー、analytics、RUMへ送りません。</p>
          {currentHistory.length ? (
            <ul className="mt-4 space-y-2">
              {currentHistory.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                  <div><p className="font-black">{entry.result.displayValues[0]?.label}: {entry.result.displayValues[0]?.value}{entry.result.displayValues[0]?.unit}</p><p className="text-xs text-slate-600 dark:text-slate-300">{new Date(entry.createdAt).toLocaleString("ja-JP")}</p></div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setRaw(entry.input); setRounding((entry.input.rounding as unknown as RoundingConfig) ?? defaultRounding); setResult(null); setErrors([]); setUsingExample(entry.input._exampleInput === true); setExampleEdited(entry.input._exampleEdited === true); }} className="min-h-11 rounded-xl border-2 border-emerald-700 px-3 text-sm font-black">入力を復元</button>
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
          {result.warnings.length ? (
            <>
              <h2 className="mt-5 text-lg font-black">注意</h2>
              <ul className="mt-2 list-disc pl-6 text-sm">{result.warnings.map((line) => <li key={line}>{line}</li>)}</ul>
            </>
          ) : null}
          <p className="mt-5 border-2 border-black p-3 font-black">概算結果です。設計図書、仕様書、実測値を確認してください。</p>
        </article>
      ) : null}
      <style jsx global>{`@media print { body * { visibility: hidden !important; } .construction-calculator-print, .construction-calculator-print * { visibility: visible !important; } .construction-calculator-print { display: block !important; position: absolute; inset: 0; width: 100%; } }`}</style>
    </div>
  );
}
