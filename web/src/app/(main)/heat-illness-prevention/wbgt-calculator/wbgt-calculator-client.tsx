"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Droplet, Wind, Sun, Activity, Printer, ClipboardCheck } from "lucide-react";
import { assess } from "@/lib/wbgt-engine";
import { putHeatLogDraft } from "@/lib/heat-illness/log-store";
import type {
  AcclimatizationState,
  Environment,
  WorkIntensity,
} from "@/types/heat-illness";

type FormState = {
  airTempC: number;
  humidity: number;
  globeTempC: string;
  windSpeedMps: number;
  solarRadiationWm2: number;
  environment: Environment;
  workIntensity: WorkIntensity;
  acclimatization: AcclimatizationState;
};

const DEFAULTS: FormState = {
  airTempC: 32,
  humidity: 70,
  globeTempC: "",
  windSpeedMps: 1.5,
  solarRadiationWm2: 700,
  environment: "outdoor",
  workIntensity: "moderate",
  acclimatization: "acclimatized",
};

const COLOR_TOKEN: Record<
  "emerald" | "amber" | "orange" | "red" | "rose",
  { bg: string; border: string; text: string; chip: string }
> = {
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    text: "text-emerald-900",
    chip: "bg-emerald-600",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-900",
    chip: "bg-amber-500",
  },
  orange: {
    bg: "bg-orange-50",
    border: "border-orange-300",
    text: "text-orange-900",
    chip: "bg-orange-500",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-900",
    chip: "bg-red-600",
  },
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-300",
    text: "text-rose-900",
    chip: "bg-rose-600",
  },
};

