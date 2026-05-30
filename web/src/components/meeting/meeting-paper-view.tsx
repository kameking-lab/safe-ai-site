"use client";

/**
 * 安全工程打合せ書及び安全衛生指示書 — 用紙ファーストUI（Phase 1,2,4,5）。
 * KYの設計（ズーム・自動保存・用紙そのまま編集）を踏襲。AI/クラウド/印刷/一覧は後続Phaseで付加。
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  buildDefaultMeetingRecord,
  emptyContractorRow,
  emptyDeliveryRow,
  aggregateMachines,
  computePriority,
  buildDefaultChecklist,
  PRIORITY_LABEL,
  CONTRACTOR_TYPES,
  type MeetingRecord,
  type MeetingContractorRow,
  type ContractorType,
  type ChecklistStatus,
} from "@/lib/meeting/schema";
import { loadCurrentMeeting, saveCurrentMeeting, snapshotMeeting, collectMeetingHistory, type MeetingHistory } from "@/lib/meeting/store";
import { MeetingPrintSheet } from "@/components/meeting/meeting-print-sheet";
import { estimateQualifications, inferChecklist } from "@/lib/meeting/inference";
import { cloudPushMeeting, isMeetingCloudEnabled } from "@/lib/meeting/cloud";

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 1.6;
const ZOOM_STEP = 0.1;
const WEATHER = ["晴れ", "曇り", "雨", "雪", "強風", "猛暑", "厳寒"];
const COUNT_OPTIONS = ["", ...Array.from({ length: 30 }, (_, i) => String(i + 1)), "30+"];
const TYPE_INDENT: Record<ContractorType, string> = { 元請: "ml-0", "1次": "ml-4", "2次": "ml-8", "3次": "ml-12" };
const TYPE_TAG: Record<ContractorType, string> = {
  元請: "bg-slate-700 text-white",
  "1次": "bg-emerald-600 text-white",
  "2次": "bg-sky-600 text-white",
  "3次": "bg-amber-600 text-white",
};

function hiddenIds(rows: MeetingContractorRow[], collapsed: Set<string>): Set<string> {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const hidden = new Set<string>();
  for (const r of rows) {
    let p = r.parentId;
    while (p) {
      if (collapsed.has(p)) {
        hidden.add(r.id);
        break;
      }
      p = byId.get(p)?.parentId ?? null;
    }
  }
  return hidden;
}

const FIRSTUSE_HINT_KEY = "safe-ai:meeting-firstuse-hint-dismissed:v1";

export function MeetingPaperView() {
  const [record, setRecord] = useState<MeetingRecord>(buildDefaultMeetingRecord);
  const [zoom, setZoom] = useState(1);
  const [savedLabel, setSavedLabel] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [history, setHistory] = useState<MeetingHistory | null>(null);
  // R3: 初見の元請担当向け 3ステップ案内（一度×で恒久非表示。localStorage）。
  const [firstUseHintOpen, setFirstUseHintOpen] = useState(false);

  // 初回: 作業中の打合せ書を復元
  useEffect(() => {
    const cur = loadCurrentMeeting();
    if (cur) setRecord(cur);
    setHistory(collectMeetingHistory());
  }, []);

  // R3: 初見案内の表示判定（未読のときだけ表示）。
  useEffect(() => {
    try {
      if (localStorage.getItem(FIRSTUSE_HINT_KEY) !== "1") setFirstUseHintOpen(true);
    } catch {
      /* localStorage 不可時は何もしない */
    }
  }, []);

  const dismissFirstUseHint = useCallback(() => {
    setFirstUseHintOpen(false);
    try {
      localStorage.setItem(FIRSTUSE_HINT_KEY, "1");
    } catch {
      /* 無視 */
    }
  }, []);

  // 自動保存（変更のたび）
  useEffect(() => {
    const t = setTimeout(() => {
      saveCurrentMeeting(record);
      setSavedLabel(`自動保存: ${new Date().toLocaleTimeString("ja-JP")}`);
    }, 600);
    return () => clearTimeout(t);
  }, [record]);

  const patch = useCallback((p: Partial<MeetingRecord>) => setRecord((r) => ({ ...r, ...p })), []);
  const patchContractor = useCallback(
    (id: string, p: Partial<MeetingContractorRow>) =>
      setRecord((r) => ({ ...r, contractors: r.contractors.map((c) => (c.id === id ? { ...c, ...p } : c)) })),
    []
  );
  const setRisk = useCallback(
    (id: string, field: "severity" | "likelihood" | "priority", value: number) =>
      setRecord((r) => ({
        ...r,
        contractors: r.contractors.map((c) => {
          if (c.id !== id) return c;
          const risk = { ...c.risk, [field]: value };
          if (field !== "priority") risk.priority = computePriority(risk.severity, risk.likelihood);
          return { ...c, risk };
        }),
      })),
    []
  );

  const addContractor = (type: ContractorType, parentId: string | null) =>
    setRecord((r) => ({ ...r, contractors: [...r.contractors, emptyContractorRow(type, parentId)] }));
  const removeContractor = (id: string) =>
    setRecord((r) => ({ ...r, contractors: r.contractors.filter((c) => c.id !== id && c.parentId !== id) }));

  const machines = useMemo(() => aggregateMachines(record.contractors), [record.contractors]);
  const hidden = useMemo(() => hiddenIds(record.contractors, collapsed), [record.contractors, collapsed]);

  const handleSave = () => {
    const rec = { ...record, savedAt: new Date().toISOString() };
    saveCurrentMeeting(rec);
    snapshotMeeting(rec);
    setRecord(rec);
    void cloudPushMeeting(rec);
    setNotice(
      isMeetingCloudEnabled()
        ? "保存しました（クラウド同期）。一覧から再編集・複製できます。"
        : "保存しました。一覧から再編集・複製できます。"
    );
  };

  // Phase6: 行の作業内容からAIで予想災害・指示・リスク・資格を提案。
  const suggestRow = async (id: string) => {
    const row = record.contractors.find((c) => c.id === id);
    if (!row || !row.workContent.trim()) {
      setNotice("作業内容を入力してからAI提案を実行してください。");
      return;
    }
    setBusyRow(id);
    try {
      const res = await fetch("/api/meeting/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workContent: row.workContent }),
      });
      if (!res.ok) {
        setNotice("AI提案に失敗しました。時間をおいて再度お試しください。");
        return;
      }
      const data = (await res.json()) as {
        source?: string;
        disasters?: string[];
        instructions?: string;
        severity?: number;
        likelihood?: number;
      };
      const sev = Math.min(3, Math.max(1, Number(data.severity) || 1));
      const lik = Math.min(3, Math.max(1, Number(data.likelihood) || 1));
      const quals = estimateQualifications(row.workContent);
      patchContractor(id, {
        predictedDisasters: Array.isArray(data.disasters) && data.disasters.length > 0 ? data.disasters : row.predictedDisasters,
        safetyInstructions: data.instructions || row.safetyInstructions,
        qualifications: [...new Set([...row.qualifications, ...quals])],
        risk: { severity: sev, likelihood: lik, priority: computePriority(sev, lik) },
      });
      setNotice(
        data.source === "gemini"
          ? "AI（Gemini）が提案しました。内容を必ず確認・修正してください。"
          : "定型の提案を表示しました（AI未設定または応答不可）。"
      );
    } catch {
      setNotice("AI提案でエラーが発生しました。");
    } finally {
      setBusyRow(null);
    }
  };

  // Phase6: 全作業内容から点検カテゴリをAI推論（該当候補を○に）。
  const inferChecklistAll = () => {
    const workText = record.contractors.map((c) => `${c.workContent} ${c.machines}`).join(" ");
    patch({ checklist: inferChecklist(record.checklist, workText) });
    setNotice("作業内容から点検項目を推論しました（○=該当候補。実施状況を確認してください）。");
  };

  // Phase11: 点検項目カスタマイズ（自社固有項目の追加・編集・削除、公式版リセット）。
  const isCustomItem = (key: string) => /-c\d/.test(key);
  const addChecklistItem = (catKey: string) =>
    patch({
      checklist: record.checklist.map((c) =>
        c.key === catKey ? { ...c, items: [...c.items, { key: `${catKey}-c${Date.now()}`, label: "", status: "na" as ChecklistStatus }] } : c
      ),
    });
  const setChecklistItemLabel = (catKey: string, itemKey: string, label: string) =>
    patch({
      checklist: record.checklist.map((c) =>
        c.key === catKey ? { ...c, items: c.items.map((i) => (i.key === itemKey ? { ...i, label } : i)) } : c
      ),
    });
  const removeChecklistItem = (catKey: string, itemKey: string) =>
    patch({
      checklist: record.checklist.map((c) => (c.key === catKey ? { ...c, items: c.items.filter((i) => i.key !== itemKey) } : c)),
    });
  const resetChecklist = () => {
    if (window.confirm("点検項目を公式版（8カテゴリ標準項目）に戻します。追加・編集した項目は失われます。よろしいですか？")) {
      patch({ checklist: buildDefaultChecklist() });
      setNotice("点検項目を公式版に戻しました。");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* 上部バー */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur print:hidden">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold text-slate-900">安全工程打合せ書・安全衛生指示書</h1>
          <Link href="/safety-diary/list" className="rounded-full border border-sky-300 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800 hover:bg-sky-100">保存一覧</Link>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="縮小" onClick={() => setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 10) / 10))} className="rounded-full px-3 py-1 text-sm font-bold text-slate-700 hover:bg-slate-100">－</button>
          <button type="button" onClick={() => setZoom(1)} className="min-w-[3.5rem] rounded-full px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">{Math.round(zoom * 100)}%</button>
          <button type="button" aria-label="拡大" onClick={() => setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 10) / 10))} className="rounded-full px-3 py-1 text-sm font-bold text-slate-700 hover:bg-slate-100">＋</button>
        </div>
      </div>

      {notice && (
        <div className="mx-auto mt-2 flex max-w-5xl items-start justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 print:hidden">
          <p className="text-sm font-semibold text-emerald-900">{notice}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label="閉じる" className="rounded px-1.5 text-emerald-700 hover:bg-emerald-100">×</button>
        </div>
      )}

      {/* R3: 初見の元請担当向け 3ステップ案内。前日5分で各社の危険対策を1枚に＝紙との差。×で恒久非表示。 */}
      {firstUseHintOpen && (
        <div className="mx-auto mt-2 max-w-5xl px-3 print:hidden">
          <div className="rounded-xl border border-sky-300 bg-sky-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold text-sky-900">はじめての方へ — 前日5分で1枚に</p>
              <button
                type="button"
                onClick={dismissFirstUseHint}
                aria-label="この案内を閉じる"
                className="rounded px-1.5 text-sky-700 hover:bg-sky-100"
              >
                ×
              </button>
            </div>
            <ol className="mt-1.5 space-y-1 text-xs leading-relaxed text-sky-900 sm:text-sm">
              <li><span className="font-bold">① 作業日・現場を入力</span></li>
              <li><span className="font-bold">②「＋元請 / ＋1次 …」で協力会社を追加</span>し、各社の作業・使用機械・予想災害・指示を記入（<span className="font-bold">「AI提案」</span>で下書き可）</li>
              <li><span className="font-bold">③「保存」→「印刷」</span>で重層下請の危険対策を1枚にまとめ、朝礼・各社へ共有</li>
            </ol>
            <p className="mt-1.5 text-[11px] leading-snug text-sky-800">
              元請が前日5分で各社の予想災害・指示を1枚に集約。AIが指示事項を下書きします。KYへの転記も可能です。
            </p>
          </div>
        </div>
      )}

      {/* A4横向き印刷指定（この画面でのみ有効） */}
      <style media="print">{"@page{size:A4 landscape;margin:8mm}"}</style>

      {/* Phase3: 履歴サジェスト（過去の打合せ書から候補） */}
      {history && (
        <>
          <datalist id="mtg-sites">{history.sites.map((v) => <option key={v} value={v} />)}</datalist>
          <datalist id="mtg-companies">{history.companies.map((v) => <option key={v} value={v} />)}</datalist>
          <datalist id="mtg-works">{history.works.map((v) => <option key={v} value={v} />)}</datalist>
          <datalist id="mtg-machines">{history.machines.map((v) => <option key={v} value={v} />)}</datalist>
          <datalist id="mtg-responsibles">{history.responsibles.map((v) => <option key={v} value={v} />)}</datalist>
          <datalist id="mtg-authors">{history.authors.map((v) => <option key={v} value={v} />)}</datalist>
          <datalist id="mtg-managers">{history.managers.map((v) => <option key={v} value={v} />)}</datalist>
          <datalist id="mtg-supervisors">{history.supervisors.map((v) => <option key={v} value={v} />)}</datalist>
        </>
      )}

      {/* 用紙本体（編集UI。印刷時は専用A4シートを使うため隠す） */}
      <div className="overflow-x-auto px-2 py-4 print:hidden">
        <div className="mx-auto origin-top space-y-3" style={{ transform: `scale(${zoom})`, width: 980, maxWidth: "100%" }}>
          {/* ヘッダー */}
          <section className="rounded-xl border border-slate-300 bg-white p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <L label="作業日">
                <div className="flex items-center gap-1">
                  <input value={record.workDateYear} onChange={(e) => patch({ workDateYear: e.target.value })} aria-label="年" className={inp + " w-16"} />年
                  <input value={record.workDateMonth} onChange={(e) => patch({ workDateMonth: e.target.value })} aria-label="月" className={inp + " w-10"} />月
                  <input value={record.workDateDay} onChange={(e) => patch({ workDateDay: e.target.value })} aria-label="日" className={inp + " w-10"} />日
                </div>
              </L>
              <L label="天気">
                <select value={record.weather} onChange={(e) => patch({ weather: e.target.value })} className={inp}>
                  <option value="">―</option>
                  {WEATHER.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </L>
              <L label="気温(℃)"><input value={record.temperature} onChange={(e) => patch({ temperature: e.target.value })} className={inp} /></L>
              <L label="打合せ日(前日)"><input type="date" value={record.meetingDate} onChange={(e) => patch({ meetingDate: e.target.value })} className={inp} /></L>
              <L label="作業所名"><input value={record.siteName} onChange={(e) => patch({ siteName: e.target.value })} list="mtg-sites" className={inp} /></L>
              <L label="作業所長"><input value={record.siteManager} onChange={(e) => patch({ siteManager: e.target.value })} list="mtg-managers" className={inp} /></L>
              <L label="主任等"><input value={record.supervisor} onChange={(e) => patch({ supervisor: e.target.value })} list="mtg-supervisors" className={inp} /></L>
              <L label="作成担当者"><input value={record.author} onChange={(e) => patch({ author: e.target.value })} list="mtg-authors" className={inp} /></L>
            </div>
          </section>

          {/* 各社マトリクス */}
          <section className="rounded-xl border border-slate-300 bg-white p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-800">各社 作業・危険対策</h2>
              <div className="flex flex-wrap gap-1">
                {CONTRACTOR_TYPES.map((t) => (
                  <button key={t} type="button" onClick={() => addContractor(t, null)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">＋{t}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {record.contractors.map((c) => {
                if (hidden.has(c.id)) return null;
                const hasChildren = record.contractors.some((x) => x.parentId === c.id);
                return (
                  <div key={c.id} className={`rounded-lg border border-slate-200 bg-slate-50 p-2 ${TYPE_INDENT[c.type]}`}>
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      {hasChildren && (
                        <button type="button" onClick={() => setCollapsed((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })} className="rounded px-1 text-xs text-slate-500 hover:bg-slate-200" aria-label="折りたたみ">{collapsed.has(c.id) ? "▶" : "▼"}</button>
                      )}
                      <select value={c.type} onChange={(e) => patchContractor(c.id, { type: e.target.value as ContractorType })} className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${TYPE_TAG[c.type]}`} aria-label="階層">
                        {CONTRACTOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input value={c.companyName} onChange={(e) => patchContractor(c.id, { companyName: e.target.value })} placeholder="業者名" list="mtg-companies" className={inp + " flex-1 min-w-[8rem]"} aria-label="業者名" />
                      <button type="button" onClick={() => addContractor(nextType(c.type), c.id)} className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100">＋下位</button>
                      <button type="button" disabled={busyRow === c.id} onClick={() => void suggestRow(c.id)} className="rounded border border-indigo-300 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">{busyRow === c.id ? "提案中…" : "AI提案"}</button>
                      <Link href={kyHrefFromRow(c)} className="rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100">KYを作成</Link>
                      <button type="button" onClick={() => removeContractor(c.id)} className="rounded border border-rose-200 bg-white px-1.5 py-0.5 text-[10px] text-rose-600 hover:bg-rose-50">削除</button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <L label="作業内容"><input value={c.workContent} onChange={(e) => patchContractor(c.id, { workContent: e.target.value })} list="mtg-works" className={inp} /></L>
                      <L label="使用機械"><input value={c.machines} onChange={(e) => patchContractor(c.id, { machines: e.target.value })} placeholder="例: バックホウ、ダンプ" list="mtg-machines" className={inp} /></L>
                      <L label="必要資格"><TagField values={c.qualifications} onChange={(v) => patchContractor(c.id, { qualifications: v })} /></L>
                      <L label="予定人員">
                        <select value={c.plannedCount} onChange={(e) => patchContractor(c.id, { plannedCount: e.target.value })} className={inp}>
                          {COUNT_OPTIONS.map((n) => <option key={n} value={n}>{n || "―"}</option>)}
                        </select>
                      </L>
                      <L label="予想災害"><TagField values={c.predictedDisasters} onChange={(v) => patchContractor(c.id, { predictedDisasters: v })} /></L>
                      <L label="リスク(重大性/可能性→優先度)">
                        <div className="flex items-center gap-1">
                          <RiskSel value={c.risk.severity} onChange={(v) => setRisk(c.id, "severity", v)} label="重大性" />
                          <span className="text-slate-400">×</span>
                          <RiskSel value={c.risk.likelihood} onChange={(v) => setRisk(c.id, "likelihood", v)} label="可能性" />
                          <span className="text-slate-400">→</span>
                          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-bold text-slate-700">{PRIORITY_LABEL[c.risk.priority]}</span>
                        </div>
                      </L>
                      <L label="安全衛生指示事項" wide><textarea value={c.safetyInstructions} onChange={(e) => patchContractor(c.id, { safetyInstructions: e.target.value })} rows={2} className={inp + " resize-y"} /></L>
                      <L label="協力会社責任者"><input value={c.responsibleName} onChange={(e) => patchContractor(c.id, { responsibleName: e.target.value })} list="mtg-responsibles" className={inp} /></L>
                      <L label="実績人員(当日)"><input value={c.actualCount} onChange={(e) => patchContractor(c.id, { actualCount: e.target.value })} className={inp} /></L>
                      <L label="追記欄(元請)" wide><textarea value={c.appendNote} onChange={(e) => patchContractor(c.id, { appendNote: e.target.value })} rows={2} className={inp + " resize-y"} /></L>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 下段3ブロック */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <section className="rounded-xl border border-slate-300 bg-white p-3">
              <h2 className="mb-2 text-sm font-bold text-slate-800">明日のイベント</h2>
              <div className="space-y-2">
                <L label="安全大会"><input value={record.tomorrowEvents.safetyMeeting} onChange={(e) => patch({ tomorrowEvents: { ...record.tomorrowEvents, safetyMeeting: e.target.value } })} className={inp} /></L>
                <L label="検査"><input value={record.tomorrowEvents.inspection} onChange={(e) => patch({ tomorrowEvents: { ...record.tomorrowEvents, inspection: e.target.value } })} className={inp} /></L>
                <L label="パトロール"><input value={record.tomorrowEvents.patrol} onChange={(e) => patch({ tomorrowEvents: { ...record.tomorrowEvents, patrol: e.target.value } })} className={inp} /></L>
                <L label="明日の安全目標"><input value={record.tomorrowEvents.tomorrowGoal} onChange={(e) => patch({ tomorrowEvents: { ...record.tomorrowEvents, tomorrowGoal: e.target.value } })} className={inp} /></L>
                <L label="自由記入"><textarea value={record.tomorrowEvents.free} onChange={(e) => patch({ tomorrowEvents: { ...record.tomorrowEvents, free: e.target.value } })} rows={2} className={inp + " resize-y"} /></L>
              </div>
            </section>

            <section className="rounded-xl border border-slate-300 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800">搬入出予定</h2>
                <button type="button" onClick={() => patch({ deliveries: [...record.deliveries, emptyDeliveryRow()] })} className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-50">＋行</button>
              </div>
              <div className="space-y-1.5">
                {record.deliveries.map((d) => (
                  <div key={d.id} className="flex items-center gap-1">
                    <input value={d.item} onChange={(e) => patch({ deliveries: record.deliveries.map((x) => x.id === d.id ? { ...x, item: e.target.value } : x) })} placeholder="物" className={inp + " flex-1"} aria-label="物" />
                    <input value={d.time} onChange={(e) => patch({ deliveries: record.deliveries.map((x) => x.id === d.id ? { ...x, time: e.target.value } : x) })} placeholder="時刻" className={inp + " w-20"} aria-label="時刻" />
                    <input value={d.place} onChange={(e) => patch({ deliveries: record.deliveries.map((x) => x.id === d.id ? { ...x, place: e.target.value } : x) })} placeholder="場所" className={inp + " w-24"} aria-label="場所" />
                    <button type="button" onClick={() => patch({ deliveries: record.deliveries.filter((x) => x.id !== d.id) })} className="px-1 text-rose-500 hover:text-rose-700" aria-label="削除">×</button>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-slate-300 bg-white p-3">
              <h2 className="mb-2 text-sm font-bold text-slate-800">統括安全責任者コメント</h2>
              <textarea value={record.supervisorComment} onChange={(e) => patch({ supervisorComment: e.target.value })} rows={6} className={inp + " w-full resize-y"} />
            </section>
          </div>

          {/* 点検項目8カテゴリ */}
          <section className="rounded-xl border border-slate-300 bg-white p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-800">点検項目（○=該当・実施 / ×=要是正 / －=該当無）</h2>
              <div className="flex gap-1.5">
                <button type="button" onClick={inferChecklistAll} className="rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100">AIで該当項目を推論</button>
                <button type="button" onClick={resetChecklist} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">公式版に戻す</button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {record.checklist.map((cat) => (
                <div key={cat.key} className="rounded-lg border border-slate-200 p-2">
                  <p className="mb-1 text-xs font-bold text-slate-700">{cat.label}</p>
                  <ul className="space-y-1">
                    {cat.items.map((it) => (
                      <li key={it.key} className="flex items-center justify-between gap-1">
                        {isCustomItem(it.key) ? (
                          <input value={it.label} onChange={(e) => setChecklistItemLabel(cat.key, it.key, e.target.value)} placeholder="項目名" aria-label="点検項目名" className="min-w-0 flex-1 rounded border border-slate-200 px-1 text-[11px]" />
                        ) : (
                          <span className="text-[11px] text-slate-600">{it.label}</span>
                        )}
                        <span className="flex shrink-0 items-center gap-0.5">
                          <Tri value={it.status} onChange={(s) => patch({ checklist: record.checklist.map((cc) => cc.key === cat.key ? { ...cc, items: cc.items.map((ii) => ii.key === it.key ? { ...ii, status: s } : ii) } : cc) })} />
                          {isCustomItem(it.key) && <button type="button" onClick={() => removeChecklistItem(cat.key, it.key)} className="px-0.5 text-rose-400 hover:text-rose-600" aria-label="項目削除">×</button>}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => addChecklistItem(cat.key)} className="mt-1 w-full rounded border border-dashed border-slate-300 py-0.5 text-[10px] text-slate-500 hover:bg-slate-50">＋ 項目を追加</button>
                </div>
              ))}
            </div>
          </section>

          {/* 使用機械リスト（自動集計） */}
          <section className="rounded-xl border border-slate-300 bg-white p-3">
            <h2 className="mb-2 text-sm font-bold text-slate-800">使用機械リスト（自動集計）</h2>
            {machines.length === 0 ? (
              <p className="text-xs text-slate-400">各社の「使用機械」を入力すると自動で集計されます。</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {machines.map((m) => (
                  <span key={m.name} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{m.name}<span className="ml-1 text-slate-400">×{m.count}</span></span>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Phase10: A4印刷用シート（画面非表示・印刷時のみ） */}
      <div className="hidden print:block">
        <MeetingPrintSheet record={record} />
      </div>

      {/* 印刷プレビュー（画面オーバーレイ。印刷物には出さない） */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-40 overflow-auto bg-slate-700/70 p-4 print:hidden">
          <div className="mx-auto max-w-[300mm] rounded bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">印刷プレビュー（A4横・打合せ書）</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => window.print()} className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-sky-700">印刷 / PDF</button>
                <button type="button" onClick={() => setShowPrintPreview(false)} className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">閉じる</button>
              </div>
            </div>
            <div className="overflow-x-auto rounded border border-slate-200 p-2">
              <MeetingPrintSheet record={record} />
            </div>
          </div>
        </div>
      )}

      {/* 下部アクションバー */}
      <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur print:hidden">
        <span className="text-[11px] text-slate-500">{savedLabel || "未保存"}</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowPrintPreview(true)} className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50">印刷プレビュー</button>
          <button type="button" onClick={() => window.print()} className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-sky-700">印刷 / PDF</button>
          <button type="button" onClick={handleSave} className="rounded-lg border border-emerald-300 bg-white px-4 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">保存</button>
        </div>
      </div>
    </div>
  );
}

const inp = "rounded border border-slate-300 px-2 py-1 text-xs";

function nextType(t: ContractorType): ContractorType {
  const order: ContractorType[] = ["元請", "1次", "2次", "3次"];
  const i = order.indexOf(t);
  return order[Math.min(i + 1, order.length - 1)]!;
}

/**
 * Phase9: 各社行 → KY起票。KY側の既存 deep-link（import=risk-prediction&payload）を
 * そのまま再利用するため、KYのコードは一切変更しない（破壊リスクゼロ）。
 */
function kyHrefFromRow(row: MeetingContractorRow): string {
  const instrLines = row.safetyInstructions.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const risks =
    row.predictedDisasters.length > 0
      ? row.predictedDisasters.map((d, i) => ({ hazard: d, reduction: instrLines[i] ?? row.safetyInstructions }))
      : [{ hazard: "", reduction: row.safetyInstructions }];
  const payload = encodeURIComponent(JSON.stringify({ workContent: row.workContent, risks }));
  return `/ky/paper?import=risk-prediction&payload=${payload}`;
}

function L({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`block space-y-0.5 ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <span className="text-[10px] font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function RiskSel({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} className="rounded border border-slate-300 px-1 py-1 text-xs">
      {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
    </select>
  );
}

function Tri({ value, onChange }: { value: ChecklistStatus; onChange: (s: ChecklistStatus) => void }) {
  const opts: { s: ChecklistStatus; t: string; on: string }[] = [
    { s: "ok", t: "○", on: "bg-emerald-600 text-white" },
    { s: "ng", t: "×", on: "bg-rose-600 text-white" },
    { s: "na", t: "－", on: "bg-slate-400 text-white" },
  ];
  return (
    <span className="flex gap-0.5">
      {opts.map((o) => (
        <button key={o.s} type="button" onClick={() => onChange(o.s)} className={`h-5 w-5 rounded text-[11px] font-bold ${value === o.s ? o.on : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>{o.t}</button>
      ))}
    </span>
  );
}

function TagField({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  };
  return (
    <div className="rounded border border-slate-300 p-1">
      <div className="flex flex-wrap gap-1">
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] text-emerald-800">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="text-emerald-600 hover:text-emerald-900" aria-label="削除">×</button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          onBlur={add}
          placeholder="＋"
          className="min-w-[3rem] flex-1 px-1 text-[11px] outline-none"
          aria-label="追加"
        />
      </div>
    </div>
  );
}
