"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ExternalLink,
  BookOpenCheck,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { SAFETY_TONE } from "@/lib/design/safety-tone";
import { TONE_DEFAULT_ICON } from "@/components/ui/status-badge";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";
import { getCalculator } from "@/lib/construction-calc/registry";
import {
  CALC_DISCLAIMER,
  normalizeValues,
  type CalcField,
  type ConstructionCalculator,
} from "@/lib/construction-calc/schema";

/**
 * 建設計算 1計算機1画面のクライアントパネル（化学ワンボックスと同じ思想）。
 * 入力 → デカ数字の結論（柱0: ConclusionCard 文法・1画面1メッセージ）→ 根拠 → 注意 の順。
 * 計算はレジストリの決定論 compute() のみ。AI は「結果の解説」ボタン（出口）だけ。
 */

type RawValues = Record<string, string>;

function initialRawValues(calc: ConstructionCalculator, params: URLSearchParams): RawValues {
  const raw: RawValues = {};
  for (const f of calc.fields) {
    const fromQuery = params.get(f.id);
    raw[f.id] = fromQuery ?? String(f.defaultValue);
  }
  return raw;
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: CalcField;
  value: string;
  onChange: (v: string) => void;
}) {
  const inputId = `calc-field-${field.id}`;
  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm font-bold text-slate-800 dark:text-slate-200">
        {field.label}
        {field.kind === "number" && (
          <span className="ml-1 font-normal text-slate-500">[{field.unit}]</span>
        )}
      </label>
      {field.kind === "select" ? (
        <select
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          value={value}
          min={field.min}
          max={field.max}
          step={field.step}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
      )}
      {field.help && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{field.help}</p>}
    </div>
  );
}

