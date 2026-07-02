"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer, Download, Plus, Trash2, BarChart3, AlertTriangle } from "lucide-react";
import {
  getNearMissReports,
  saveNearMiss,
  deleteNearMiss,
  countByType,
  openCount,
  openHighCount,
  sortByPriority,
  filterOpenOnly,
  nearMissToCsv,
  newNearMissId,
  NEAR_MISS_TYPES,
  POTENTIAL_JA,
  type NearMissPotential,
  type NearMissReport,
  type NearMissType,
} from "@/lib/site-records/nearmiss-store";
import { nearMissConclusion } from "@/lib/site-records/record-conclusions";
import { ConclusionCard } from "@/components/ui/conclusion-card";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

type AddForm = {
  date: string;
  site: string;
  reporter: string;
  type: NearMissType;
  location: string;
  situation: string;
  cause: string;
  countermeasure: string;
  potential: NearMissPotential;
};

function emptyForm(today: string): AddForm {
  return { date: today, site: "", reporter: "", type: "墜落・転落", location: "", situation: "", cause: "", countermeasure: "", potential: "high" };
}

export function NearMissClient() {
  const [reports, setReports] = useState<NearMissReport[]>([]);
  const [form, setForm] = useState<AddForm>(emptyForm(""));
  const [savedNote, setSavedNote] = useState("");
  const [openOnly, setOpenOnly] = useState(false);

  useEffect(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 既定日付（SSRハイドレーション差異回避）
    setForm(emptyForm(today));
    setReports(getNearMissReports());
  }, []);

  const tally = useMemo(() => countByType(reports), [reports]);
  const maxCount = tally.length ? tally[0]!.count : 0;
  const open = useMemo(() => openCount(reports), [reports]);
  const openHigh = useMemo(() => openHighCount(reports), [reports]);
  // 「対策すべきもの優先」で並べ、必要なら未対策のみに絞る
  const visible = useMemo(
    () => sortByPriority(filterOpenOnly(reports, openOnly)),
    [reports, openOnly],
  );

  function up<K extends keyof AddForm>(k: K, v: AddForm[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function addReport() {
    if (!form.situation.trim()) {
      setSavedNote("「状況」を入力してください。");
      return;
    }
    const rec: NearMissReport = {
      id: newNearMissId(),
      date: form.date,
      site: form.site.trim(),
      reporter: form.reporter.trim(),
      type: form.type,
      location: form.location.trim(),
      situation: form.situation.trim(),
      cause: form.cause.trim(),
      countermeasure: form.countermeasure.trim(),
      potential: form.potential,
      resolved: false,
      savedAt: new Date().toISOString(),
    };
    setReports(saveNearMiss(rec));
    const now = new Date();
    setForm(emptyForm(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`));
    setSavedNote("報告を登録しました。");
  }

  function toggleResolved(rec: NearMissReport) {
    setReports(saveNearMiss({ ...rec, resolved: !rec.resolved }));
  }
  function remove(id: string) {
    if (typeof window !== "undefined" && !window.confirm("この報告を削除します。よろしいですか？")) return;
    setReports(deleteNearMiss(id));
  }

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }
  function handleCsv() {
    if (typeof window === "undefined" || reports.length === 0) return;
    const csv = nearMissToCsv(reports);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `near-miss-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* 結論カード（柱0）: 重大×未対策→赤 / 未対策→黄 / 報告ゼロ→青 / 全件対策済→緑 */}
      {form.date !== "" && (
        <ConclusionCard {...nearMissConclusion(reports.length, open, openHigh)} className="print:hidden" />
      )}

      {/* 入力 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Plus className="h-5 w-5 text-amber-600" aria-hidden="true" /> ヒヤリハットを報告
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="日付"><input type="date" value={form.date} onChange={(e) => up("date", e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
          <Field label="現場"><Inp value={form.site} onChange={(v) => up("site", v)} placeholder="例: ○○現場" /></Field>
          <Field label="報告者"><Inp value={form.reporter} onChange={(v) => up("reporter", v)} placeholder="例: 山田" /></Field>
          <Field label="事故の型">
            <select value={form.type} onChange={(e) => up("type", e.target.value as NearMissType)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              {NEAR_MISS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="場所"><Inp value={form.location} onChange={(v) => up("location", v)} placeholder="例: 3F開口部" /></Field>
          <Field label="危険度">
            <select value={form.potential} onChange={(e) => up("potential", e.target.value as NearMissPotential)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="high">重大の可能性</option>
              <option value="low">軽微</option>
            </select>
          </Field>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="状況（どんなヒヤリ・ハットか）"><textarea value={form.situation} onChange={(e) => up("situation", e.target.value)} rows={2} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" placeholder="例: 脚立がぐらつき転落しかけた" /></Field>
          <Field label="要因"><textarea value={form.cause} onChange={(e) => up("cause", e.target.value)} rows={2} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" placeholder="例: 不安定な場所に設置" /></Field>
          <Field label="対策"><textarea value={form.countermeasure} onChange={(e) => up("countermeasure", e.target.value)} rows={2} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" placeholder="例: 設置面の確認・脚立点検を徹底" /></Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={addReport} className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700">
            <Plus className="h-4 w-4" aria-hidden="true" /> 報告を登録
          </button>
          {savedNote && <span className="text-xs font-semibold text-amber-700">{savedNote}</span>}
        </div>
      </section>

      {/* 集計 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <BarChart3 className="h-5 w-5 text-amber-600" aria-hidden="true" /> 事故の型別 傾向集計
          </h2>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-lg bg-slate-100 px-2 py-1 font-bold text-slate-700">報告 {reports.length} 件</span>
            <span className="rounded-lg bg-rose-100 px-2 py-1 font-bold text-rose-700">対応中 {open} 件</span>
          </div>
        </div>
        {tally.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-6 text-center text-sm text-slate-400">まだ報告がありません。上のフォームから登録してください。</p>
        ) : (
          <ul className="space-y-1.5">
            {tally.map((t) => (
              <li key={t.type} className="flex items-center gap-2">
                <span className="w-40 shrink-0 text-xs font-semibold text-slate-700">{t.type}</span>
                <span className="h-4 rounded bg-amber-400" style={{ width: `${maxCount ? Math.max(8, (t.count / maxCount) * 100) : 0}%` }} aria-hidden="true" />
                <span className="text-xs font-bold text-slate-800">{t.count}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">
            <Printer className="h-3.5 w-3.5" aria-hidden="true" /> 集計・一覧を印刷
          </button>
          <button type="button" onClick={handleCsv} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            <Download className="h-3.5 w-3.5" aria-hidden="true" /> CSV出力（全件）
          </button>
        </div>
      </section>

      {/* 一覧 */}
      <section id="nearmiss-list" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">報告一覧（この端末）</h2>
          {reports.length > 0 && (
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 print:hidden">
              <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} className="h-4 w-4 accent-amber-600" />
              未対策のみ表示
            </label>
          )}
        </div>
        {/* 要対策（重大×未対策）を最優先で可視化＝日付順に埋もれさせない */}
        {openHigh > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
            <p className="text-sm font-bold text-rose-800">
              重大の可能性 × 未対策が {openHigh} 件あります。下記の先頭にまとめています。優先して対策してください。
            </p>
          </div>
        )}
        {reports.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">報告はまだありません。</p>
        ) : visible.length === 0 ? (
          <p className="mt-3 text-sm text-emerald-700">未対策の報告はありません。すべて対策済です。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {visible.map((rep) => {
              const openHighItem = !rep.resolved && rep.potential === "high";
              return (
              <li key={rep.id} className={`rounded-xl border p-3 ${rep.resolved ? "border-emerald-200 bg-emerald-50/40" : openHighItem ? "border-rose-300 border-l-4 border-l-rose-500 bg-rose-50/40" : "border-slate-200"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                      {openHighItem && (
                        <span className="mr-2 rounded bg-rose-600 px-1.5 py-0.5 text-[11px] font-bold text-white">要対策</span>
                      )}
                      <span className="mr-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">{rep.type}</span>
                      {rep.situation}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{rep.date}／{rep.site || "現場未設定"}／{rep.location}／{POTENTIAL_JA[rep.potential]}／報告 {rep.reporter || "—"}</p>
                    {(rep.cause || rep.countermeasure) && (
                      <p className="mt-1 text-xs text-slate-600">要因: {rep.cause || "—"}　対策: {rep.countermeasure || "—"}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2 print:hidden">
                    <button type="button" onClick={() => toggleResolved(rep)} className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold ${rep.resolved ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : "border-slate-300 text-slate-600 hover:bg-slate-100"}`}>
                      {rep.resolved ? "対策済" : "対応中"}
                    </button>
                    <button type="button" onClick={() => remove(rep.id)} className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50" aria-label="削除">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          ヒヤリハットは「重大の可能性」のものを優先的に対策し、対策後も類似の報告が続かないかを傾向集計で確認してください。報告はこの端末にのみ保存されます。
        </p>
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
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400" />
  );
}
