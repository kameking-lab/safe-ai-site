"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer, Download, Save, FilePlus2, FolderOpen, Plus, Trash2, AlarmClock, ArrowUpRight } from "lucide-react";
import {
  getPatrolList,
  getPatrolById,
  getAllPatrolRecords,
  savePatrol,
  deletePatrol,
  defaultPatrolChecks,
  findingsToCsv,
  collectOpenFindings,
  countOverdueFindings,
  newPatrolId,
  newFindingId,
  RESULT_JA,
  SEVERITY_JA,
  type PatrolCheckItem,
  type PatrolCheckResult,
  type PatrolFinding,
  type PatrolRecord,
  type PatrolSeverity,
  type PatrolSummary,
  type OpenFinding,
} from "@/lib/site-records/patrol-store";
import { patrolConclusion } from "@/lib/site-records/record-conclusions";
import { ConclusionCard } from "@/components/ui/conclusion-card";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

const RESULT_STYLE: Record<PatrolCheckResult, string> = {
  ok: "bg-emerald-50 border-emerald-200",
  ng: "bg-rose-50 border-rose-200",
  na: "bg-white border-slate-200",
};

export function PatrolClient() {
  const [recId, setRecId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [inspector, setInspector] = useState("");
  const [role, setRole] = useState("");
  const [area, setArea] = useState("");
  const [checks, setChecks] = useState<PatrolCheckItem[]>([]);
  const [findings, setFindings] = useState<PatrolFinding[]>([]);
  const [summary, setSummary] = useState("");
  const [list, setList] = useState<PatrolSummary[]>([]);
  const [allRecords, setAllRecords] = useState<PatrolRecord[]>([]);
  const [today, setToday] = useState("");
  const [savedNote, setSavedNote] = useState("");

  useEffect(() => {
    const now = new Date();
    const todayIso = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初回マウントの既定値（SSRハイドレーション差異回避）
    setRecId(newPatrolId());
    setDate(todayIso);
    setTime(`${pad2(now.getHours())}:${pad2(now.getMinutes())}`);
    setToday(todayIso);
    setChecks(defaultPatrolChecks());
    setList(getPatrolList());
    setAllRecords(getAllPatrolRecords());
  }, []);

  // 全保存記録を横断して未是正の指摘を集約（期日超過→重大→期日昇順）
  const openFindings = useMemo(() => collectOpenFindings(allRecords, today), [allRecords, today]);
  const overdueCount = useMemo(() => countOverdueFindings(openFindings), [openFindings]);

  const stat = useMemo(
    () => ({
      ng: checks.filter((c) => c.result === "ng").length,
      ok: checks.filter((c) => c.result === "ok").length,
      open: findings.filter((f) => !f.resolved).length,
    }),
    [checks, findings],
  );

  function setResult(key: string, result: PatrolCheckResult) {
    setChecks((arr) => arr.map((c) => (c.key === key ? { ...c, result } : c)));
    setSavedNote("");
  }
  function addFinding() {
    setFindings((arr) => [...arr, { id: newFindingId(), location: "", content: "", severity: "low", owner: "", due: "", resolved: false }]);
  }
  function updateFinding(id: string, patch: Partial<PatrolFinding>) {
    setFindings((arr) => arr.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    setSavedNote("");
  }
  function removeFinding(id: string) {
    setFindings((arr) => arr.filter((f) => f.id !== id));
  }

  function build(): PatrolRecord {
    return {
      id: recId,
      date,
      time,
      inspector: inspector.trim(),
      role: role.trim(),
      area: area.trim(),
      checks,
      findings,
      summary: summary.trim(),
      savedAt: new Date().toISOString(),
    };
  }

  function handleSave() {
    setList(savePatrol(build()));
    setAllRecords(getAllPatrolRecords());
    setSavedNote("この端末に保存しました。");
  }
  function handleNew() {
    const now = new Date();
    setRecId(newPatrolId());
    setDate(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`);
    setTime(`${pad2(now.getHours())}:${pad2(now.getMinutes())}`);
    setInspector("");
    setRole("");
    setArea("");
    setChecks(defaultPatrolChecks());
    setFindings([]);
    setSummary("");
    setSavedNote("");
  }
  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }
  function handleCsv() {
    if (typeof window === "undefined") return;
    if (findings.length === 0) {
      setSavedNote("CSV出力する指摘事項がありません。");
      return;
    }
    const csv = findingsToCsv(build());
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `patrol-${date || "record"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  function openSaved(id: string) {
    const r = getPatrolById(id);
    if (!r) return;
    setRecId(r.id);
    setDate(r.date);
    setTime(r.time);
    setInspector(r.inspector);
    setRole(r.role);
    setArea(r.area);
    setChecks(r.checks);
    setFindings(r.findings);
    setSummary(r.summary);
    setSavedNote("保存済みの記録を開きました。是正できたら「是正済み」にチェックして再保存してください。");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function deleteSaved(id: string) {
    if (typeof window !== "undefined" && !window.confirm("この記録を削除します。よろしいですか？")) return;
    setList(deletePatrol(id));
    setAllRecords(getAllPatrolRecords());
  }

  return (
    <div className="space-y-6">
      {/* 結論カード（柱0）: 全巡視を横断した未是正・期日超過の状態を最上部で1メッセージに。
          localStorage 読込後にのみ描画（SSR初期値の「未是正なし」を一瞬見せない） */}
      {today !== "" && (
        <ConclusionCard {...patrolConclusion(openFindings.length, overdueCount)} className="print:hidden" />
      )}

      {/* 巡視情報 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="巡視日"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
          <Field label="時刻"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></Field>
          <Field label="巡視範囲"><Inp value={area} onChange={setArea} placeholder="例: 3F 躯体工事エリア" /></Field>
          <Field label="巡視者"><Inp value={inspector} onChange={setInspector} placeholder="例: 安全 太郎" /></Field>
          <Field label="職位・資格"><Inp value={role} onChange={setRole} placeholder="例: 安全管理者 / 衛生管理者 / 職長" /></Field>
        </div>
      </section>

      {/* チェック項目 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">巡視チェック</h2>
          <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">良 {stat.ok}／要改善 {stat.ng}</span>
        </div>
        <ul className="space-y-2">
          {checks.map((c) => (
            <li key={c.key} className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 ${RESULT_STYLE[c.result]}`}>
              <span className="min-w-0 flex-1 text-sm text-slate-800">{c.label}</span>
              <div className="flex shrink-0 gap-1">
                {(["ok", "ng", "na"] as PatrolCheckResult[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setResult(c.key, r)}
                    className={`min-h-[44px] rounded-md border px-2.5 py-1 text-xs font-bold transition ${
                      c.result === r
                        ? r === "ok"
                          ? "border-emerald-500 bg-emerald-600 text-white"
                          : r === "ng"
                            ? "border-rose-500 bg-rose-600 text-white"
                            : "border-slate-400 bg-slate-500 text-white"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {RESULT_JA[r]}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 指摘事項 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">指摘事項・是正管理</h2>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">指摘 {findings.length}／未是正 {stat.open}</span>
            <button type="button" onClick={addFinding} className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 print:hidden">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> 指摘を追加
            </button>
          </div>
        </div>
        {findings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-6 text-center text-sm text-slate-400">指摘事項があれば「指摘を追加」で記録してください。</p>
        ) : (
          <div className="space-y-2">
            {findings.map((f, idx) => (
              <div key={f.id} className={`rounded-xl border p-3 ${f.resolved ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200"}`}>
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 shrink-0 text-xs font-bold text-slate-400">{idx + 1}.</span>
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <input type="text" value={f.location} onChange={(e) => updateFinding(f.id, { location: e.target.value })} placeholder="場所" className="w-40 rounded-md border border-slate-300 px-2 py-1 text-sm" autoComplete="off" />
                      <select value={f.severity} onChange={(e) => updateFinding(f.id, { severity: e.target.value as PatrolSeverity })} className="rounded-md border border-slate-300 px-2 py-1 text-sm">
                        <option value="low">軽微</option>
                        <option value="high">重大</option>
                      </select>
                    </div>
                    <input type="text" value={f.content} onChange={(e) => updateFinding(f.id, { content: e.target.value })} placeholder="指摘内容（不安全な状態・行動）" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" autoComplete="off" />
                    <div className="flex flex-wrap items-center gap-2">
                      <input type="text" value={f.owner} onChange={(e) => updateFinding(f.id, { owner: e.target.value })} placeholder="是正担当" className="w-32 rounded-md border border-slate-300 px-2 py-1 text-xs" autoComplete="off" />
                      <input type="date" value={f.due} onChange={(e) => updateFinding(f.id, { due: e.target.value })} className="rounded-md border border-slate-300 px-2 py-1 text-xs" />
                      <label className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <input type="checkbox" checked={f.resolved} onChange={(e) => updateFinding(f.id, { resolved: e.target.checked })} className="h-4 w-4 accent-emerald-600" />
                        是正済み
                      </label>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeFinding(f.id)} className="flex min-h-[44px] shrink-0 items-center rounded p-1 text-rose-500 hover:bg-rose-50 print:hidden" aria-label={`指摘${idx + 1}を削除`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3">
          <Field label="総評・所見">
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" placeholder="例: 開口部の養生を最優先で是正。次回までに保護具着用を再徹底。" />
          </Field>
        </div>

        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          衛生管理者は少なくとも毎週1回、作業場等を巡視する義務があります（安衛法13条・安衛則6条等）。指摘事項は担当・期日を定めて確実に是正し、未是正の項目は次回巡視でフォローしてください。
        </p>

        <div className="mt-4 flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={handleSave} className="inline-flex items-center gap-1 rounded-lg bg-rose-600 min-h-[44px] px-3 py-2 text-xs font-bold text-white hover:bg-rose-700">
            <Save className="h-3.5 w-3.5" aria-hidden="true" /> この端末に保存
          </button>
          <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1 rounded-lg bg-slate-700 min-h-[44px] px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">
            <Printer className="h-3.5 w-3.5" aria-hidden="true" /> 巡視記録を印刷
          </button>
          <button type="button" onClick={handleCsv} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 min-h-[44px] px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            <Download className="h-3.5 w-3.5" aria-hidden="true" /> 指摘CSV
          </button>
          <button type="button" onClick={handleNew} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 min-h-[44px] px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" /> 新規
          </button>
          {savedNote && <span className="self-center text-xs font-semibold text-rose-700">{savedNote}</span>}
        </div>
      </section>

      {/* 未是正トラッカー（全巡視を横断して是正まで追う） */}
      <section id="open-findings" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <AlarmClock className="h-5 w-5 text-rose-600" aria-hidden="true" />
            未是正の指摘トラッカー（全巡視を横断）
          </h2>
          <div className="flex items-center gap-2">
            {overdueCount > 0 && (
              <span className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-bold text-white">期日超過 {overdueCount}</span>
            )}
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">未是正 {openFindings.length}</span>
          </div>
        </div>
        {openFindings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-6 text-center text-sm text-slate-400">
            保存済みの巡視に未是正の指摘はありません。指摘を「是正済み」にして保存すると、ここから消えます。
          </p>
        ) : (
          <>
            {overdueCount > 0 && (
              <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
                是正期日を過ぎた未是正が {overdueCount} 件あります。担当へ催促し、是正できたら元の記録で「是正済み」にチェックして再保存してください。
              </p>
            )}
            <ul className="space-y-2">
              {openFindings.map((f) => (
                <OpenFindingRow key={`${f.recordId}:${f.id}`} f={f} onOpen={() => openSaved(f.recordId)} />
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-5 text-slate-500">
              未是正の指摘を、是正期日が過ぎたもの・重大なものから順に表示しています。「記録を開く」でその巡視を上に開き、是正状況を更新できます。
            </p>
          </>
        )}
      </section>

      {/* 保存済み一覧 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <FolderOpen className="h-5 w-5 text-rose-600" aria-hidden="true" />
          保存した巡視記録（この端末）
        </h2>
        {list.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">まだ保存された記録はありません。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {list.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{s.date}　{s.area || "範囲未設定"}</p>
                  <p className="mt-0.5 text-xs text-slate-500">巡視者 {s.inspector || "—"}／要改善 {s.ngCount}／指摘 {s.findingCount}（未是正 {s.openCount}）</p>
                </div>
                <div className="flex shrink-0 gap-2">
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

function OpenFindingRow({ f, onOpen }: { f: OpenFinding; onOpen: () => void }) {
  return (
    <li className={`rounded-xl border p-3 ${f.overdue ? "border-rose-300 bg-rose-50/60" : f.severity === "high" ? "border-amber-200 bg-amber-50/40" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {f.overdue && <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">期日超過</span>}
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${f.severity === "high" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{SEVERITY_JA[f.severity]}</span>
            <span className="text-sm font-bold text-slate-900">{f.content || "（内容未記入）"}</span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            {f.location || "場所未記入"}
            <span className="mx-1 text-slate-300">|</span>
            担当 {f.owner || "—"}
            <span className="mx-1 text-slate-300">|</span>
            <span className={f.overdue ? "font-bold text-rose-700" : ""}>期日 {f.due || "未設定"}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">{f.patrolDate} の巡視（{f.area || "範囲未設定"}）</p>
        </div>
        <button type="button" onClick={onOpen} className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-lg border border-sky-300 px-2.5 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-50">
          記録を開く <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </li>
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
      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
    />
  );
}
