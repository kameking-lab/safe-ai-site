"use client";

import { InputWithVoice, TextareaWithVoice } from "@/components/voice-input-field";
import type { KyPaperFormState, KyPaperRiskRow } from "@/lib/types/operations";

export function computeRiskGrade(evaluation: number): string {
  if (evaluation >= 12) return "A";
  if (evaluation >= 7) return "B";
  if (evaluation >= 4) return "C";
  return "D";
}

function withRecalc(row: KyPaperRiskRow, patch: Partial<KyPaperRiskRow>): KyPaperRiskRow {
  const next = { ...row, ...patch };
  const ev = next.magnitude * next.probability;
  next.evaluation = ev;
  next.riskGrade = computeRiskGrade(ev);
  const rev = next.reMagnitude * next.reProbability;
  next.reEvaluation = rev;
  next.reRiskGrade = computeRiskGrade(rev);
  return next;
}

type KyPaperFormProps = {
  value: KyPaperFormState;
  onChange: (next: KyPaperFormState) => void;
  onSave: (current: KyPaperFormState) => void;
  savedLabel?: string;
};

export function KyPaperForm({ value, onChange, onSave, savedLabel }: KyPaperFormProps) {
  const setRow = (index: number, patch: Partial<KyPaperRiskRow>) => {
    const rows = value.rows.map((r, i) => (i === index ? withRecalc(r, patch) : r));
    onChange({ ...value, rows });
  };

  return (
    <section className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm print:shadow-none sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">危険予知活動（KY）</h2>
          <p className="mt-0.5 text-[11px] text-slate-600">紙様式に近い入力。評価は大きさ×可能性で自動計算します。</p>
        </div>
        <button
          type="button"
          onClick={() => onSave(value)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          保存
        </button>
      </div>
      {savedLabel ? <p className="mt-2 text-[11px] text-emerald-700">{savedLabel}</p> : null}

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-700">日付</span>
          <InputWithVoice
            type="date"
            value={value.date}
            onChange={(e) => onChange({ ...value, date: e.target.value })}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-700">会社名</span>
          <InputWithVoice
            value={value.companyName}
            onChange={(e) => onChange({ ...value, companyName: e.target.value })}
            placeholder="会社名"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-700">担当者</span>
          <InputWithVoice
            value={value.personInCharge}
            onChange={(e) => onChange({ ...value, personInCharge: e.target.value })}
            placeholder="担当者名"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-slate-700">作業内容</span>
          <InputWithVoice
            value={value.workContent}
            onChange={(e) => onChange({ ...value, workContent: e.target.value })}
            placeholder="例: 土台入れ"
          />
        </label>
      </div>

      <label className="mt-3 block space-y-1">
        <span className="text-xs font-semibold text-slate-700">元方安全指示事項</span>
        <TextareaWithVoice
          rows={2}
          value={value.supervisorInstructions}
          onChange={(e) => onChange({ ...value, supervisorInstructions: e.target.value })}
          placeholder="例: 足元段差注意の事"
          className="min-h-[52px]"
        />
      </label>

      {/* モバイル: 各行をカード表示 */}
      <div className="mt-4 sm:hidden space-y-4">
        {value.rows.map((row, idx) => (
          <div key={idx} className="rounded-lg border border-slate-300 bg-slate-50 p-3 space-y-2">
            <p className="text-[11px] font-semibold text-slate-700">リスク #{idx + 1}</p>
            <label className="block space-y-1">
              <span className="text-[11px] text-slate-600">予測される危険性・有害性</span>
              <TextareaWithVoice
                rows={3}
                value={row.predictedHarm}
                onChange={(e) => setRow(idx, { predictedHarm: e.target.value })}
                className="text-xs"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-[11px] text-slate-600">大きさ</span>
                <select
                  className="w-full rounded border border-slate-300 bg-white px-1 py-1 text-xs"
                  value={row.magnitude}
                  onChange={(e) => setRow(idx, { magnitude: Number(e.target.value) })}
                >
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-slate-600">可能性</span>
                <select
                  className="w-full rounded border border-slate-300 bg-white px-1 py-1 text-xs"
                  value={row.probability}
                  onChange={(e) => setRow(idx, { probability: Number(e.target.value) })}
                >
                  {[0, 1, 3, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>
            <p className="text-[11px] text-slate-700">
              評価: <span className="font-mono font-bold">{row.evaluation}</span>　危険度: <span className="font-bold">{row.riskGrade}</span>
            </p>
            <label className="block space-y-1">
              <span className="text-[11px] text-slate-600">低減対策</span>
              <TextareaWithVoice
                rows={2}
                value={row.reductionMeasures}
                onChange={(e) => setRow(idx, { reductionMeasures: e.target.value })}
                className="text-xs"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-[11px] text-slate-600">再評価・大きさ</span>
                <select
                  className="w-full rounded border border-slate-300 bg-white px-1 py-1 text-xs"
                  value={row.reMagnitude}
                  onChange={(e) => setRow(idx, { reMagnitude: Number(e.target.value) })}
                >
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-slate-600">再評価・可能性</span>
                <select
                  className="w-full rounded border border-slate-300 bg-white px-1 py-1 text-xs"
                  value={row.reProbability}
                  onChange={(e) => setRow(idx, { reProbability: Number(e.target.value) })}
                >
                  {[0, 1, 3, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>
            <p className="text-[11px] text-slate-700">
              再評価: <span className="font-mono font-bold">{row.reEvaluation}</span>　危険度: <span className="font-bold">{row.reRiskGrade}</span>
            </p>
            <label className="block space-y-1">
              <span className="text-[11px] text-slate-600">再対策</span>
              <TextareaWithVoice
                rows={2}
                value={row.reMeasures}
                onChange={(e) => setRow(idx, { reMeasures: e.target.value })}
                className="text-xs"
              />
            </label>
          </div>
        ))}
      </div>

      {/* PC: テーブル表示 */}
      <div className="mt-4 hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[720px] border-collapse border border-slate-400 text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 px-1 py-2 font-semibold" rowSpan={2}>
                予測される危険性・有害性
              </th>
              <th className="border border-slate-400 px-1 py-2 font-semibold" colSpan={4}>
                危険性・有害性の評価
              </th>
              <th className="border border-slate-400 px-1 py-2 font-semibold" rowSpan={2}>
                低減対策
              </th>
              <th className="border border-slate-400 px-1 py-2 font-semibold" colSpan={4}>
                再評価
              </th>
              <th className="border border-slate-400 px-1 py-2 font-semibold" rowSpan={2}>
                再対策
              </th>
            </tr>
            <tr className="bg-slate-50">
              <th className="border border-slate-400 px-0.5 py-1">大きさ</th>
              <th className="border border-slate-400 px-0.5 py-1">可能性</th>
              <th className="border border-slate-400 px-0.5 py-1">評価</th>
              <th className="border border-slate-400 px-0.5 py-1">危険度</th>
              <th className="border border-slate-400 px-0.5 py-1">大きさ</th>
              <th className="border border-slate-400 px-0.5 py-1">可能性</th>
              <th className="border border-slate-400 px-0.5 py-1">評価</th>
              <th className="border border-slate-400 px-0.5 py-1">危険度</th>
            </tr>
          </thead>
          <tbody>
            {value.rows.map((row, idx) => (
              <tr key={idx}>
                <td className="border border-slate-400 p-1 align-top">
                  <TextareaWithVoice
                    rows={3}
                    value={row.predictedHarm}
                    onChange={(e) => setRow(idx, { predictedHarm: e.target.value })}
                    className="text-xs"
                  />
                </td>
                <td className="border border-slate-400 p-0.5">
                  <select
                    className="w-full rounded border border-slate-300 bg-white px-1 py-1"
                    value={row.magnitude}
                    onChange={(e) => setRow(idx, { magnitude: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border border-slate-400 p-0.5">
                  <select
                    className="w-full rounded border border-slate-300 bg-white px-1 py-1"
                    value={row.probability}
                    onChange={(e) => setRow(idx, { probability: Number(e.target.value) })}
                  >
                    {[0, 1, 3, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border border-slate-400 px-1 text-center font-mono">{row.evaluation}</td>
                <td className="border border-slate-400 px-1 text-center font-bold">{row.riskGrade}</td>
                <td className="border border-slate-400 p-1 align-top">
                  <TextareaWithVoice
                    rows={2}
                    value={row.reductionMeasures}
                    onChange={(e) => setRow(idx, { reductionMeasures: e.target.value })}
                    className="text-xs"
                  />
                </td>
                <td className="border border-slate-400 p-0.5">
                  <select
                    className="w-full rounded border border-slate-300 bg-white px-1 py-1"
                    value={row.reMagnitude}
                    onChange={(e) => setRow(idx, { reMagnitude: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border border-slate-400 p-0.5">
                  <select
                    className="w-full rounded border border-slate-300 bg-white px-1 py-1"
                    value={row.reProbability}
                    onChange={(e) => setRow(idx, { reProbability: Number(e.target.value) })}
                  >
                    {[0, 1, 3, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border border-slate-400 px-1 text-center font-mono">{row.reEvaluation}</td>
                <td className="border border-slate-400 px-1 text-center font-bold">{row.reRiskGrade}</td>
                <td className="border border-slate-400 p-1 align-top">
                  <TextareaWithVoice
                    rows={2}
                    value={row.reMeasures}
                    onChange={(e) => setRow(idx, { reMeasures: e.target.value })}
                    className="text-xs"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-[11px] leading-relaxed text-slate-700">
        <p className="font-semibold text-slate-800">凡例</p>
        <p>
          <span className="font-semibold">(a) 大きさ:</span> 4 極大（死亡等） / 3 大（31日以上） / 2 中（4〜30日） / 1
          小（3日以下）
        </p>
        <p>
          <span className="font-semibold">(b) 可能性:</span> 5 高い / 3 あり得る / 1 低い / 0 ほぼなし
        </p>
        <p>
          <span className="font-semibold">(c) 危険度:</span> A（12以上）即時見直し / B（7〜11）早期改善 / C（4〜6）一部改善 /
          D（3以下）必要に応じて
        </p>
      </div>

      <label className="mt-4 block space-y-1">
        <span className="text-xs font-semibold text-slate-700">参加者氏名・体調確認メモ</span>
        <TextareaWithVoice
          rows={3}
          value={value.participantNames}
          onChange={(e) => onChange({ ...value, participantNames: e.target.value })}
          placeholder="氏名と体調（良好○・不良×）"
        />
      </label>
      <p className="mt-1 text-[10px] text-slate-600">
        ※新規入場者の有無を確認の上、もれなく教育を実施する事。体調不良（×）は就業不可。
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 border border-slate-300 p-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-slate-800">ワンポイント指差呼称</p>
          <InputWithVoice
            className="mt-1"
            value={value.pointingCall}
            onChange={(e) => onChange({ ...value, pointingCall: e.target.value })}
            placeholder="例: 足元確認 ヨシ!"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-700">現場代理人</span>
            <InputWithVoice
              value={value.siteAgentSign}
              onChange={(e) => onChange({ ...value, siteAgentSign: e.target.value })}
              placeholder="署名・捺印欄"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-700">担当者</span>
            <InputWithVoice
              value={value.supervisorSign}
              onChange={(e) => onChange({ ...value, supervisorSign: e.target.value })}
              placeholder="署名・捺印欄"
            />
          </label>
        </div>
      </div>
    </section>
  );
}
