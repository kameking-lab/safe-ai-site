"use client";

/**
 * 安全工程打合せ書及び安全衛生指示書 — 用紙ファーストUI（Phase 1,2,4,5）。
 * KYの設計（ズーム・自動保存・用紙そのまま編集）を踏襲。AI/クラウド/印刷/一覧は後続Phaseで付加。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  MEETING_WEATHER_OPTIONS,
  MEETING_COUNT_OPTIONS,
  type MeetingRecord,
  type MeetingContractorRow,
  type ContractorType,
  type ChecklistStatus,
} from "@/lib/meeting/schema";
import { MeetingTagField } from "@/components/meeting/meeting-tag-field";
import { loadCurrentMeeting, saveCurrentMeeting, snapshotMeeting, collectMeetingHistory, loadLatestMeeting, duplicateForNextDay, type MeetingHistory } from "@/lib/meeting/store";
import { MeetingPrintSheet } from "@/components/meeting/meeting-print-sheet";
import { estimateQualifications, inferChecklist } from "@/lib/meeting/inference";
import { cloudPushMeeting, isMeetingCloudEnabled } from "@/lib/meeting/cloud";
import { DistributedInputBar } from "@/components/meeting/distributed-input-bar";
import { computeMeetingPaperStatus } from "@/lib/meeting/paper-status";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";
import { PaperStage, type PaperStageHandle } from "@/components/ky-paper/paper-stage";
import { MeetingFieldEditorSheet } from "@/components/meeting/meeting-field-editor-sheet";
import { contractorFieldKey, deliveryFieldKey, emptyMeetingPaperFieldKeys, firstEmptyMeetingPaperFieldKey, type MeetingPaperFieldKey } from "@/lib/meeting/paper-fields";

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 1.6;
const ZOOM_STEP = 0.1;
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

export function MeetingPaperView() {
  const [record, setRecord] = useState<MeetingRecord>(buildDefaultMeetingRecord);
  const [zoom, setZoom] = useState(1);
  const [savedLabel, setSavedLabel] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [history, setHistory] = useState<MeetingHistory | null>(null);
  // 「前回を複製」を上部にも出すための判定（端末に保存済みの打合せ書があるときだけ）。
  const [hasLatest, setHasLatest] = useState(false);
  // S1（打合せ用紙 直接操作UI・第一弾〜第六弾）: 用紙キャンバス（β）。KYのF1と同じ方式で
  // 既定はオフ（?canvas=1 または「🗺 キャンバス(β)」ボタンで切替）。ヘッダー7欄・明日のイベント5欄・
  // 統括安全責任者コメント・各社マトリクス10部位・搬入出（動的行）・点検項目8カテゴリに対応。
  // 残＝AI提案のエディタ内統合・履歴サジェストのcanvas内提供・既定切替（β外し）。
  const [canvasMode, setCanvasMode] = useState(false);
  const [activeFieldKey, setActiveFieldKey] = useState<MeetingPaperFieldKey | null>(null);
  const stageRef = useRef<PaperStageHandle>(null);

  // 初回: 作業中の打合せ書を復元
  useEffect(() => {
    const cur = loadCurrentMeeting();
    if (cur) setRecord(cur);
    setHistory(collectMeetingHistory());
    // 保存済みの打合せ書があれば上部にも「前回を複製」を出す（翌日分作成の最速ルート）。
    setHasLatest(loadLatestMeeting() !== null);
    // キャンバスβの状態をURLと同期（リロード/共有しても状態が保てる）。
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("canvas") === "1") setCanvasMode(true);
      else if (params.get("canvas") === "0") setCanvasMode(false);
    } catch {
      /* URL操作不可の環境では既定値のまま */
    }
  }, []);

  // S1: キャンバスβの切替（URLの ?canvas=1 と同期）。
  const toggleCanvasMode = useCallback((on: boolean) => {
    setCanvasMode(on);
    setActiveFieldKey(null);
    try {
      const url = new URL(window.location.href);
      if (on) url.searchParams.set("canvas", "1");
      else url.searchParams.delete("canvas");
      window.history.replaceState(null, "", url.toString());
    } catch {
      /* URL操作不可の環境では state のみ */
    }
  }, []);

  // 上部「前回を複製」: 直近に保存した1枚を翌日分として複製（各社の作業・危険・対策を引き継ぎ、
  // 日付は翌日・打合せ日は今日・実績/当日記入/コメント/点検はクリア）。1時間作業の大半を省く最速ルート。
  const handleCopyLatest = useCallback(() => {
    const latest = loadLatestMeeting();
    if (!latest) {
      setNotice("複製できる過去の打合せ書が見つかりませんでした。");
      return;
    }
    const next = duplicateForNextDay(latest);
    setRecord(next);
    saveCurrentMeeting(next);
    setNotice("前回の打合せ書を翌日分として複製しました（各社の作業・危険・対策を引き継ぎ、当日記入はクリア）。");
  }, []);

  // 自動保存（変更のたび）
  useEffect(() => {
    const t = setTimeout(() => {
      saveCurrentMeeting(record);
      // 自動保存は端末内の下書きのみ（保存一覧には未反映）。緑「保存済み」は手動「保存」が条件。
      setSavedLabel(`下書き自動保存: ${new Date().toLocaleTimeString("ja-JP")}`);
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

  // S1（第三弾）: 用紙キャンバスβの「＋元請/1次/2次/3次」ホットスポット。追加した行の
  // 会社名・階層欄をそのまま開く（危険行追加(O10)と同じ「そのまま開く」作法）。
  const handleAddContractorRow = useCallback((type: ContractorType) => {
    const newRow = emptyContractorRow(type, null);
    setRecord((prev) => ({ ...prev, contractors: [...prev.contractors, newRow] }));
    setActiveFieldKey(contractorFieldKey(newRow.id, "company"));
  }, []);

  // S1（第五弾）: 用紙キャンバスβの「＋搬入出行を追加」ホットスポット。追加した行の
  // 「物」欄をそのまま開く（各社マトリクス行追加(第三弾)と同じ「そのまま開く」作法）。
  const handleAddDeliveryRow = useCallback(() => {
    const newRow = emptyDeliveryRow();
    setRecord((prev) => ({ ...prev, deliveries: [...prev.deliveries, newRow] }));
    setActiveFieldKey(deliveryFieldKey(newRow.id, "item"));
  }, []);

  const machines = useMemo(() => aggregateMachines(record.contractors), [record.contractors]);
  const hidden = useMemo(() => hiddenIds(record.contractors, collapsed), [record.contractors, collapsed]);
  // 柱0: いまの状態を1メッセージに（記入のこりN＝青 / 記入完了・未保存＝青 / 保存済み＝緑）。
  // 「保存一覧に保存済みか」はセッション内で厳密追跡する。store の savedAt は自動保存・翌日複製でも
  // 更新されるため保存済みの根拠に使えない（誤って緑にしない）。手動「保存」を押した内容と
  // 現在の内容が一致するときだけ saved とみなす。
  const recordJson = useMemo(() => JSON.stringify(record), [record]);
  const [savedJson, setSavedJson] = useState<string | null>(null);
  const isSaved = savedJson !== null && savedJson === recordJson;
  const paperStatus = useMemo(
    () => computeMeetingPaperStatus(record, { saved: isSaved }),
    [record, isSaved]
  );
  // S1: 用紙キャンバスβ用。未記入欄集合とzoom-to-cell。
  const emptyPaperFieldKeys = useMemo(() => emptyMeetingPaperFieldKeys(record), [record]);
  const firstEmptyFieldKey = useMemo(() => firstEmptyMeetingPaperFieldKey(record), [record]);
  const handleZoomToNextEmpty = useCallback(() => {
    if (!firstEmptyFieldKey) return;
    stageRef.current?.focusField(firstEmptyFieldKey);
    setActiveFieldKey(firstEmptyFieldKey);
  }, [firstEmptyFieldKey]);

  const handleSave = () => {
    const rec = { ...record, savedAt: new Date().toISOString() };
    saveCurrentMeeting(rec);
    snapshotMeeting(rec);
    setRecord(rec);
    // この内容が保存一覧に入った＝結論カードを緑「保存済み」に。以後の編集で自動的に外れる。
    setSavedJson(JSON.stringify(rec));
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

  // S1（打合せ用紙 直接操作UI）: 用紙キャンバス（β）。全hooks評価後の分岐＝
  // クラシックUIと状態を完全共有する（record/自動保存/保存判定がそのまま効く）。
  // KYのF1と同じく既定はオフ。搬入出・点検項目・必要資格/予定人員/予想災害は後続弾で拡張。
  if (canvasMode) {
    const remaining = emptyPaperFieldKeys.size;
    return (
      <div className="min-h-screen bg-slate-100 pb-20 print:bg-white print:pb-0">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-3 py-1.5 backdrop-blur print:hidden">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-900">安全工程打合せ書</span>
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={handleZoomToNextEmpty}
                  disabled={!firstEmptyFieldKey}
                  title="最初の未記入セルへズームして開く"
                  className="min-h-[28px] rounded-full bg-sky-600 px-2.5 py-0.5 text-[11px] font-bold text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  のこり{remaining}項目 →
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link href="/safety-diary/list" className="rounded-full border border-sky-300 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800 hover:bg-sky-100">
                保存一覧
              </Link>
              <button
                type="button"
                onClick={() => toggleCanvasMode(false)}
                className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
              >
                従来表示
              </button>
            </div>
          </div>
        </div>

        {notice && (
          <div className="mx-auto mt-2 flex max-w-5xl items-start justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 print:hidden">
            <p className="text-sm font-semibold text-emerald-900">{notice}</p>
            <button type="button" onClick={() => setNotice(null)} aria-label="閉じる" className="rounded px-1.5 text-emerald-700 hover:bg-emerald-100">×</button>
          </div>
        )}

        {/* A4横向き印刷指定（この画面でのみ有効） */}
        <style media="print">{"@page{size:A4 landscape;margin:8mm}"}</style>

        {/* 用紙キャンバス: 初期表示＝全体フィット。タップで入力、ピンチ/ホイール/ボタンでズーム */}
        <PaperStage ref={stageRef} heightClassName="h-[calc(100dvh-200px)] min-h-[320px] sm:h-[calc(100dvh-150px)]">
          <div className="bg-white p-3">
            <MeetingPrintSheet
              record={record}
              editing={{
                onTapField: (key) => setActiveFieldKey(key),
                activeKey: activeFieldKey,
                emptyKeys: emptyPaperFieldKeys,
                onAddContractorRow: handleAddContractorRow,
                onAddDeliveryRow: handleAddDeliveryRow,
              }}
            />
          </div>
        </PaperStage>

        {/* 欄タップで開く入力エディタ */}
        {activeFieldKey && (
          <MeetingFieldEditorSheet
            fieldKey={activeFieldKey}
            record={record}
            patch={patch}
            onClose={() => setActiveFieldKey(null)}
            onSelectField={(key) => setActiveFieldKey(key)}
          />
        )}

        {/* 印刷経路は従来と同一（正式書式は editing なしの MeetingPrintSheet） */}
        <div className="hidden print:block">
          <MeetingPrintSheet record={record} />
        </div>

        <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur print:hidden">
          <span className={`text-[11px] font-semibold ${isSaved ? "text-emerald-700" : "text-slate-500"}`}>
            {isSaved ? "✓ 保存一覧に保存済み" : savedLabel ? `未保存（${savedLabel}）` : "未保存"}
          </span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => window.print()} className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-sky-700">印刷 / PDF</button>
            <button type="button" onClick={handleSave} className="rounded-lg border border-emerald-300 bg-white px-4 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">保存</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* 上部バー */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur print:hidden">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold text-slate-900">安全工程打合せ書・安全衛生指示書</h1>
          <Link href="/safety-diary/list" className="rounded-full border border-sky-300 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800 hover:bg-sky-100">保存一覧</Link>
          {hasLatest && (
            <button
              type="button"
              onClick={handleCopyLatest}
              title="前回の打合せ書を翌日分として複製（各社の作業・危険・対策を引き継ぎ、日付は翌日・当日記入はクリア）"
              className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
            >
              ↻ 前回を複製
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* S1: タップ入力できる新しい表示（β）への入口。既定はまだクラシック表示。 */}
          <button
            type="button"
            onClick={() => toggleCanvasMode(true)}
            title="用紙全体を1画面で見ながら、タップした欄をその場で入力できる新しい表示を試す（β）"
            className="rounded-full border border-sky-300 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800 hover:bg-sky-100"
          >
            🗺 キャンバス(β)
          </button>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="縮小" onClick={() => setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 10) / 10))} className="rounded-full px-3 py-1 text-sm font-bold text-slate-700 hover:bg-slate-100">－</button>
            <button type="button" onClick={() => setZoom(1)} className="min-w-[3.5rem] rounded-full px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">{Math.round(zoom * 100)}%</button>
            <button type="button" aria-label="拡大" onClick={() => setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 10) / 10))} className="rounded-full px-3 py-1 text-sm font-bold text-slate-700 hover:bg-slate-100">＋</button>
          </div>
        </div>
      </div>

      {notice && (
        <div className="mx-auto mt-2 flex max-w-5xl items-start justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 print:hidden">
          <p className="text-sm font-semibold text-emerald-900">{notice}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label="閉じる" className="rounded px-1.5 text-emerald-700 hover:bg-emerald-100">×</button>
        </div>
      )}

      {/* 柱0: 結論カード=いまの状態1メッセージ（記入のこりN=青デカ数字 / 記入完了=緑）。
          未記入チップはタップでその欄へジャンプ。 */}
      <div className="mx-auto mt-2 max-w-5xl px-3 print:hidden">
        <ConclusionCard
          tone={paperStatus.tone}
          value={paperStatus.remaining}
          unit={paperStatus.remaining !== undefined ? "項目" : undefined}
          title={paperStatus.title}
          action={paperStatus.action}
        >
          {paperStatus.missing.length > 0 &&
            paperStatus.missing.map((m) => (
              <a key={m.key} href={m.anchor} className="rounded-full">
                <StatusBadge tone="neutral" size="sm">{m.label}</StatusBadge>
              </a>
            ))}
        </ConclusionCard>
      </div>

      {/* 柱0: 初見の元請担当向け 3ステップ案内は折りたたみへ格納（結論カードが「次にやること」を常時案内するため）。 */}
      <div className="mx-auto mt-2 max-w-5xl px-3 print:hidden">
        <CollapsibleDetail summary="はじめての方へ — 前日5分で1枚に">
          <ol className="space-y-1">
            <li><span className="font-bold">① 作業日・現場を入力</span></li>
            <li><span className="font-bold">②「＋元請 / ＋1次 …」で協力会社を追加</span>し、各社の作業・使用機械・予想災害・指示を記入（<span className="font-bold">「AI提案」</span>で下書き可）</li>
            <li><span className="font-bold">③「保存」→「印刷」</span>で重層下請の危険対策を1枚にまとめ、朝礼・各社へ共有</li>
          </ol>
          <p className="mt-1.5">
            元請が前日5分で各社の予想災害・指示を1枚に集約。AIが指示事項を下書きします。KYへの転記も可能です。
          </p>
        </CollapsibleDetail>
      </div>

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
          <section id="mtg-header" className="scroll-mt-20 rounded-xl border border-slate-300 bg-white p-3">
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
                  {MEETING_WEATHER_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
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
          <section id="mtg-companies" className="scroll-mt-20 rounded-xl border border-slate-300 bg-white p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-800">各社 作業・危険対策</h2>
              <div className="flex flex-wrap gap-1">
                {CONTRACTOR_TYPES.map((t) => (
                  <button key={t} type="button" onClick={() => addContractor(t, null)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">＋{t}</button>
                ))}
              </div>
            </div>

            {/* 協力会社 分散入力 → 元請 自動集約（クラウド設定時のみ。print:hidden） */}
            <DistributedInputBar
              meetingId={record.id}
              siteName={record.siteName}
              workDate={`${record.workDateYear}-${record.workDateMonth}-${record.workDateDay}`}
              onImport={(merged) => patch({ contractors: merged })}
              contractors={record.contractors}
            />

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
                      <L label="必要資格"><MeetingTagField values={c.qualifications} onChange={(v) => patchContractor(c.id, { qualifications: v })} /></L>
                      <L label="予定人員">
                        <select value={c.plannedCount} onChange={(e) => patchContractor(c.id, { plannedCount: e.target.value })} className={inp}>
                          {MEETING_COUNT_OPTIONS.map((n) => <option key={n} value={n}>{n || "―"}</option>)}
                        </select>
                      </L>
                      <L label="予想災害"><MeetingTagField values={c.predictedDisasters} onChange={(v) => patchContractor(c.id, { predictedDisasters: v })} /></L>
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
      <div id="mtg-actions" className="sticky bottom-0 z-20 flex scroll-mt-20 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur print:hidden">
        <span className={`text-[11px] font-semibold ${isSaved ? "text-emerald-700" : "text-slate-500"}`}>
          {isSaved ? "✓ 保存一覧に保存済み" : savedLabel ? `未保存（${savedLabel}）` : "未保存"}
        </span>
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

