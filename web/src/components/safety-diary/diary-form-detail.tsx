"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import {
  INDUSTRY_PRESETS,
  WEATHER_OPTIONS,
  optionalFieldsSchema,
  requiredFieldsSchema,
  type IndustryPreset,
  type Weather,
} from "@/lib/safety-diary/schema";
import { addEntry, newId } from "@/lib/safety-diary/store";
import { INDUSTRY_PRESET_DATA, estimateQualifications } from "@/lib/safety-diary/presets";

const INDUSTRY_LABELS: Record<IndustryPreset, string> = {
  construction: "建設",
  manufacturing: "製造",
  healthcare: "医療福祉",
  transport: "運輸",
  it: "IT",
  other: "その他",
};

/** 必須5 + 任意8 の詳細モード */
export function DiaryFormDetail() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [industry, setIndustry] = useState<IndustryPreset>("construction");
  // 必須
  const [date, setDate] = useState(today);
  const [weather, setWeather] = useState<Weather>("晴れ");
  const [siteName, setSiteName] = useState("");
  const [workContent, setWorkContent] = useState("");
  const [kyResult, setKyResult] = useState("");
  const [nearMissOccurred, setNearMissOccurred] = useState(false);
  const [nearMissDetail, setNearMissDetail] = useState("");
  // 任意
  const [contractorWorks, setContractorWorks] = useState<{ name: string; work: string }[]>([
    { name: "", work: "" },
  ]);
  const [requiredQualifications, setRequiredQualifications] = useState<string[]>([]);
  const [plannedPeopleCount, setPlannedPeopleCount] = useState<string>("");
  const [predictedDisasters, setPredictedDisasters] = useState<string[]>([]);
  const [severity, setSeverity] = useState(3);
  const [likelihood, setLikelihood] = useState(3);
  const [riskSummary, setRiskSummary] = useState("");
  const [safetyInstructions, setSafetyInstructions] = useState("");
  const [patrolRecord, setPatrolRecord] = useState("");
  const [nextDayPlan, setNextDayPlan] = useState("");

  const [error, setError] = useState<string | null>(null);

  const preset = INDUSTRY_PRESET_DATA[industry];
  const estimated = useMemo(
    () => (workContent ? estimateQualifications(workContent, industry) : []),
    [workContent, industry]
  );

  function toggleArray(arr: string[], v: string): string[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const required = requiredFieldsSchema.safeParse({
      date,
      weather,
      siteName,
      workContent,
      kyResult,
      nearMissOccurred,
      nearMissDetail: nearMissOccurred ? nearMissDetail : undefined,
    });
    if (!required.success) {
      setError(required.error.issues[0]?.message ?? "必須項目に誤りがあります");
      return;
    }
    const optional = optionalFieldsSchema.safeParse({
      contractorWorks: contractorWorks.filter((c) => c.name || c.work),
      requiredQualifications: [...new Set([...requiredQualifications, ...estimated])],
      plannedPeopleCount: plannedPeopleCount ? Number(plannedPeopleCount) : undefined,
      predictedDisasters,
      riskAssessment: riskSummary || severity !== 3 || likelihood !== 3
        ? { severity, likelihood, summary: riskSummary }
        : undefined,
      safetyInstructions: safetyInstructions || undefined,
      patrolRecord: patrolRecord || undefined,
      nextDayPlan: nextDayPlan || undefined,
    });
    if (!optional.success) {
      setError(optional.error.issues[0]?.message ?? "任意項目に誤りがあります");
      return;
    }
    const id = newId();
    const now = new Date().toISOString();
    addEntry({
      id,
      industry,
      required: required.data,
      optional: optional.data,
      weatherAlerts: [],
      similarAccidentIds: [],
      relatedLawRevisionIds: [],
      createdAt: now,
      updatedAt: now,
    });
    router.push(`/safety-diary/${id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-xs font-bold text-slate-700">業種プリセット</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {INDUSTRY_PRESETS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setIndustry(id)}
              aria-pressed={industry === id}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                industry === id
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {INDUSTRY_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      {/* 必須セクション */}
      <fieldset className="space-y-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-4">
        <legend className="text-xs font-bold text-emerald-800">必須5項目</legend>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <select
            value={weather}
            onChange={(e) => setWeather(e.target.value as Weather)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {WEATHER_OPTIONS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>
        <input
          type="text"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          placeholder="現場名"
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          required
        />
        <textarea
          value={workContent}
          onChange={(e) => setWorkContent(e.target.value)}
          placeholder="作業内容"
          rows={2}
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          required
        />
        <textarea
          value={kyResult}
          onChange={(e) => setKyResult(e.target.value)}
          placeholder="KY結果（/ky からコピペ）"
          rows={2}
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          required
        />
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-700">ヒヤリハット:</label>
          <button
            type="button"
            onClick={() => setNearMissOccurred(false)}
            aria-pressed={!nearMissOccurred}
            className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
              !nearMissOccurred
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white"
            }`}
          >
            無し
          </button>
          <button
            type="button"
            onClick={() => setNearMissOccurred(true)}
            aria-pressed={nearMissOccurred}
            className={`rounded-lg border px-3 py-1 text-xs font-semibold ${
              nearMissOccurred ? "border-amber-500 bg-amber-50 text-amber-800" : "border-slate-200 bg-white"
            }`}
          >
            有り
          </button>
        </div>
        {nearMissOccurred && (
          <textarea
            value={nearMissDetail}
            onChange={(e) => setNearMissDetail(e.target.value)}
            placeholder="ヒヤリハット内容"
            rows={2}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        )}
      </fieldset>

      {/* 任意セクション */}
      <fieldset className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <legend className="text-xs font-bold text-slate-600">任意8項目（詳細記録）</legend>

        {/* 業者別作業 */}
        <div>
          <p className="text-xs font-semibold text-slate-700">業者別作業</p>
          <div className="mt-2 space-y-2">
            {contractorWorks.map((c, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2">
                <input
                  list={`contractor-${idx}`}
                  value={c.name}
                  onChange={(e) =>
                    setContractorWorks((prev) =>
                      prev.map((p, i) => (i === idx ? { ...p, name: e.target.value } : p))
                    )
                  }
                  placeholder="業者名"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <datalist id={`contractor-${idx}`}>
                  {preset.contractorSuggestions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <input
                  value={c.work}
                  onChange={(e) =>
                    setContractorWorks((prev) =>
                      prev.map((p, i) => (i === idx ? { ...p, work: e.target.value } : p))
                    )
                  }
                  placeholder="作業内容"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setContractorWorks((prev) => [...prev, { name: "", work: "" }])}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              + 業者を追加
            </button>
          </div>
        </div>

        {/* 必要資格（自動推定） */}
        <div>
          <p className="text-xs font-semibold text-slate-700">必要資格</p>
          {estimated.length > 0 && (
            <div className="mt-1 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-[11px] text-emerald-900">
              作業内容から自動推定: {estimated.join("、")}
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {[...new Set([...preset.qualifications, ...requiredQualifications])].map((q) => {
              const selected = requiredQualifications.includes(q);
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => setRequiredQualifications((prev) => toggleArray(prev, q))}
                  aria-pressed={selected}
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    selected
                      ? "border-emerald-500 bg-emerald-100 text-emerald-800"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  {q}
                </button>
              );
            })}
          </div>
        </div>

        {/* 予定人数 */}
        <label className="block">
          <span className="text-xs font-semibold text-slate-700">予定人数</span>
          <input
            type="number"
            min={0}
            value={plannedPeopleCount}
            onChange={(e) => setPlannedPeopleCount(e.target.value)}
            placeholder="例: 12"
            className="mt-1 block w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        {/* 予想災害 */}
        <div>
          <p className="text-xs font-semibold text-slate-700">予想災害</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {preset.predictedDisasters.map((d) => {
              const selected = predictedDisasters.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setPredictedDisasters((prev) => toggleArray(prev, d))}
                  aria-pressed={selected}
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    selected
                      ? "border-amber-500 bg-amber-100 text-amber-800"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* リスク評価（5x5） */}
        <div>
          <p className="text-xs font-semibold text-slate-700">リスク評価（5×5マトリクス）</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10px] text-slate-500">重大性 (1-5)</span>
              <input
                type="number"
                min={1}
                max={5}
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[10px] text-slate-500">発生可能性 (1-5)</span>
              <input
                type="number"
                min={1}
                max={5}
                value={likelihood}
                onChange={(e) => setLikelihood(Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <input
            value={riskSummary}
            onChange={(e) => setRiskSummary(e.target.value)}
            placeholder="リスク評価のサマリー（任意）"
            className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {/* 安全指示 */}
        <textarea
          value={safetyInstructions}
          onChange={(e) => setSafetyInstructions(e.target.value)}
          placeholder="安全指示事項"
          rows={2}
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        {/* 巡視記録 */}
        <textarea
          value={patrolRecord}
          onChange={(e) => setPatrolRecord(e.target.value)}
          placeholder="巡視記録"
          rows={2}
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        {/* 翌日予定 */}
        <textarea
          value={nextDayPlan}
          onChange={(e) => setNextDayPlan(e.target.value)}
          placeholder="翌日予定"
          rows={2}
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </fieldset>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Link
          href="/safety-diary"
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          キャンセル
        </Link>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
        >
          <Save className="h-4 w-4" />
          保存
        </button>
      </div>
    </form>
  );
}
