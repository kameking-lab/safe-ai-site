"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type {
  KyInstructionFallCheck,
  KyInstructionParticipant,
  KyInstructionRecordState,
  KyInstructionRiskRow,
  KyInstructionWorkRow,
} from "@/lib/types/operations";

type KyTabId = "basic" | "work" | "risk" | "people" | "fall";

const KY_TABS: { id: KyTabId; label: string }[] = [
  { id: "basic", label: "基本・印" },
  { id: "work", label: "作業①〜④" },
  { id: "risk", label: "現地KY" },
  { id: "people", label: "参加者・終了" },
  { id: "fall", label: "墜落点検" },
];

function workContextFrom(v: KyInstructionRecordState): string {
  return v.workRows
    .map((r) => [r.workPlace, r.workDetail, r.machinery, r.safetyInstruction].filter(Boolean).join(" "))
    .filter(Boolean)
    .join(" / ")
    .slice(0, 500);
}

type Props = {
  value: KyInstructionRecordState;
  onChange: (next: KyInstructionRecordState) => void;
  onSave: (current: KyInstructionRecordState) => void;
  savedLabel?: string;
};

const FALL_CHECK_LABELS = [
  "足場の墜落・転落防止設備が取外しされてないか？（交さ筋かい・さん・幅木・手すり・ネット等）",
  "吊足場の墜落・転落防止設備が取外しされてないか？（構成部材の損傷・腐食・状態は？）",
  "構台の墜落防止設備が取外しされてないか？",
] as const;

const QUAL_LIST =
  "1.足場 2.地山・土留 3.型枠 4.鉄骨 5.石綿 6.酸欠(1種) 7.酸欠(2種) 8.木工作業 9.コンクリート 10.玉掛け 11.クレーン運転 12.車両系建設機械 13.高所作業車 14.ボイラー取扱 15.特定化学物質 16.粉じん作業 17.その他";

function evalProduct(l: number, s: number) {
  return l * s;
}

