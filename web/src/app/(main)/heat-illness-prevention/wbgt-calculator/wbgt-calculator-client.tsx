"use client";

import { useMemo, useState } from "react";
import {
  Droplet,
  Wind,
  Sun,
  Activity,
} from "lucide-react";
import { calculateWBGT } from "@/lib/wbgt-engine";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";
import type { Environment } from "@/types/heat-illness";

type FormState = {
  airTempC: number;
  humidity: number;
  globeTempC: string;
  windSpeedMps: number;
  solarRadiationWm2: number;
  environment: Environment;
};

const DEFAULTS: FormState = {
  airTempC: 32,
  humidity: 70,
  globeTempC: "",
  windSpeedMps: 1.5,
  solarRadiationWm2: 700,
  environment: "outdoor",
};

export function WbgtCalculatorClient() {
  const [form, setForm] = useState<FormState>(DEFAULTS);

  const result = useMemo(() => {
    const globe = parseFloat(form.globeTempC);
    return calculateWBGT({
      airTempC: form.airTempC,
      humidity: form.humidity,
      globeTempC: Number.isFinite(globe) ? globe : undefined,
      windSpeedMps: form.windSpeedMps,
      solarRadiationWm2: form.solarRadiationWm2,
      environment: form.environment,
    });
  }, [form]);

  function handleReset() {
    setForm(DEFAULTS);
  }

  return (
    <div className="space-y-6">
      <section role="status" className="rounded-2xl border-2 border-sky-300 bg-sky-50 p-5 text-sky-950">
        <p className="text-sm font-bold">参考推定値（実測WBGTではありません）</p>
        <p className="mt-1 text-4xl font-black tabular-nums">{result.wbgt.toFixed(1)} °C</p>
        <p className="mt-3 text-sm leading-6">
          気温・湿度から自然湿球温度を近似し、黒球温度が未入力の場合はさらに推定しています。
          この値から作業中止、休憩時間、飲水量を決めたり、日次記録へ実測値として転記したりしないでください。
        </p>
        <a className="mt-3 inline-flex min-h-11 items-center font-bold underline" href="https://neccyusho.mhlw.go.jp/" target="_blank" rel="noopener noreferrer">
          厚生労働省「職場における熱中症予防情報」で確認
        </a>
      </section>

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
          教育用の参考計算です。作業判断にはJIS適合のWBGT計による現場実測値を使用してください。
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
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            初期値に戻す
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Droplet className="h-5 w-5 text-orange-600" aria-hidden="true" />
          作業判断前に確認すること
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-800">
          <li>作業場所でWBGT計を用いて実測し、測定時刻・場所・機器を記録する</li>
          <li>作業強度、衣服、暑熱順化、持病・服薬・当日の体調を個別に確認する</li>
          <li>熱中症のおそれがある者の報告体制と、悪化防止・救急対応手順を周知する</li>
          <li>飲水・塩分は一律量を指示せず、公式指針と産業医等の助言を確認する</li>
        </ul>
      </section>

      <CollapsibleDetail summary="参考推定の内訳（作業判断には使用不可）" className="print:hidden">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ResultStat
            label="自然湿球温度"
            value={`${result.naturalWetBulbC.toFixed(1)} °C`}
          />
          <ResultStat
            label="使用した黒球温度"
            value={`${result.globeTempUsedC.toFixed(1)} °C`}
          />
        </dl>
        <p className="mt-3">式：{result.notes}</p>
        <p className="mt-2">
          計算式の出典：JIS Z 8504 「暑熱環境－WBGT 指数に基づく作業者の熱ストレスの評価」、
          JSOH「許容濃度等の勧告（暑熱）」、厚生労働省「職場における熱中症予防対策マニュアル」。
        </p>
        <p className="mt-1">
          本ツールは近似計算の教育用参考値です。自然湿球温度を実測していないため、WBGT実測値の代替にはなりません。
        </p>
      </CollapsibleDetail>
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
