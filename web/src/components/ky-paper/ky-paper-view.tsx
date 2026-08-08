"use client";

/**
 * KY全面再設計 Phase 1: 用紙ファーストUI（ベータ / 追加ルート /ky/paper）。
 *
 * 社長要件: 完成KY用紙を最初に表示し、ズームで目視確認、入力箇所は音声/キーボード。
 * 既存 /ky を壊さないため別ルートに追加し、保存先は既存 `ky-record` を共有する
 * （朝礼サイネージ /ky/morning とそのまま連携）。視覚確認はプレビュー環境で要実施。
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { TransientChatLink } from "@/components/home-safety-cockpit/transient-chat-link";
import { TransientChemicalLink } from "@/components/home-safety-cockpit/transient-chemical-link";
import { buildContextPrefill } from "@/lib/chatbot-context-prefill";
import {
  InputWithVoice,
  TextareaWithVoice,
} from "@/components/voice-input-field";
import {
  normalizeKyInstructionRecord,
  makeEmptyKyRiskRow,
} from "@/lib/services/operations-service";
import type {
  KyInstructionParticipant,
  KyInstructionRecordState,
  KyInstructionRiskRow,
} from "@/lib/types/operations";
import {
  yearOptions,
  MONTH_OPTIONS,
  dayOptions,
  temperatureOptions,
  LIKELIHOOD_OPTIONS,
  SEVERITY_OPTIONS,
  evalScore,
  riskGrade,
} from "@/lib/ky/pulldown-options";
import {
  fetchWeatherAutofill,
  WEATHER_REGIONS,
  DEFAULT_WEATHER_REGION,
} from "@/lib/ky/weather-autofill";
import {
  loadWorkers,
  visibleWorkers,
  type Worker,
} from "@/lib/ky/workers-master";
import {
  addParticipants,
  clearParticipants,
  groupWorkersByAffiliation,
} from "@/lib/ky/participant-select";
import { loadLatestKyRecord, copyKyForToday } from "@/lib/ky/copy-latest";
import {
  isKyCloudEnabled,
  isKyCloudAuthorized,
  cloudPullKyRecords,
  cloudPushKyRecord,
  flushKyCloudQueue,
  hasPendingKyCloudSync,
} from "@/lib/ky/storage-adapter";
import {
  grantCloudConsent,
  hasCloudConsent,
  revokeCloudConsent,
} from "@/lib/cloud-consent";
import type {
  KyHazardSuggestion,
  HazardSuggestionResponse,
} from "@/lib/ky/gemini-suggest";
import { parseKySuggestionContext } from "@/lib/ky/suggestion-context";
import { migrateLegacyKyRecord } from "@/lib/ky/storage-migration";
import {
  computeKySyncStatus,
  KY_SYNC_LABEL,
  type KySyncStatus,
} from "@/lib/ky/sync-status";
import { applyKyDeepLink } from "@/lib/ky/deep-link-prefill";
import { detectChemicalWork } from "@/lib/chemical/work-chemical-hints";
import {
  detectAccidentWork,
  accidentsHref,
} from "@/lib/accidents/work-accident-hints";
import { routeByKeywords } from "@/lib/construction-calc/ai-router";
import type { KyRiskDraftFromAccident } from "@/lib/ky/accident-similar";
import { KyPrintSheet } from "@/components/ky-paper/ky-print-sheet";
import type { PaperStageHandle } from "@/components/ky-paper/paper-stage";
import {
  emptyKyPaperFieldKeys,
  firstEmptyKyPaperFieldKey,
  riskFieldKey,
  type KyPaperFieldKey,
} from "@/lib/ky/paper-fields";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";
import { SAFETY_TONE, type SafetyTone } from "@/lib/design/safety-tone";
import {
  computeKyPaperStatus,
  computeKyPaperSteps,
} from "@/lib/ky/paper-status";
import { KyPaperStepNav } from "@/components/ky-paper/ky-paper-step-nav";
import { AutomationServicePromo } from "@/components/automation/automation-service-promo";
import {
  submitKy,
  approveKy,
  rejectKy,
  recordKyPrint,
  isKyLocked,
  DEFAULT_APPROVAL,
  KY_APPROVAL_LABEL,
  type KyApproval,
} from "@/lib/ky/approval";
import { evaluateChatbotSafety } from "@/lib/chatbot-safety";
import {
  KY_RISK_SOURCE_LABELS,
  setKyCandidateConfirmation,
  unconfirmedKyCandidateIndexes,
} from "@/lib/ky/risk-source";
import {
  isKyCleanPrintAllowed,
  kyPrintActionLabel,
  validateKyForTransition,
} from "@/lib/ky/readiness";
import { Mascot } from "@/components/mascot";
import {
  OperationalStatus,
  type OperationalState,
} from "@/components/ui/operational-status";
import {
  CloudDownload,
  Monitor,
  ClipboardCopy,
  Search,
  Printer,
  FlaskConical,
  AlertTriangle,
  MessageSquare,
  Map,
  Sparkles,
  Star,
  RotateCcw,
  Calculator,
} from "lucide-react";

const PaperStage = dynamic(
  () =>
    import("@/components/ky-paper/paper-stage").then((module) => ({
      default: module.PaperStage,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        role="status"
        className="mx-auto flex min-h-[320px] max-w-5xl items-center justify-center rounded-xl border border-slate-300 bg-white p-6 text-sm font-semibold text-slate-700"
      >
        任意の用紙キャンバスを読み込んでいます。印刷用の正本データは端末内に保持されています。
      </div>
    ),
  },
);

const KyAccidentCasesPanel = dynamic(
  () =>
    import("@/components/ky-paper/ky-accident-cases").then(
      (module) => module.KyAccidentCasesPanel,
    ),
  { ssr: false },
);
const KyTranscribePanel = dynamic(
  () =>
    import("@/components/ky-paper/ky-transcribe-panel").then(
      (module) => module.KyTranscribePanel,
    ),
  { ssr: false },
);
const FieldEditorSheet = dynamic(
  () =>
    import("@/components/ky-paper/field-editor-sheet").then(
      (module) => module.FieldEditorSheet,
    ),
  { ssr: false },
);

const AUTOSAVE_KEY = "ky-record";
const ZOOM_MIN = 0.6;
const ZOOM_MAX = 1.6;
const ZOOM_STEP = 0.1;
const DEEP_LINK_KEYS = [
  "preset",
  "template",
  "industry",
  "fromAccident",
  "fromDiary",
  "import",
  "topic",
] as const;

const KY_ADDITIONAL_CONTEXT_FIELDS: Array<{
  key:
    | "heavyEquipment"
    | "plannedPeopleCount"
    | "weather"
    | "simultaneousWork"
    | "newEntrants"
    | "nightWork"
    | "chemicals"
    | "heatStress";
  label: string;
  placeholder: string;
}> = [
  { key: "heavyEquipment", label: "重機", placeholder: "例: 25tラフター／なし" },
  { key: "plannedPeopleCount", label: "作業人数", placeholder: "例: 6人" },
  { key: "weather", label: "天候", placeholder: "例: 晴・32℃" },
  { key: "simultaneousWork", label: "同時作業", placeholder: "例: 南側で塗装／なし" },
  { key: "newEntrants", label: "新規入場者", placeholder: "例: 1人・教育確認済／なし" },
  { key: "nightWork", label: "夜間作業", placeholder: "例: あり・照明確認／なし" },
  { key: "chemicals", label: "化学物質", placeholder: "例: エポキシ樹脂・SDS確認／なし" },
  { key: "heatStress", label: "熱中症条件", placeholder: "例: WBGT確認・休憩30分／該当なし" },
];

// 作業日は SSR（ビルド/リクエスト時）とハイドレーション（実際の閲覧時）で
// new Date() の評価タイミングがずれ React error #418（hydration mismatch）を
// 毎ロード引き起こしていた。初期描画は日付非依存で固定し、マウント後（クライ
// アントのみ）に withTodayWorkDate で「今日」を補う。
function emptyKyRecord(): KyInstructionRecordState {
  const base = normalizeKyInstructionRecord({});
  base.workDateYear = "";
  base.workDateMonth = "";
  base.workDateDay = "";
  base.applicableDate = "";
  return base;
}

function withTodayWorkDate(
  rec: KyInstructionRecordState,
): KyInstructionRecordState {
  const d = new Date();
  return {
    ...rec,
    createdAt: rec.createdAt || d.toISOString(),
    applicableDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    workDateYear: String(d.getFullYear()),
    workDateMonth: String(d.getMonth() + 1),
    workDateDay: String(d.getDate()),
  };
}

export function KyPaperView({
  consultAvailability,
}: {
  consultAvailability: import("@/lib/automation-consult/availability").AutomationConsultAvailability;
}) {
  const [record, setRecord] = useState<KyInstructionRecordState>(emptyKyRecord);
  const activeEmergency = useMemo(() => {
    const decision = evaluateChatbotSafety(JSON.stringify(record));
    return decision?.kind === "emergency" ? decision : null;
  }, [record]);
  const [zoom, setZoom] = useState(1);
  const [region, setRegion] = useState(DEFAULT_WEATHER_REGION);
  const [weatherBusy, setWeatherBusy] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [savedLabel, setSavedLabel] = useState("記入すると自動保存されます");
  // 柱0: 通知も色の文法に乗せる（成功=緑 / 失敗・要対応=黄 / 案内=青）。従来は失敗まで緑だった。
  const [notice, setNoticeState] = useState<{
    text: string;
    tone: SafetyTone;
  } | null>(null);
  const setNotice = useCallback(
    (text: string | null, tone: SafetyTone = "safe") => {
      setNoticeState(text === null ? null : { text, tone });
    },
    [],
  );
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [aiProviderConsent, setAiProviderConsent] = useState(false);
  const [suggestions, setSuggestions] = useState<KyHazardSuggestion[]>([]);
  const [suggestSource, setSuggestSource] = useState<
    "gemini" | "fallback" | null
  >(null);
  const suggestContext = record.context;
  const setSuggestContext = useCallback(
    (
      update: (
        current: KyInstructionRecordState["context"],
      ) => KyInstructionRecordState["context"],
    ) => {
      setRecord((current) => ({
        ...current,
        context: update(current.context),
      }));
    },
    [],
  );
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  // 柱C-9: 操作集中。保存だけを主ボタンに残し、複製/共有/転記/印刷は「…」シートへ退避。
  const [showActions, setShowActions] = useState(false);
  // 柱1是正: 元請Excel様式への転記支援（項目別コピー・表TSV・CSV）
  const [showTranscribe, setShowTranscribe] = useState(false);
  // セマンティックHTMLフォームを既定かつ入力の正本とする。用紙キャンバスは
  // ?canvas=1 で明示的に選ぶ任意の視覚プレビュー。
  const [canvasMode, setCanvasMode] = useState(false);
  const [activeFieldKey, setActiveFieldKey] = useState<KyPaperFieldKey | null>(
    null,
  );
  const [approvalActor, setApprovalActor] = useState("");
  const [approvalComment, setApprovalComment] = useState("");
  // 「前回を複製」を上部にも出すための判定（保存済みKYが端末にあるときだけ）。
  const [hasLatest, setHasLatest] = useState(false);
  const [cloudConsent, setCloudConsent] = useState(false);
  const cloudTransferRef = useRef<"none" | "success" | "failed">("none");
  const [syncStatus, setSyncStatus] = useState<KySyncStatus>(() =>
    computeKySyncStatus({
      cloudEnabled: isKyCloudEnabled(),
      consentGranted: hasCloudConsent(),
      online: true,
      pending: false,
    }),
  );
  const operationalSyncState: OperationalState =
    syncStatus === "offline"
      ? "offline"
      : syncStatus === "failed"
        ? "partial-failure"
        : syncStatus === "pending"
          ? "syncing"
          : syncStatus === "synced"
            ? "synced"
            : "saved";
  const mobileSyncLabel =
    syncStatus === "offline"
      ? "オフライン"
      : syncStatus === "pending"
        ? "未同期"
        : syncStatus === "failed"
          ? "同期失敗"
          : null;

  const refreshSync = useCallback(() => {
    setSyncStatus(
      computeKySyncStatus({
        cloudEnabled: isKyCloudEnabled(),
        consentGranted: hasCloudConsent(),
        online: typeof navigator === "undefined" ? true : navigator.onLine,
        pending: hasPendingKyCloudSync(),
        lastTransfer: cloudTransferRef.current,
      }),
    );
  }, []);

  // P1-D: 同期状態の追従（マウント＋オンライン/オフライン切替）。
  useEffect(() => {
    setCloudConsent(hasCloudConsent());
    refreshSync();
    if (typeof window === "undefined") return;
    window.addEventListener("online", refreshSync);
    window.addEventListener("offline", refreshSync);
    return () => {
      window.removeEventListener("online", refreshSync);
      window.removeEventListener("offline", refreshSync);
    };
  }, [refreshSync]);

  // 柱C-9: 「…」操作シートは Escape で閉じる（user-menu と同じ作法）。
  useEffect(() => {
    if (!showActions) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowActions(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showActions]);

  // 初回読み込み: 旧 /ky の手動保存データを引き継ぎ→自動保存KY→クロスツール連携クエリの順で反映。
  useEffect(() => {
    // Phase 7: 旧 /ky（手動保存キー）→ ky-record の移行（空のときだけ・冪等）。
    migrateLegacyKyRecord();
    let baseRec: KyInstructionRecordState | null = null;
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved)
        baseRec = normalizeKyInstructionRecord(JSON.parse(saved) as unknown);
    } catch {
      /* 壊れていれば初期値のまま */
    }
    // P1-C: 事故DB/プリセット/日誌/AIリスク予測からのクエリ取り込み。
    let params: URLSearchParams | null = null;
    try {
      params = new URLSearchParams(window.location.search);
    } catch {
      params = null;
    }
    // 既定はセマンティックHTML。canvas=1 のときだけ視覚プレビューを開く。
    // Semantic HTML is the fail-safe default. The visual canvas is enabled only by
    // an explicit query parameter so stale client state can never opt a user in.
    setCanvasMode(params?.get("canvas") === "1");
    if (params && DEEP_LINK_KEYS.some((k) => params!.has(k))) {
      const res = applyKyDeepLink(
        params,
        baseRec ?? withTodayWorkDate(emptyKyRecord()),
      );
      setRecord(res.record);
      if (res.notice) setNotice(res.notice, "info");
    } else if (baseRec) {
      setRecord(baseRec);
    } else {
      // 保存データも深リンクも無ければ「今日」を補う（クライアントのみ＝hydration安全）。
      setRecord((prev) => withTodayWorkDate(prev));
    }
    setWorkers(visibleWorkers(loadWorkers()));
    // 保存済みKYがあれば上部にも「前回を複製」を出す（再来訪の最速ルート）。
    setHasLatest(loadLatestKyRecord() !== null);
  }, [setNotice]);

  // Phase 4: クラウド同期（背景・任意）。env 未設定なら何もしない＝従来どおり端末内のみ。
  // ローカルに編集中ドラフトがあれば必ずそれを優先し、空のときだけ別端末の最新を引き継ぐ。
  useEffect(() => {
    if (!isKyCloudAuthorized()) return;
    let cancelled = false;
    void (async () => {
      await flushKyCloudQueue();
      refreshSync();
      let hasLocal = false;
      try {
        hasLocal = Boolean(localStorage.getItem(AUTOSAVE_KEY));
      } catch {
        hasLocal = false;
      }
      if (hasLocal) return;
      const pulled = await cloudPullKyRecords();
      if (!cancelled && pulled?.latest) {
        cloudTransferRef.current = "success";
        setRecord(pulled.latest);
        setNotice("別端末のクラウド保存から最新KYを引き継ぎました。", "info");
        refreshSync();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cloudConsent, refreshSync, setNotice]);

  // 自動保存（1秒デバウンス）— /ky と同じキーへ
  useEffect(() => {
    if (activeEmergency) {
      setNotice(activeEmergency.response, "warning");
      setSavedLabel("緊急表現を検出したため保存していません");
      return;
    }
    const t = setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(record));
        setSavedLabel(`自動保存: ${new Date().toLocaleTimeString("ja-JP")}`);
      } catch {
        /* 容量超過等は無視 */
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [activeEmergency, record, setNotice]);

  const patch = useCallback((p: Partial<KyInstructionRecordState>) => {
    setRecord((prev) => ({ ...prev, ...p }));
  }, []);

  // 柱C-9: 「…」シート内の操作は実行後にシートを閉じる（操作→結果へ視線を戻す）。
  const runAction = useCallback((fn: () => void) => {
    setShowActions(false);
    fn();
  }, []);

  const setRisk = useCallback((i: number, row: KyInstructionRiskRow) => {
    setRecord((prev) => ({
      ...prev,
      riskRows: prev.riskRows.map((r, idx) => (idx === i ? row : r)),
    }));
  }, []);

  // O10（続き）: 危険行の「＋行追加」ホットスポット。追加した行の危険欄をそのまま開く（zoom-to-cellの先取り）。
  const handleAddRiskRow = useCallback(() => {
    const newIndex = record.riskRows.length;
    setRecord((prev) => ({
      ...prev,
      riskRows: [...prev.riskRows, makeEmptyKyRiskRow(prev.riskRows.length)],
    }));
    setActiveFieldKey(riskFieldKey(newIndex, "hazard"));
  }, [record.riskRows.length]);

  const years = useMemo(() => yearOptions(), []);
  const days = useMemo(
    () =>
      dayOptions(
        Number(record.workDateYear) || new Date().getFullYear(),
        Number(record.workDateMonth) || 1,
      ),
    [record.workDateYear, record.workDateMonth],
  );
  const temps = useMemo(() => temperatureOptions(), []);

  const handleWeather = async () => {
    setWeatherBusy(true);
    try {
      const w = await fetchWeatherAutofill(region);
      if (w) {
        patch({ weather: w.weather, temperature: w.temperature });
        setNotice(
          `天気を自動取得しました（${WEATHER_REGIONS.find((r) => r.id === region)?.label ?? ""}: ${w.weather} ${w.temperature}℃）`,
        );
      } else {
        setNotice(
          "天気の自動取得に失敗しました。手動で入力してください。",
          "warning",
        );
      }
    } finally {
      setWeatherBusy(false);
    }
  };

  const handleCopyLatest = () => {
    const latest = loadLatestKyRecord();
    if (!latest) {
      setNotice("複製できる過去のKYが見つかりませんでした。", "warning");
      return;
    }
    setRecord(copyKyForToday(latest));
    setNotice(
      "前回のKYを当日分として複製しました（危険・対策・参加者を引き継ぎ）。",
    );
  };

  const handleSave = async () => {
    if (activeEmergency) {
      setNotice(activeEmergency.response, "warning");
      return;
    }
    // 全機能向けservice factoryは保存操作時だけ読む。初期のsemantic form、
    // local draft復元、自動保存をこの大きい依存で止めない。
    const { createServices } = await import("@/lib/services/service-factory");
    const services = createServices();
    const res = await services.operations.saveKyInstructionRecord(record);
    if (res.ok) {
      setSavedLabel(`保存しました: ${new Date().toLocaleTimeString("ja-JP")}`);
      setNotice(
        cloudConsent
          ? "端末内に保存しました。クラウド同期を確認しています。"
          : "この端末内に保存しました。クラウドへは送信していません。",
      );
      if (cloudConsent) {
        const uploaded = await cloudPushKyRecord(record);
        cloudTransferRef.current = uploaded ? "success" : "failed";
      }
      refreshSync();
    } else {
      setNotice(res.error?.message ?? "保存に失敗しました", "warning");
    }
  };

  // Phase 5: 本物のAI（Gemini）に危険箇所を提案させる。未設定/失敗時はAPI側で擬似AIにフォールバック。
  const handleSuggest = async () => {
    const workContent = record.workRows[0]?.workDetail?.trim() ?? "";
    const operationalContext = {
      workLocation: suggestContext.workLocation,
      equipment: suggestContext.equipment,
      heavyEquipment: suggestContext.heavyEquipment,
      plannedPeopleCount: suggestContext.plannedPeopleCount,
      weather: suggestContext.weather,
      simultaneousWork: suggestContext.simultaneousWork,
      changes: suggestContext.changes,
      newEntrants: suggestContext.newEntrants,
      nightWork: suggestContext.nightWork,
      chemicals: suggestContext.chemicals,
      heatStress: suggestContext.heatStress,
    };
    const emergency = [
      workContent,
      ...Object.values(operationalContext),
    ]
      .map((text) => evaluateChatbotSafety(text))
      .find((decision) => decision?.kind === "emergency");
    if (emergency?.kind === "emergency") {
      setNotice(emergency.response, "warning");
      return;
    }
    const parsedContext = parseKySuggestionContext({
      workContent,
      context: operationalContext,
    });
    if (!parsedContext.context) {
      setNotice(
        `AI候補の前に ${parsedContext.missing.join("・")} を入力してください。「なし」の条件も明示してください。条件不足のまま危険を推定しません。`,
        "warning",
      );
      return;
    }
    if (!aiProviderConsent) {
      setNotice(
        "外部AIへ送る内容を匿名化し、送信確認にチェックしてから実行してください。",
        "warning",
      );
      return;
    }
    setSuggestBusy(true);
    try {
      // 外部AI送信ガードは利用者が明示実行した時だけ読む。初期表示では
      // AI/service群を同梱せず、同意・匿名化・approved corpus境界は維持する。
      const { runClientAiAction } = await import("@/lib/client-ai-action");
      const guardedResponse = await runClientAiAction(
        {
          purpose: "ky-suggestion-client",
          texts: Object.values(parsedContext.context),
          consent: aiProviderConsent,
          maxChars: 4_000,
          contextPolicy: "approved-server-corpus",
        },
        () =>
          fetch("/api/ky/suggest", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              workContent,
              context: operationalContext,
              aiProviderConsent: true,
            }),
          }),
      );
      if (!guardedResponse.sent) {
        setNotice(guardedResponse.decision.message, "warning");
        return;
      }
      const res = guardedResponse.value;
      if (!res.ok) {
        const errorData = (await res.json().catch(() => null)) as {
          missing?: string[];
        } | null;
        setNotice(
          Array.isArray(errorData?.missing)
            ? `不足条件: ${errorData.missing.join("・")}。入力後に再試行してください。`
            : "AI提案の取得に失敗しました。時間をおいて再度お試しください。",
          "warning",
        );
        return;
      }
      const data = (await res.json()) as HazardSuggestionResponse;
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      setSuggestSource(data.source ?? null);
      if (!data.suggestions || data.suggestions.length === 0) {
        setNotice(
          "提案が得られませんでした。作業内容を具体的にすると精度が上がります。",
          "info",
        );
      } else if (data.note) {
        setNotice(data.note, "info");
      }
    } catch {
      setNotice("AI提案の通信に失敗しました。", "warning");
    } finally {
      setSuggestBusy(false);
    }
  };

  // 提案の反映先。targetIndex 指定時（canvas: 危険行エディタから）はその行へ直接、
  // 未指定時（従来UI）は最初の空き危険欄に取り込む（埋まっていれば新しい行を追加）。
  const applySuggestion = (s: KyHazardSuggestion, targetIndex?: number) => {
    setRecord((prev) => {
      const rows = [...prev.riskRows];
      const idx = targetIndex ?? rows.findIndex((r) => !r.hazard.trim());
      const base = idx >= 0 && idx < rows.length ? rows[idx] : undefined;
      if (base) {
        rows[idx] = {
          ...base,
          hazard: s.hazard,
          reduction: s.reduction,
          likelihood: s.likelihood,
          severity: s.severity,
          candidateSource: {
            kind: suggestSource === "gemini" ? "ai" : "rule",
            label: suggestSource === "gemini" ? "AI生成候補" : "定型ルール候補",
            basis: s.basis,
            grounded: s.grounded,
            retrievedExampleIds: s.retrievedExampleIds,
            sourceUrls: s.sourceUrls,
            generatedAt: s.generatedAt,
            requiresHumanReview: true,
          },
          humanConfirmedAt: undefined,
        };
      } else {
        rows.push({
          targetLabel: "+",
          hazard: s.hazard,
          qualNo: "",
          likelihood: s.likelihood,
          severity: s.severity,
          reduction: s.reduction,
          reLikelihood: 1,
          reSeverity: 1,
          reducedBelow2: "",
          primeSign: "",
          candidateSource: {
            kind: suggestSource === "gemini" ? "ai" : "rule",
            label: suggestSource === "gemini" ? "AI生成候補" : "定型ルール候補",
            basis: s.basis,
            grounded: s.grounded,
            retrievedExampleIds: s.retrievedExampleIds,
            sourceUrls: s.sourceUrls,
            generatedAt: s.generatedAt,
            requiresHumanReview: true,
          },
        });
      }
      return { ...prev, riskRows: rows };
    });
    setNotice(
      "提案を危険のポイント欄に反映しました。現場に合わせて加筆・修正してください。",
    );
  };

  // NIQ-REC1: 類似労災事例（実在事例）を危険のポイント欄へ取り込む。空き行を優先し、
  // 埋まっていれば新しい行を追加する（applySuggestion と同じ作法・出所は保有事例DB）。
  const adoptAccidentDraft = useCallback(
    (draft: KyRiskDraftFromAccident) => {
      setRecord((prev) => {
        const rows = [...prev.riskRows];
        const idx = rows.findIndex((r) => !r.hazard.trim());
        const patchRow = {
          hazard: draft.hazard,
          reduction: draft.reduction,
          likelihood: draft.likelihood,
          severity: draft.severity,
          candidateSource: {
            ...draft.source,
            requiresHumanReview: true as const,
          },
          humanConfirmedAt: undefined,
        };
        if (idx >= 0) {
          rows[idx] = { ...rows[idx], ...patchRow };
        } else {
          rows.push({ ...makeEmptyKyRiskRow(rows.length), ...patchRow });
        }
        return { ...prev, riskRows: rows };
      });
      setNotice(
        "類似災害事例を危険のポイントに取り込みました。現場に合わせて加筆・修正してください。",
      );
    },
    [setNotice],
  );

  // P1-D: クラウドの最新KYを取得して現在の内容を置き換える（競合は確認のうえユーザー判断）。
  const handleFetchLatest = async () => {
    if (!cloudConsent || !hasCloudConsent()) {
      setNotice(
        "クラウドから取得する前に、上部の説明を確認して任意クラウドを有効にしてください。",
        "warning",
      );
      return;
    }
    const pulled = await cloudPullKyRecords();
    cloudTransferRef.current = pulled ? "success" : "failed";
    refreshSync();
    if (!pulled?.latest) {
      setNotice("クラウドに保存済みのKYが見つかりませんでした。", "info");
      return;
    }
    if (
      window.confirm(
        "クラウドの最新KYで現在の内容を置き換えますか？（この端末の未保存の変更は失われます）",
      )
    ) {
      setRecord(pulled.latest);
      setNotice("クラウドの最新KYを読み込みました。");
    }
  };

  // P1-B: 元請確認・承認フロー。提出/承認中は編集ロック（差し戻しで編集可）。
  const approval = record.approval ?? DEFAULT_APPROVAL;
  const locked = isKyLocked(approval);
  const unconfirmedCandidateRows = useMemo(
    () => unconfirmedKyCandidateIndexes(record),
    [record],
  );
  const readinessIssues = useMemo(
    () => validateKyForTransition(record),
    [record],
  );
  const applyApproval = (next: KyApproval) => {
    const updated = { ...record, approval: next };
    setRecord(updated);
    if (cloudConsent) {
      void cloudPushKyRecord(updated).then((uploaded) => {
        cloudTransferRef.current = uploaded ? "success" : "failed";
        refreshSync();
      });
    }
  };
  const handleSubmitApproval = () => {
    if (readinessIssues.length > 0) {
      setNotice(
        `提出前に確認が必要です: ${readinessIssues.map((issue) => issue.label).join("・")}`,
        "warning",
      );
      return;
    }
    const result = submitKy(
      record,
      approvalActor || record.foremanName || "職長",
    );
    if (!result.ok) {
      setNotice("現版の提出条件を確認してください。", "warning");
      return;
    }
    applyApproval(result.approval);
    setNotice(
      "元請に提出しました。確認待ちです（提出中は編集ロック）。",
      "info",
    );
  };
  const handleApprove = () => {
    if (readinessIssues.length > 0 || !approvalActor.trim()) {
      setNotice(
        readinessIssues.length > 0
          ? `承認前に確認が必要です: ${readinessIssues.map((issue) => issue.label).join("・")}`
          : "承認者名を入力してください。",
        "warning",
      );
      return;
    }
    const result = approveKy(
      record,
      approvalActor,
      new Date(),
      approvalComment || undefined,
    );
    if (!result.ok) {
      setNotice(
        result.reason === "revision-stale"
          ? "提出後に内容が変更されています。現版を再提出してください。"
          : "現版の承認条件を確認してください。",
        "warning",
      );
      return;
    }
    applyApproval(result.approval);
    setApprovalComment("");
    setNotice("承認しました。");
  };
  const handleReject = () => {
    applyApproval(
      rejectKy(
        approval,
        approvalActor || "元請担当者",
        new Date(),
        approvalComment || undefined,
      ),
    );
    setApprovalComment("");
    setNotice("差し戻しました。編集できるようになりました。", "warning");
  };
  const handlePrint = () => {
    if (!isKyCleanPrintAllowed(record)) {
      window.print();
      setNotice(
        "未承認または未確認のため、「下書き・未確認版」の表示付きで印刷しました。",
        "warning",
      );
      return;
    }
    window.print();
    const lastApprover = [...approval.history]
      .reverse()
      .find((event) => event.action === "approve")?.by;
    const printResult = recordKyPrint(
      record,
      approvalActor || lastApprover || "端末利用者",
      new Date(),
    );
    if (!printResult.ok) {
      setNotice(
        "承認後に内容が変更されています。現版を再承認してから印刷してください。",
        "warning",
      );
      return;
    }
    applyApproval(printResult.approval);
    setNotice(
      "印刷ダイアログ終了時刻を履歴に記録しました。実際に出力された内容は利用者が確認してください。",
      "info",
    );
  };

  const toggleWorker = (w: Worker, checked: boolean) => {
    setRecord((prev) => {
      const exists = prev.participants.some(
        (p) => p.name === w.name && w.name !== "",
      );
      let participants: KyInstructionParticipant[];
      if (checked && !exists) {
        // 空き行があればそこへ、無ければ追加
        const emptyIdx = prev.participants.findIndex((p) => !p.name.trim());
        const entry: KyInstructionParticipant = {
          name: w.name,
          qualNo: w.qualNo,
          preWork: "",
          onExit: "",
        };
        if (emptyIdx >= 0) {
          participants = prev.participants.map((p, i) =>
            i === emptyIdx ? entry : p,
          );
        } else {
          participants = [...prev.participants, entry];
        }
      } else if (!checked && exists) {
        participants = prev.participants.map((p) =>
          p.name === w.name
            ? { name: "", qualNo: "", preWork: "", onExit: "" }
            : p,
        );
      } else {
        participants = prev.participants;
      }
      return { ...prev, participants };
    });
  };

  // よく使う班をワンタップで呼び出す（常用まとめ・協力会社ごと全員）。1人ずつのタップを撲滅。
  const addWorkers = (toAdd: Worker[]) => {
    setRecord((prev) => ({
      ...prev,
      participants: addParticipants(prev.participants, toAdd),
    }));
  };
  const clearMasterWorkers = () => {
    setRecord((prev) => ({
      ...prev,
      participants: clearParticipants(
        prev.participants,
        workers.map((w) => w.name),
      ),
    }));
  };
  const regularWorkers = useMemo(
    () => workers.filter((w) => w.isRegular),
    [workers],
  );
  const workerGroups = useMemo(
    () => groupWorkersByAffiliation(workers),
    [workers],
  );

  const selectedNames = useMemo(
    () =>
      new Set(
        record.participants.filter((p) => p.name.trim()).map((p) => p.name),
      ),
    [record.participants],
  );
  const participantCount = selectedNames.size;
  const visibleRisks = record.riskRows;

  // P0-1（化学物質RA統合）: 作業内容に化学物質を扱う作業（塗装・溶接・洗浄等）が
  // 含まれる場合のみ、化学物質RAへの導線を出す。規制該当の判定はせず、
  // 物質候補はURLへ載せず、同一タブの一時メモリで規制・ばく露注意の確認へ誘導する。
  const chemHint = useMemo(
    () =>
      detectChemicalWork(record.workRows.map((w) => w.workDetail).join(" ")),
    [record.workRows],
  );

  // P1-1（事故DB統合）: 作業内容があれば、類似の労災事例・AI注意喚起（/accidents）へ誘導。
  const accHint = useMemo(
    () =>
      detectAccidentWork(
        record.workRows
          .map((w) => w.workDetail)
          .filter(Boolean)
          .join(" "),
      ),
    [record.workRows],
  );
  // NIQ-REC1: 類似事例カード提示用の作業テキスト（全作業行を結合）。
  const accidentWorkText = useMemo(
    () =>
      record.workRows
        .map((w) => w.workDetail)
        .filter(Boolean)
        .join(" "),
    [record.workRows],
  );

  // 建設計算コーナー統合: 作業内容に玉掛け・足場・掘削・型枠・電線等が含まれる場合、
  // その作業に効く計算機（法令根拠つき）へ誘導する。判定は registry 駆動の
  // routeByKeywords（各計算機の keywords マッチ）＝部隊の新機も自動で候補に入る。
  const calcHint = useMemo(() => {
    const text = record.workRows
      .map((w) => w.workDetail)
      .filter(Boolean)
      .join(" ");
    if (!text.trim()) return undefined;
    const top = routeByKeywords(text)[0];
    // 2文字以上のキーワードが最低1つ当たった（score>=2）確度のみ提示＝弱い一致で誤誘導しない
    return top && top.score >= 2 ? top : undefined;
  }, [record.workRows]);

  // 柱0: 画面最上部の結論カード用の状態（記入の進み具合＋承認フロー）。
  const paperStatus = useMemo(() => computeKyPaperStatus(record), [record]);
  // 柱C-9・A2: 記入の4段（基本情報→危険→対策→確認）進行ナビ。用紙ファーストは不変、用紙の上に進行を可視化。
  const paperSteps = useMemo(() => computeKyPaperSteps(record), [record]);

  // F1: キャンバスβの切替（URLの ?canvas=1 と同期＝リロード/共有しても状態が保てる）。
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
  // F1/O10: 未記入の全欄（キャンバス上のうっすらハイライト用）
  const emptyPaperFieldKeys = useMemo(
    () => emptyKyPaperFieldKeys(record),
    [record],
  );
  // O10（第四弾）: zoom-to-cell。「のこりN」タップで最初の未記入欄へズーム＋そのまま開く
  // （行追加ホットスポットの「そのまま開く」と同じ作法の汎用化）。
  const stageRef = useRef<PaperStageHandle>(null);
  const firstEmptyFieldKey = useMemo(
    () => firstEmptyKyPaperFieldKey(record),
    [record],
  );
  const handleZoomToNextEmpty = useCallback(() => {
    if (!firstEmptyFieldKey) return;
    stageRef.current?.focusField(firstEmptyFieldKey);
    setActiveFieldKey(firstEmptyFieldKey);
  }, [firstEmptyFieldKey]);

  // P1-B: 元請確認・承認パネル。下書き中は記入の邪魔になるので用紙の下に置き、
  // 提出/承認/差し戻し中（actionable）は操作ボタンを見失わないよう用紙の上に置く。
  // O10（第五弾）: canvas/クラシック共通（既定切替でcanvasからも保存・承認・共有・印刷が必須のため）。
  const approvalPanel = (
    <div
      id="ky-approval"
      className="mx-auto mt-3 max-w-5xl scroll-mt-24 px-4 print:hidden"
    >
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">
              元請確認・承認
            </span>
            {/* 柱0: 状態色はトークン経由（承認=緑 / 確認待ち=青 / 差し戻し=要対応の黄） */}
            <StatusBadge
              size="sm"
              tone={
                approval.status === "approved"
                  ? "safe"
                  : approval.status === "submitted"
                    ? "info"
                    : approval.status === "rejected"
                      ? "warning"
                      : "neutral"
              }
            >
              {KY_APPROVAL_LABEL[approval.status]}
            </StatusBadge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(approval.status === "draft" ||
              approval.status === "rejected") && (
              <button
                type="button"
                onClick={handleSubmitApproval}
                disabled={readinessIssues.length > 0}
                className="min-h-[44px] rounded-lg bg-indigo-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                元請に提出
              </button>
            )}
            {(approval.status === "submitted" ||
              approval.status === "approved") && (
              <>
                <input
                  value={approvalActor}
                  onChange={(e) => setApprovalActor(e.target.value)}
                  placeholder="確認者名"
                  aria-label="確認者名"
                  className="w-28 rounded border border-slate-300 px-2 py-1 text-xs"
                />
                <input
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder="コメント(任意)"
                  aria-label="コメント"
                  className="w-40 rounded border border-slate-300 px-2 py-1 text-xs"
                />
                {approval.status === "submitted" && (
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={
                      readinessIssues.length > 0 || !approvalActor.trim()
                    }
                    className="min-h-[44px] rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    承認
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReject}
                  className="min-h-[44px] rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                >
                  差し戻し（編集可に）
                </button>
              </>
            )}
          </div>
        </div>
        {unconfirmedCandidateRows.length > 0 ? (
          <p
            role="alert"
            className="mt-2 rounded border border-amber-500 bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-950"
          >
            AI・事故・定型ルールから取り込んだ未確認候補が
            {unconfirmedCandidateRows.length}
            件あります。各危険行で出所を開き、現場条件と対策を確認するまで提出・承認・正式印刷を保留します。
          </p>
        ) : (
          <p className="mt-2 text-[11px] leading-5 text-slate-600">
            候補の行別確認と全体承認は別の手続です。承認記録は電子署名・本人認証ではありません。
          </p>
        )}
        {readinessIssues.length > 0 ? (
          <div
            role="alert"
            className="mt-2 rounded border border-amber-500 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950"
          >
            <p className="font-bold">提出・承認までに確認する項目</p>
            <ul className="mt-1 list-disc pl-5">
              {readinessIssues.map((issue) => (
                <li key={`${issue.code}-${issue.label}`}>{issue.label}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-2 text-xs font-bold text-emerald-800">
            人手確認済み・承認準備完了
          </p>
        )}
        {locked && (
          <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
            提出/承認中のため編集はロックされています。修正するには「差し戻し」してください。
          </p>
        )}
        {approval.history.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-[11px] text-slate-500">
            {approval.history.slice(-5).map((h, i) => (
              <li key={i}>
                {h.action === "submit"
                  ? "提出"
                  : h.action === "approve"
                    ? "承認"
                    : h.action === "print"
                      ? "印刷ダイアログ終了"
                      : "差し戻し"}
                : {h.by}（{new Date(h.at).toLocaleString("ja-JP")}）
                {h.comment ? `― ${h.comment}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  // 転記支援（画面オーバーレイ。元請Excel様式への貼り付け用）。canvas/クラシック共通。
  const transcribePanel = showTranscribe && (
    <KyTranscribePanel
      record={record}
      onClose={() => setShowTranscribe(false)}
    />
  );

  // 印刷プレビュー（画面オーバーレイ。印刷物には出さない）。canvas/クラシック共通。
  const printPreviewOverlay = showPrintPreview && (
    <div className="fixed inset-0 z-40 overflow-auto bg-slate-700/70 p-4 print:hidden">
      <div className="mx-auto max-w-[210mm] rounded bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-800">
            印刷プレビュー（A4・確認印枠つき）
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[44px] rounded-lg bg-sky-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-sky-900"
            >
              {kyPrintActionLabel(record)}
            </button>
            <button
              type="button"
              onClick={() => setShowPrintPreview(false)}
              className="min-h-[44px] rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              閉じる
            </button>
          </div>
        </div>
        <div className="overflow-x-auto rounded border border-slate-200 p-2">
          <KyPrintSheet record={record} />
        </div>
      </div>
    </div>
  );

  // 柱C-9 操作集中: 下部バーは「保存（主ボタン・solid常設）」＋「…（その他）」の2つだけに絞る。
  // 複製/共有/転記/印刷/連携は「…」シートへ退避し、保存が同格ボタンに埋もれないようにする。
  // canvas/クラシック共通（O10第五弾＝既定切替後もcanvasから保存・共有・印刷・連携に到達できる必要があるため）。
  const bottomActionBar = (
    <div
      className="fixed left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur print:hidden sm:px-4"
      style={{
        bottom:
          "calc(var(--mobile-bottom-nav-h, 0px) + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-[11px] text-slate-500">
          <span
            className={`min-w-0 truncate whitespace-nowrap ${mobileSyncLabel ? "hidden sm:block" : ""}`}
            title={savedLabel}
          >
            {savedLabel}
          </span>
          {mobileSyncLabel ? (
            <span className="min-w-0 shrink sm:hidden">
              <OperationalStatus
                state={operationalSyncState}
                label={mobileSyncLabel}
                compact
              />
            </span>
          ) : null}
          <span className="hidden shrink-0 sm:block">
            <OperationalStatus
              state={operationalSyncState}
              label={KY_SYNC_LABEL[syncStatus]}
              compact
            />
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            className="min-h-[44px] rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:px-7"
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => setShowActions(true)}
            aria-haspopup="menu"
            aria-expanded={showActions}
            aria-label="その他の操作（複製・共有・転記・印刷）"
            className="min-h-[44px] min-w-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base font-bold leading-none text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:px-4"
          >
            …
          </button>
        </div>
      </div>
    </div>
  );

  // 柱C-9: その他の操作シート（複製・共有・転記・印刷・連携）。下から出る・タップしやすい1列。canvas/クラシック共通。
  const actionsSheet = showActions && (
    <>
      <div
        className="fixed inset-0 z-[45] bg-slate-900/40 print:hidden"
        onClick={() => setShowActions(false)}
        aria-hidden="true"
      />
      <div
        role="menu"
        aria-label="その他の操作"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[80vh] max-w-lg overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl print:hidden"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-800">その他の操作</p>
          <button
            type="button"
            onClick={() => setShowActions(false)}
            aria-label="閉じる"
            className="min-h-[44px] rounded-lg px-3 text-lg leading-none text-slate-500 hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        <p className="mb-1.5 text-[11px] font-bold text-slate-600">記録</p>
        <div className="mb-3 space-y-1.5">
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(handleCopyLatest)}
            className="flex min-h-[48px] w-full flex-col items-start justify-center gap-0.5 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-2.5 text-left hover:bg-amber-100"
          >
            <span className="text-sm font-bold text-amber-800">
              <RotateCcw
                className="mr-1 inline h-3.5 w-3.5 align-[-2px]"
                aria-hidden="true"
              />
              前回を複製
            </span>
            <span className="text-[11px] font-normal text-amber-600">
              前回のKYを今日の分として引き継ぐ
            </span>
          </button>
        </div>

        <p className="mb-1.5 text-[11px] font-bold text-slate-600">
          共有・連携
        </p>
        <div className="mb-3 space-y-1.5">
          {isKyCloudEnabled() && (
            <button
              type="button"
              role="menuitem"
              onClick={() => runAction(() => void handleFetchLatest())}
              className="flex min-h-[48px] w-full flex-col items-start justify-center gap-0.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left hover:bg-slate-50"
            >
              <span className="text-sm font-semibold text-slate-700">
                <CloudDownload
                  className="mr-1 inline h-3.5 w-3.5 align-[-2px]"
                  aria-hidden="true"
                />
                クラウド最新取得
              </span>
              <span className="text-[11px] font-normal text-slate-500">
                別端末で保存したKYを読み込む
              </span>
            </button>
          )}
          <Link
            href="/ky/morning"
            role="menuitem"
            onClick={() => setShowActions(false)}
            className="flex min-h-[48px] w-full items-center rounded-xl border border-violet-200 bg-white px-4 py-3 text-left text-sm font-semibold text-violet-700 hover:bg-violet-50"
          >
            <Monitor
              className="mr-1 inline h-3.5 w-3.5 align-[-2px]"
              aria-hidden="true"
            />
            朝礼サイネージへ →
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(() => setShowTranscribe(true))}
            className="flex min-h-[48px] w-full flex-col items-start justify-center gap-0.5 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-left hover:bg-emerald-50"
            title="元請指定のExcel様式へ項目ごとにコピーして貼り付け"
          >
            <span className="text-sm font-semibold text-emerald-700">
              <ClipboardCopy
                className="mr-1 inline h-3.5 w-3.5 align-[-2px]"
                aria-hidden="true"
              />
              Excel転記
            </span>
            <span className="text-[11px] font-normal text-emerald-700">
              元請のExcel様式へ項目ごとにコピー
            </span>
          </button>
        </div>

        <p className="mb-1.5 text-[11px] font-bold text-slate-600">印刷・PDF</p>
        <div className="mb-1 space-y-1.5">
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(() => setShowPrintPreview(true))}
            className="flex min-h-[48px] w-full flex-col items-start justify-center gap-0.5 rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-left hover:bg-sky-50"
          >
            <span className="text-sm font-semibold text-sky-700">
              <Search
                className="mr-1 inline h-3.5 w-3.5 align-[-2px]"
                aria-hidden="true"
              />
              印刷プレビュー
            </span>
            <span className="text-[11px] font-normal text-sky-700">
              A4の体裁を確認してから印刷
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(handlePrint)}
            className="flex min-h-[48px] w-full items-center rounded-xl bg-sky-700 px-4 py-3 text-left text-sm font-bold text-white hover:bg-sky-800"
          >
            <Printer
              className="mr-1 inline h-3.5 w-3.5 align-[-2px]"
              aria-hidden="true"
            />
            {kyPrintActionLabel(record)}
          </button>
        </div>

        {(chemHint.matched ||
          accHint.matched ||
          calcHint ||
          (record.workRows[0]?.workDetail?.trim() ?? "") !== "") && (
          <>
            <p className="mb-1.5 mt-3 text-[11px] font-bold text-slate-600">
              この作業の関連情報
            </p>
            <div className="space-y-1.5">
              {calcHint && (
                <Link
                  href={`/construction-calc/${calcHint.slug}`}
                  role="menuitem"
                  onClick={() => setShowActions(false)}
                  className="flex min-h-[48px] w-full items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-left text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                  title={`この作業に関連する建設計算（${calcHint.title}）を法令根拠つきで計算`}
                >
                  <Calculator
                    className="mr-1 inline h-3.5 w-3.5 align-[-2px]"
                    aria-hidden="true"
                  />
                  {calcHint.title}を計算する →
                </Link>
              )}
              {chemHint.matched && chemHint.suggestedQuery && (
                <TransientChemicalLink
                  query={chemHint.suggestedQuery}
                  role="menuitem"
                  onClick={() => setShowActions(false)}
                  className="flex min-h-[48px] w-full items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-left text-sm font-semibold text-amber-800 hover:bg-amber-100"
                  title={`この作業（${chemHint.keywords.join("・")}）で扱う化学物質の規制・ばく露注意を確認`}
                >
                  <FlaskConical
                    className="mr-1 inline h-3.5 w-3.5 align-[-2px]"
                    aria-hidden="true"
                  />
                  化学物質リスクを見る →
                </TransientChemicalLink>
              )}
              {accHint.matched && (
                <Link
                  href={accidentsHref(accHint)}
                  role="menuitem"
                  onClick={() => setShowActions(false)}
                  className="flex min-h-[48px] w-full items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-left text-sm font-semibold text-rose-700 hover:bg-rose-100"
                  title="この作業の類似労災事例・AI注意喚起を見る"
                >
                  <AlertTriangle
                    className="mr-1 inline h-3.5 w-3.5 align-[-2px]"
                    aria-hidden="true"
                  />
                  類似の労災事例を見る →
                </Link>
              )}
              {/* KY作業本文はURLへ載せず、同一タブの一時メモリだけで渡す。 */}
              {(record.workRows[0]?.workDetail?.trim() ?? "") !== "" && (
                <TransientChatLink
                  question={
                    buildContextPrefill({
                      context: "ky",
                      work: record.workRows[0]?.workDetail,
                    }) ?? "この作業に必要な措置と根拠条文を教えてください。"
                  }
                  role="menuitem"
                  onClick={() => setShowActions(false)}
                  className="flex min-h-[48px] w-full items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 text-left text-sm font-semibold text-blue-700 hover:bg-blue-100"
                  title="この作業の法的根拠・必要な措置をAIチャットに質問"
                >
                  <MessageSquare
                    className="mr-1 inline h-3.5 w-3.5 align-[-2px]"
                    aria-hidden="true"
                  />
                  法的根拠をAIに聞く →
                </TransientChatLink>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );

  const cloudDisclosure = (
    <section
      className="mx-auto mt-3 max-w-5xl px-4 print:hidden"
      aria-labelledby="ky-cloud-disclosure-heading"
    >
      <div className="rounded-xl border-2 border-sky-300 bg-sky-50 p-4 text-xs leading-6 text-sky-950">
        <h2 id="ky-cloud-disclosure-heading" className="font-bold">
          保存先：既定はこの端末内／クラウドは任意
        </h2>
        <p>
          通常の自動保存と「保存」は、このブラウザの端末内ストレージへ行います。任意クラウドを有効にした場合だけ、サイトのサーバーを経由して設定済みクラウド保管先へ送信し、認証済み利用者の別端末同期・共同確認に使用します。短いコードによる匿名共有は再検証中のため停止しています。
        </p>
        <p>
          送信対象には、現場名、作業内容、危険・対策、会社名、参加者名、署名・承認情報が含まれ得ます。氏名、連絡先、病歴、健診結果など不要な個人情報・健康情報は入力しないでください。同期データは認証済み所有者向けです。
        </p>
        <p>
          保持期間と削除時期はサーバー設定に依存します。同意を解除しても送信済みデータは自動削除されません。保存一覧の削除機能と組織の管理手順を使用し、期限を一律に保証する表示には依存しないでください。
        </p>
        {isKyCloudEnabled() ? (
          <button
            type="button"
            onClick={() => {
              if (cloudConsent) {
                revokeCloudConsent();
                setCloudConsent(false);
                cloudTransferRef.current = "none";
                refreshSync();
                setNotice(
                  "今後のクラウド通信を停止しました。送信済みデータは自動削除されません。",
                  "info",
                );
              } else if (grantCloudConsent()) {
                setCloudConsent(true);
                cloudTransferRef.current = "none";
                refreshSync();
                setNotice(
                  "任意クラウドを有効にしました。以後の保存・共有操作で通信します。",
                  "info",
                );
              }
            }}
            aria-pressed={cloudConsent}
            className="mt-2 min-h-[44px] rounded-lg border border-sky-400 bg-white px-4 py-2 font-bold text-sky-900 hover:bg-sky-100"
          >
            {cloudConsent
              ? "任意クラウドを停止する"
              : "説明に同意して任意クラウドを有効にする"}
          </button>
        ) : (
          <p className="mt-2 font-bold">
            この環境ではクラウド機能は設定されていません。端末内保存のみです。
          </p>
        )}
      </div>
    </section>
  );

  // F1: 用紙キャンバス（β）。全hooks評価後の分岐＝クラシックUIと状態を完全共有する
  // （record/自動保存/クラウド同期/承認ロック/深リンクがそのまま効く）。
  if (canvasMode) {
    return (
      <div className="min-h-screen bg-slate-100 pb-28 [&_button]:min-h-[44px] [&_input]:min-h-[44px] [&_select]:min-h-[44px] print:bg-white print:pb-0 print:[&_input]:min-h-0 print:[&_select]:min-h-0">
        {/* コンパクトバー: 用紙が主役なので操作は1行に集約 */}
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-3 py-1.5 backdrop-blur print:hidden dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Mascot
                variant="ky-writing"
                size="xs"
                alt=""
                className="shrink-0"
              />
              <span className="text-sm font-bold text-slate-900">KY用紙</span>
              {paperStatus.remaining !== undefined &&
                paperStatus.remaining > 0 && (
                  <button
                    type="button"
                    onClick={handleZoomToNextEmpty}
                    disabled={!firstEmptyFieldKey}
                    title="最初の未記入セルへズームして開く"
                    className="min-h-[44px] rounded-full bg-sky-800 px-2.5 py-0.5 text-[11px] font-bold text-white hover:bg-sky-900 disabled:opacity-60"
                  >
                    のこり{paperStatus.remaining}項目 →
                  </button>
                )}
              {locked && (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  {KY_APPROVAL_LABEL[approval.status]}・編集ロック中
                </span>
              )}
              {/* O10（第五弾・既定切替）: 従来UIと対称の作業員マスター導線（クラシックUIのみに偏在していた欠落を解消） */}
              <Link
                href="/ky/workers"
                className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
              >
                作業員マスター
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-[11px] text-slate-500 sm:inline">
                {savedLabel}
              </span>
              <Link
                href="/ky/list"
                className="rounded-full border border-sky-300 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800 hover:bg-sky-100"
              >
                保存一覧
              </Link>
              <button
                type="button"
                onClick={() => toggleCanvasMode(false)}
                className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
              >
                アクセシブル入力
              </button>
            </div>
          </div>
        </div>
        {cloudDisclosure}

        {/* O10（第四弾）: 通知バー。従来表示にはあったがキャンバスβでは未提供だった＝
            AI提案のエディタ統合で「先に作業内容を」等の案内が必要になったため追加。 */}
        {notice && (
          <div className="mx-auto mt-2 max-w-5xl px-3 print:hidden">
            <div
              className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2 ${SAFETY_TONE[notice.tone].soft}`}
            >
              <p className="text-xs font-semibold">{notice.text}</p>
              <button
                type="button"
                onClick={() => setNotice(null)}
                aria-label="閉じる"
                className="flex min-h-[44px] items-center rounded px-1.5 hover:bg-black/10"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* O10（第五弾・既定切替）: 提出/承認/差し戻し中は用紙の上に、下書き中は用紙の下に＝クラシックUIと同じ配置規約 */}
        {approval.status !== "draft" && approvalPanel}

        {/* 用紙キャンバス: 初期表示＝全体フィット。タップで入力、ピンチ/ホイール/ボタンでズーム */}
        <PaperStage
          ref={stageRef}
          heightClassName="h-[calc(100dvh-200px)] min-h-[320px] sm:h-[calc(100dvh-150px)]"
        >
          <div className="bg-white p-3">
            <KyPrintSheet
              record={record}
              editing={
                locked
                  ? undefined
                  : {
                      onTapField: (key) => setActiveFieldKey(key),
                      activeKey: activeFieldKey,
                      emptyKeys: emptyPaperFieldKeys,
                      onAddRiskRow: handleAddRiskRow,
                    }
              }
            />
          </div>
        </PaperStage>

        {approval.status === "draft" && approvalPanel}

        {/* NIQ-REC1: 作業内容から保有事故DBの類似実在事例を提示（危険予知の裏取り・ワンタップ取り込み）。 */}
        {!locked && accidentWorkText.trim().length >= 2 && (
          <KyAccidentCasesPanel
            workText={accidentWorkText}
            onAdopt={adoptAccidentDraft}
          />
        )}

        {/* 欄タップで開く入力エディタ（Phase 2: ヘッダー6欄＋本日の作業内容＋4R目標3欄＋危険行＋参加者） */}
        {activeFieldKey && !locked && (
          <FieldEditorSheet
            fieldKey={activeFieldKey}
            record={record}
            patch={patch}
            onClose={() => setActiveFieldKey(null)}
            onSelectField={(key) => setActiveFieldKey(key)}
            weather={{
              region,
              setRegion,
              fetchWeather: () => void handleWeather(),
              busy: weatherBusy,
            }}
            participants={{
              workers,
              regularWorkers,
              workerGroups,
              selectedNames,
              toggleWorker,
              addWorkers,
              clearMasterWorkers,
            }}
            ai={{
              busy: suggestBusy,
              suggestions,
              source: suggestSource,
              onSuggest: () => void handleSuggest(),
              onApply: (s, riskIndex) => applySuggestion(s, riskIndex),
            }}
          />
        )}

        {/* 印刷経路は従来と同一（正式書式は editing なしの KyPrintSheet） */}
        <div className="hidden print:block">
          <KyPrintSheet record={record} />
        </div>

        {/* O10（第五弾・既定切替）: 保存・複製・共有・転記・印刷・連携は既定表示でも必須のためクラシックUIと共通のconstsを表示 */}
        <AutomationServicePromo
          position="ky"
          availability={consultAvailability}
          cta="安全衛生業務の自動化を相談する"
          href="/services/automation#consult-form"
        />
        {transcribePanel}
        {printPreviewOverlay}
        {bottomActionBar}
        {actionsSheet}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-28 [&_button]:min-h-[44px] [&_input]:min-h-[44px] [&_select]:min-h-[44px] print:bg-white print:pb-0 print:[&_input]:min-h-0 print:[&_select]:min-h-0">
      {/* 操作バー（印刷時は隠す） */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur print:hidden dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Mascot
              variant="ky-writing"
              size="xs"
              alt=""
              className="shrink-0"
            />
            <span className="text-sm font-bold text-slate-900">KY用紙</span>
            <Link
              href="/ky/workers"
              className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
            >
              作業員マスター
            </Link>
            <Link
              href="/ky/list"
              className="rounded-full border border-sky-300 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800 hover:bg-sky-100"
            >
              保存一覧
            </Link>
            {hasLatest && (
              <button
                type="button"
                onClick={handleCopyLatest}
                title="前回のKYを当日分として複製（現場・作業・危険・対策・参加者を引き継ぎ、日付は今日に）"
                className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
              >
                <RotateCcw
                  className="mr-1 inline h-3 w-3 align-[-2px]"
                  aria-hidden="true"
                />
                前回を複製
              </button>
            )}
          </div>
          {/* 任意の用紙プレビューへ切り替える。入力の正本はこのHTMLフォーム。 */}
          <button
            type="button"
            onClick={() => toggleCanvasMode(true)}
            title="用紙全体を見ながら入力する任意のプレビューモード"
            className="rounded-full border border-sky-300 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800 hover:bg-sky-100"
          >
            <Map
              className="mr-1 inline h-3.5 w-3.5 align-[-2px]"
              aria-hidden="true"
            />
            用紙プレビュー（任意）
          </button>
          {/* ズーム */}
          <div className="flex items-center gap-1 rounded-full border border-slate-300 bg-white p-0.5">
            <button
              type="button"
              aria-label="縮小"
              onClick={() =>
                setZoom((z) =>
                  Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 10) / 10),
                )
              }
              className="min-h-[44px] min-w-[44px] rounded-full px-3 py-1 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              －
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="min-h-[44px] min-w-[3.5rem] rounded-full px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              aria-label="拡大"
              onClick={() =>
                setZoom((z) =>
                  Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 10) / 10),
                )
              }
              className="min-h-[44px] min-w-[44px] rounded-full px-3 py-1 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              ＋
            </button>
          </div>
        </div>
      </div>

      {/* 5段の進行を先に示し、説明を読まず次の入力先へ移動できるようにする。 */}
      {approval.status === "draft" && (
        <div className="mx-auto mt-3 max-w-5xl px-4 print:hidden">
          <KyPaperStepNav steps={paperSteps} />
        </div>
      )}

      {/* 柱0: 結論カード=いまの状態1メッセージ（記入のこりN=青デカ数字 / 記入完了・承認済=緑 / 差し戻し=黄）。
          次にやること（最初の未記入欄）は action で案内。 */}
      <div className="mx-auto mt-3 max-w-5xl px-4 print:hidden">
        <ConclusionCard
          tone={paperStatus.tone}
          value={paperStatus.remaining}
          unit={paperStatus.remaining !== undefined ? "項目" : undefined}
          title={paperStatus.title}
          action={paperStatus.action ?? undefined}
        />
      </div>

      {cloudDisclosure}

      {notice && (
        <div className="mx-auto mt-3 max-w-5xl px-4 print:hidden">
          <div
            className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-2.5 ${SAFETY_TONE[notice.tone].soft}`}
          >
            <p className="text-sm font-semibold">{notice.text}</p>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="閉じる"
              className="rounded px-1.5 hover:bg-black/10"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* NIQ-REC1: 作業内容から保有事故DBの類似実在事例を提示（危険予知の裏取り・ワンタップ取り込み）。 */}
      {!locked && accidentWorkText.trim().length >= 2 && (
        <KyAccidentCasesPanel
          workText={accidentWorkText}
          onAdopt={adoptAccidentDraft}
        />
      )}

      {/* 柱0: 初見の職長向け 3ステップ案内は折りたたみへ格納（結論カードが「次にやること」を常時案内するため）。 */}
      <div className="mx-auto mt-3 max-w-5xl px-4 print:hidden">
        <CollapsibleDetail summary="はじめての方へ — 3ステップで完成">
          <ol className="space-y-1">
            <li>
              <span className="font-bold">① 現場名と今日の作業を入力</span>
              （音声入力ボタンでも可）
            </li>
            <li>
              <span className="font-bold">② 「AIに危険箇所を提案」</span>
              を押すと、危険と対策が自動で下書きされます
            </li>
            <li>
              <span className="font-bold">③ 「保存」→「印刷プレビュー」</span>
              または<span className="font-bold">「サイネージへ」</span>
              で朝礼の大画面に表示
            </li>
          </ol>
          <p className="mt-1.5">
            紙の様式と違い、AIが危険予知を下書きし、そのまま朝礼サイネージに出せます。入力は自動保存されます。
          </p>
        </CollapsibleDetail>
      </div>

      {/* 元請確認・承認パネル: 提出/承認/差し戻し中のみ用紙の上（操作を見失わないため）。
          下書き中は記入が主役なので用紙の下へ回す（持ち手＝職長がすぐ記入に入れる）。 */}
      {approval.status !== "draft" && approvalPanel}

      {/* 用紙本体（ズーム対象）。印刷時は専用A4シート（下部）を使うため隠す。提出/承認中は inert で編集ロック。 */}
      <div
        className="overflow-x-auto px-2 py-4 print:hidden"
        inert={locked || undefined}
      >
        <div
          className="mx-auto origin-top"
          style={{ transform: `scale(${zoom})`, width: 820, maxWidth: "100%" }}
        >
          <div className="rounded-sm border-2 border-slate-800 bg-white p-4 text-slate-900 shadow-lg print:border print:shadow-none">
            {/* 表題 */}
            <div className="mb-2 flex items-center justify-between border-b-2 border-slate-800 pb-2">
              <h2 className="text-lg font-bold tracking-wide">
                作業前 危険予知活動表（KY）
              </h2>
              <span className="text-xs text-slate-500">4ラウンド法</span>
            </div>

            {/* ヘッダー: 現場名/工事名/職長/日付/天気/気温 */}
            <div className="grid grid-cols-1 gap-2 border-b border-slate-400 pb-3 sm:grid-cols-2">
              <SheetField label="現場名">
                <InputWithVoice
                  value={record.siteName}
                  onChange={(e) => patch({ siteName: e.target.value })}
                  placeholder="例: ○○ビル新築工事"
                />
              </SheetField>
              <SheetField label="工事名・工区">
                <InputWithVoice
                  value={record.projectName}
                  onChange={(e) => patch({ projectName: e.target.value })}
                  placeholder="例: 3工区 躯体"
                />
              </SheetField>
              <SheetField label="職長（リーダー）">
                <InputWithVoice
                  value={record.foremanName}
                  onChange={(e) => patch({ foremanName: e.target.value })}
                  placeholder="氏名"
                />
              </SheetField>
              <SheetField label="元請会社">
                <InputWithVoice
                  value={record.coop1Name}
                  onChange={(e) => patch({ coop1Name: e.target.value })}
                  placeholder="会社名"
                />
              </SheetField>
              <SheetField label="作業日">
                <div className="flex items-center gap-1">
                  <Pulldown
                    ariaLabel="年"
                    value={record.workDateYear}
                    onChange={(v) => patch({ workDateYear: v })}
                    options={years.map((y) => ({
                      value: String(y),
                      label: String(y),
                    }))}
                    minWidthClassName="min-w-14"
                  />
                  <span className="text-xs">年</span>
                  <Pulldown
                    ariaLabel="月"
                    value={record.workDateMonth}
                    onChange={(v) => patch({ workDateMonth: v })}
                    options={MONTH_OPTIONS.map((m) => ({
                      value: String(m),
                      label: String(m),
                    }))}
                    minWidthClassName="min-w-11"
                  />
                  <span className="text-xs">月</span>
                  <Pulldown
                    ariaLabel="日"
                    value={record.workDateDay}
                    onChange={(v) => patch({ workDateDay: v })}
                    options={days.map((d) => ({
                      value: String(d),
                      label: String(d),
                    }))}
                    minWidthClassName="min-w-11"
                  />
                  <span className="text-xs">日</span>
                </div>
              </SheetField>
              <SheetField label="天気・気温（自動取得）">
                <div className="flex flex-wrap items-center gap-1">
                  <select
                    aria-label="地域"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="rounded border border-slate-300 px-1.5 py-1.5 text-xs"
                  >
                    {WEATHER_REGIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleWeather}
                    disabled={weatherBusy}
                    className="min-h-[44px] rounded border border-sky-300 bg-sky-50 px-2 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-100 disabled:opacity-50 print:hidden"
                  >
                    {weatherBusy ? "取得中…" : "自動取得"}
                  </button>
                  <input
                    value={record.weather}
                    onChange={(e) => patch({ weather: e.target.value })}
                    placeholder="天気"
                    className="w-16 rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <Pulldown
                    ariaLabel="気温"
                    value={record.temperature}
                    onChange={(v) => patch({ temperature: v })}
                    options={[
                      { value: "", label: "—" },
                      ...temps.map((t) => ({
                        value: String(t),
                        label: String(t),
                      })),
                    ]}
                  />
                  <span className="text-xs">℃</span>
                </div>
              </SheetField>
            </div>

            {/* 作業内容 */}
            <SheetSection id="ky-work" title="本日の作業内容">
              <TextareaWithVoice
                rows={2}
                value={record.workRows[0]?.workDetail ?? ""}
                onChange={(e) =>
                  setRecord((prev) => ({
                    ...prev,
                    workRows: prev.workRows.map((r, i) =>
                      i === 0 ? { ...r, workDetail: e.target.value } : r,
                    ),
                  }))
                }
                placeholder="今日やる作業（例: 3F鉄骨建方、ボルト本締め）"
                className="text-sm"
              />
            </SheetSection>

            {/* 4R: 危険のポイントと対策（リスクアセスメント） */}
            <SheetSection id="ky-risks" title="危険のポイントと対策（1R〜3R）">
              {/* Phase 5: 本物のAI（Gemini）による危険箇所提案。印刷時は隠す。 */}
              <div className="mb-2 print:hidden">
                <fieldset className="mb-2 rounded-lg border border-slate-300 bg-slate-50 p-3">
                  <legend className="px-1 text-xs font-bold text-slate-800">
                    AI確認候補に使う現場条件（必須）
                  </legend>
                  <p
                    id="ky-ai-context-help"
                    className="mb-2 text-[11px] text-slate-600"
                  >
                    作業・人数・天候と合わせて候補を作ります。入力は外部AI事業者へ送られます。氏名、会社名、現場名、電話番号、メールアドレス、健康情報、案件番号は入力しないでください。
                  </p>
                  <div
                    className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
                    aria-describedby="ky-ai-context-help"
                  >
                    <label className="text-[11px] font-semibold text-slate-700">
                      作業場所
                      <input
                        value={suggestContext.workLocation}
                        onChange={(event) =>
                          setSuggestContext((current) => ({
                            ...current,
                            workLocation: event.target.value,
                            reviewedAt: undefined,
                          }))
                        }
                        placeholder="例: 3階南側"
                        className="mt-1 min-h-[44px] w-full rounded border border-slate-300 bg-white px-2 text-sm"
                      />
                    </label>
                    <label className="text-[11px] font-semibold text-slate-700">
                      設備・機械
                      <input
                        value={suggestContext.equipment}
                        onChange={(event) =>
                          setSuggestContext((current) => ({
                            ...current,
                            equipment: event.target.value,
                            reviewedAt: undefined,
                          }))
                        }
                        placeholder="例: 移動式クレーン"
                        className="mt-1 min-h-[44px] w-full rounded border border-slate-300 bg-white px-2 text-sm"
                      />
                    </label>
                    <label className="text-[11px] font-semibold text-slate-700">
                      前回からの変更点
                      <input
                        value={suggestContext.changes}
                        onChange={(event) =>
                          setSuggestContext((current) => ({
                            ...current,
                            changes: event.target.value,
                            reviewedAt: undefined,
                          }))
                        }
                        placeholder="例: 搬入経路変更／なし"
                        className="mt-1 min-h-[44px] w-full rounded border border-slate-300 bg-white px-2 text-sm"
                      />
                    </label>
                    {KY_ADDITIONAL_CONTEXT_FIELDS.map((field) => (
                      <label
                        key={field.key}
                        className="text-[11px] font-semibold text-slate-700"
                      >
                        {field.label}
                        <input
                          value={suggestContext[field.key]}
                          onChange={(event) =>
                            setSuggestContext((current) => ({
                              ...current,
                              [field.key]: event.target.value,
                              reviewedAt: undefined,
                            }))
                          }
                          placeholder={field.placeholder}
                          className="mt-1 min-h-[44px] w-full rounded border border-slate-300 bg-white px-2 text-sm"
                        />
                      </label>
                    ))}
                    <label className="text-[11px] font-semibold text-slate-700">
                      現場条件の確認者
                      <input
                        value={suggestContext.reviewerName}
                        onChange={(event) =>
                          setSuggestContext((current) => ({
                            ...current,
                            reviewerName: event.target.value,
                            reviewedAt: undefined,
                          }))
                        }
                        placeholder="実際に確認した方の氏名"
                        className="mt-1 min-h-[44px] w-full rounded border border-slate-300 bg-white px-2 text-sm"
                      />
                    </label>
                  </div>
                  <label className="mt-3 flex min-h-[44px] items-center gap-2 text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={Boolean(suggestContext.reviewedAt)}
                      disabled={!suggestContext.reviewerName.trim()}
                      onChange={(event) =>
                        setSuggestContext((current) => ({
                          ...current,
                          reviewedAt: event.target.checked
                            ? new Date().toISOString()
                            : undefined,
                        }))
                      }
                      className="h-5 w-5"
                    />
                    場所・設備・人数・天候・同時作業・変更点等を人が確認しました
                  </label>
                </fieldset>
                <label className="flex min-h-[44px] items-center gap-2 text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={aiProviderConsent}
                    onChange={(event) =>
                      setAiProviderConsent(event.target.checked)
                    }
                    className="h-5 w-5"
                  />
                  入力を匿名化し、候補作成のため外部AIへ送信することを確認しました
                </label>
                <button
                  type="button"
                  onClick={() => void handleSuggest()}
                  disabled={suggestBusy || !aiProviderConsent}
                  className="min-h-[44px] rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-800 hover:bg-indigo-100 disabled:opacity-50"
                >
                  {suggestBusy ? (
                    "AIが分析中…"
                  ) : (
                    <>
                      <Sparkles
                        className="mr-1 inline h-3.5 w-3.5 align-[-2px]"
                        aria-hidden="true"
                      />
                      AIに危険箇所を提案させる
                    </>
                  )}
                </button>
                {suggestSource && suggestions.length > 0 && (
                  <div className="mt-2 space-y-1.5 rounded-lg border border-indigo-200 bg-indigo-50/40 p-2">
                    <p className="text-[11px] font-semibold text-indigo-900">
                      {suggestSource === "gemini"
                        ? "AI生成の確認候補（未反映）"
                        : "定型提案（AI未設定/応答不可のフォールバック）"}
                      ：気になる項目を「反映」で危険欄へ取り込めます
                    </p>
                    {suggestions.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-start justify-between gap-2 rounded border border-indigo-200 bg-white p-1.5"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800">
                            {s.hazard}
                            <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] text-slate-600">
                              評価値{s.evaluation}（{s.riskLabel}）
                            </span>
                            {!s.grounded && (
                              <StatusBadge
                                tone="warning"
                                size="sm"
                                className="ml-1"
                              >
                                出典支持未確認
                              </StatusBadge>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-600">
                            対策: {s.reduction || "—"}
                          </p>
                          {s.basis && (
                            <p className="text-[10px] text-slate-600">
                              根拠: {s.basis}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => applySuggestion(s)}
                          className="shrink-0 rounded border border-indigo-300 bg-white px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50"
                        >
                          反映
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {visibleRisks.map((row, i) => {
                  const score = evalScore(row.likelihood, row.severity);
                  const grade = riskGrade(score);
                  return (
                    <div
                      key={i}
                      className="rounded border border-slate-300 p-2"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {row.targetLabel || i}
                        </span>
                        <StatusBadge
                          size="sm"
                          tone={
                            grade.grade === "high"
                              ? "danger"
                              : grade.grade === "medium"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          評価値 {score}（{grade.label}）
                        </StatusBadge>
                      </div>
                      {row.candidateSource ? (
                        <div className="mb-2 rounded-lg border border-amber-400 bg-amber-50 p-2 text-[11px] leading-5 text-amber-950">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge tone="warning" size="sm">
                              出所:{" "}
                              {KY_RISK_SOURCE_LABELS[row.candidateSource.kind]}
                            </StatusBadge>
                            {row.candidateSource.referenceId ? (
                              <span>
                                参照ID: {row.candidateSource.referenceId}
                              </span>
                            ) : null}
                            {row.candidateSource.referenceUrl ? (
                              <a
                                href={row.candidateSource.referenceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold text-sky-900 underline underline-offset-2"
                              >
                                出典を開く
                              </a>
                            ) : null}
                          </div>
                          {row.candidateSource.basis ? (
                            <p className="mt-1">
                              生成理由: {row.candidateSource.basis}
                            </p>
                          ) : null}
                          <p className="mt-1 font-bold">
                            引用支持:{" "}
                            {row.candidateSource.grounded === true
                              ? "確認済み"
                              : "未確認（候補内容を公式資料が支持するとは限りません）"}
                          </p>
                          {row.candidateSource.retrievedExampleIds?.length ? (
                            <p className="mt-1">
                              参照番号:{" "}
                              {row.candidateSource.retrievedExampleIds.join(
                                ", ",
                              )}
                              （語句検索結果であり主張支持ではありません）
                            </p>
                          ) : null}
                          {row.candidateSource.generatedAt ? (
                            <p className="mt-1">
                              候補生成時刻:{" "}
                              {new Date(
                                row.candidateSource.generatedAt,
                              ).toLocaleString("ja-JP")}
                            </p>
                          ) : null}
                          <label className="mt-1 flex min-h-11 cursor-pointer items-center gap-2 rounded border border-amber-500 bg-white px-2 py-1.5 font-bold">
                            <input
                              type="checkbox"
                              checked={Boolean(row.humanConfirmedAt)}
                              onChange={(event) =>
                                setRisk(
                                  i,
                                  setKyCandidateConfirmation(
                                    row,
                                    event.target.checked,
                                  ),
                                )
                              }
                              className="h-5 w-5"
                            />
                            現場条件・候補内容・対策を人が確認した
                          </label>
                          <p className="mt-1">
                            確認時刻:{" "}
                            {row.humanConfirmedAt
                              ? new Date(row.humanConfirmedAt).toLocaleString(
                                  "ja-JP",
                                )
                              : "未確認。提出・承認・正式印刷を保留"}
                          </p>
                        </div>
                      ) : (
                        <p className="mb-2 text-[11px] font-semibold text-slate-600">
                          出所: 利用者が直接入力（全体の元請確認・承認対象）
                        </p>
                      )}
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        <label className="space-y-0.5">
                          <span className="text-[10px] font-semibold text-rose-700">
                            どんな危険（1R）
                          </span>
                          <TextareaWithVoice
                            rows={2}
                            value={row.hazard}
                            onChange={(e) =>
                              setRisk(i, {
                                ...row,
                                hazard: e.target.value,
                                humanConfirmedAt: undefined,
                              })
                            }
                            className="text-xs"
                          />
                        </label>
                        <label className="space-y-0.5">
                          <span className="text-[10px] font-semibold text-emerald-700">
                            対策（3R）
                          </span>
                          <TextareaWithVoice
                            rows={2}
                            value={row.reduction}
                            onChange={(e) =>
                              setRisk(i, {
                                ...row,
                                reduction: e.target.value,
                                humanConfirmedAt: undefined,
                              })
                            }
                            className="text-xs"
                          />
                        </label>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1 text-[10px] text-slate-600">
                          可能性
                          <Pulldown
                            ariaLabel="可能性"
                            value={String(row.likelihood)}
                            onChange={(v) =>
                              setRisk(i, {
                                ...row,
                                likelihood: Number(v) as 1 | 2 | 3,
                                humanConfirmedAt: undefined,
                              })
                            }
                            options={LIKELIHOOD_OPTIONS.map((o) => ({
                              value: String(o.value),
                              label: o.label,
                            }))}
                          />
                        </label>
                        <label className="flex items-center gap-1 text-[10px] text-slate-600">
                          重大性
                          <Pulldown
                            ariaLabel="重大性"
                            value={String(row.severity)}
                            onChange={(v) =>
                              setRisk(i, {
                                ...row,
                                severity: Number(v) as 1 | 2 | 3,
                                humanConfirmedAt: undefined,
                              })
                            }
                            options={SEVERITY_OPTIONS.map((o) => ({
                              value: String(o.value),
                              label: o.label,
                            }))}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SheetSection>

            {/* 4R: 目標設定 — チーム行動目標・重点実施項目・指差呼称 */}
            <SheetSection id="ky-goal" title="本日の目標（4R）と指差呼称">
              <div className="space-y-2">
                <SheetField label="チーム行動目標（〜しよう）">
                  <TextareaWithVoice
                    rows={2}
                    value={record.teamGoal}
                    onChange={(e) => patch({ teamGoal: e.target.value })}
                    placeholder="例: 高所では必ず親綱に掛けてから移動しよう"
                    className="text-sm"
                  />
                </SheetField>
                <SheetField label="重点実施項目">
                  <TextareaWithVoice
                    rows={2}
                    value={record.priorityItems}
                    onChange={(e) => patch({ priorityItems: e.target.value })}
                    placeholder="今日必ずやること"
                    className="text-sm"
                  />
                </SheetField>
                <SheetField label="指差呼称項目（ヨシ！）">
                  <InputWithVoice
                    value={record.pointingCall}
                    onChange={(e) => patch({ pointingCall: e.target.value })}
                    placeholder="例: 親綱 ヨシ！ 足元 ヨシ！"
                  />
                </SheetField>
              </div>
            </SheetSection>

            {/* 参加者: マスターから選ぶ */}
            <SheetSection
              id="ky-members"
              title={`参加者（${participantCount}名）`}
            >
              {workers.length === 0 ? (
                <p className="text-xs text-slate-500">
                  <Link
                    href="/ky/workers"
                    className="font-semibold text-emerald-700 underline"
                  >
                    作業員マスター
                  </Link>
                  に登録すると、ここでチェックするだけで参加者を選べます。
                </p>
              ) : (
                <div className="print:hidden">
                  {/* ワンタップ呼び出し: 毎朝「いつもの班」を1人ずつ選ぶ手間を撲滅 */}
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {regularWorkers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => addWorkers(regularWorkers)}
                        title="常用（毎日来る）作業員をまとめて参加者に追加します"
                        className="rounded-full border border-amber-400 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100 min-h-[44px]"
                      >
                        <Star
                          className="mr-1 inline h-3.5 w-3.5 align-[-2px]"
                          aria-hidden="true"
                        />
                        常用{regularWorkers.length}名をまとめて選ぶ
                      </button>
                    )}
                    {workerGroups.length > 1 &&
                      workerGroups.map((g) => (
                        <button
                          key={g.affiliation}
                          type="button"
                          onClick={() => addWorkers(g.members)}
                          title={`${g.label}の作業員${g.members.length}名をまとめて追加`}
                          className="rounded-full border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 min-h-[44px]"
                        >
                          {g.label}全員
                        </button>
                      ))}
                    {participantCount > 0 && (
                      <button
                        type="button"
                        onClick={clearMasterWorkers}
                        title="選択した作業員をすべて外す"
                        className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 min-h-[44px]"
                      >
                        クリア
                      </button>
                    )}
                  </div>
                  {/* 個別調整: 所属ごとにまとめて見つけやすく */}
                  <div className="space-y-1.5">
                    {workerGroups.map((g) => (
                      <div
                        key={g.affiliation}
                        className="flex flex-wrap items-center gap-1.5"
                      >
                        {workerGroups.length > 1 && (
                          <span className="w-full text-[11px] font-semibold text-slate-600 sm:w-auto sm:pr-1">
                            {g.label}
                          </span>
                        )}
                        {g.members.map((w) => {
                          const checked = selectedNames.has(w.name);
                          return (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => toggleWorker(w, !checked)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition min-h-[44px] ${checked ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
                            >
                              {checked ? "✓ " : ""}
                              {w.name}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* 印刷・確認用の選択済み氏名一覧 */}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {record.participants
                  .filter((p) => p.name.trim())
                  .map((p, i) => (
                    <span key={i} className="border-b border-slate-400 px-1">
                      {p.name}
                      {p.qualNo ? `（${p.qualNo}）` : ""}
                    </span>
                  ))}
              </div>
            </SheetSection>
          </div>
        </div>
      </div>

      {/* 下書き中の元請提出パネルは、記入を終えた用紙の下に置く（提出は記入の後）。 */}
      {approval.status === "draft" && approvalPanel}

      {/* P1-A: A4印刷用シート（画面では非表示・印刷時のみ描画＝元請提出体裁） */}
      <div className="hidden print:block">
        <KyPrintSheet record={record} />
      </div>

      {/* 転記支援・印刷プレビュー・下部操作バー（保存/…）・その他操作シート＝canvas/クラシック共通consts */}
      <AutomationServicePromo
        position="ky"
        availability={consultAvailability}
        cta="安全衛生業務の自動化を相談する"
        href="/services/automation#consult-form"
      />
      {transcribePanel}
      {printPreviewOverlay}
      {bottomActionBar}
      {actionsSheet}
    </div>
  );
}

function SheetField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-0.5">
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div>{children}</div>
    </label>
  );
}

function SheetSection({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-b border-slate-400 py-3 last:border-b-0"
    >
      <h2 className="mb-2 text-sm font-bold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

function Pulldown({
  value,
  onChange,
  options,
  ariaLabel,
  minWidthClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
  minWidthClassName?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded border border-slate-300 bg-white px-1.5 py-1.5 text-sm ${minWidthClassName ?? ""}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
