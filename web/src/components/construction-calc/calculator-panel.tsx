"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  AlertTriangle,
  Loader2,
  FileText,
} from "lucide-react";
import { SAFETY_TONE } from "@/lib/design/safety-tone";
import { TONE_DEFAULT_ICON } from "@/components/ui/status-badge";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";
import { CalcReportSheet } from "@/components/construction-calc/calc-report-sheet";
import { getCalculator } from "@/lib/construction-calc/registry";
import {
  normalizeValues,
  type CalcField,
  type ConstructionCalculator,
} from "@/lib/construction-calc/schema";
import { Mascot } from "@/components/mascot";

/**
 * 建設計算 1計算機1画面のインタラクティブ部（入力→結論→計算過程→AI解説）。
 *
 * 【SSR是正】以前は Suspense + useSearchParams を使っていたため、静的HTML内では
 * この計算機の中身が丸ごとフォールバック（スケルトン）になり「空シェル」化していた
 * （useSearchParams は静的生成時にクライアント境界へバイアウトする）。
 * 現在は既定値で初期描画し（＝サーバー側の静的HTMLに入力欄・結果枠が実在する）、
 * URLクエリの初期値はマウント後に window.location.search から反映する。
 * これで SEO/LCP を保ったままAI入口からの初期値プリセットも維持する。
 *
 * 根拠・注意事項・免責は入力に依存しないためサーバーコンポーネント
 * （CalcBasisSection / CalcCautionsSection）へ分離済み。ここは
 * 入力値に依存する「このケース固有の警告」だけを持つ。
 */

type RawValues = Record<string, string>;

function initialRawValues(calc: ConstructionCalculator): RawValues {
  const raw: RawValues = {};
  for (const f of calc.fields) {
    raw[f.id] = String(f.defaultValue);
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

export function CalculatorPanel({ slug }: { slug: string }) {
  const calc = getCalculator(slug);
  const [raw, setRaw] = useState<RawValues>(() => (calc ? initialRawValues(calc) : {}));
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  // 計算書出力: 作成日時は印刷実行時にクライアントで確定する（SSRしない＝水和ズレなし）。
  const [printedAt, setPrintedAt] = useState<string>("");
  const [printSeq, setPrintSeq] = useState(0);

  // マウント後に URLクエリの初期値を反映（AI入口 /?loadKg=2000 等）。
  // サーバーの静的HTMLは既定値で描画済みなので、ここでの上書きは水和後に一度だけ走る。
  useEffect(() => {
    if (!calc) return;
    const params = new URLSearchParams(window.location.search);
    const overrides: RawValues = {};
    for (const f of calc.fields) {
      const q = params.get(f.id);
      if (q !== null && q !== "") overrides[f.id] = q;
    }
    if (Object.keys(overrides).length > 0) {
      setRaw((prev) => ({ ...prev, ...overrides }));
    }
  }, [calc]);

  // 「計算書を出力」→ 作成日時を確定してから印刷ダイアログを開く。
  // state 更新後の再描画（計算書に日時が載る）を待つため requestAnimationFrame 経由。
  useEffect(() => {
    if (printSeq === 0) return;
    const id = window.requestAnimationFrame(() => window.print());
    return () => window.cancelAnimationFrame(id);
  }, [printSeq]);

  const handlePrintReport = () => {
    const stamp = new Date().toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    setPrintedAt(stamp);
    setPrintSeq((n) => n + 1);
  };

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
    <>
    <div className="space-y-4 print:hidden">
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
          {outcome.tone === "safe" && (
            <Mascot variant="calculator" size="md" alt="" className="order-last ml-auto hidden shrink-0 sm:block" />
          )}
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

        {/* このケース固有の警告（入力依存なのでクライアント側） */}
        {outcome.warnings.length > 0 && (
          <ul className="mt-4 space-y-1 rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-xs leading-5 text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200" aria-label="この条件での注意">
            {outcome.warnings.map((w) => (
              <li key={w} className="flex items-start gap-1.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {w}
              </li>
            ))}
          </ul>
        )}

        {/* AI出口＋計算書出力（提出用A4帳票を registry から自動生成して印刷/PDF化） */}
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
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
            <button
              type="button"
              onClick={handlePrintReport}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-emerald-700 bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50 dark:bg-slate-800 dark:text-emerald-300"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              計算書を出力（PDF/印刷）
            </button>
          </div>
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
    </div>

    {/* 提出用計算書（画面では非表示・印刷/PDF時のみ）。registry 定義から自動生成。 */}
    <div className="hidden print:block">
      {printedAt && (
        <CalcReportSheet calc={calc} values={values} outcome={outcome} printedAt={printedAt} />
      )}
    </div>
    </>
  );
}