export function KyInstructionRecordForm({ value, onChange, onSave, savedLabel }: Props) {
  const [tab, setTab] = useState<KyTabId>("basic");
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const patch = (partial: Partial<KyInstructionRecordState>) => onChange({ ...value, ...partial });

  useEffect(() => {
    if (value.workDateMonth && value.workDateDay) return;
    const d = new Date();
    onChange({
      ...value,
      workDateYear: String(d.getFullYear()),
      workDateMonth: String(d.getMonth() + 1),
      workDateDay: String(d.getDate()),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 初回マウント時の日付補完のみ
  }, []);

  const syncToday = () => {
    const d = new Date();
    onChange({
      ...value,
      workDateYear: String(d.getFullYear()),
      workDateMonth: String(d.getMonth() + 1),
      workDateDay: String(d.getDate()),
    });
  };

  const fetchAssist = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch("/api/ky-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("assist failed");
      const j = (await res.json()) as { text?: string };
      return j.text ?? "";
    },
    []
  );

  const addParticipant = () => {
    patch({ participants: [...value.participants, { name: "", qualNo: "", preWork: "", onExit: "" }] });
  };

  const removeParticipant = (index: number) => {
    if (value.participants.length <= 1) return;
    patch({ participants: value.participants.filter((_, i) => i !== index) });
  };

  const setWorkRow = (i: number, row: KyInstructionWorkRow) => {
    const next = [...value.workRows];
    next[i] = row;
    patch({ workRows: next });
  };

  const setRiskRow = (i: number, row: KyInstructionRiskRow) => {
    const next = [...value.riskRows];
    next[i] = row;
    patch({ riskRows: next });
  };

  const setParticipant = (i: number, row: KyInstructionParticipant) => {
    const next = [...value.participants];
    next[i] = row;
    patch({ participants: next });
  };

  const setFallCheck = (i: number, row: KyInstructionFallCheck) => {
    const next = [...value.fallChecks];
    next[i] = row;
    patch({ fallChecks: next });
  };

  const setStamp = (i: number, v: string) => {
    const next = [...value.reportStamps] as KyInstructionRecordState["reportStamps"];
    next[i] = v;
    patch({ reportStamps: next });
  };

  return (
    <div className="space-y-3 print:text-black">
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-[1px] shadow-lg">
        <div className="rounded-2xl bg-slate-950/95 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-base font-black tracking-tight text-white sm:text-lg md:text-xl">
                作業指示・安全指示書及び現地KY記録表
              </h1>
              <p className="mt-1 text-[11px] text-emerald-100/90">
                タブレット横持ち向け。セクション切替で縦スクロールを抑えます。
                <Link href="/risk" className="ml-2 font-semibold text-cyan-300 underline">
                  現場リスク
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={syncToday}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20"
              >
                今日の日付
              </button>
              <button
                type="button"
                onClick={() => onSave(value)}
                className="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-bold text-slate-950 shadow hover:bg-emerald-400"
              >
                保存
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {KY_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                  tab === t.id ? "bg-emerald-400 text-slate-950" : "bg-white/10 text-slate-200 hover:bg-white/20"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {savedLabel ? <p className="text-xs font-semibold text-emerald-700">{savedLabel}</p> : null}

      <div className="max-h-[min(100dvh-14rem,56rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-slate-50/50 p-2 sm:p-3 md:max-h-[min(100dvh-12rem,52rem)] landscape:max-h-[min(100dvh-10rem,48rem)]">
      {/* 報告確認印欄 */}
      {tab === "basic" ? (
      <>
      <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
        <table className="w-full min-w-[720px] border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100">
              {["報告確認", "統括安全衛生責任者", "元方安全衛生管理者", "担当者", "協力会社責任者"].map((h, i) => (
                <th key={h} className="border border-slate-300 px-1 py-2 font-semibold text-slate-800">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="h-16">
              {value.reportStamps.map((cell, i) => (
                <td key={i} className="border border-slate-300 p-1 align-top">
                  <input
                    className="h-full min-h-[3rem] w-full rounded border border-dashed border-slate-300 bg-slate-50/50 px-1 text-center text-xs"
                    value={cell}
                    onChange={(e) => setStamp(i, e.target.value)}
                    placeholder="印"
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white p-3 text-xs shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold">作業日</span>
          <input
            className="w-20 rounded border border-slate-300 px-2 py-1"
            value={value.workDateYear}
            onChange={(e) => patch({ workDateYear: e.target.value })}
            placeholder="2017"
          />
          <span>年</span>
          <input
            className="w-12 rounded border border-slate-300 px-2 py-1"
            value={value.workDateMonth}
            onChange={(e) => patch({ workDateMonth: e.target.value })}
          />
          <span>月</span>
          <input
            className="w-12 rounded border border-slate-300 px-2 py-1"
            value={value.workDateDay}
            onChange={(e) => patch({ workDateDay: e.target.value })}
          />
          <span>日</span>
          <input
            className="w-24 rounded border border-slate-300 px-2 py-1"
            value={value.workDateNote}
            onChange={(e) => patch({ workDateNote: e.target.value })}
            placeholder="（　）"
          />
          <span className="ml-4 font-semibold">天候</span>
          <input
            className="min-w-[12rem] flex-1 rounded border border-slate-300 px-2 py-1"
            value={value.weather}
            onChange={(e) => patch({ weather: e.target.value })}
            placeholder="晴・曇・雨・雪"
          />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="flex flex-col gap-1 rounded border border-slate-200 p-2">
            <span className="font-semibold text-slate-700">協力会社名（1次）</span>
            <input
              className="rounded border border-slate-300 px-2 py-1"
              value={value.coop1Name}
              onChange={(e) => patch({ coop1Name: e.target.value })}
            />
            <span className="text-[11px] text-slate-600">安責（安全衛生責任者）</span>
            <input
              className="rounded border border-slate-300 px-2 py-1"
              value={value.coop1Chief}
              onChange={(e) => patch({ coop1Chief: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1 rounded border border-slate-200 p-2">
            <span className="font-semibold text-slate-700">協力会社名（2次）</span>
            <input
              className="rounded border border-slate-300 px-2 py-1"
              value={value.coop2Name}
              onChange={(e) => patch({ coop2Name: e.target.value })}
            />
            <span className="text-[11px] text-slate-600">安責（安全衛生責任者）</span>
            <input
              className="rounded border border-slate-300 px-2 py-1"
              value={value.coop2Chief}
              onChange={(e) => patch({ coop2Chief: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1 rounded border border-slate-200 p-2">
            <span className="font-semibold text-slate-700">協力会社名（3次）</span>
            <input
              className="rounded border border-slate-300 px-2 py-1"
              value={value.coop3Name}
              onChange={(e) => patch({ coop3Name: e.target.value })}
            />
            <span className="text-[11px] text-slate-600">安責（安全衛生責任者）</span>
            <input
              className="rounded border border-slate-300 px-2 py-1"
              value={value.coop3Chief}
              onChange={(e) => patch({ coop3Chief: e.target.value })}
            />
          </div>
        </div>
      </div>
      </>
      ) : null}

      {/* 作業内容 */}
      {tab === "work" ? (
      <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
        <p className="border-b border-slate-200 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-900">作業内容</p>
        <table className="w-full min-w-[960px] border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-1 py-1">番号</th>
              <th className="border border-slate-300 px-1 py-1">作業箇所</th>
              <th className="border border-slate-300 px-1 py-1">作業実施内容</th>
              <th className="border border-slate-300 px-1 py-1">使用機械</th>
              <th className="border border-slate-300 px-1 py-1">火気使用〇</th>
              <th className="border border-slate-300 px-1 py-1">高所作業〇</th>
              <th className="border border-slate-300 px-1 py-1">使用保護具</th>
              <th className="border border-slate-300 px-1 py-1">安全衛生指示事項</th>
              <th className="border border-slate-300 px-1 py-1">責任者</th>
              <th className="border border-slate-300 px-1 py-1">元請サイン</th>
            </tr>
          </thead>
          <tbody>
            {(["①", "②", "③", "④"] as const).map((no, i) => {
              const row = value.workRows[i]!;
              return (
                <tr key={no}>
                  <td className="border border-slate-300 px-1 py-1 text-center font-bold">{no}</td>
                  <td className="border border-slate-300 p-0">
                    <textarea
                      className="min-h-[4rem] w-full resize-y border-0 bg-transparent px-1 py-1"
                      value={row.workPlace}
                      onChange={(e) => setWorkRow(i, { ...row, workPlace: e.target.value })}
                    />
                  </td>
                  <td className="border border-slate-300 p-0">
                    <textarea
                      className="min-h-[4rem] w-full resize-y border-0 bg-transparent px-1 py-1"
                      value={row.workDetail}
                      onChange={(e) => setWorkRow(i, { ...row, workDetail: e.target.value })}
                    />
                  </td>
                  <td className="border border-slate-300 p-0">
                    <textarea
                      className="min-h-[4rem] w-full resize-y border-0 bg-transparent px-1 py-1"
                      value={row.machinery}
                      onChange={(e) => setWorkRow(i, { ...row, machinery: e.target.value })}
                    />
                  </td>
                  <td className="border border-slate-300 p-0">
                    <input
                      className="w-full border-0 bg-transparent px-1 py-1 text-center"
                      value={row.fireMark}
                      onChange={(e) => setWorkRow(i, { ...row, fireMark: e.target.value })}
                      placeholder="〇"
                    />
                  </td>
                  <td className="border border-slate-300 p-0">
                    <input
                      className="w-full border-0 bg-transparent px-1 py-1 text-center"
                      value={row.heightMark}
                      onChange={(e) => setWorkRow(i, { ...row, heightMark: e.target.value })}
                      placeholder="〇"
                    />
                  </td>
                  <td className="border border-slate-300 p-0">
                    <textarea
                      className="min-h-[4rem] w-full resize-y border-0 bg-transparent px-1 py-0.5 text-[10px] leading-tight text-slate-600"
                      value={row.ppeNote}
                      onChange={(e) => setWorkRow(i, { ...row, ppeNote: e.target.value })}
                      placeholder="親綱、安全帯、保護メガネ、防塵マスク、耳栓、防振手袋、発炎筒他必要毎記載"
                    />
                  </td>
                  <td className="border border-slate-300 p-0">
                    <textarea
                      className="min-h-[4rem] w-full resize-y border-0 bg-transparent px-1 py-1"
                      value={row.safetyInstruction}
                      onChange={(e) => setWorkRow(i, { ...row, safetyInstruction: e.target.value })}
                    />
                  </td>
                  <td className="border border-slate-300 p-0">
                    <input
                      className="w-full border-0 bg-transparent px-1 py-1"
                      value={row.responsible}
                      onChange={(e) => setWorkRow(i, { ...row, responsible: e.target.value })}
                    />
                  </td>
                  <td className="border border-slate-300 p-0">
                    <input
                      className="w-full border-0 bg-transparent px-1 py-1"
                      value={row.primeSign}
                      onChange={(e) => setWorkRow(i, { ...row, primeSign: e.target.value })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      ) : null}

      {/* 現地KY */}
      {tab === "risk" ? (
      <>
      <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
        <p className="border-b border-slate-200 bg-sky-50 px-2 py-1 text-xs font-bold text-sky-900">現地KY（リスクアセスメント）</p>
        <table className="w-full min-w-[1100px] border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-100">
              <th rowSpan={2} className="border border-slate-300 px-1 py-1">
                対象
              </th>
              <th rowSpan={2} className="border border-slate-300 px-1 py-1">
                どんな危険が潜んでいますか
              </th>
              <th rowSpan={2} className="border border-slate-300 px-1 py-1">
                必要資格No.
              </th>
              <th colSpan={5} className="border border-slate-300 px-1 py-1">
                リスクの評価
              </th>
              <th rowSpan={2} className="border border-slate-300 px-1 py-1">
                低減対策（評価値3以上は必ず記入）
              </th>
              <th colSpan={5} className="border border-slate-300 px-1 py-1">
                低減対策後の再評価
              </th>
              <th rowSpan={2} className="border border-slate-300 px-1 py-1">
                2以下になりましたか？
              </th>
              <th rowSpan={2} className="border border-slate-300 px-1 py-1">
                元請サイン
              </th>
            </tr>
            <tr className="bg-slate-50">
              <th className="border border-slate-300 px-0.5 py-0.5">①可能性</th>
              <th className="border border-slate-300 px-0.5 py-0.5">×</th>
              <th className="border border-slate-300 px-0.5 py-0.5">②重大性</th>
              <th className="border border-slate-300 px-0.5 py-0.5">＝</th>
              <th className="border border-slate-300 px-0.5 py-0.5">評価値※2以下も低減対策を考える</th>
              <th className="border border-slate-300 px-0.5 py-0.5">可能性</th>
              <th className="border border-slate-300 px-0.5 py-0.5">×</th>
              <th className="border border-slate-300 px-0.5 py-0.5">重大性</th>
              <th className="border border-slate-300 px-0.5 py-0.5">＝</th>
              <th className="border border-slate-300 px-0.5 py-0.5">評価値</th>
            </tr>
          </thead>
          <tbody>
            {value.riskRows.map((row, i) => (
              <tr key={row.targetLabel}>
                <td className="border border-slate-300 px-1 py-1 text-center font-bold">{row.targetLabel}</td>
                <td className="border border-slate-300 p-0 align-top">
                  <div className="flex flex-col gap-1 p-1">
                    <button
                      type="button"
                      disabled={aiBusy === `hz-${i}`}
                      onClick={async () => {
                        setAiBusy(`hz-${i}`);
                        try {
                          const text = await fetchAssist({
                            field: "hazard",
                            targetLabel: row.targetLabel,
                            workContext: workContextFrom(value),
                            seed: Date.now() + i,
                          });
                          setRiskRow(i, { ...row, hazard: text });
                        } catch {
                          setRiskRow(i, { ...row, hazard: row.hazard + "\n（AI取得に失敗しました）" });
                        } finally {
                          setAiBusy(null);
                        }
                      }}
                      className="rounded border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold text-sky-900 hover:bg-sky-100 disabled:opacity-50"
                    >
                      {aiBusy === `hz-${i}` ? "生成中…" : "AIで危険を下書き"}
                    </button>
                    <textarea
                      className="min-h-[3.5rem] w-full resize-y rounded border border-slate-200 bg-white px-1 py-1 text-[10px]"
                      value={row.hazard}
                      onChange={(e) => setRiskRow(i, { ...row, hazard: e.target.value })}
                    />
                  </div>
                </td>
                <td className="border border-slate-300 p-0">
                  <input
                    className="w-full border-0 bg-transparent px-1 py-1 text-center"
                    value={row.qualNo}
                    onChange={(e) => setRiskRow(i, { ...row, qualNo: e.target.value })}
                  />
                </td>
                <td className="border border-slate-300 p-0">
                  <select
                    className="w-full border-0 bg-transparent py-1 text-center text-xs"
                    value={row.likelihood}
                    onChange={(e) =>
                      setRiskRow(i, { ...row, likelihood: Number(e.target.value) as 1 | 2 | 3 })
                    }
                  >
                    <option value={3}>3</option>
                    <option value={2}>2</option>
                    <option value={1}>1</option>
                  </select>
                </td>
                <td className="border border-slate-300 text-center">×</td>
                <td className="border border-slate-300 p-0">
                  <select
                    className="w-full border-0 bg-transparent py-1 text-center text-xs"
                    value={row.severity}
                    onChange={(e) =>
                      setRiskRow(i, { ...row, severity: Number(e.target.value) as 1 | 2 | 3 })
                    }
                  >
                    <option value={3}>3</option>
                    <option value={2}>2</option>
                    <option value={1}>1</option>
                  </select>
                </td>
                <td className="border border-slate-300 text-center">＝</td>
                <td className="border border-slate-300 px-1 py-1 text-center font-bold">
                  {evalProduct(row.likelihood, row.severity)}
                </td>
                <td className="border border-slate-300 p-0 align-top">
                  <div className="flex flex-col gap-1 p-1">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        disabled={aiBusy === `rd-${i}`}
                        onClick={async () => {
                          setAiBusy(`rd-${i}`);
                          try {
                            const text = await fetchAssist({
                              field: "reduction",
                              targetLabel: row.targetLabel,
                              workContext: workContextFrom(value),
                              hazardSoFar: row.hazard,
                              likelihood: row.likelihood,
                              severity: row.severity,
                              seed: Date.now() + i * 3,
                            });
                            setRiskRow(i, { ...row, reduction: text });
                          } catch {
                            setRiskRow(i, { ...row, reduction: row.reduction });
                          } finally {
                            setAiBusy(null);
                          }
                        }}
                        className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
                      >
                        {aiBusy === `rd-${i}` ? "…" : "低減AI"}
                      </button>
                      <button
                        type="button"
                        disabled={aiBusy === `rr-${i}`}
                        onClick={async () => {
                          setAiBusy(`rr-${i}`);
                          try {
                            const text = await fetchAssist({
                              field: "rereduction",
                              targetLabel: row.targetLabel,
                              workContext: workContextFrom(value),
                              reductionSoFar: row.reduction,
                              reLikelihood: row.reLikelihood,
                              reSeverity: row.reSeverity,
                              seed: Date.now() + i * 5,
                            });
                            setRiskRow(i, {
                              ...row,
                              reduction: row.reduction ? `${row.reduction}\n【再対策案】${text}` : text,
                            });
                          } catch {
                            /* ignore */
                          } finally {
                            setAiBusy(null);
                          }
                        }}
                        className="rounded border border-violet-300 bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-950 hover:bg-violet-100 disabled:opacity-50"
                      >
                        {aiBusy === `rr-${i}` ? "…" : "再対策AI"}
                      </button>
                    </div>
                    <textarea
                      className="min-h-[3.5rem] w-full resize-y rounded border border-slate-200 bg-white px-1 py-1 text-[10px]"
                      value={row.reduction}
                      onChange={(e) => setRiskRow(i, { ...row, reduction: e.target.value })}
                    />
                  </div>
                </td>
                <td className="border border-slate-300 p-0">
                  <select
                    className="w-full border-0 bg-transparent py-1 text-center text-xs"
                    value={row.reLikelihood}
                    onChange={(e) =>
                      setRiskRow(i, { ...row, reLikelihood: Number(e.target.value) as 1 | 2 | 3 })
                    }
                  >
                    <option value={3}>3</option>
                    <option value={2}>2</option>
                    <option value={1}>1</option>
                  </select>
                </td>
                <td className="border border-slate-300 text-center">×</td>
                <td className="border border-slate-300 p-0">
                  <select
                    className="w-full border-0 bg-transparent py-1 text-center text-xs"
                    value={row.reSeverity}
                    onChange={(e) =>
                      setRiskRow(i, { ...row, reSeverity: Number(e.target.value) as 1 | 2 | 3 })
                    }
                  >
                    <option value={3}>3</option>
                    <option value={2}>2</option>
                    <option value={1}>1</option>
                  </select>
                </td>
                <td className="border border-slate-300 text-center">＝</td>
                <td className="border border-slate-300 px-1 py-1 text-center font-bold">
                  {evalProduct(row.reLikelihood, row.reSeverity)}
                </td>
                <td className="border border-slate-300 p-0">
                  <input
                    className="w-full border-0 bg-transparent px-1 py-1 text-center"
                    value={row.reducedBelow2}
                    onChange={(e) => setRiskRow(i, { ...row, reducedBelow2: e.target.value })}
                    placeholder="はい/いいえ"
                  />
                </td>
                <td className="border border-slate-300 p-0">
                  <input
                    className="w-full border-0 bg-transparent px-1 py-1"
                    value={row.primeSign}
                    onChange={(e) => setRiskRow(i, { ...row, primeSign: e.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 rounded-xl border border-slate-300 bg-white p-2 text-[10px] shadow-sm md:grid-cols-2">
        <div>
          <p className="font-bold text-slate-800">リスクアセスメント評価基準</p>
          <ul className="mt-1 list-inside list-disc text-slate-700">
            <li>①可能性 3:かなり発生 / 2:たまに発生 / 1:ほとんどない</li>
            <li>②重大性 3:死亡・重大 / 2:休業4日以上 / 1:休業4日未満</li>
            <li>評価値＝①×②。2以下も低減対策を考える。3以上は低減対策必須。</li>
          </ul>
        </div>
        <div>
          <p className="font-bold text-slate-800">作業主任者・技能講習資格者他一覧</p>
          <p className="mt-1 leading-snug text-slate-700">{QUAL_LIST}</p>
        </div>
      </div>
      </>
      ) : null}

      {/* 参加者・休憩・退出 */}
      {tab === "people" ? (
      <div className="grid gap-3 rounded-xl border border-slate-300 bg-white p-2 shadow-sm lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-slate-800">KY参加者（自署）</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addParticipant}
                className="rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700"
              >
                ＋ 行を追加
              </button>
            </div>
          </div>
          <div className="mt-1 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[10px]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-0.5 py-1"> </th>
                  <th className="border border-slate-300 px-0.5 py-1">#</th>
                  <th className="border border-slate-300 px-0.5 py-1">氏名</th>
                  <th className="border border-slate-300 px-0.5 py-1">必要資格No.</th>
                  <th className="border border-slate-300 px-0.5 py-1">作業前</th>
                  <th className="border border-slate-300 px-0.5 py-1">退場時</th>
                </tr>
              </thead>
              <tbody>
                {value.participants.map((p, i) => (
                  <tr key={i}>
                    <td className="border border-slate-300 p-0.5 text-center">
                      <button
                        type="button"
                        title="この行を削除"
                        onClick={() => removeParticipant(i)}
                        className="rounded text-rose-600 hover:bg-rose-50 disabled:opacity-30"
                        disabled={value.participants.length <= 1}
                      >
                        ×
                      </button>
                    </td>
                    <td className="border border-slate-300 px-0.5 py-0.5 text-center">{i + 1}</td>
                    <td className="border border-slate-300 p-0">
                      <input
                        className="w-full border-0 bg-transparent px-1 py-0.5"
                        value={p.name}
                        onChange={(e) => setParticipant(i, { ...p, name: e.target.value })}
                      />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input
                        className="w-full border-0 bg-transparent px-1 py-0.5"
                        value={p.qualNo}
                        onChange={(e) => setParticipant(i, { ...p, qualNo: e.target.value })}
                      />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input
                        className="w-full border-0 bg-transparent px-1 py-0.5"
                        value={p.preWork}
                        onChange={(e) => setParticipant(i, { ...p, preWork: e.target.value })}
                      />
                    </td>
                    <td className="border border-slate-300 p-0">
                      <input
                        className="w-full border-0 bg-transparent px-1 py-0.5"
                        value={p.onExit}
                        onChange={(e) => setParticipant(i, { ...p, onExit: e.target.value })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="font-semibold">計</span>
            <input
              className="w-20 rounded border border-slate-300 px-2 py-1"
              value={value.participantTotal}
              onChange={(e) => patch({ participantTotal: e.target.value })}
            />
            <span>名</span>
          </div>
        </div>

        <div className="space-y-2 text-xs lg:col-span-5">
          <div>
            <p className="font-bold text-slate-800">本日の休憩時間</p>
            <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {value.breaks.map((b, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="w-6 text-[10px] text-slate-500">{i + 1}</span>
                  <input
                    className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs"
                    value={b}
                    onChange={(e) => {
                      const next = [...value.breaks];
                      next[i] = e.target.value;
                      patch({ breaks: next });
                    }}
                    placeholder="〇:〇〜〇:〇"
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="font-bold text-slate-800">本日は安全チョッキ</p>
            <input
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
              value={value.safetyVest}
              onChange={(e) => patch({ safetyVest: e.target.value })}
              placeholder="着用・未着用 （〇を打つ）"
            />
          </div>
          <div>
            <p className="font-bold text-slate-800">作業終了時間（退出）</p>
            <div className="mt-1 space-y-1">
              <label className="flex items-center gap-2">
                <span className="w-16 shrink-0">大型車</span>
                <input
                  className="flex-1 rounded border border-slate-300 px-2 py-1"
                  value={value.exitLarge}
                  onChange={(e) => patch({ exitLarge: e.target.value })}
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-16 shrink-0">中型車</span>
                <input
                  className="flex-1 rounded border border-slate-300 px-2 py-1"
                  value={value.exitMedium}
                  onChange={(e) => patch({ exitMedium: e.target.value })}
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-16 shrink-0">普通車</span>
                <input
                  className="flex-1 rounded border border-slate-300 px-2 py-1"
                  value={value.exitSmall}
                  onChange={(e) => patch({ exitSmall: e.target.value })}
                />
              </label>
            </div>
          </div>
          <div>
            <p className="text-[11px] leading-snug text-slate-700">
              全員怪我なく終了した場合「本日異常なし」と安全衛生責任者が記入。※異常があった場合は作業員に申し出る。
            </p>
            <textarea
              className="mt-1 min-h-[3rem] w-full rounded border border-slate-300 px-2 py-1 text-xs"
              value={value.closingNote}
              onChange={(e) => patch({ closingNote: e.target.value })}
            />
          </div>
        </div>
      </div>
      ) : null}

      {/* 墜落防止点検 */}
      {tab === "fall" ? (
      <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
        <p className="border-b border-slate-200 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-900">
          墜落防止設備等の点検（良/否・済）
        </p>
        <table className="w-full min-w-[720px] border-collapse text-[10px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-1 py-1">項目</th>
              <th className="border border-slate-300 px-1 py-1">良</th>
              <th className="border border-slate-300 px-1 py-1">否</th>
              <th className="border border-slate-300 px-1 py-1">済</th>
            </tr>
          </thead>
          <tbody>
            {FALL_CHECK_LABELS.map((label, i) => {
              const row = value.fallChecks[i] ?? { good: "", bad: "", done: "" };
              return (
                <tr key={i}>
                  <td className="border border-slate-300 px-1 py-1 align-top text-slate-800">{label}</td>
                  <td className="border border-slate-300 p-0">
                    <input
                      className="w-full border-0 bg-transparent px-1 py-1 text-center"
                      value={row.good}
                      onChange={(e) => setFallCheck(i, { ...row, good: e.target.value })}
                    />
                  </td>
                  <td className="border border-slate-300 p-0">
                    <input
                      className="w-full border-0 bg-transparent px-1 py-1 text-center"
                      value={row.bad}
                      onChange={(e) => setFallCheck(i, { ...row, bad: e.target.value })}
                    />
                  </td>
                  <td className="border border-slate-300 p-0">
                    <input
                      className="w-full border-0 bg-transparent px-1 py-1 text-center"
                      value={row.done}
                      onChange={(e) => setFallCheck(i, { ...row, done: e.target.value })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="border-t border-slate-200 px-2 py-2 text-[11px] text-slate-700">
          是正の必要がある場合は元請へ報告すること。
        </p>
        <div className="px-2 pb-2">
          <p className="text-[11px] font-semibold text-slate-700">是正場所、内容他</p>
          <textarea
            className="mt-1 min-h-[3rem] w-full rounded border border-slate-300 px-2 py-1 text-xs"
            value={value.correctionNote}
            onChange={(e) => patch({ correctionNote: e.target.value })}
          />
        </div>
      </div>
      ) : null}
      </div>
    </div>
  );
}
