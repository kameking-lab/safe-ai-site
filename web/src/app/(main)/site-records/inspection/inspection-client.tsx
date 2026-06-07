"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer, Download, Save, FilePlus2, FolderOpen } from "lucide-react";
import {
  getInspectionList,
  getInspectionById,
  saveInspection,
  deleteInspection,
  itemsForKind,
  inspectionToCsv,
  newInspectionId,
  INSPECTION_RESULT_JA,
  EQUIP_KIND_JA,
  type EquipKind,
  type InspectionCheckItem,
  type InspectionRecord,
  type InspectionResult,
  type InspectionSummary,
} from "@/lib/site-records/inspection-store";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

const KIND_ORDER: EquipKind[] = ["vehicle-construction", "mobile-crane", "forklift", "aerial-platform", "power-tool", "other"];

export function InspectionClient() {
  const [recId, setRecId] = useState("");
  const [date, setDate] = useState("");
  const [site, setSite] = useState("");
  const [inspector, setInspector] = useState("");
  const [equipKind, setEquipKind] = useState<EquipKind>("vehicle-construction");
  const [equipName, setEquipName] = useState("");
  const [items, setItems] = useState<InspectionCheckItem[]>([]);
  const [usable, setUsable] = useState(true);
  const [abnormalAction, setAbnormalAction] = useState("");
  const [note, setNote] = useState("");
  const [list, setList] = useState<InspectionSummary[]>([]);
  const [savedNote, setSavedNote] = useState("");

  useEffect(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初回マウントの既定値（SSRハイドレーション差異回避）
    setRecId(newInspectionId());
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 同上
    setDate(today);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 機種の標準項目
    setItems(itemsForKind("vehicle-construction"));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 保存一覧
    setList(getInspectionList());
  }, []);

  const ngCount = useMemo(() => items.filter((i) => i.result === "ng").length, [items]);

  function changeKind(kind: EquipKind) {
    setEquipKind(kind);
    setItems(itemsForKind(kind));
    setSavedNote("");
  }
  function setResult(key: string, result: InspectionResult) {
    setItems((arr) => arr.map((i) => (i.key === key ? { ...i, result } : i)));
    setSavedNote("");
  }

  function build(): InspectionRecord {
    return {
      id: recId,
      date,
      site: site.trim(),
      inspector: inspector.trim(),
      equipKind,
      equipName: equipName.trim(),
      items,
      usable,
      abnormalAction: abnormalAction.trim(),
      note: note.trim(),
      savedAt: new Date().toISOString(),
    };
  }

  function handleSave() {
    setList(saveInspection(build()));
    setSavedNote("この端末に保存しました。");
  }
  function handleNew() {
    const now = new Date();
    setRecId(newInspectionId());
    setDate(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`);
    setSite("");
    setInspector("");
    setEquipKind("vehicle-construction");
    setEquipName("");
    setItems(itemsForKind("vehicle-construction"));
    setUsable(true);
    setAbnormalAction("");
    setNote("");
    setSavedNote("");
  }
  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }
  function handleCsv() {
    if (typeof window === "undefined") return;
    const csv = inspectionToCsv(build());
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inspection-${date || "record"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  function openSaved(id: string) {
    const r = getInspectionById(id);
    if (!r) return;
    setRecId(r.id);
    setDate(r.date);
    setSite(r.site);
    setInspector(r.inspector);
    setEquipKind(r.equipKind);
    setEquipName(r.equipName);
    setItems(r.items);
    setUsable(r.usable);
    setAbnormalAction(r.abnormalAction);
    setNote(r.note);
    setSavedNote("保存済みの点検記録を開きました。");
  }
  function deleteSaved(id: string) {
    if (typeof window !== "undefined" && !window.confirm("この点検記録を削除します。よろしいですか？")) return;
    setList(deleteInspection(id));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="点検日"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
          <Field label="現場"><Inp value={site} onChange={setSite} placeholder="例: ○○現場" /></Field>
          <Field label="点検者"><Inp value={inspector} onChange={setInspector} placeholder="例: オペ 山田" /></Field>
          <Field label="機種">
            <select value={equipKind} onChange={(e) => changeKind(e.target.value as EquipKind)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              {KIND_ORDER.map((k) => <option key={k} value={k}>{EQUIP_KIND_JA[k]}</option>)}
            </select>
          </Field>
          <Field label="機種・機番"><Inp value={equipName} onChange={setEquipName} placeholder="例: 0.7m3 バックホウ #2" /></Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">点検項目（{EQUIP_KIND_JA[equipKind]}）</h2>
          <span className={`rounded-lg px-2 py-1 text-xs font-bold ${ngCount > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
            不良 {ngCount}
          </span>
        </div>
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <span className="min-w-0 flex-1 text-sm text-slate-800">{it.label}</span>
              <div className="flex shrink-0 gap-1">
                {(["ok", "ng", "na"] as InspectionResult[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setResult(it.key, r)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-bold transition ${
                      it.result === r
                        ? r === "ok"
                          ? "border-emerald-500 bg-emerald-600 text-white"
                          : r === "ng"
                            ? "border-rose-500 bg-rose-600 text-white"
                            : "border-slate-400 bg-slate-500 text-white"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {INSPECTION_RESULT_JA[r]}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-bold text-slate-700">本日の使用可否</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => setUsable(true)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${usable ? "border-emerald-500 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-600"}`}>使用可</button>
              <button type="button" onClick={() => setUsable(false)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${!usable ? "border-rose-500 bg-rose-600 text-white" : "border-slate-300 bg-white text-slate-600"}`}>使用不可</button>
            </div>
            {ngCount > 0 && usable && <p className="mt-2 text-[11px] font-semibold text-rose-600">不良があります。是正するまで使用不可の検討を。</p>}
          </div>
          <Field label="異常時の措置"><textarea value={abnormalAction} onChange={(e) => setAbnormalAction(e.target.value)} rows={2} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" placeholder="例: ○○を交換・修理依頼。完了まで立入禁止表示。" /></Field>
        </div>
        <div className="mt-3">
          <Field label="備考"><Inp value={note} onChange={setNote} placeholder="例: 次回オイル交換予定" /></Field>
        </div>

        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          車両系建設機械（安衛則170条）・移動式クレーン（クレーン則78条）・フォークリフト（安衛則151条の25）・高所作業車（安衛則194条の27）等は作業開始前の点検が義務です。点検項目は各規則の趣旨に基づく一般的なひな形で、実機の取扱説明書・現場に応じて事業者が定めてください。不良があれば是正まで使用しないでください。
        </p>

        <div className="mt-4 flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={handleSave} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"><Save className="h-3.5 w-3.5" aria-hidden="true" /> この端末に保存</button>
          <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"><Printer className="h-3.5 w-3.5" aria-hidden="true" /> 点検表を印刷</button>
          <button type="button" onClick={handleCsv} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"><Download className="h-3.5 w-3.5" aria-hidden="true" /> CSV出力</button>
          <button type="button" onClick={handleNew} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"><FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" /> 新規</button>
          {savedNote && <span className="self-center text-xs font-semibold text-blue-700">{savedNote}</span>}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><FolderOpen className="h-5 w-5 text-blue-600" aria-hidden="true" /> 保存した点検記録（この端末）</h2>
        {list.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">まだ保存された記録はありません。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {list.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{s.date}　{EQUIP_KIND_JA[s.equipKind]}　{s.equipName || ""}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{s.site || "現場なし"}／不良 {s.ngCount}／{s.usable ? "使用可" : "使用不可"}</p>
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
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400" />
  );
}