export function WbgtCalculatorClient() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(DEFAULTS);

  const result = useMemo(() => {
    const globe = parseFloat(form.globeTempC);
    return assess(
      {
        airTempC: form.airTempC,
        humidity: form.humidity,
        globeTempC: Number.isFinite(globe) ? globe : undefined,
        windSpeedMps: form.windSpeedMps,
        solarRadiationWm2: form.solarRadiationWm2,
        environment: form.environment,
      },
      form.workIntensity,
      form.acclimatization,
    );
  }, [form]);

  const color = COLOR_TOKEN[result.risk.color];

  function handleReset() {
    setForm(DEFAULTS);
  }

  function handlePrint() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  function handleAddToLog() {
    const globe = parseFloat(form.globeTempC);
    putHeatLogDraft({
      airTempC: form.airTempC,
      humidity: form.humidity,
      globeTempC: Number.isFinite(globe) ? globe : null,
      environment: form.environment,
      workIntensity: form.workIntensity,
      acclimatization: form.acclimatization,
      wbgt: result.wbgt.wbgt,
      riskLevel: result.risk.level,
      riskLabel: result.risk.label,
      suggestedMeasures: [
        `作業/休憩 ${result.recommendation.workRestRatio}`,
        `水分 ${result.recommendation.fluidIntakeMlPerHour}`,
      ].join("／"),
    });
    router.push("/heat-illness-prevention/log");
  }

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="wbgt-input-heading"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden"
      >
        <h2
          id="wbgt-input-heading"
          className="flex items-center gap-2 text-base font-bold text-slate-900"
        >
          <Activity className="h-5 w-5 text-orange-600" aria-hidden="true" />
          入力条件
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          現場で測定した気温・湿度・黒球温度を入力してください。黒球温度が未測定の場合は風速・日射量から推計します。
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField
            label="気温 (°C)"
            value={form.airTempC}
            step={0.1}
            stepBy={0.5}
            min={-10}
            max={55}
            onChange={(v) => setForm((s) => ({ ...s, airTempC: v }))}
          />
          <NumberField
            label="相対湿度 (%)"
            value={form.humidity}
            step={1}
            stepBy={5}
            min={5}
            max={100}
            onChange={(v) => setForm((s) => ({ ...s, humidity: v }))}
          />
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              黒球温度 (°C)
              <span className="ml-1 font-normal text-slate-400">（任意）</span>
            </label>
            <input
              type="number"
              inputMode="decimal"
              step={0.1}
              value={form.globeTempC}
              onChange={(e) =>
                setForm((s) => ({ ...s, globeTempC: e.target.value }))
              }
              className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-base focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              placeholder="未測定なら空欄"
              autoComplete="off"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              未入力の場合は風速・日射量から推計値を使用します。
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              作業環境
            </label>
            <select
              value={form.environment}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  environment: e.target.value as Environment,
                }))
              }
              className="mt-1 h-11 w-full rounded-md border border-slate-300 px-2 text-base focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              <option value="outdoor">屋外（日射あり）</option>
              <option value="indoor">屋内（日射なし）</option>
            </select>
          </div>
          {form.environment === "outdoor" && !form.globeTempC && (
            <>
              <NumberField
                label="風速 (m/s)"
                value={form.windSpeedMps}
                step={0.1}
                stepBy={0.5}
                min={0}
                max={20}
                onChange={(v) => setForm((s) => ({ ...s, windSpeedMps: v }))}
                icon={<Wind className="h-3.5 w-3.5 text-slate-500" />}
              />
              <NumberField
                label="日射量 (W/m²)"
                value={form.solarRadiationWm2}
                step={10}
                stepBy={50}
                min={0}
                max={1200}
                onChange={(v) =>
                  setForm((s) => ({ ...s, solarRadiationWm2: v }))
                }
                icon={<Sun className="h-3.5 w-3.5 text-slate-500" />}
              />
            </>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              作業強度
            </label>
            <select
              value={form.workIntensity}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  workIntensity: e.target.value as WorkIntensity,
                }))
              }
              className="mt-1 h-11 w-full rounded-md border border-slate-300 px-2 text-base focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              <option value="light">軽作業（座位・軽手作業）</option>
              <option value="moderate">中程度（立位・通常歩行）</option>
              <option value="heavy">重作業（持続的肉体労働）</option>
              <option value="very-heavy">非常に重い（最大努力・重量物）</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              暑熱順化の状況
            </label>
            <select
              value={form.acclimatization}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  acclimatization: e.target.value as AcclimatizationState,
                }))
              }
              className="mt-1 h-11 w-full rounded-md border border-slate-300 px-2 text-base focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            >
              <option value="acclimatized">
                順化済み（直近7日以上連続で暑熱作業）
              </option>
              <option value="non-acclimatized">
                未順化（新規・復帰・初日）
              </option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            初期値に戻す
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            結果を印刷
          </button>
          <button
            type="button"
            onClick={handleAddToLog}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-500 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100"
          >
            <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
            日次記録簿に追加
          </button>
        </div>
      </section>

      <section
        aria-labelledby="wbgt-result-heading"
        className={`rounded-2xl border-2 ${color.border} ${color.bg} p-5 shadow-sm`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <h2
            id="wbgt-result-heading"
            className={`text-lg font-bold ${color.text}`}
          >
            WBGT {result.wbgt.wbgt.toFixed(1)} °C
          </h2>
          <span
            className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-white ${color.chip}`}
          >
            {result.risk.label}
          </span>
        </div>
        <p className={`mt-2 text-sm leading-6 ${color.text}`}>
          {result.risk.summary}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
          <ResultStat
            label="自然湿球温度"
            value={`${result.wbgt.naturalWetBulbC.toFixed(1)} °C`}
          />
          <ResultStat
            label="使用した黒球温度"
            value={`${result.wbgt.globeTempUsedC.toFixed(1)} °C`}
          />
          <ResultStat
            label="作業強度別の閾値"
            value={`≥ ${result.risk.thresholdC.toFixed(0)} °C`}
          />
        </dl>
        <p className="mt-3 text-[11px] text-slate-600">
          式：{result.wbgt.notes}
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Droplet className="h-5 w-5 text-orange-600" aria-hidden="true" />
          推奨対策
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <RecRow
            label="作業／休憩サイクル"
            value={result.recommendation.workRestRatio}
          />
          <RecRow
            label="1時間あたりの水分補給"
            value={result.recommendation.fluidIntakeMlPerHour}
          />
          <RecRow label="塩分補給" value={result.recommendation.saltIntake} />
          {result.recommendation.suspendWork && (
            <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm font-semibold text-rose-900">
              本リスクレベルでは原則として作業を中止してください。
            </div>
          )}
        </dl>

        <RecList
          title="冷却・環境対策"
          items={result.recommendation.coolingMeasures}
        />
        <RecList
          title="モニタリング"
          items={result.recommendation.monitoring}
        />
        <RecList
          title="教育・周知事項"
          items={result.recommendation.educationReminders}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">
        <p>
          計算式の出典：JIS Z 8504 「暑熱環境－WBGT 指数に基づく作業者の熱ストレスの評価」、
          JSOH「許容濃度等の勧告（暑熱）」、厚生労働省「職場における熱中症予防対策マニュアル」。
        </p>
        <p className="mt-1">
          本ツールはあくまで参考値です。最終的な作業可否判断は事業者・産業医・職長が実測値と現場状況を踏まえて行ってください。
        </p>
      </section>
    </div>
  );
}

function NumberField({
  label,
  value,
  step,
  stepBy,
  min,
  max,
  onChange,
  icon,
}: {
  label: string;
  value: number;
  step: number;
  /** ＋/− ボタン1回あたりの増減幅（省略時は step）。手袋でのタップ調整用。 */
  stepBy?: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  icon?: React.ReactNode;
}) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const bump = (dir: 1 | -1) => {
    const inc = stepBy ?? step;
    // 浮動小数の誤差を抑えるため小数2桁で丸める
    const next = Math.round((safeValue + dir * inc) * 100) / 100;
    onChange(Math.min(max, Math.max(min, next)));
  };
  return (
    <div>
      <label className="flex items-center gap-1 text-xs font-semibold text-slate-700">
        {icon}
        {label}
      </label>
      <div className="mt-1 flex items-stretch gap-1.5">
        <button
          type="button"
          aria-label={`${label}を${stepBy ?? step}減らす`}
          onClick={() => bump(-1)}
          disabled={safeValue <= min}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-2xl font-bold leading-none text-slate-700 active:bg-slate-200 disabled:opacity-40"
        >
          −
        </button>
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={safeValue}
          onChange={(e) => {
            const next = parseFloat(e.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
          className="h-11 w-full min-w-0 rounded-md border border-slate-300 px-2 text-center text-base focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
        />
        <button
          type="button"
          aria-label={`${label}を${stepBy ?? step}増やす`}
          onClick={() => bump(1)}
          disabled={safeValue >= max}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-slate-50 text-2xl font-bold leading-none text-slate-700 active:bg-slate-200 disabled:opacity-40"
        >
          ＋
        </button>
      </div>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function RecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <dt className="text-xs font-semibold text-slate-500 sm:w-44">{label}</dt>
      <dd className="text-sm leading-6 text-slate-800">{value}</dd>
    </div>
  );
}

function RecList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4">
      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-800">
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
