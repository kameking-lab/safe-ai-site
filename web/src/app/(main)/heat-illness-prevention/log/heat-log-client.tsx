"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Printer,
  Download,
  Save,
  Plus,
  Trash2,
  FilePlus2,
  FolderOpen,
} from "lucide-react";
import { assess } from "@/lib/wbgt-engine";
import type {
  AcclimatizationState,
  Environment,
  WorkIntensity,
} from "@/types/heat-illness";
import {
  getHeatLogList,
  getHeatLogById,
  saveHeatLog,
  deleteHeatLog,
  recordToCsv,
  summarizeRecord,
  takeHeatLogDraft,
  newHeatLogId,
  type HeatLogEntry,
  type HeatLogRecord,
  type HeatLogSummary,
} from "@/lib/heat-illness/log-store";
import { RISK_ORDER, RISK_VISUAL } from "@/lib/heat-illness/risk-visual";
import { WbgtConclusion } from "@/components/heat-illness/wbgt-conclusion";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";
import { EmptyState } from "@/components/empty-state";

/** 本日の記録のうち最も危険な測定（リスク区分降順→WBGT降順）。結論カードの主役。 */
function worstEntry(entries: HeatLogEntry[]): HeatLogEntry | null {
  if (entries.length === 0) return null;
  return entries.reduce((worst, e) => {
    const a = RISK_ORDER.indexOf(e.riskLevel);
    const b = RISK_ORDER.indexOf(worst.riskLevel);
    if (a > b || (a === b && e.wbgt > worst.wbgt)) return e;
    return worst;
  });
}

type AddForm = {
  time: string;
  airTempC: number;
  humidity: number;
  globeTempC: string;
  environment: Environment;
  workIntensity: WorkIntensity;
  acclimatization: AcclimatizationState;
  measures: string;
  note: string;
};

