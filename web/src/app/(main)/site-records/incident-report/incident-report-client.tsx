"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer, Download, Save, FilePlus2, FolderOpen } from "lucide-react";
import {
  getIncidentList,
  getIncidentById,
  saveIncident,
  deleteIncident,
  incidentToCsv,
  newIncidentId,
  FORM_TYPE_JA,
  SITUATION_HINTS,
  type IncidentReport,
  type IncidentReportSummary,
  type ReportFormType,
} from "@/lib/site-records/incident-report-store";
import { countIncidentRemaining, incidentConclusion } from "@/lib/site-records/record-conclusions";
import { ConclusionCard } from "@/components/ui/conclusion-card";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

const EMPTY = (date: string): IncidentReport => ({
  id: "",
  createdDate: date,
  formType: "23",
  bizType: "",
  siteName: "",
  siteAddress: "",
  workerCount: "",
  victimName: "",
  victimSexAge: "",
  victimJob: "",
  victimExperience: "",
  occurredAt: "",
  place: "",
  injuryName: "",
  absenceDays: "",
  situation: "",
  note: "",
  savedAt: "",
});

export function IncidentReportClient() {
  const [f, setF] = useState<IncidentReport>(EMPTY(""));
  const [list, setList] = useState<IncidentReportSummary[]>([]);
  const [savedNote, setSavedNote] = useState("");

  useEffect(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初回マウントの既定値
    setF({ ...EMPTY(today), id: newIncidentId() });
    setList(getIncidentList());
  }, []);

  // 記入のこり（KY用紙と同じ文法）: 下書きに必要な13欄（備考は任意）
  const remaining = useMemo(() => countIncidentRemaining(f), [f]);

  function up<K extends keyof IncidentReport>(k: K, v: IncidentReport[K]) {
    setF((s) => ({ ...s, [k]: v }));
    setSavedNote("");
  }

  function handleSave() {
    if (!f.victimName.trim() && !f.siteName.trim()) {
      setSavedNote("被災者名または事業場名を入力してください。");
      return;
    }
    setList(saveIncident({ ...f, savedAt: new Date().toISOString() }));
    setSavedNote("この端末に保存しました。");
  }
  function handleNew() {
    const now = new Date();
    const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    setF({ ...EMPTY(today), id: newIncidentId() });
    setSavedNote("");
  }
  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }
  function handleCsv() {
    if (typeof window === "undefined") return;
    const csv = incidentToCsv(f);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `incident-report-${f.createdDate || "draft"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  function openSaved(id: string) {
    const r = getIncidentById(id);
    if (!r) return;
    setF(r);
    setSavedNote("保存済みの下書きを開きました。");
  }
  function deleteSaved(id: string) {
    if (typeof window !== "undefined" && !window.confirm("この下書きを削除します。よろしいですか？")) return;
    setList(deleteIncident(id));
  }

  return (
    <div className="space-y-6">
      {/* 結論カード（柱0）: 「記入のこりN欄（青）→ 下書き完了（緑）」。
          完了＝提出ではない（提出は電子申請）ことを補足に明記。印刷帳票には載せない。
          SSR初期値の偽表示防止に初期化後のみ描画 */}
      {f.id !== "" && (
        <ConclusionCard {...incidentConclusion(remaining)} className="print:hidden" />
      )}

      <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-xs leading-5 text-rose-900 print:hidden">
        労働災害で労働者が死亡・休業したときは、事業者は「労働者死傷病報告」を所轄労働基準監督署長に提出する義務があります（安衛則97条。休業4日以上は様式23号で遅滞なく、4日未満は様式24号で四半期報告。2025年1月から電子申請が原則義務化）。
        <strong className="font-semibold">本ツールは提出様式そのものではなく、必要情報を整理する下書きです。</strong>実際の提出は電子申請等で行ってください。
      </section>

      {/* 帳票本体（印刷対象） */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <header className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b-2 border-slate-800 pb-2">
          <h2 className="text-lg font-bold text-slate-900">労働者死傷病報告（下書き）</h2>
          <div className="print:hidden">
            <label className="text-xs font-semibold text-slate-700">様式区分
              <select value={f.formType} onChange={(e) => up("formType", e.target.value as ReportFormType)} className="ml-2 rounded-md border border-slate-300 px-2 py-1 text-sm">
                <option value="23">様式23号（休業4日以上・死亡）</option>
                <option value="24">様式24号（休業4日未満）</option>
              </select>
            </label>
          </div>
          <p className="hidden text-sm text-slate-600 print:block">{FORM_TYPE_JA[f.formType]}　作成日: {f.createdDate}</p>
        </header>

        <h3 className="mt-2 text-sm font-bold text-slate-700">事業場</h3>
        <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="事業の種類"><Inp value={f.bizType} onChange={(v) => up("bizType", v)} placeholder="例: 建設業（鉄骨工事）" /></Field>
          <Field label="事業場の名称"><Inp value={f.siteName} onChange={(v) => up("siteName", v)} placeholder="例: ○○新築工事" /></Field>
          <Field label="所在地"><Inp value={f.siteAddress} onChange={(v) => up("siteAddress", v)} placeholder="例: ○○市○○" /></Field>
          <Field label="労働者数"><Inp value={f.workerCount} onChange={(v) => up("workerCount", v)} placeholder="例: 25" /></Field>
        </div>

        <h3 className="mt-4 text-sm font-bold text-slate-700">被災者</h3>
        <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="氏名"><Inp value={f.victimName} onChange={(v) => up("victimName", v)} placeholder="例: ○○ ○○" /></Field>
          <Field label="性別・年齢"><Inp value={f.victimSexAge} onChange={(v) => up("victimSexAge", v)} placeholder="例: 男・34" /></Field>
          <Field label="職種"><Inp value={f.victimJob} onChange={(v) => up("victimJob", v)} placeholder="例: 鉄筋工" /></Field>
          <Field label="経験期間"><Inp value={f.victimExperience} onChange={(v) => up("victimExperience", v)} placeholder="例: 5年" /></Field>
        </div>

        <h3 className="mt-4 text-sm font-bold text-slate-700">災害</h3>
        <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="発生年月日・時刻"><Inp value={f.occurredAt} onChange={(v) => up("occurredAt", v)} placeholder="例: 2026-07-09 10:30" /></Field>
          <Field label="発生場所"><Inp value={f.place} onChange={(v) => up("place", v)} placeholder="例: 3F 開口部付近" /></Field>
          <Field label="傷病名・部位"><Inp value={f.injuryName} onChange={(v) => up("injuryName", v)} placeholder="例: 右足関節骨折" /></Field>
          <Field label="休業見込み日数"><Inp value={f.absenceDays} onChange={(v) => up("absenceDays", v)} placeholder="例: 30" /></Field>
        </div>

        <div className="mt-3">
          <Field label="災害発生状況・原因">
            <textarea value={f.situation} onChange={(e) => up("situation", e.target.value)} rows={4} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" placeholder="どのような場所で／どのような作業中に／どのような物・環境に／どのような不安全な状態があって／どのような災害が発生したか" />
          </Field>
          <p className="mt-1 text-[11px] text-slate-500 print:hidden">記入の観点: {SITUATION_HINTS.join("／")}</p>
        </div>
        <div className="mt-3">
          <Field label="備考"><Inp value={f.note} onChange={(v) => up("note", v)} placeholder="例: 元方事業者・派遣元への連絡、再発防止策 等" /></Field>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={handleSave} className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700"><Save className="h-3.5 w-3.5" aria-hidden="true" /> この端末に保存</button>
          <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"><Printer className="h-3.5 w-3.5" aria-hidden="true" /> 下書きを印刷</button>
          <button type="button" onClick={handleCsv} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"><Download className="h-3.5 w-3.5" aria-hidden="true" /> CSV出力</button>
          <button type="button" onClick={handleNew} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"><FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" /> 新規</button>
          {savedNote && <span className="self-center text-xs font-semibold text-rose-700">{savedNote}</span>}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><FolderOpen className="h-5 w-5 text-rose-600" aria-hidden="true" /> 保存した下書き（この端末）</h2>
        {list.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">まだ保存された下書きはありません。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {list.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{s.victimName || "（被災者名なし）"}<span className="ml-2 text-xs font-normal text-slate-500">{FORM_TYPE_JA[s.formType]}</span></p>
                  <p className="mt-0.5 text-xs text-slate-500">{s.siteName || "事業場なし"}／発生 {s.occurredAt || "—"}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => openSaved(s.id)} className="rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-50">開く</button>
                  <button type="button" onClick={() => deleteSaved(s.id)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">削除</button>
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

function Inp({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400" />
  );
}
