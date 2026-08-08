"use client";

import { FolderOpen, Map as MapIcon, Printer, Search, Sparkles } from "lucide-react";

/**
 * 安全工程打合せ書及び安全衛生指示書 — 用紙ファーストUI（Phase 1,2,4,5）。
 * KYの設計（ズーム・自動保存・用紙そのまま編集）を踏襲。AI/クラウド/印刷/一覧は後続Phaseで付加。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
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
import {
  estimateQualifications,
  inferChecklistCandidates,
} from "@/lib/meeting/inference";
import { cloudPushMeeting, isMeetingCloudEnabled } from "@/lib/meeting/cloud";
import { grantCloudConsent, hasCloudConsent, revokeCloudConsent } from "@/lib/cloud-consent";
import { DistributedInputBar } from "@/components/meeting/distributed-input-bar";
import { computeMeetingPaperStatus } from "@/lib/meeting/paper-status";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";
import { PaperStage, type PaperStageHandle } from "@/components/ky-paper/paper-stage";
import {
  KyHandoffLink,
  type KyHandoffInput,
} from "@/components/ky-handoff-link";
import { contractorFieldKey, deliveryFieldKey, emptyMeetingPaperFieldKeys, firstEmptyMeetingPaperFieldKey, type MeetingPaperFieldKey } from "@/lib/meeting/paper-fields";
import { runClientAiAction } from "@/lib/client-ai-action";
import {
  approveMeetingRecord,
  getMeetingDocumentState,
  recordMeetingPrint,
} from "@/lib/meeting/document-state";
import { validateMeetingForApproval } from "@/lib/meeting/readiness";
import { evaluateChatbotSafety } from "@/lib/chatbot-safety";

const MeetingFieldEditorSheet = dynamic(() =>
  import("@/components/meeting/meeting-field-editor-sheet").then(
    (module) => module.MeetingFieldEditorSheet,
  ),
);

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

const MEETING_COORDINATION_FIELDS: Array<{
  key: keyof MeetingRecord["coordination"];
  label: string;
  placeholder: string;
}> = [
  { key: "simultaneousWork", label: "同時作業", placeholder: "作業・区画・調整内容／なし" },
  { key: "deliveries", label: "搬入出", placeholder: "車両・時刻・場所／なし" },
  { key: "fireWork", label: "火気", placeholder: "内容・許可・消火設備／なし" },
  { key: "heightWork", label: "高所", placeholder: "場所・墜落防止措置／なし" },
  { key: "electricalWork", label: "電気", placeholder: "停電・活線・防護／なし" },
  { key: "chemicalWork", label: "化学物質", placeholder: "物質・SDS・措置／なし" },
  { key: "weather", label: "天候条件", placeholder: "警報・暑熱・風・中止基準" },
  { key: "changes", label: "変更点", placeholder: "前回・計画からの変更／なし" },
  { key: "newEntrants", label: "新規入場者", placeholder: "人数・教育確認／なし" },
  { key: "nightWork", label: "夜間", placeholder: "照明・連絡体制／なし" },
  { key: "roles", label: "役割", placeholder: "統括・誘導・監視・連絡担当" },
];

type MeetingAiDraft = {
  disasters: string[];
  instructions: string;
  severity: number;
  likelihood: number;
  qualificationCandidates: string[];
  source: "gemini" | "fallback";
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

export function MeetingPaperView({ initialRecord }: { initialRecord?: MeetingRecord }) {
  // 通常ページではServer Componentが生成した同一値をhydrationに再利用する。
  // optionalなのは独立したコンポーネントテストと埋め込み利用の互換性のため。
  const [record, setRecord] = useState<MeetingRecord>(() => initialRecord ?? buildDefaultMeetingRecord());
  const activeEmergency = useMemo(() => {
    const decision = evaluateChatbotSafety(JSON.stringify(record));
    return decision?.kind === "emergency" ? decision : null;
  }, [record]);
  const [zoom, setZoom] = useState(1);
  const [savedLabel, setSavedLabel] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  // 柱C-9: 「…」その他操作シート（KYのO10第五弾と同じ操作集中の型）
  const [showActions, setShowActions] = useState(false);
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [aiProviderConsent, setAiProviderConsent] = useState(false);
  const [aiDrafts, setAiDrafts] = useState<Record<string, MeetingAiDraft>>({});
  const [aiChangeNotes, setAiChangeNotes] = useState<Record<string, string>>({});
  const [suggestedChecklistCategories, setSuggestedChecklistCategories] = useState<string[]>([]);
  const [history, setHistory] = useState<MeetingHistory | null>(null);
  // 「前回を複製」を上部にも出すための判定（端末に保存済みの打合せ書があるときだけ）。
  const [hasLatest, setHasLatest] = useState(false);
  // S1（打合せ用紙 直接操作UI・第一弾〜第九弾）: 用紙キャンバス。ヘッダー7欄・明日のイベント5欄・
  // 統括安全責任者コメント・各社マトリクス10部位・搬入出（動的行）・点検項目8カテゴリ・
  // 作業内容欄でのAI提案・履歴サジェスト（datalist）・行操作（下位追加/削除/KY起票）に対応。
  // セマンティックHTMLフォームを既定かつ入力の正本とし、用紙キャンバスは任意表示にする。
  const [canvasMode, setCanvasMode] = useState(false);
  const [cloudConsent, setCloudConsent] = useState(false);
  const [reviewerName, setReviewerName] = useState(
    initialRecord?.documentControl.approval?.reviewerName ?? "",
  );
  const [activeFieldKey, setActiveFieldKey] = useState<MeetingPaperFieldKey | null>(null);
  const stageRef = useRef<PaperStageHandle>(null);

  // 初回: 作業中の打合せ書を復元
  useEffect(() => {
    setCloudConsent(hasCloudConsent());
    const cur = loadCurrentMeeting();
    if (cur) {
      setRecord(cur);
      setReviewerName(cur.documentControl.approval?.reviewerName ?? "");
    }
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

  // セマンティックHTML入力を既定にし、用紙キャンバスは ?canvas=1 の任意表示。
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
    if (activeEmergency) {
      setNotice(activeEmergency.response);
      setSavedLabel("緊急表現を検出したため保存していません");
      return;
    }
    const t = setTimeout(() => {
      saveCurrentMeeting(record);
      // 自動保存は端末内の下書きのみ（保存一覧には未反映）。緑「保存済み」は手動「保存」が条件。
      setSavedLabel(`下書き自動保存: ${new Date().toLocaleTimeString("ja-JP")}`);
    }, 600);
    return () => clearTimeout(t);
  }, [activeEmergency, record]);

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
          const risk = { ...c.risk, [field]: value, reviewed: true };
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

  // S1（第九弾）: canvasエディタ内の行操作（クラシックの＋下位/削除/KYを作成と同じ挙動）。
  // 下位追加は追加した行の業者名欄をそのまま開く（行追加ホットスポットと同じ作法）。
  const handleAddChildRow = (row: MeetingContractorRow) => {
    const newRow = emptyContractorRow(nextType(row.type), row.id);
    setRecord((prev) => ({ ...prev, contractors: [...prev.contractors, newRow] }));
    setActiveFieldKey(contractorFieldKey(newRow.id, "company"));
  };
  const handleRemoveRow = (id: string) => {
    setActiveFieldKey(null);
    removeContractor(id);
  };

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
  const documentState = useMemo(() => getMeetingDocumentState(record), [record]);
  const meetingSteps = useMemo(() => {
    const activeRows = record.contractors.filter(
      (row) =>
        row.companyName.trim() ||
        row.workContent.trim() ||
        row.machines.trim() ||
        row.plannedCount.trim() ||
        row.predictedDisasters.some((item) => item.trim()) ||
        row.safetyInstructions.trim(),
    );
    const definitions = [
      {
        label: "工程",
        href: "#mtg-header",
        done:
          record.siteName.trim() !== "" &&
          activeRows.some((row) => row.workContent.trim() !== ""),
      },
      {
        label: "人員・会社",
        href: "#mtg-companies",
        done:
          activeRows.length > 0 &&
          activeRows.every(
            (row) =>
              row.companyName.trim() !== "" && row.plannedCount.trim() !== "",
          ),
      },
      {
        label: "重機・設備",
        href: "#mtg-companies",
        done:
          activeRows.length > 0 &&
          activeRows.every((row) => row.machines.trim() !== ""),
      },
      {
        label: "同時作業・変更",
        href: "#mtg-coordination",
        done: Object.values(record.coordination).every(
          (value) => value.trim() !== "",
        ),
      },
      {
        label: "対策",
        href: "#mtg-companies",
        done:
          activeRows.length > 0 &&
          activeRows.every(
            (row) =>
              row.predictedDisasters.some((item) => item.trim() !== "") &&
              row.safetyInstructions.trim() !== "" &&
              row.risk.reviewed,
          ),
      },
      {
        label: "承認",
        href: "#meeting-approval",
        done: documentState.approval === "approved",
      },
    ];
    let currentAssigned = false;
    return definitions.map((step) => {
      const current = !step.done && !currentAssigned;
      if (current) currentAssigned = true;
      return { ...step, current };
    });
  }, [documentState.approval, record]);
  const readinessIssues = useMemo(
    () => validateMeetingForApproval(record),
    [record],
  );
  // S1: 用紙キャンバスβ用。未記入欄集合とzoom-to-cell。
  const emptyPaperFieldKeys = useMemo(() => emptyMeetingPaperFieldKeys(record), [record]);
  const firstEmptyFieldKey = useMemo(() => firstEmptyMeetingPaperFieldKey(record), [record]);
  const handleZoomToNextEmpty = useCallback(() => {
    if (!firstEmptyFieldKey) return;
    stageRef.current?.focusField(firstEmptyFieldKey);
    setActiveFieldKey(firstEmptyFieldKey);
  }, [firstEmptyFieldKey]);

  const handleSave = async () => {
    if (activeEmergency) {
      setNotice(activeEmergency.response);
      return;
    }
    const rec = { ...record, savedAt: new Date().toISOString() };
    saveCurrentMeeting(rec);
    snapshotMeeting(rec);
    setRecord(rec);
    // この内容が保存一覧に入った＝結論カードを緑「保存済み」に。以後の編集で自動的に外れる。
    setSavedJson(JSON.stringify(rec));
    if (cloudConsent) {
      const uploaded = await cloudPushMeeting(rec);
      setNotice(uploaded
        ? "端末内に保存し、クラウド同期も完了しました。"
        : "端末内には保存しましたが、クラウド同期は完了していません。");
    } else {
      setNotice("この端末内に保存しました。クラウドへは送信していません。");
    }
  };

  // Phase6: AI出力は確認候補として隔離し、利用者が明示的に反映するまで記録を変更しない。
  const suggestRow = async (id: string) => {
    const row = record.contractors.find((c) => c.id === id);
    const emergency = [
      row?.workContent ?? "",
      record.siteName,
      row?.machines ?? "",
      String(row?.plannedCount ?? ""),
      record.weather,
      aiChangeNotes[id] ?? "",
    ]
      .map((text) => evaluateChatbotSafety(text))
      .find((decision) => decision?.kind === "emergency");
    if (emergency?.kind === "emergency") {
      setNotice(emergency.response);
      return;
    }
    const missing = [
      !row?.workContent.trim() ? "作業内容" : "",
      !row?.machines.trim() ? "使用機械・設備" : "",
      !row?.plannedCount ? "予定人員" : "",
      !record.weather.trim() ? "天候" : "",
      !record.siteName.trim() ? "作業場所" : "",
      !aiChangeNotes[id]?.trim() ? "変更点（ない場合は「なし」）" : "",
    ].filter(Boolean);
    if (!row || missing.length > 0) {
      setNotice(`AI候補の前に ${missing.join("・")} を入力してください。条件不足のまま危険を推定しません。`);
      return;
    }
    if (!aiProviderConsent) {
      setNotice("外部AIへ送る内容を匿名化し、送信確認にチェックしてから実行してください。");
      return;
    }
    setBusyRow(id);
    try {
      const guardedResponse = await runClientAiAction(
        {
          purpose: "meeting-suggestion-client",
          texts: [
            row.workContent,
            record.siteName,
            row.machines,
            String(row.plannedCount),
            record.weather,
            aiChangeNotes[id] ?? "",
          ],
          consent: aiProviderConsent,
          maxChars: 5_000,
          contextPolicy: "approved-server-corpus",
        },
        () =>
          fetch("/api/meeting/suggest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workContent: row.workContent,
              workLocation: record.siteName,
              machines: row.machines,
              plannedCount: row.plannedCount,
              weather: record.weather,
              changes: aiChangeNotes[id],
              workDate: `${record.workDateYear}-${record.workDateMonth}-${record.workDateDay}`,
              aiProviderConsent: true,
            }),
          }),
      );
      if (!guardedResponse.sent) {
        setNotice(guardedResponse.decision.message);
        return;
      }
      const res = guardedResponse.value;
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
      setAiDrafts((current) => ({
        ...current,
        [id]: {
          disasters: Array.isArray(data.disasters) ? data.disasters.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [],
          instructions: typeof data.instructions === "string" ? data.instructions : "",
          severity: sev,
          likelihood: lik,
          qualificationCandidates: quals,
          source: data.source === "gemini" ? "gemini" : "fallback",
        },
      }));
      setNotice(
        data.source === "gemini"
          ? "AI候補を確認欄へ表示しました。まだ工程書には反映していません。"
          : "定型候補を確認欄へ表示しました。まだ工程書には反映していません。"
      );
    } catch {
      setNotice("AI提案でエラーが発生しました。");
    } finally {
      setBusyRow(null);
    }
  };

  const handleApprove = () => {
    const result = approveMeetingRecord(record, { reviewerName });
    if (!result.ok) {
      const message =
        result.reason === "reviewer-required"
          ? "確認者名を入力してください。"
          : result.reason === "incomplete"
            ? "必須欄が未完了です。各入力行の会社名・作業内容・予想災害・安全衛生指示を確認してください。"
            : "承認日時を記録できませんでした。";
      setNotice(message);
      return;
    }
    setRecord(result.record);
    saveCurrentMeeting(result.record);
    setNotice("現在の帳票内容を確認済みとして記録しました。以後に内容を変更すると承認は期限切れになります。");
  };

  const handlePrint = () => {
    if (!documentState.canPrint) {
      window.print();
      setNotice(
        "未承認または未確認のため、「下書き・未確認版」の表示付きで印刷しました。",
      );
      return;
    }
    window.print();
    const result = recordMeetingPrint(record);
    if (!result.ok) {
      setNotice("印刷記録を保存できませんでした。内容の承認状態を再確認してください。");
      return;
    }
    saveCurrentMeeting(result.record);
    snapshotMeeting(result.record);
    setRecord(result.record);
    setSavedJson(JSON.stringify(result.record));
    setNotice("印刷ダイアログ完了時刻を記録しました。実際の出力成否はプリンターまたはPDF保存先でも確認してください。");
  };

  const applyAiDraft = (id: string) => {
    const draft = aiDrafts[id];
    if (!draft) return;
    patchContractor(id, {
      predictedDisasters: draft.disasters,
      safetyInstructions: draft.instructions,
      risk: {
        severity: draft.severity,
        likelihood: draft.likelihood,
        priority: computePriority(draft.severity, draft.likelihood),
        reviewed: false,
      },
    });
    setAiDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setNotice("確認したAI候補を工程書へ反映しました。資格候補は自動確定していません。一次資料と作業条件で確認してください。");
  };

  const dismissAiDraft = (id: string) => {
    setAiDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setNotice("AI候補を破棄しました。工程書の確定内容は変更していません。");
  };

  // Phase6: 全作業内容から点検カテゴリ候補を抽出。未確認を実施済みへは変えない。
  const inferChecklistAll = () => {
    const workText = record.contractors.map((c) => `${c.workContent} ${c.machines}`).join(" ");
    const candidates = inferChecklistCandidates(record.checklist, workText);
    setSuggestedChecklistCategories(candidates);
    setNotice(
      candidates.length > 0
        ? `作業内容から${candidates.length}カテゴリを「確認候補」として示しました。点検を実施し、人が○・×・－を選んでください。`
        : "候補を抽出できませんでした。各社の作業内容・場所・機械・数量・能力を入力してください。"
    );
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

  // Phase3/S1（続き・第八弾）: 履歴サジェスト（過去の打合せ書から候補）。従来UI・キャンバス両方の
  // list= 参照先として共有する（キャンバス側もタップ→エディタ内の入力欄で同じ候補が出るように）。
  const historyDatalists = history && (
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
  );

  // 柱C-9（KYのO10第五弾と同型）: 印刷プレビュー・下部操作バー（保存＋「…」）・
  // その他操作シートを canvas/クラシック共通の変数として分岐前に括り出す
  //（ロジック二重化ゼロ＝既定切替後もどちらの表示からも同じ操作に到達できる）。
  const runAction = (fn: () => void) => {
    setShowActions(false);
    fn();
  };

  const coordinationControl = (
    <section
      id="mtg-coordination"
      className="mx-auto mt-3 max-w-5xl scroll-mt-20 px-3 print:hidden"
      aria-labelledby="meeting-coordination-heading"
    >
      <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
        <h2 id="meeting-coordination-heading" className="text-sm font-bold text-amber-950">
          承認前の現場調整条件
        </h2>
        <p className="mt-1 text-xs leading-6 text-amber-950">
          空欄・既定値は確認済みと扱いません。該当しない場合も「なし」と明示してください。
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {MEETING_COORDINATION_FIELDS.map((field) => (
            <label key={field.key} className="text-xs font-bold text-slate-800">
              {field.label}
              <input
                value={record.coordination[field.key]}
                onChange={(event) =>
                  patch({
                    coordination: {
                      ...record.coordination,
                      [field.key]: event.target.value,
                    },
                  })
                }
                placeholder={field.placeholder}
                className="mt-1 min-h-[44px] w-full rounded-lg border border-amber-400 bg-white px-3 text-sm"
              />
            </label>
          ))}
        </div>
      </div>
    </section>
  );

  const approvalControl = (
    <section
      id="meeting-approval"
      className="mx-auto mt-3 max-w-5xl px-3 print:hidden"
      aria-labelledby="meeting-approval-heading"
    >
      <div className="rounded-xl border-2 border-slate-300 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="meeting-approval-heading" className="text-sm font-bold text-slate-900">
              人による確認・印刷管理
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              AI候補や過去例は未確定です。現場条件、各社の危険、指示内容を確認者が確認し、
              現在の版を承認してから印刷します。承認後の編集は自動で「再承認が必要」になります。
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-bold ${
              documentState.approval === "approved"
                ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                : documentState.approval === "stale"
                  ? "border-rose-400 bg-rose-50 text-rose-900"
                  : "border-amber-400 bg-amber-50 text-amber-950"
            }`}
          >
            {documentState.approval === "approved"
              ? "確認済み・現行版"
              : documentState.approval === "stale"
                ? "内容変更あり・再承認必要"
                : "未承認"}
          </span>
        </div>

        {documentState.legacyImported && (
          <p role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-950">
            旧形式から読み込んだ記録です。過去の確認・印刷状態は引き継いでいません。
          </p>
        )}
        {readinessIssues.length > 0 ? (
          <div role="alert" className="mt-3 rounded-lg border border-amber-400 bg-amber-50 p-3 text-xs text-amber-950">
            <p className="font-bold">承認前に確認する項目</p>
            <ul className="mt-1 list-disc pl-5">
              {readinessIssues.map((issue) => (
                <li key={`${issue.code}-${issue.label}`}>{issue.label}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-3 text-xs font-bold text-emerald-800">
            全条件を人が確認済み・承認可能
          </p>
        )}

        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="block text-xs font-bold text-slate-800">
            確認者名
            <input
              value={reviewerName}
              onChange={(event) => setReviewerName(event.target.value)}
              autoComplete="name"
              aria-describedby="meeting-reviewer-help"
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={handleApprove}
            disabled={!documentState.canApprove || !reviewerName.trim()}
            className="min-h-11 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            現在の内容を確認・承認
          </button>
        </div>
        <p id="meeting-reviewer-help" className="mt-1 text-[11px] text-slate-600">
          個人情報は必要最小限にし、組織の記録ルールに従ってください。電子署名・本人認証ではなく、この端末内の変更履歴です。
        </p>

        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
          <div>
            <dt className="font-bold text-slate-700">確認日時</dt>
            <dd>
              {record.documentControl.approval
                ? new Date(record.documentControl.approval.approvedAt).toLocaleString("ja-JP")
                : "未記録"}
            </dd>
          </div>
          <div>
            <dt className="font-bold text-slate-700">印刷操作日時</dt>
            <dd>
              {record.documentControl.lastPrint
                ? new Date(record.documentControl.lastPrint.printedAt).toLocaleString("ja-JP")
                : "未記録"}
            </dd>
          </div>
          <div>
            <dt className="font-bold text-slate-700">変更履歴</dt>
            <dd>{record.documentControl.history.length}件（最大100件を端末内保持）</dd>
          </div>
        </dl>
      </div>
    </section>
  );

  const printPreviewOverlay = showPrintPreview && (
    <div className="fixed inset-0 z-40 overflow-auto bg-slate-700/70 p-4 print:hidden">
      <div className="mx-auto max-w-[300mm] rounded bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-800">印刷プレビュー（A4横・打合せ書）</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[44px] rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-sky-700"
            >
              {documentState.canPrint
                ? "承認済み版を印刷 / PDF"
                : "下書き・未確認版を印刷"}
            </button>
            <button type="button" onClick={() => setShowPrintPreview(false)} className="min-h-[44px] rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">閉じる</button>
          </div>
        </div>
        <div className="overflow-x-auto rounded border border-slate-200 p-2">
          <MeetingPrintSheet record={record} />
        </div>
      </div>
    </div>
  );

  const bottomActionBar = (
    <div
      className="fixed left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur print:hidden sm:px-4"
      style={{ bottom: "calc(var(--mobile-bottom-nav-h, 0px) + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
        <span className={`min-w-0 flex-1 truncate whitespace-nowrap text-[11px] font-semibold ${isSaved ? "text-emerald-700" : "text-slate-500"}`}>
          {isSaved ? "✓ 保存一覧に保存済み" : savedLabel ? `未保存（${savedLabel}）` : "未保存"}
        </span>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="min-h-[44px] rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:px-7"
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => setShowActions(true)}
            aria-haspopup="menu"
            aria-expanded={showActions}
            aria-label="その他の操作（複製・印刷・点検項目AI）"
            className="min-h-[44px] min-w-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base font-bold leading-none text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:px-4"
          >
            …
          </button>
        </div>
      </div>
    </div>
  );

  const actionsSheet = showActions && (
    <>
      <div className="fixed inset-0 z-[45] bg-slate-900/40 print:hidden" onClick={() => setShowActions(false)} aria-hidden="true" />
      <div
        role="menu"
        aria-label="その他の操作"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[80vh] max-w-lg overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl print:hidden"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-800">その他の操作</p>
          <button type="button" onClick={() => setShowActions(false)} aria-label="閉じる" className="min-h-[44px] rounded-lg px-3 text-lg leading-none text-slate-500 hover:bg-slate-100">×</button>
        </div>

        <p className="mb-1.5 text-[11px] font-bold text-slate-400">記録</p>
        <div className="mb-3 space-y-1.5">
          <button type="button" role="menuitem" onClick={() => runAction(handleCopyLatest)} className="flex min-h-[48px] w-full flex-col items-start justify-center gap-0.5 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-2.5 text-left hover:bg-amber-100">
            <span className="text-sm font-bold text-amber-800">↻ 前回を複製</span>
            <span className="text-[11px] font-normal text-amber-600">前回の打合せ書を翌日分として引き継ぐ</span>
          </button>
          <Link href="/safety-diary/list" role="menuitem" onClick={() => setShowActions(false)} className="flex min-h-[48px] w-full items-center rounded-xl border border-sky-200 bg-white px-4 py-3 text-left text-sm font-semibold text-sky-700 hover:bg-sky-50">
            <FolderOpen className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />保存一覧を開く →
          </Link>
        </div>

        <p className="mb-1.5 text-[11px] font-bold text-slate-400">点検項目</p>
        <div className="mb-3 space-y-1.5">
          <button type="button" role="menuitem" onClick={() => runAction(inferChecklistAll)} className="flex min-h-[48px] w-full flex-col items-start justify-center gap-0.5 rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-2.5 text-left hover:bg-indigo-100">
            <span className="text-sm font-bold text-indigo-800"><Sparkles className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />確認候補を抽出</span>
            <span className="text-[11px] font-normal text-indigo-600">各社の作業内容から確認対象を絞る（点検済みにはしません）</span>
          </button>
          <button type="button" role="menuitem" onClick={() => runAction(resetChecklist)} className="flex min-h-[48px] w-full items-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-600 hover:bg-slate-50">
            公式版の点検項目に戻す
          </button>
        </div>

        <p className="mb-1.5 text-[11px] font-bold text-slate-400">印刷・PDF</p>
        <div className="mb-1 space-y-1.5">
          <button type="button" role="menuitem" onClick={() => runAction(() => setShowPrintPreview(true))} className="flex min-h-[48px] w-full flex-col items-start justify-center gap-0.5 rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-left hover:bg-sky-50">
            <span className="text-sm font-semibold text-sky-700"><Search className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />印刷プレビュー</span>
            <span className="text-[11px] font-normal text-sky-600">A4横の体裁を確認してから印刷</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setShowActions(false);
              handlePrint();
            }}
            className="flex min-h-[48px] w-full items-center rounded-xl bg-sky-600 px-4 py-3 text-left text-sm font-bold text-white hover:bg-sky-700"
          >
            <Printer className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />印刷 / PDF
          </button>
        </div>
      </div>
    </>
  );

  const cloudDisclosure = (
    <section className="mx-auto mt-3 max-w-5xl px-3 print:hidden" aria-labelledby="meeting-cloud-heading">
      <div className="rounded-xl border-2 border-sky-300 bg-sky-50 p-4 text-xs leading-6 text-sky-950">
        <h2 id="meeting-cloud-heading" className="font-bold">保存先：既定はこの端末内／クラウド同期・共有は任意</h2>
        <p>有効にした場合だけ、現場名、日付、各社名、作業・危険・指示、責任者、搬入出、署名等をサイトのサーバー経由で設定済みクラウドへ送り、別端末同期と協力会社共有に使います。氏名、連絡先、病歴、健診結果など不要な個人情報・健康情報は入力しないでください。</p>
        <p>通常データは認証済み所有者向けです。発行した共有リンクはリンクを知る人が利用できるため、必要な相手にだけ渡してください。保持・削除時期はサーバー設定に依存し、同意解除だけでは送信済みデータは削除されません。</p>
        {isMeetingCloudEnabled() ? (
          <button
            type="button"
            onClick={() => {
              if (cloudConsent) {
                revokeCloudConsent();
                setCloudConsent(false);
                setNotice("今後のクラウド通信を停止しました。送信済みデータは自動削除されません。");
              } else if (grantCloudConsent()) {
                setCloudConsent(true);
                setNotice("任意クラウドを有効にしました。以後の保存・共有操作で通信します。");
              }
            }}
            aria-pressed={cloudConsent}
            className="mt-2 min-h-[44px] rounded-lg border border-sky-400 bg-white px-4 py-2 font-bold text-sky-900 hover:bg-sky-100"
          >
            {cloudConsent ? "任意クラウドを停止する" : "説明に同意して任意クラウドを有効にする"}
          </button>
        ) : <p className="mt-2 font-bold">この環境では端末内保存のみです。</p>}
      </div>
    </section>
  );

  // 用紙キャンバスは任意表示。全hooks評価後の分岐＝クラシックUIと状態を
  // 完全共有する（record/自動保存/保存判定がそのまま効く）。?canvas=1 で明示する。
  if (canvasMode) {
    const remaining = emptyPaperFieldKeys.size;
    return (
      <div className="min-h-screen bg-slate-100 pb-20 print:bg-white print:pb-0">
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-3 py-1.5 backdrop-blur print:hidden dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-900">安全工程打合せ書</span>
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={handleZoomToNextEmpty}
                  disabled={!firstEmptyFieldKey}
                  title="最初の未記入セルへズームして開く"
                  className="min-h-[44px] min-w-[44px] rounded-full bg-sky-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  のこり{remaining}項目 →
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasLatest && (
                <button
                  type="button"
                  onClick={handleCopyLatest}
                  title="前回の打合せ書を翌日分として複製（各社の作業・危険・対策を引き継ぎ、日付は翌日・当日記入はクリア）"
                  className="min-h-[44px] min-w-[44px] rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
                >
                  ↻ 前回を複製
                </button>
              )}
              <Link href="/safety-diary/list" className="inline-flex min-h-[44px] min-w-[44px] items-center rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-[11px] font-bold text-sky-800 hover:bg-sky-100">
                保存一覧
              </Link>
              <button
                type="button"
                onClick={() => toggleCanvasMode(false)}
                className="min-h-[44px] min-w-[44px] rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
              >
                アクセシブル入力
              </button>
            </div>
          </div>
        </div>
        {cloudDisclosure}
        {coordinationControl}
        {approvalControl}

        {notice && (
          <div className="mx-auto mt-2 flex max-w-5xl items-start justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 print:hidden">
            <p className="text-sm font-semibold text-emerald-900">{notice}</p>
            <button type="button" onClick={() => setNotice(null)} aria-label="閉じる" className="flex min-h-[44px] items-center rounded px-1.5 text-emerald-700 hover:bg-emerald-100">×</button>
          </div>
        )}

        {/* A4横向き印刷指定（この画面でのみ有効） */}
        <style media="print">{"@page{size:A4 landscape;margin:8mm}"}</style>

        {historyDatalists}

        {/* 協力会社 分散入力 → 元請 自動集約（クラウド設定時のみ表示。クラシックと同一部品） */}
        <div className="mx-auto max-w-5xl px-3 pt-2 print:hidden">
          <DistributedInputBar
            cloudConsent={cloudConsent}
            meetingId={record.id}
            siteName={record.siteName}
            workDate={`${record.workDateYear}-${record.workDateMonth}-${record.workDateDay}`}
            onImport={(merged) => patch({ contractors: merged })}
            contractors={record.contractors}
          />
        </div>

        {/* 用紙キャンバス: 初期表示＝全体フィット。タップで入力、ピンチ/ホイール/ボタンでズーム */}
        <PaperStage ref={stageRef} heightClassName="h-[calc(100dvh-260px)] min-h-[320px] sm:h-[calc(100dvh-210px)]">
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
            suggestBusyId={null}
            onAddChildRow={handleAddChildRow}
            onRemoveRow={handleRemoveRow}
            kyHandoffForRow={kyHandoffFromRow}
          />
        )}

        {/* 印刷経路は従来と同一（正式書式は editing なしの MeetingPrintSheet） */}
        <div className="hidden print:block">
          <MeetingPrintSheet record={record} />
        </div>

        {printPreviewOverlay}
        {bottomActionBar}
        {actionsSheet}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-24 print:pb-0">
      {/* 上部バー */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur print:hidden dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900">安全工程打合せ書・安全衛生指示書</h2>
          <Link href="/safety-diary/list" className="inline-flex min-h-[44px] min-w-[44px] items-center rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-[11px] font-bold text-sky-800 hover:bg-sky-100">保存一覧</Link>
          {hasLatest && (
            <button
              type="button"
              onClick={handleCopyLatest}
              title="前回の打合せ書を翌日分として複製（各社の作業・危険・対策を引き継ぎ、日付は翌日・当日記入はクリア）"
              className="min-h-[44px] min-w-[44px] rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
            >
              ↻ 前回を複製
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 用紙キャンバスは任意の視覚プレビュー。入力の正本はこのHTMLフォーム。 */}
          <button
            type="button"
            onClick={() => toggleCanvasMode(true)}
            title="用紙全体を見ながら入力する任意のプレビューモード"
            className="min-h-[44px] min-w-[44px] rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-[11px] font-bold text-sky-800 hover:bg-sky-100"
          >
            <MapIcon className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />用紙プレビュー（任意）
          </button>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="縮小" onClick={() => setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 10) / 10))} className="min-h-[44px] min-w-[44px] rounded-full px-3 py-1 text-sm font-bold text-slate-700 hover:bg-slate-100">－</button>
            <button type="button" onClick={() => setZoom(1)} className="min-h-[44px] min-w-[3.5rem] rounded-full px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">{Math.round(zoom * 100)}%</button>
            <button type="button" aria-label="拡大" onClick={() => setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 10) / 10))} className="min-h-[44px] min-w-[44px] rounded-full px-3 py-1 text-sm font-bold text-slate-700 hover:bg-slate-100">＋</button>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-2 max-w-5xl px-3 print:hidden lg:sticky lg:top-16 lg:z-10">
        <nav
          aria-label="安全工程打合せ書の6ステップ"
          className="rounded-2xl border-2 border-slate-300 bg-white/95 p-3 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700">
            <span>
              未確認 {meetingSteps.filter((step) => !step.done).length}項目
            </span>
            <span>
              次に行う操作：
              {meetingSteps.find((step) => step.current)?.label ?? "保存・印刷"}
            </span>
          </div>
          <ol className="mt-2 grid grid-cols-3 gap-1.5 lg:grid-cols-6">
            {meetingSteps.map((step, index) => (
              <li key={step.label}>
                <a
                  href={step.href}
                  aria-current={step.current ? "step" : undefined}
                  className={`flex min-h-12 items-center justify-center rounded-lg border px-2 py-2 text-center text-[11px] font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 ${
                    step.done
                      ? "border-emerald-400 bg-emerald-50 text-emerald-950"
                      : step.current
                        ? "border-sky-600 bg-sky-50 text-sky-950 ring-2 ring-sky-400"
                        : "border-slate-300 bg-slate-100 text-slate-700"
                  }`}
                >
                  {index + 1}. {step.label}
                  <span className="sr-only">
                    {step.done ? " 完了" : step.current ? " 現在の手順" : " 未確認"}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>
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
              <a key={m.key} href={m.anchor} className="inline-flex min-h-[44px] items-center rounded-full">
                <StatusBadge tone="neutral" size="sm">{m.label}</StatusBadge>
              </a>
            ))}
        </ConclusionCard>
      </div>
      {cloudDisclosure}
      {coordinationControl}
      {approvalControl}

      {notice && (
        <div className="mx-auto mt-2 flex max-w-5xl items-start justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 print:hidden">
          <p className="text-sm font-semibold text-emerald-900">{notice}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label="閉じる" className="min-h-[44px] min-w-[44px] rounded px-1.5 text-emerald-700 hover:bg-emerald-100">×</button>
        </div>
      )}

      {/* 柱0: 初見の元請担当向け 3ステップ案内は折りたたみへ格納（結論カードが「次にやること」を常時案内するため）。 */}
      <div className="mx-auto mt-2 max-w-5xl px-3 print:hidden">
        <CollapsibleDetail summary="はじめての方へ — 各社の情報を1枚に">
          <ol className="space-y-1">
            <li><span className="font-bold">① 作業日・現場を入力</span></li>
            <li><span className="font-bold">②「＋元請 / ＋1次 …」で協力会社を追加</span>し、各社の作業・使用機械・予想災害・指示を記入</li>
            <li><span className="font-bold">③「保存」→「印刷」</span>で重層下請の危険対策を1枚にまとめ、朝礼・各社へ共有</li>
          </ol>
          <p className="mt-1.5">
            元請が各社の予想災害・指示を1枚に整理します。候補は人が確認・確定し、KYへの転記も承認後に行います。
          </p>
        </CollapsibleDetail>
      </div>

      {/* A4横向き印刷指定（この画面でのみ有効） */}
      <style media="print">{"@page{size:A4 landscape;margin:8mm}"}</style>

      {historyDatalists}

      {/* 用紙本体（編集UI。印刷時は専用A4シートを使うため隠す） */}
      <div className="overflow-x-auto px-2 py-4 print:hidden">
        <div className="mx-auto origin-top space-y-3" style={{ transform: `scale(${zoom})`, width: 980, maxWidth: "100%" }}>
          {/* ヘッダー */}
          <section id="mtg-header" className="scroll-mt-20 rounded-xl border border-slate-300 bg-white p-3">
            <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 sm:grid-cols-4">
              <L label="作業日">
                <div className="flex flex-wrap items-center gap-1">
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
                  <button key={t} type="button" onClick={() => addContractor(t, null)} className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">＋{t}</button>
                ))}
              </div>
            </div>

            {/* 協力会社 分散入力 → 元請 自動集約（クラウド設定時のみ。print:hidden） */}
            <DistributedInputBar
              cloudConsent={cloudConsent}
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
                        <button type="button" onClick={() => setCollapsed((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })} className="min-h-[44px] min-w-[44px] rounded text-xs text-slate-500 hover:bg-slate-200" aria-label="折りたたみ">{collapsed.has(c.id) ? "▶" : "▼"}</button>
                      )}
                      <select value={c.type} onChange={(e) => patchContractor(c.id, { type: e.target.value as ContractorType })} className={`min-h-[44px] min-w-[44px] rounded px-1.5 py-0.5 text-[11px] font-bold ${TYPE_TAG[c.type]}`} aria-label="階層">
                        {CONTRACTOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input value={c.companyName} onChange={(e) => patchContractor(c.id, { companyName: e.target.value })} placeholder="業者名" list="mtg-companies" className={inp + " flex-1 min-w-[8rem]"} aria-label="業者名" />
                      <button type="button" onClick={() => addContractor(nextType(c.type), c.id)} className="min-h-[44px] rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100">＋下位</button>
                      <KyHandoffLink handoff={kyHandoffFromRow(c)} className="flex min-h-[44px] items-center rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100">KYを作成</KyHandoffLink>
                      <button type="button" onClick={() => removeContractor(c.id)} className="min-h-[44px] rounded border border-rose-200 bg-white px-1.5 py-0.5 text-[10px] text-rose-600 hover:bg-rose-50">削除</button>
                    </div>
                    {aiDrafts[c.id] && (
                      <section
                        aria-label="AI提案の確認"
                        className="mb-2 rounded-lg border-2 border-indigo-300 bg-indigo-50 p-3 text-xs text-slate-800"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold text-indigo-900">
                            AI生成の確認候補（未反映）
                          </p>
                          <span className="rounded bg-white px-2 py-1 text-[10px] font-semibold text-indigo-800">
                            {aiDrafts[c.id].source === "gemini" ? "AI生成" : "定型候補"}
                          </span>
                        </div>
                        <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                          <div>
                            <dt className="font-semibold">危険源・予想災害</dt>
                            <dd>{aiDrafts[c.id].disasters.join("、") || "候補なし"}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold">対策・確認方法</dt>
                            <dd>{aiDrafts[c.id].instructions || "候補なし"}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold">リスク候補</dt>
                            <dd>重大性 {aiDrafts[c.id].severity} ／ 可能性 {aiDrafts[c.id].likelihood}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold">資格の確認候補（自動反映しません）</dt>
                            <dd>{aiDrafts[c.id].qualificationCandidates.join("、") || "候補なし・条件を個別確認"}</dd>
                          </div>
                        </dl>
                        <p className="mt-2 text-[11px] text-indigo-900">
                          作業条件と一次資料を人が確認してください。「反映」を押すまで工程書の確定内容は変わりません。
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button type="button" onClick={() => applyAiDraft(c.id)} className="min-h-[44px] rounded-lg bg-indigo-700 px-3 py-2 font-bold text-white hover:bg-indigo-800">
                            内容を確認して反映
                          </button>
                          <button type="button" onClick={() => dismissAiDraft(c.id)} className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-bold text-slate-700 hover:bg-slate-100">
                            候補を破棄
                          </button>
                        </div>
                      </section>
                    )}
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
                <button type="button" onClick={() => patch({ deliveries: [...record.deliveries, emptyDeliveryRow()] })} className="min-h-[44px] rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-50">＋行</button>
              </div>
              <div className="space-y-1.5">
                {record.deliveries.map((d) => (
                  <div key={d.id} className="flex items-center gap-1">
                    <input value={d.item} onChange={(e) => patch({ deliveries: record.deliveries.map((x) => x.id === d.id ? { ...x, item: e.target.value } : x) })} placeholder="物" className={inp + " flex-1"} aria-label="物" />
                    <input value={d.time} onChange={(e) => patch({ deliveries: record.deliveries.map((x) => x.id === d.id ? { ...x, time: e.target.value } : x) })} placeholder="時刻" className={inp + " w-20"} aria-label="時刻" />
                    <input value={d.place} onChange={(e) => patch({ deliveries: record.deliveries.map((x) => x.id === d.id ? { ...x, place: e.target.value } : x) })} placeholder="場所" className={inp + " w-24"} aria-label="場所" />
                    <button type="button" onClick={() => patch({ deliveries: record.deliveries.filter((x) => x.id !== d.id) })} className="min-h-[44px] min-w-[44px] px-1 text-rose-500 hover:text-rose-700" aria-label="削除">×</button>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-slate-300 bg-white p-3">
              <h2 id="supervisor-comment-label" className="mb-2 text-sm font-bold text-slate-800">統括安全責任者コメント</h2>
              <textarea
                value={record.supervisorComment}
                onChange={(e) => patch({ supervisorComment: e.target.value })}
                rows={6}
                aria-labelledby="supervisor-comment-label"
                className={inp + " w-full resize-y"}
              />
            </section>
          </div>

          {/* 点検項目8カテゴリ */}
          <section className="rounded-xl border border-slate-300 bg-white p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-800">点検項目（○=該当・実施 / ×=要是正 / －=該当無）</h2>
              <div className="flex gap-1.5">
                <button type="button" onClick={inferChecklistAll} className="min-h-[44px] rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100">確認候補を抽出</button>
                <button type="button" onClick={resetChecklist} className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">公式版に戻す</button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {record.checklist.map((cat) => (
                <div
                  key={cat.key}
                  className={`rounded-lg border p-2 ${
                    suggestedChecklistCategories.includes(cat.key)
                      ? "border-indigo-400 bg-indigo-50/60"
                      : "border-slate-200"
                  }`}
                >
                  <p className="mb-1 flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
                    <span>{cat.label}</span>
                    {suggestedChecklistCategories.includes(cat.key) && (
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] text-indigo-800">
                        要確認候補
                      </span>
                    )}
                  </p>
                  <ul className="space-y-1">
                    {cat.items.map((it) => (
                      <li key={it.key} className="flex items-center justify-between gap-1">
                        {isCustomItem(it.key) ? (
                          <input value={it.label} onChange={(e) => setChecklistItemLabel(cat.key, it.key, e.target.value)} placeholder="項目名" aria-label="点検項目名" className="min-h-[44px] min-w-0 flex-1 rounded border border-slate-200 px-1 text-[11px]" />
                        ) : (
                          <span className="text-[11px] text-slate-600">{it.label}</span>
                        )}
                        <span className="flex shrink-0 items-center gap-0.5">
                          <Tri value={it.status} onChange={(s) => patch({ checklist: record.checklist.map((cc) => cc.key === cat.key ? { ...cc, items: cc.items.map((ii) => ii.key === it.key ? { ...ii, status: s } : ii) } : cc) })} />
                          {isCustomItem(it.key) && <button type="button" onClick={() => removeChecklistItem(cat.key, it.key)} className="min-h-[44px] min-w-[44px] px-0.5 text-rose-400 hover:text-rose-600" aria-label="項目削除">×</button>}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => addChecklistItem(cat.key)} className="mt-1 min-h-[44px] w-full rounded border border-dashed border-slate-300 py-0.5 text-[10px] text-slate-500 hover:bg-slate-50">＋ 項目を追加</button>
                </div>
              ))}
            </div>
          </section>

          {/* 使用機械リスト（自動集計） */}
          <section className="rounded-xl border border-slate-300 bg-white p-3">
            <h2 className="mb-2 text-sm font-bold text-slate-800">使用機械リスト（自動集計）</h2>
            {machines.length === 0 ? (
              <p className="text-xs text-slate-600">各社の「使用機械」を入力すると自動で集計されます。</p>
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

      {/* 印刷プレビュー・下部操作バー（保存/…）・その他操作シート＝canvas/クラシック共通consts */}
      <span id="mtg-actions" className="block scroll-mt-20" aria-hidden="true" />
      {printPreviewOverlay}
      {bottomActionBar}
      {actionsSheet}
    </div>
  );
}

const inp = "min-h-[44px] rounded border border-slate-300 px-2 py-1 text-xs";

function nextType(t: ContractorType): ContractorType {
  const order: ContractorType[] = ["元請", "1次", "2次", "3次"];
  const i = order.indexOf(t);
  return order[Math.min(i + 1, order.length - 1)]!;
}

/** 各社行 → KY起票。自由文はURLへ載せず、同一originの短期sessionだけで候補として渡す。 */
function kyHandoffFromRow(row: MeetingContractorRow): KyHandoffInput {
  const instrLines = row.safetyInstructions.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  return {
    source: "meeting",
    workDraft: row.workContent,
    hazardDrafts: row.predictedDisasters
      .map((title, index) => ({ id: `meeting-hazard-${index + 1}`, title: title.trim() }))
      .filter((item) => item.title),
    measureDrafts: instrLines.map((text, index) => ({
      id: `meeting-measure-${index + 1}`,
      text,
      level: "administrative" as const,
    })),
  };
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
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} className="min-h-[44px] min-w-[44px] rounded border border-slate-300 px-1 py-1 text-xs">
      {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
    </select>
  );
}

function Tri({ value, onChange }: { value: ChecklistStatus; onChange: (s: ChecklistStatus) => void }) {
  const opts: { s: ChecklistStatus; t: string; on: string }[] = [
    { s: "unreviewed", t: "未", on: "bg-amber-500 text-black" },
    { s: "ok", t: "○", on: "bg-emerald-600 text-white" },
    { s: "ng", t: "×", on: "bg-rose-600 text-white" },
    { s: "na", t: "－", on: "bg-slate-400 text-white" },
  ];
  return (
    <span className="flex gap-0.5">
      {opts.map((o) => (
        <button key={o.s} type="button" onClick={() => onChange(o.s)} className={`min-h-[44px] min-w-[44px] rounded text-[11px] font-bold ${value === o.s ? o.on : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>{o.t}</button>
      ))}
    </span>
  );
}