const ADD_DEFAULTS: AddForm = {
  time: "",
  airTempC: 32,
  humidity: 70,
  globeTempC: "",
  environment: "outdoor",
  workIntensity: "moderate",
  acclimatization: "acclimatized",
  measures: "",
  note: "",
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function HeatLogClient() {
  const [recId, setRecId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [siteName, setSiteName] = useState<string>("");
  const [author, setAuthor] = useState<string>("");
  const [entries, setEntries] = useState<HeatLogEntry[]>([]);
  const [add, setAdd] = useState<AddForm>(ADD_DEFAULTS);
  const [list, setList] = useState<HeatLogSummary[]>([]);
  const [savedNote, setSavedNote] = useState<string>("");

  // 初期化（マウント時）: 日付・時刻の既定、計算機からの下書き受け取り、保存一覧の読込。
  useEffect(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const hhmm = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初回マウント時の既定値設定（SSRハイドレーション差異回避のためeffectで実行）
    setRecId(newHeatLogId());
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 同上
    setDate(today);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 同上
    setList(getHeatLogList());

    const draft = takeHeatLogDraft();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- WBGT計算機からの下書きを初期フォームへ反映
    setAdd((s) => ({
      ...s,
      time: hhmm,
      ...(draft
        ? {
            airTempC: draft.airTempC,
            humidity: draft.humidity,
            globeTempC: draft.globeTempC === null ? "" : String(draft.globeTempC),
            environment: draft.environment,
            workIntensity: draft.workIntensity,
            acclimatization: draft.acclimatization,
            measures: draft.suggestedMeasures ?? "",
          }
        : {}),
    }));
  }, []);

  const preview = useMemo(() => {
    const globe = parseFloat(add.globeTempC);
    return assess(
      {
        airTempC: add.airTempC,
        humidity: add.humidity,
        globeTempC: Number.isFinite(globe) ? globe : undefined,
        environment: add.environment,
      },
      add.workIntensity,
      add.acclimatization,
    );
  }, [add]);

  const summary = useMemo(
    () =>
      summarizeRecord({
        id: recId || "preview",
        date,
        siteName,
        author,
        entries,
        savedAt: "",
      }),
    [recId, date, siteName, author, entries],
  );

  function applyRecommended() {
    const r = preview.recommendation;
    const text = [
      `作業/休憩 ${r.workRestRatio}`,
      `水分 ${r.fluidIntakeMlPerHour}`,
      r.saltIntake,
      ...r.coolingMeasures.slice(0, 1),
    ].join("／");
    setAdd((s) => ({ ...s, measures: text }));
  }

  function addEntry() {
    const globe = parseFloat(add.globeTempC);
    const entry: HeatLogEntry = {
      id: newHeatLogId(),
      time: add.time || "00:00",
      airTempC: add.airTempC,
      humidity: add.humidity,
      globeTempC: Number.isFinite(globe) ? globe : null,
      environment: add.environment,
      workIntensity: add.workIntensity,
      acclimatization: add.acclimatization,
      wbgt: preview.wbgt.wbgt,
      riskLevel: preview.risk.level,
      riskLabel: preview.risk.label,
      measures: add.measures.trim(),
      note: add.note.trim(),
    };
    setEntries((list_) =>
      [...list_, entry].sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0)),
    );
    setAdd((s) => ({ ...s, measures: "", note: "" }));
    setSavedNote("");
  }

  function removeEntry(id: string) {
    setEntries((list_) => list_.filter((e) => e.id !== id));
    setSavedNote("");
  }

  function buildRecord(): HeatLogRecord {
    return {
      id: recId,
      date,
      siteName: siteName.trim(),
      author: author.trim(),
      entries,
      savedAt: new Date().toISOString(),
    };
  }

  function handleSave() {
    if (entries.length === 0) {
      setSavedNote("記録が1件もありません。先に測定を追加してください。");
      return;
    }
    const updated = saveHeatLog(buildRecord());
    setList(updated);
    setSavedNote("この端末に保存しました。");
  }

  function handleNew() {
    setRecId(newHeatLogId());
    setEntries([]);
    setSiteName("");
    setSavedNote("");
    const now = new Date();
    setAdd({ ...ADD_DEFAULTS, time: `${pad2(now.getHours())}:${pad2(now.getMinutes())}` });
  }

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  function handleCsv() {
    if (typeof window === "undefined" || entries.length === 0) return;
    const csv = recordToCsv(buildRecord());
    // Excel での文字化け回避に BOM を付与。
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wbgt-log-${date || "record"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function openSaved(id: string) {
    const rec = getHeatLogById(id);
    if (!rec) return;
    setRecId(rec.id);
    setDate(rec.date);
    setSiteName(rec.siteName);
    setAuthor(rec.author);
    setEntries(rec.entries);
    setSavedNote("保存済みの記録を開きました。");
  }

  function deleteSaved(id: string) {
    if (typeof window !== "undefined" && !window.confirm("この記録を削除します。よろしいですか？")) return;
    setList(deleteHeatLog(id));
  }

  const previewColor = RISK_VISUAL[preview.risk.level];
  const worst = worstEntry(entries);

  return (
    <div className="space-y-6">
      {/* 結論ファースト: 本日いちばん危険だった測定をデカ数字＋色帯で（柱0・画面表示のみ） */}
      {worst ? (
        <WbgtConclusion
          wbgt={worst.wbgt}
          level={worst.riskLevel}
          heading={`本日の最も危険な測定（${worst.time}）`}
          workIntensity={worst.workIntensity}
          acclimatization={worst.acclimatization}
          className="print:hidden"
        >
          <span className="inline-flex items-center rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs font-bold text-slate-700">
            記録 {summary.entryCount} 件
          </span>
          {summary.maxWbgt !== null && (
            <span className="inline-flex items-center rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs font-bold text-slate-700">
              最高WBGT {summary.maxWbgt.toFixed(1)} ℃
            </span>
          )}
        </WbgtConclusion>
      ) : (
        <ConclusionCard
          tone="info"
          value={0}
          unit="件"
          title="記録なし"
          description="今日の分はまだ0件。作業前と日中のWBGTを測って記録すると、令和7年改正（安衛則612条の2）の実施記録になります。"
          action={{ href: "#heat-log-add", label: "測定を追加する" }}
          className="print:hidden"
        />
      )}

      {/* 記録ヘッダー（日付・現場・記録者） */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="記録日">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </Field>
          <Field label="現場名">
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="例: ○○ビル新築工事"
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              autoComplete="off"
            />
          </Field>
          <Field label="記録者">
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="例: 職長 山田"
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              autoComplete="off"
            />
          </Field>
        </div>
      </section>

      {/* 測定の追加（印刷時は隠す） */}
      <section
        id="heat-log-add"
        className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden"
      >
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Activity className="h-5 w-5 text-amber-600" aria-hidden="true" />
          測定を追加
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          現場で測定した時刻・気温・湿度・黒球温度を入力すると、JIS Z 8504式でWBGTとリスク区分を自動判定します。
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="時刻">
            <input
              type="time"
              value={add.time}
              onChange={(e) => setAdd((s) => ({ ...s, time: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </Field>
          <NumberField label="気温 (℃)" value={add.airTempC} step={0.1} min={-10} max={55} onChange={(v) => setAdd((s) => ({ ...s, airTempC: v }))} />
          <NumberField label="湿度 (%)" value={add.humidity} step={1} min={5} max={100} onChange={(v) => setAdd((s) => ({ ...s, humidity: v }))} />
          <Field label="黒球温度 (℃) 任意">
            <input
              type="number"
              step={0.1}
              value={add.globeTempC}
              onChange={(e) => setAdd((s) => ({ ...s, globeTempC: e.target.value }))}
              placeholder="未測定は空欄"
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              autoComplete="off"
            />
          </Field>
          <Field label="作業環境">
            <select
              value={add.environment}
              onChange={(e) => setAdd((s) => ({ ...s, environment: e.target.value as Environment }))}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="outdoor">屋外（日射あり）</option>
              <option value="indoor">屋内（日射なし）</option>
            </select>
          </Field>
          <Field label="作業強度">
            <select
              value={add.workIntensity}
              onChange={(e) => setAdd((s) => ({ ...s, workIntensity: e.target.value as WorkIntensity }))}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="light">軽作業</option>
              <option value="moderate">中程度</option>
              <option value="heavy">重作業</option>
              <option value="very-heavy">非常に重い</option>
            </select>
          </Field>
          <Field label="暑熱順化">
            <select
              value={add.acclimatization}
              onChange={(e) => setAdd((s) => ({ ...s, acclimatization: e.target.value as AcclimatizationState }))}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="acclimatized">順化済み</option>
              <option value="non-acclimatized">未順化（新規・復帰・初日）</option>
            </select>
          </Field>
        </div>

        {/* 算出プレビュー: 追加前から色とデカ数字で危険度が分かる */}
        <div className={`mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border ${previewColor.soft} px-4 py-3`}>
          <span className={`text-3xl font-bold leading-none ${previewColor.text}`}>
            {preview.wbgt.wbgt.toFixed(1)}
            <span className="ml-0.5 text-base font-bold">℃</span>
          </span>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${previewColor.chip}`}>
            {preview.risk.label}
          </span>
          <span className="text-xs opacity-80">{preview.risk.summary}</span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="実施した対策">
            <textarea
              value={add.measures}
              onChange={(e) => setAdd((s) => ({ ...s, measures: e.target.value }))}
              rows={2}
              placeholder="例: 30分ごとに休憩・水分塩分補給、日除けテント設置"
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={applyRecommended}
              className="mt-1 text-[11px] font-semibold text-amber-700 hover:underline"
            >
              ＋ このWBGTの推奨対策を反映
            </button>
          </Field>
          <Field label="体調確認・特記事項">
            <textarea
              value={add.note}
              onChange={(e) => setAdd((s) => ({ ...s, note: e.target.value }))}
              rows={2}
              placeholder="例: 全員体調異常なし／○○氏に倦怠感、休憩で回復"
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </Field>
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={addEntry}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            この測定を記録に追加
          </button>
        </div>
      </section>

      {/* 帳票本体（画面・印刷共通） */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              WBGT・熱中症対策 日次記録簿
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              {date || "（日付未設定）"}　{siteName || "（現場名未設定）"}　記録者: {author || "—"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="rounded-lg bg-slate-100 px-2 py-1 font-semibold text-slate-700">
              記録 {summary.entryCount} 件
            </span>
            <span className="rounded-lg bg-slate-100 px-2 py-1 font-semibold text-slate-700">
              最高WBGT {summary.maxWbgt === null ? "—" : `${summary.maxWbgt.toFixed(1)} ℃`}
            </span>
            {summary.maxRiskLevel && (
              <span className={`rounded-lg px-2 py-1 font-bold ${RISK_VISUAL[summary.maxRiskLevel].chip}`}>
                最悪リスク {entries.find((e) => e.riskLevel === summary.maxRiskLevel)?.riskLabel}
              </span>
            )}
          </div>
        </div>

        {entries.length === 0 ? (
          <EmptyState
            variant="water-break"
            title="まだ記録がありません"
            description="上の「測定を追加」から作業前・日中のWBGTを記録してください。"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300 text-left text-xs text-slate-500">
                  <th className="py-2 pr-2">時刻</th>
                  <th className="py-2 pr-2">WBGT</th>
                  <th className="py-2 pr-2">リスク</th>
                  <th className="py-2 pr-2">気温/湿度</th>
                  <th className="py-2 pr-2">実施した対策</th>
                  <th className="py-2 pr-2">体調・特記</th>
                  <th className="py-2 pr-2 print:hidden"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className={`border-b border-slate-200 align-top ${RISK_VISUAL[e.riskLevel].row}`}>
                    <td className="whitespace-nowrap py-2 pr-2 font-semibold text-slate-800">{e.time}</td>
                    <td className="whitespace-nowrap py-2 pr-2 font-bold text-slate-900">{e.wbgt.toFixed(1)}</td>
                    <td className="whitespace-nowrap py-2 pr-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${RISK_VISUAL[e.riskLevel].chip}`}>
                        {e.riskLabel}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-2 pr-2 text-xs text-slate-600">
                      {e.airTempC}℃ / {e.humidity}%
                    </td>
                    <td className="py-2 pr-2 text-xs text-slate-700">{e.measures || "—"}</td>
                    <td className="py-2 pr-2 text-xs text-slate-700">{e.note || "—"}</td>
                    <td className="py-2 pr-2 print:hidden">
                      <button
                        type="button"
                        onClick={() => removeEntry(e.id)}
                        className="rounded p-1 text-rose-500 hover:bg-rose-50"
                        aria-label={`${e.time} の記録を削除`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 画面では折りたたみ・印刷では帳票どおり全文（正確性は不可侵） */}
        <CollapsibleDetail summary="この記録簿の法的位置付け・出典" className="mt-3 print:hidden">
          <p>
            令和7年6月施行の改正安衛則（第612条の2）では、WBGT基準値以上の作業について体制整備・対応手順の整備等が求められます。
            本記録簿はその日次の実施記録づくりを支援するもので、最終的な作業可否は事業者・職長が現場状況を踏まえて判断してください。WBGT計算式の出典：JIS Z 8504。
          </p>
        </CollapsibleDetail>
        <p className="mt-3 hidden text-[11px] leading-5 text-slate-500 print:block">
          令和7年6月施行の改正安衛則（第612条の2）では、WBGT基準値以上の作業について体制整備・対応手順の整備等が求められます。
          本記録簿はその日次の実施記録づくりを支援するもので、最終的な作業可否は事業者・職長が現場状況を踏まえて判断してください。WBGT計算式の出典：JIS Z 8504。
        </p>

        {/* 操作ボタン（印刷時は隠す） */}
        <div className="mt-4 flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={handleSave} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">
            <Save className="h-3.5 w-3.5" aria-hidden="true" /> この端末に保存
          </button>
          <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700">
            <Printer className="h-3.5 w-3.5" aria-hidden="true" /> 印刷／PDF
          </button>
          <button type="button" onClick={handleCsv} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            <Download className="h-3.5 w-3.5" aria-hidden="true" /> CSV出力
          </button>
          <button type="button" onClick={handleNew} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" /> 新規
          </button>
          {savedNote && <span className="self-center text-xs font-semibold text-emerald-700">{savedNote}</span>}
        </div>
      </section>

      {/* 保存済み一覧（印刷時は隠す） */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <FolderOpen className="h-5 w-5 text-amber-600" aria-hidden="true" />
          保存した記録（この端末）
        </h2>
        {list.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">まだ保存された記録はありません。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {list.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{s.date}　{s.siteName || "（現場名なし）"}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {s.entryCount}件／最高WBGT {s.maxWbgt === null ? "—" : `${s.maxWbgt.toFixed(1)}℃`}／記録者 {s.author || "—"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => openSaved(s.id)} className="rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-50">
                    開く
                  </button>
                  <button type="button" onClick={() => deleteSaved(s.id)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function NumberField({
  label,
  value,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const next = parseFloat(e.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
      />
    </Field>
  );
}
