"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer, Download, Save, FilePlus2, FolderOpen, Plus, Trash2, CopyPlus } from "lucide-react";
import {
  getCommitteeList,
  getCommitteeById,
  saveCommittee,
  deleteCommittee,
  defaultAgenda,
  minutesToCsv,
  newCommitteeId,
  newAgendaId,
  takeCommitteeAgendaDraft,
  buildCarryOverMinutes,
  COMMITTEE_TYPE_JA,
  type AgendaItem,
  type CommitteeMinutes,
  type CommitteeSummary,
  type CommitteeType,
} from "@/lib/site-records/committee-store";
import { committeeConclusion } from "@/lib/site-records/record-conclusions";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { SAFETY_TONE } from "@/lib/design/safety-tone";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function CommitteeClient() {
  const [recId, setRecId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [place, setPlace] = useState("");
  const [committeeType, setCommitteeType] = useState<CommitteeType>("both");
  const [chair, setChair] = useState("");
  const [secretary, setSecretary] = useState("");
  const [attendees, setAttendees] = useState("");
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [remarks, setRemarks] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [list, setList] = useState<CommitteeSummary[]>([]);
  const [savedNote, setSavedNote] = useState("");
  // 当月の開催判定用（フォームの開催日とは独立に「今月」を固定する）
  const [todayYm, setTodayYm] = useState("");

  useEffect(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初回マウントの既定値（SSRハイドレーション差異回避）
    setTodayYm(today.slice(0, 7));
    setRecId(newCommitteeId());
    setDate(today);
    // 月次レポートからの下書きがあれば、当月実績の議題を先頭に挿入。
    const draft = takeCommitteeAgendaDraft();
    const base = defaultAgenda();
    const agendaInit = draft
      ? [{ id: newAgendaId(), topic: "今月の安全衛生実績（月次レポート集計）", discussion: draft, decision: "", owner: "", due: "" }, ...base]
      : base;
    setAgenda(agendaInit);
    setList(getCommitteeList());
  }, []);

  const decidedCount = useMemo(() => agenda.filter((a) => a.decision.trim() !== "").length, [agenda]);
  const heldThisMonth = useMemo(
    () => todayYm !== "" && list.some((s) => s.date.startsWith(todayYm)),
    [list, todayYm],
  );

  function updateItem(id: string, patch: Partial<AgendaItem>) {
    setAgenda((arr) => arr.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    setSavedNote("");
  }
  function addItem() {
    setAgenda((arr) => [...arr, { id: newAgendaId(), topic: "", discussion: "", decision: "", owner: "", due: "" }]);
  }
  function removeItem(id: string) {
    setAgenda((arr) => arr.filter((a) => a.id !== id));
  }

  function build(): CommitteeMinutes {
    return {
      id: recId,
      date,
      startTime,
      place: place.trim(),
      committeeType,
      chair: chair.trim(),
      secretary: secretary.trim(),
      attendees: attendees.trim(),
      agenda,
      remarks: remarks.trim(),
      nextDate,
      savedAt: new Date().toISOString(),
    };
  }

  function handleSave() {
    setList(saveCommittee(build()));
    setSavedNote("この端末に保存しました。");
  }
  function handleNew() {
    const now = new Date();
    setRecId(newCommitteeId());
    setDate(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`);
    setStartTime("");
    setPlace("");
    setCommitteeType("both");
    setChair("");
    setSecretary("");
    setAttendees("");
    setAgenda(defaultAgenda());
    setRemarks("");
    setNextDate("");
    setSavedNote("");
  }
  function applyMinutes(r: CommitteeMinutes) {
    setRecId(r.id);
    setDate(r.date);
    setStartTime(r.startTime);
    setPlace(r.place);
    setCommitteeType(r.committeeType);
    setChair(r.chair);
    setSecretary(r.secretary);
    setAttendees(r.attendees);
    setAgenda(r.agenda);
    setRemarks(r.remarks);
    setNextDate(r.nextDate);
  }
  function carryOverFrom(id: string) {
    const prev = getCommitteeById(id);
    if (!prev) return;
    const now = new Date();
    const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    applyMinutes(buildCarryOverMinutes(prev, defaultAgenda(), newCommitteeId(), today));
    setSavedNote(`前回（${prev.date}）を引き継いで当月分を作成しました。委員・場所はそのまま、冒頭に前回の宿題を転記しています。`);
  }
  function handleCarryOverLatest() {
    if (list.length > 0) carryOverFrom(list[0]!.id);
  }
  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }
  function handleCsv() {
    if (typeof window === "undefined") return;
    const csv = minutesToCsv(build());
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `committee-minutes-${date || "record"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  function openSaved(id: string) {
    const r = getCommitteeById(id);
    if (!r) return;
    applyMinutes(r);
    setSavedNote("保存済みの議事録を開きました。");
  }
  function deleteSaved(id: string) {
    if (typeof window !== "undefined" && !window.confirm("この議事録を削除します。よろしいですか？")) return;
    setList(deleteCommittee(id));
  }

  return (
    <div className="space-y-6">
      {/* 結論カード（柱0）: 今月の開催実績（毎月1回以上・安衛則23条）を最上部で1メッセージに。
          保存すると即「今月開催済」へ切り替わる */}
      {todayYm !== "" && (
        <ConclusionCard {...committeeConclusion(heldThisMonth, list.length > 0)} className="print:hidden" />
      )}

      {/* 開催情報 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="委員会の種類">
            <select value={committeeType} onChange={(e) => setCommitteeType(e.target.value as CommitteeType)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="both">安全衛生委員会</option>
              <option value="safety">安全委員会</option>
              <option value="health">衛生委員会</option>
            </select>
          </Field>
          <Field label="開催日"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
          <Field label="開始時刻"><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
          <Field label="開催場所"><Inp value={place} onChange={setPlace} placeholder="例: 本社会議室" /></Field>
          <Field label="委員長・議長"><Inp value={chair} onChange={setChair} placeholder="例: 総括安全衛生管理者 佐藤" /></Field>
          <Field label="書記"><Inp value={secretary} onChange={setSecretary} placeholder="例: 安全衛生担当 鈴木" /></Field>
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="出席者（労使委員）"><Inp value={attendees} onChange={setAttendees} placeholder="例: 議長／産業医／安全管理者／衛生管理者／労働者代表 ○○・○○（計8名）" /></Field>
          </div>
        </div>
      </section>

      {/* 議題 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">議題・審議事項</h2>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">議題 {agenda.length}／決定済 {decidedCount}</span>
            <button type="button" onClick={addItem} className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-indigo-300 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 print:hidden">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> 議題を追加
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {agenda.map((a, idx) => (
            <div key={a.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start gap-2">
                <span className="mt-1.5 shrink-0 text-xs font-bold text-slate-400">{idx + 1}.</span>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={a.topic}
                    onChange={(e) => updateItem(a.id, { topic: e.target.value })}
                    placeholder="議題"
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm font-semibold"
                    autoComplete="off"
                  />
                  <textarea value={a.discussion} onChange={(e) => updateItem(a.id, { discussion: e.target.value })} rows={2} placeholder="議事内容・報告" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                  <textarea value={a.decision} onChange={(e) => updateItem(a.id, { decision: e.target.value })} rows={1} placeholder="決定・措置事項" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                  <div className="flex flex-wrap gap-2">
                    <input type="text" value={a.owner} onChange={(e) => updateItem(a.id, { owner: e.target.value })} placeholder="担当" className="w-32 rounded-md border border-slate-300 px-2 py-1 text-xs" autoComplete="off" />
                    <input type="date" value={a.due} onChange={(e) => updateItem(a.id, { due: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1 text-xs" />
                  </div>
                </div>
                <button type="button" onClick={() => removeItem(a.id)} className="flex min-h-[44px] shrink-0 items-center rounded p-1 text-rose-500 hover:bg-rose-50 print:hidden" aria-label={`議題${idx + 1}を削除`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="その他・特記事項"><textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
          <Field label="次回開催予定"><input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
        </div>

        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          安全委員会・衛生委員会・安全衛生委員会は毎月1回以上の開催が必要です（安衛則23条）。議事の概要等は3年間保存し、議事の概要を遅滞なく労働者へ周知（掲示・書面交付・電磁的記録）してください。標準議題は付議事項（安衛則21・22条）に基づくひな形です。
        </p>

        <div id="committee-actions" className="mt-4 flex scroll-mt-24 flex-wrap gap-2 print:hidden">
          <button type="button" onClick={handleSave} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 min-h-[44px] px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700">
            <Save className="h-3.5 w-3.5" aria-hidden="true" /> この端末に保存
          </button>
          <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1 rounded-lg bg-slate-700 min-h-[44px] px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">
            <Printer className="h-3.5 w-3.5" aria-hidden="true" /> 議事録を印刷
          </button>
          <button type="button" onClick={handleCsv} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 min-h-[44px] px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            <Download className="h-3.5 w-3.5" aria-hidden="true" /> CSV出力
          </button>
          {list.length > 0 && (
            <button type="button" onClick={handleCarryOverLatest} className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 min-h-[44px] px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
              <CopyPlus className="h-3.5 w-3.5" aria-hidden="true" /> 前回をベースに新規（委員・場所を引き継ぎ）
            </button>
          )}
          <button type="button" onClick={handleNew} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 min-h-[44px] px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" /> 新規（白紙）
          </button>
          {savedNote && <span role="status" className={`self-center text-xs font-semibold ${SAFETY_TONE.safe.text}`}>{savedNote}</span>}
        </div>
      </section>

      {/* 保存済み一覧 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <FolderOpen className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          保存した議事録（この端末）
        </h2>
        {list.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">まだ保存された議事録はありません。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {list.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{s.date}　{COMMITTEE_TYPE_JA[s.committeeType]}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{s.place || "場所なし"}／議題 {s.agendaCount}・決定済 {s.decidedCount}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => carryOverFrom(s.id)} className="min-h-[44px] rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50">この回をベースに次月を作成</button>
                  <button type="button" onClick={() => openSaved(s.id)} className="min-h-[44px] rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-50">開く</button>
                  <button type="button" onClick={() => deleteSaved(s.id)} className="min-h-[44px] rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50">削除</button>
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
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
    />
  );
}