function CalculatorPanelInner({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const calc = getCalculator(slug);
  const [raw, setRaw] = useState<RawValues>(() =>
    calc ? initialRawValues(calc, searchParams) : {},
  );
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const result = useMemo(() => {
    if (!calc) return null;
    const { values, errors } = normalizeValues(calc, raw);
    return { values, errors, outcome: calc.compute(values) };
  }, [calc, raw]);

  if (!calc || !result) return null;
  const { outcome, errors, values } = result;
  const tone = SAFETY_TONE[outcome.tone];
  const ToneIcon = TONE_DEFAULT_ICON[outcome.tone];

  const setField = (id: string, v: string) => {
    setRaw((prev) => ({ ...prev, [id]: v }));
    setAiText(null);
  };

  const fetchExplanation = async () => {
    setAiLoading(true);
    setAiText(null);
    try {
      const qs = new URLSearchParams({ slug: calc.slug });
      for (const f of calc.fields) qs.set(f.id, String(values[f.id]));
      const res = await fetch(`/api/construction-calc?${qs.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { explanation?: string };
      setAiText(data.explanation ?? "解説を取得できませんでした。");
    } catch {
      setAiText("AI解説を取得できませんでした。時間をおいて再度お試しください（計算結果自体は上の表示が正です）。");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 入力 */}
      <section
        aria-label="計算条件の入力"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/60 sm:p-5"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {calc.fields.map((f) => (
            <FieldInput key={f.id} field={f} value={raw[f.id] ?? ""} onChange={(v) => setField(f.id, v)} />
          ))}
        </div>
        {calc.examples.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">入力例:</span>
            {calc.examples.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => {
                  const next: RawValues = { ...raw };
                  for (const [k, v] of Object.entries(ex.values)) next[k] = String(v);
                  setRaw(next);
                  setAiText(null);
                }}
                className="inline-flex min-h-[44px] items-center rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              >
                {ex.label}
              </button>
            ))}
          </div>
        )}
        {errors.length > 0 && (
          <ul className="mt-3 space-y-1" aria-label="入力の注意">
            {errors.map((e) => (
              <li key={e} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {e}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 結論（柱0: 1画面1メッセージ・デカ数字） */}
      <section
        role="status"
        aria-label={`計算結果: ${outcome.headline}`}
        className={`rounded-2xl border-2 p-4 sm:p-5 ${tone.soft}`}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <ToneIcon className="h-10 w-10 shrink-0 sm:h-12 sm:w-12" aria-hidden="true" />
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3">
            {outcome.value !== undefined && (
              <span className={`text-5xl font-bold leading-none tracking-tight ${tone.text}`}>
                {outcome.value}
                {outcome.unit && <span className="ml-0.5 text-xl font-bold">{outcome.unit}</span>}
              </span>
            )}
            <span className="text-2xl font-bold leading-tight">{outcome.headline}</span>
          </div>
        </div>
        <p className="mt-2 text-sm leading-6">{outcome.summary}</p>

        <dl className="mt-4 space-y-1.5">
          {outcome.items.map((item) => {
            const itemTone = item.tone ? SAFETY_TONE[item.tone] : null;
            return (
              <div
                key={item.label}
                className={`flex flex-col gap-x-3 rounded-lg border-l-4 bg-white/70 px-3 py-2 text-sm dark:bg-slate-900/40 sm:flex-row sm:items-baseline sm:justify-between ${itemTone ? itemTone.leftBar : "border-l-slate-200"}`}
              >
                <dt className="font-semibold text-slate-700 dark:text-slate-300">
                  {item.label}
                  {item.note && (
                    <span className="ml-1 block text-[11px] font-normal text-slate-500 sm:inline">
                      （{item.note}）
                    </span>
                  )}
                </dt>
                <dd className={`shrink-0 font-bold ${itemTone ? itemTone.text : "text-slate-900 dark:text-white"}`}>
                  {item.value}
                </dd>
              </div>
            );
          })}
        </dl>

        {/* AI出口: 結果の平易な解説（計算はしない） */}
        <div className="mt-4">
          <button
            type="button"
            onClick={fetchExplanation}
            disabled={aiLoading}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-800 disabled:opacity-60"
          >
            {aiLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            この結果をAIがやさしく解説
          </button>
          {aiText && (
            <div className="mt-3 whitespace-pre-wrap rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-slate-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-slate-200">
              {aiText}
            </div>
          )}
        </div>
      </section>

      {/* 計算過程 */}
      <CollapsibleDetail summary="計算過程（式と代入値）">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-6">
          {outcome.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </CollapsibleDetail>

      {/* 根拠 */}
      <section
        aria-label="根拠となる法令・基準"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/60 sm:p-5"
      >
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <BookOpenCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          根拠となる法令・基準
        </h2>
        <ul className="mt-3 space-y-3">
          {calc.basis.map((b) => (
            <li key={b.label} className="text-sm">
              <p className="font-semibold text-slate-800 dark:text-slate-200">{b.label}</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-400">{b.description}</p>
              <div className="mt-1 flex flex-wrap gap-3">
                {b.lawNaviPath && (
                  <Link
                    href={b.lawNaviPath}
                    className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800 dark:text-emerald-400"
                  >
                    条文を法令ナビで読む
                  </Link>
                )}
                {b.egovUrl && (
                  <a
                    href={b.egovUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-sky-700 underline underline-offset-2 hover:text-sky-800 dark:text-sky-400"
                  >
                    原文（e-Gov）
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 注意・免責 */}
      <section
        aria-label="注意事項と免責"
        className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200 sm:p-5"
      >
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          ご利用上の注意
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5">
          {outcome.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
          {calc.cautions.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <p className="mt-3 border-t border-amber-200 pt-2 text-xs font-semibold leading-5 dark:border-amber-800">
          {CALC_DISCLAIMER}
        </p>
      </section>
    </div>
  );
}

export function CalculatorPanel({ slug }: { slug: string }) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" aria-hidden="true" />}>
      <CalculatorPanelInner slug={slug} />
    </Suspense>
  );
}
