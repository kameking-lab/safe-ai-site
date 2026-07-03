"use client";

/**
 * KY全面再設計 Phase 1: 用紙ファーストUI（ベータ / 追加ルート /ky/paper）。
 *
 * 社長要件: 完成KY用紙を最初に表示し、ズームで目視確認、入力箇所は音声/キーボード。
 * 既存 /ky を壊さないため別ルートに追加し、保存先は既存 `ky-record` を共有する
 * （朝礼サイネージ /ky/morning とそのまま連携）。視覚確認はプレビュー環境で要実施。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { InputWithVoice, TextareaWithVoice } from "@/components/voice-input-field";
import { normalizeKyInstructionRecord, makeEmptyKyRiskRow } from "@/lib/services/operations-service";
import { createServices } from "@/lib/services/service-factory";
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
import { loadWorkers, visibleWorkers, type Worker } from "@/lib/ky/workers-master";
import {
  addParticipants,
  clearParticipants,
  groupWorkersByAffiliation,
} from "@/lib/ky/participant-select";
import { loadLatestKyRecord, copyKyForToday } from "@/lib/ky/copy-latest";
import {
  isKyCloudEnabled,
  cloudPullKyRecords,
  cloudPushKyRecord,
  cloudCreateSignageSessionDetailed,
  flushKyCloudQueue,
  hasPendingKyCloudSync,
} from "@/lib/ky/storage-adapter";
import type { KyHazardSuggestion, HazardSuggestionResponse } from "@/lib/ky/gemini-suggest";
import { migrateLegacyKyRecord } from "@/lib/ky/storage-migration";
import { computeKySyncStatus, KY_SYNC_LABEL, type KySyncStatus } from "@/lib/ky/sync-status";
import { applyKyDeepLink } from "@/lib/ky/deep-link-prefill";
import { detectChemicalWork, chemicalRaHref } from "@/lib/chemical/work-chemical-hints";
import { detectAccidentWork, accidentsHref } from "@/lib/accidents/work-accident-hints";
import { KyPrintSheet } from "@/components/ky-paper/ky-print-sheet";
import { KyTranscribePanel } from "@/components/ky-paper/ky-transcribe-panel";
import { PaperStage, type PaperStageHandle } from "@/components/ky-paper/paper-stage";
import { FieldEditorSheet } from "@/components/ky-paper/field-editor-sheet";
import { emptyKyPaperFieldKeys, firstEmptyKyPaperFieldKey, riskFieldKey, type KyPaperFieldKey } from "@/lib/ky/paper-fields";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CollapsibleDetail } from "@/components/ui/collapsible-detail";
import { SAFETY_TONE, type SafetyTone } from "@/lib/design/safety-tone";
import { computeKyPaperStatus, computeKyPaperSteps } from "@/lib/ky/paper-status";
import { KyPaperStepNav } from "@/components/ky-paper/ky-paper-step-nav";
import {
  submitKy,
  approveKy,
  rejectKy,
  isKyLocked,
  DEFAULT_APPROVAL,
  KY_APPROVAL_LABEL,
  type KyApproval,
} from "@/lib/ky/approval";

const AUTOSAVE_KEY = "ky-record";
const ZOOM_MIN = 0.6;
const ZOOM_MAX = 1.6;
const ZOOM_STEP = 0.1;
const DEEP_LINK_KEYS = ["preset", "template", "industry", "fromAccident", "fromDiary", "import"] as const;

// 作業日は SSR（ビルド/リクエスト時）とハイドレーション（実際の閲覧時）で
// new Date() の評価タイミングがずれ React error #418（hydration mismatch）を
// 毎ロード引き起こしていた。初期描画は日付非依存で固定し、マウント後（クライ
// アントのみ）に withTodayWorkDate で「今日」を補う。
function emptyKyRecord(): KyInstructionRecordState {
  const base = normalizeKyInstructionRecord({});
  base.workDateYear = "";
  base.workDateMonth = "";
  base.workDateDay = "";
  return base;
}

function withTodayWorkDate(rec: KyInstructionRecordState): KyInstructionRecordState {
  const d = new Date();
  return {
    ...rec,
    workDateYear: String(d.getFullYear()),
    workDateMonth: String(d.getMonth() + 1),
    workDateDay: String(d.getDate()),
  };
}

export function KyPaperView() {
  const services = useMemo(() => createServices(), []);
  const [record, setRecord] = useState<KyInstructionRecordState>(emptyKyRecord);
  const [zoom, setZoom] = useState(1);
  const [region, setRegion] = useState(DEFAULT_WEATHER_REGION);
  const [weatherBusy, setWeatherBusy] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [savedLabel, setSavedLabel] = useState("記入すると自動保存されます");
  // 柱0: 通知も色の文法に乗せる（成功=緑 / 失敗・要対応=黄 / 案内=青）。従来は失敗まで緑だった。
  const [notice, setNoticeState] = useState<{ text: string; tone: SafetyTone } | null>(null);
  const setNotice = useCallback((text: string | null, tone: SafetyTone = "safe") => {
    setNoticeState(text === null ? null : { text, tone });
  }, []);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<KyHazardSuggestion[]>([]);
  const [suggestSource, setSuggestSource] = useState<"gemini" | "fallback" | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  // 柱C-9: 操作集中。保存だけを主ボタンに残し、複製/共有/転記/印刷は「…」シートへ退避。
  const [showActions, setShowActions] = useState(false);
  // 柱1是正: 元請Excel様式への転記支援（項目別コピー・表TSV・CSV）
  const [showTranscribe, setShowTranscribe] = useState(false);
  // F1（直接操作UI・方式確立）: 用紙キャンバス（β）。?canvas=1 で併存導入し、
  // 「全体俯瞰→ズーム→セルタップ→その場入力」を正式書式そのものの上で行う。
  const [canvasMode, setCanvasMode] = useState(false);
  const [activeFieldKey, setActiveFieldKey] = useState<KyPaperFieldKey | null>(null);
  const [approvalActor, setApprovalActor] = useState("");
  const [approvalComment, setApprovalComment] = useState("");
  // 「前回を複製」を上部にも出すための判定（保存済みKYが端末にあるときだけ）。
  const [hasLatest, setHasLatest] = useState(false);
  const [syncStatus, setSyncStatus] = useState<KySyncStatus>(() =>
    computeKySyncStatus({ cloudEnabled: isKyCloudEnabled(), online: true, pending: false })
  );

  const refreshSync = useCallback(() => {
    setSyncStatus(
      computeKySyncStatus({
        cloudEnabled: isKyCloudEnabled(),
        online: typeof navigator === "undefined" ? true : navigator.onLine,
        pending: hasPendingKyCloudSync(),
      })
    );
  }, []);

  // P1-D: 同期状態の追従（マウント＋オンライン/オフライン切替）。
  useEffect(() => {
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
      if (saved) baseRec = normalizeKyInstructionRecord(JSON.parse(saved) as unknown);
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
    if (params?.get("canvas") === "1") setCanvasMode(true);
    if (params && DEEP_LINK_KEYS.some((k) => params!.has(k))) {
      const res = applyKyDeepLink(params, baseRec ?? withTodayWorkDate(emptyKyRecord()));
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
    if (!isKyCloudEnabled()) return;
    let cancelled = false;
    void (async () => {
      await flushKyCloudQueue();
      let hasLocal = false;
      try {
        hasLocal = Boolean(localStorage.getItem(AUTOSAVE_KEY));
      } catch {
        hasLocal = false;
      }
      if (hasLocal) return;
      const pulled = await cloudPullKyRecords();
      if (!cancelled && pulled?.latest) {
        setRecord(pulled.latest);
        setNotice("別端末のクラウド保存から最新KYを引き継ぎました。", "info");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setNotice]);

  // 自動保存（1秒デバウンス）— /ky と同じキーへ
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(record));
        setSavedLabel(`自動保存: ${new Date().toLocaleTimeString("ja-JP")}`);
      } catch {
        /* 容量超過等は無視 */
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [record]);

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
    setRecord((prev) => ({ ...prev, riskRows: [...prev.riskRows, makeEmptyKyRiskRow(prev.riskRows.length)] }));
    setActiveFieldKey(riskFieldKey(newIndex, "hazard"));
  }, [record.riskRows.length]);

  const years = useMemo(() => yearOptions(), []);
  const days = useMemo(
    () => dayOptions(Number(record.workDateYear) || new Date().getFullYear(), Number(record.workDateMonth) || 1),
    [record.workDateYear, record.workDateMonth]
  );
  const temps = useMemo(() => temperatureOptions(), []);

  const handleWeather = async () => {
    setWeatherBusy(true);
    try {
      const w = await fetchWeatherAutofill(region);
      if (w) {
        patch({ weather: w.weather, temperature: w.temperature });
        setNotice(`天気を自動取得しました（${WEATHER_REGIONS.find((r) => r.id === region)?.label ?? ""}: ${w.weather} ${w.temperature}℃）`);
      } else {
        setNotice("天気の自動取得に失敗しました。手動で入力してください。", "warning");
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
    setNotice("前回のKYを当日分として複製しました（危険・対策・参加者を引き継ぎ）。");
  };

  const handleSave = async () => {
    const res = await services.operations.saveKyInstructionRecord(record);
    if (res.ok) {
      setSavedLabel(`保存しました: ${new Date().toLocaleTimeString("ja-JP")}`);
      setNotice("保存しました。朝礼サイネージ・日誌から参照できます。");
      // Phase 4: 背景でクラウドにも保管（失敗時はキューに退避し次回再送）。
      await cloudPushKyRecord(record);
      refreshSync();
    } else {
      setNotice(res.error?.message ?? "保存に失敗しました", "warning");
    }
  };

  // Phase 5: 本物のAI（Gemini）に危険箇所を提案させる。未設定/失敗時はAPI側で擬似AIにフォールバック。
  const handleSuggest = async () => {
    const workContent = record.workRows[0]?.workDetail?.trim() ?? "";
    if (!workContent) {
      setNotice("先に「本日の作業内容」を入力してください（AI提案の手がかりになります）。", "warning");
      return;
    }
    setSuggestBusy(true);
    try {
      const res = await fetch("/api/ky/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workContent }),
      });
      if (!res.ok) {
        setNotice("AI提案の取得に失敗しました。時間をおいて再度お試しください。", "warning");
        return;
      }
      const data = (await res.json()) as HazardSuggestionResponse;
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      setSuggestSource(data.source ?? null);
      if (!data.suggestions || data.suggestions.length === 0) {
        setNotice("提案が得られませんでした。作業内容を具体的にすると精度が上がります。", "info");
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
        });
      }
      return { ...prev, riskRows: rows };
    });
    setNotice("提案を危険のポイント欄に反映しました。現場に合わせて加筆・修正してください。");
  };

  // Phase 6: 現在のKYを別端末サイネージ用に共有（6桁コード発行）。
  const handleShare = async () => {
    if (!isKyCloudEnabled()) {
      setNotice("クラウド未設定のため別端末共有は使えません。同じ端末なら「サイネージへ」ボタンですぐ表示できます。", "info");
      return;
    }
    setShareBusy(true);
    try {
      // 共有前に保存して内容を確定（保存KYと共有内容を一致させる）。
      await services.operations.saveKyInstructionRecord(record);
      void cloudPushKyRecord(record);
      // R2: 失敗理由まで取得し、原因に応じた正直な案内＋同一端末フォールバックを提示。
      // （クラウド権限障害でも「通信状況を確認」と誤誘導せず、確実に動く代替へ導く）
      const result = await cloudCreateSignageSessionDetailed(record);
      if (result.ok) {
        setShareCode(result.code);
        setNotice(`別端末サイネージ共有コード: ${result.code}（別端末で /ky/morning に入力、または ?code=${result.code}）`);
      } else if (result.reason === "cloud_not_configured") {
        setNotice("クラウド未設定のため別端末共有は使えません。同じ端末なら「サイネージへ」ボタンですぐ表示できます。", "info");
      } else if (result.reason === "server_error") {
        setNotice("別端末共有サーバーが一時的に利用できません（管理者が対応中の可能性）。お急ぎの場合は、同じ端末で「サイネージへ」ボタンを押せばこのKYをすぐ表示できます。", "warning");
      } else if (result.reason === "busy") {
        setNotice("共有コードが混み合っています。少し待って再度「別端末で共有」をお試しください。すぐ表示したい場合は同じ端末の「サイネージへ」をご利用ください。", "warning");
      } else {
        setNotice("共有コードの発行に失敗しました。通信状況をご確認のうえ、もう一度お試しください。同じ端末なら「サイネージへ」ボタンで表示できます。", "warning");
      }
    } finally {
      setShareBusy(false);
    }
  };

  // P1-D: クラウドの最新KYを取得して現在の内容を置き換える（競合は確認のうえユーザー判断）。
  const handleFetchLatest = async () => {
    const pulled = await cloudPullKyRecords();
    refreshSync();
    if (!pulled?.latest) {
      setNotice("クラウドに保存済みのKYが見つかりませんでした。", "info");
      return;
    }
    if (window.confirm("クラウドの最新KYで現在の内容を置き換えますか？（この端末の未保存の変更は失われます）")) {
      setRecord(pulled.latest);
      setNotice("クラウドの最新KYを読み込みました。");
    }
  };

  // P1-B: 元請確認・承認フロー。提出/承認中は編集ロック（差し戻しで編集可）。
  const approval = record.approval ?? DEFAULT_APPROVAL;
  const locked = isKyLocked(approval);
  const applyApproval = (next: KyApproval) => {
    const updated = { ...record, approval: next };
    setRecord(updated);
    void cloudPushKyRecord(updated);
    refreshSync();
  };
  const handleSubmitApproval = () => {
    applyApproval(submitKy(approval, approvalActor || record.foremanName || "職長"));
    setNotice("元請に提出しました。確認待ちです（提出中は編集ロック）。", "info");
  };
  const handleApprove = () => {
    applyApproval(approveKy(approval, approvalActor || "元請担当者", new Date(), approvalComment || undefined));
    setApprovalComment("");
    setNotice("承認しました。");
  };
  const handleReject = () => {
    applyApproval(rejectKy(approval, approvalActor || "元請担当者", new Date(), approvalComment || undefined));
    setApprovalComment("");
    setNotice("差し戻しました。編集できるようになりました。", "warning");
  };

  const toggleWorker = (w: Worker, checked: boolean) => {
    setRecord((prev) => {
      const exists = prev.participants.some((p) => p.name === w.name && w.name !== "");
      let participants: KyInstructionParticipant[];
      if (checked && !exists) {
        // 空き行があればそこへ、無ければ追加
        const emptyIdx = prev.participants.findIndex((p) => !p.name.trim());
        const entry: KyInstructionParticipant = { name: w.name, qualNo: w.qualNo, preWork: "", onExit: "" };
        if (emptyIdx >= 0) {
          participants = prev.participants.map((p, i) => (i === emptyIdx ? entry : p));
        } else {
          participants = [...prev.participants, entry];
        }
      } else if (!checked && exists) {
        participants = prev.participants.map((p) =>
          p.name === w.name ? { name: "", qualNo: "", preWork: "", onExit: "" } : p
        );
      } else {
        participants = prev.participants;
      }
      return { ...prev, participants };
    });
  };

  // よく使う班をワンタップで呼び出す（常用まとめ・協力会社ごと全員）。1人ずつのタップを撲滅。
  const addWorkers = (toAdd: Worker[]) => {
    setRecord((prev) => ({ ...prev, participants: addParticipants(prev.participants, toAdd) }));
  };
  const clearMasterWorkers = () => {
    setRecord((prev) => ({
      ...prev,
      participants: clearParticipants(prev.participants, workers.map((w) => w.name)),
    }));
  };
  const regularWorkers = useMemo(() => workers.filter((w) => w.isRegular), [workers]);
  const workerGroups = useMemo(() => groupWorkersByAffiliation(workers), [workers]);

  const selectedNames = useMemo(
    () => new Set(record.participants.filter((p) => p.name.trim()).map((p) => p.name)),
    [record.participants]
  );
  const participantCount = selectedNames.size;
  const visibleRisks = record.riskRows;

  // P0-1（化学物質RA統合）: 作業内容に化学物質を扱う作業（塗装・溶接・洗浄等）が
  // 含まれる場合のみ、化学物質RAへの導線を出す。規制該当の判定はせず、
  // /chemical-ra?name=... で該当物質の規制・ばく露注意の確認へ誘導する。
  const chemHint = useMemo(
    () => detectChemicalWork(record.workRows.map((w) => w.workDetail).join(" ")),
    [record.workRows]
  );

  // P1-1（事故DB統合）: 作業内容があれば、類似の労災事例・AI注意喚起（/accidents）へ誘導。
  const accHint = useMemo(
    () => detectAccidentWork(record.workRows.map((w) => w.workDetail).filter(Boolean).join(" ")),
    [record.workRows]
  );

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
  const emptyPaperFieldKeys = useMemo(() => emptyKyPaperFieldKeys(record), [record]);
  // O10（第四弾）: zoom-to-cell。「のこりN」タップで最初の未記入欄へズーム＋そのまま開く
  // （行追加ホットスポットの「そのまま開く」と同じ作法の汎用化）。
  const stageRef = useRef<PaperStageHandle>(null);
  const firstEmptyFieldKey = useMemo(() => firstEmptyKyPaperFieldKey(record), [record]);
  const handleZoomToNextEmpty = useCallback(() => {
    if (!firstEmptyFieldKey) return;
    stageRef.current?.focusField(firstEmptyFieldKey);
    setActiveFieldKey(firstEmptyFieldKey);
  }, [firstEmptyFieldKey]);

  // F1: 用紙キャンバス（β）。全hooks評価後の分岐＝クラシックUIと状態を完全共有する
  // （record/自動保存/クラウド同期/承認ロック/深リンクがそのまま効く）。
  if (canvasMode) {
    return (
      <div className="min-h-screen bg-slate-100 pb-24 sm:pb-4 print:bg-white print:pb-0">
        {/* コンパクトバー: 用紙が主役なので操作は1行に集約 */}
        <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-3 py-1.5 backdrop-blur print:hidden">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">KY用紙</span>
              <span className="rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-800">
                キャンバスβ
              </span>
              {paperStatus.remaining !== undefined && paperStatus.remaining > 0 && (
                <button
                  type="button"
                  onClick={handleZoomToNextEmpty}
                  disabled={!firstEmptyFieldKey}
                  title="最初の未記入セルへズームして開く"
                  className="min-h-[28px] rounded-full bg-sky-600 px-2.5 py-0.5 text-[11px] font-bold text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  のこり{paperStatus.remaining}項目 →
                </button>
              )}
              {locked && (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  {KY_APPROVAL_LABEL[approval.status]}・編集ロック中
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-[11px] text-slate-500 sm:inline">{savedLabel}</span>
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
                従来表示
              </button>
            </div>
          </div>
        </div>

        {/* O10（第四弾）: 通知バー。従来表示にはあったがキャンバスβでは未提供だった＝
            AI提案のエディタ統合で「先に作業内容を」等の案内が必要になったため追加。 */}
        {notice && (
          <div className="mx-auto mt-2 max-w-5xl px-3 print:hidden">
            <div className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2 ${SAFETY_TONE[notice.tone].soft}`}>
              <p className="text-xs font-semibold">{notice.text}</p>
              <button type="button" onClick={() => setNotice(null)} aria-label="閉じる" className="rounded px-1.5 hover:bg-black/10">×</button>
            </div>
          </div>
        )}

        {/* 用紙キャンバス: 初期表示＝全体フィット。タップで入力、ピンチ/ホイール/ボタンでズーム */}
        <PaperStage ref={stageRef} heightClassName="h-[calc(100dvh-200px)] min-h-[320px] sm:h-[calc(100dvh-150px)]">
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

        {/* 欄タップで開く入力エディタ（Phase 2: ヘッダー6欄＋本日の作業内容＋4R目標3欄＋危険行＋参加者） */}
        {activeFieldKey && !locked && (
          <FieldEditorSheet
            fieldKey={activeFieldKey}
            record={record}
            patch={patch}
            onClose={() => setActiveFieldKey(null)}
            onSelectField={(key) => setActiveFieldKey(key)}
            weather={{ region, setRegion, fetchWeather: () => void handleWeather(), busy: weatherBusy }}
            participants={{ workers, regularWorkers, workerGroups, selectedNames, toggleWorker, addWorkers, clearMasterWorkers }}
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
      </div>
    );
  }

  // P1-B: 元請確認・承認パネル。下書き中は記入の邪魔になるので用紙の下に置き、
  // 提出/承認/差し戻し中（actionable）は操作ボタンを見失わないよう用紙の上に置く。
  const approvalPanel = (
    <div id="ky-approval" className="mx-auto mt-3 max-w-5xl scroll-mt-24 px-4 print:hidden">
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">元請確認・承認</span>
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
            {(approval.status === "draft" || approval.status === "rejected") && (
              <button type="button" onClick={handleSubmitApproval} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">
                元請に提出
              </button>
            )}
            {(approval.status === "submitted" || approval.status === "approved") && (
              <>
                <input value={approvalActor} onChange={(e) => setApprovalActor(e.target.value)} placeholder="確認者名" aria-label="確認者名" className="w-28 rounded border border-slate-300 px-2 py-1 text-xs" />
                <input value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} placeholder="コメント(任意)" aria-label="コメント" className="w-40 rounded border border-slate-300 px-2 py-1 text-xs" />
                {approval.status === "submitted" && (
                  <button type="button" onClick={handleApprove} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">承認</button>
                )}
                <button type="button" onClick={handleReject} className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">差し戻し（編集可に）</button>
              </>
            )}
          </div>
        </div>
        {locked && (
          <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
            提出/承認中のため編集はロックされています。修正するには「差し戻し」してください。
          </p>
        )}
        {approval.history.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-[11px] text-slate-500">
            {approval.history.slice(-5).map((h, i) => (
              <li key={i}>
                {h.action === "submit" ? "提出" : h.action === "approve" ? "承認" : "差し戻し"}: {h.by}（
                {new Date(h.at).toLocaleString("ja-JP")}）{h.comment ? `― ${h.comment}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 pb-28 print:bg-white print:pb-0">
      {/* 操作バー（印刷時は隠す） */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-900">KY用紙</span>
            <Link href="/ky/workers" className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100">
              作業員マスター
            </Link>
            <Link href="/ky/list" className="rounded-full border border-sky-300 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800 hover:bg-sky-100">
              保存一覧
            </Link>
            {hasLatest && (
              <button
                type="button"
                onClick={handleCopyLatest}
                title="前回のKYを当日分として複製（現場・作業・危険・対策・参加者を引き継ぎ、日付は今日に）"
                className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
              >
                ↻ 前回を複製
              </button>
            )}
          </div>
          {/* F1: 用紙キャンバスβ（全体俯瞰→ズーム→タップ入力）への入口 */}
          <button
            type="button"
            onClick={() => toggleCanvasMode(true)}
            title="用紙全体を1画面で見ながら、タップした欄をその場で入力できる新表示（β）"
            className="rounded-full border border-sky-300 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800 hover:bg-sky-100"
          >
            🗺 キャンバスβ
          </button>
          {/* ズーム */}
          <div className="flex items-center gap-1 rounded-full border border-slate-300 bg-white p-0.5">
            <button type="button" aria-label="縮小" onClick={() => setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 10) / 10))} className="rounded-full px-3 py-1 text-sm font-bold text-slate-700 hover:bg-slate-100">－</button>
            <button type="button" onClick={() => setZoom(1)} className="min-w-[3.5rem] rounded-full px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">{Math.round(zoom * 100)}%</button>
            <button type="button" aria-label="拡大" onClick={() => setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 10) / 10))} className="rounded-full px-3 py-1 text-sm font-bold text-slate-700 hover:bg-slate-100">＋</button>
          </div>
        </div>
      </div>

      {/* 柱0: 結論カード=いまの状態1メッセージ（記入のこりN=青デカ数字 / 記入完了・承認済=緑 / 差し戻し=黄）。
          次にやること（最初の未記入欄）は action で案内。個別の未記入項目は下の進行ナビ（4段）で案内する。 */}
      <div className="mx-auto mt-3 max-w-5xl px-4 print:hidden">
        <ConclusionCard
          tone={paperStatus.tone}
          value={paperStatus.remaining}
          unit={paperStatus.remaining !== undefined ? "項目" : undefined}
          title={paperStatus.title}
          action={paperStatus.action ?? undefined}
        />
      </div>

      {/* 柱C-9・A2: 記入の進行ナビ（基本情報→危険→対策→確認）。記入中（下書き）だけ出す。
          結論カードの「記入のこりN」と整合（全段の remaining 合計＝結論カードのN）。
          用紙ファースト設計は不変＝下に完成用紙をそのまま表示する。 */}
      {approval.status === "draft" && (
        <div className="mx-auto mt-3 max-w-5xl px-4 print:hidden">
          <KyPaperStepNav steps={paperSteps} />
        </div>
      )}

      {notice && (
        <div className="mx-auto mt-3 max-w-5xl px-4 print:hidden">
          <div className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-2.5 ${SAFETY_TONE[notice.tone].soft}`}>
            <p className="text-sm font-semibold">{notice.text}</p>
            <button type="button" onClick={() => setNotice(null)} aria-label="閉じる" className="rounded px-1.5 hover:bg-black/10">×</button>
          </div>
        </div>
      )}

      {/* 柱0: 初見の職長向け 3ステップ案内は折りたたみへ格納（結論カードが「次にやること」を常時案内するため）。 */}
      <div className="mx-auto mt-3 max-w-5xl px-4 print:hidden">
        <CollapsibleDetail summary="はじめての方へ — 3ステップで完成">
          <ol className="space-y-1">
            <li><span className="font-bold">① 現場名と今日の作業を入力</span>（音声入力ボタンでも可）</li>
            <li><span className="font-bold">② 「🤖 AIに危険箇所を提案」</span>を押すと、危険と対策が自動で下書きされます</li>
            <li><span className="font-bold">③ 「保存」→「印刷プレビュー」</span>または<span className="font-bold">「サイネージへ」</span>で朝礼の大画面に表示</li>
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
      <div className="overflow-x-auto px-2 py-4 print:hidden" inert={locked || undefined}>
        <div
          className="mx-auto origin-top"
          style={{ transform: `scale(${zoom})`, width: 820, maxWidth: "100%" }}
        >
          <div className="rounded-sm border-2 border-slate-800 bg-white p-4 text-slate-900 shadow-lg print:border print:shadow-none">
            {/* 表題 */}
            <div className="mb-2 flex items-center justify-between border-b-2 border-slate-800 pb-2">
              <h1 className="text-lg font-bold tracking-wide">作業前 危険予知活動表（KY）</h1>
              <span className="text-xs text-slate-500">4ラウンド法</span>
            </div>

            {/* ヘッダー: 現場名/工事名/職長/日付/天気/気温 */}
            <div className="grid grid-cols-1 gap-2 border-b border-slate-400 pb-3 sm:grid-cols-2">
              <SheetField label="現場名">
                <InputWithVoice value={record.siteName} onChange={(e) => patch({ siteName: e.target.value })} placeholder="例: ○○ビル新築工事" />
              </SheetField>
              <SheetField label="工事名・工区">
                <InputWithVoice value={record.projectName} onChange={(e) => patch({ projectName: e.target.value })} placeholder="例: 3工区 躯体" />
              </SheetField>
              <SheetField label="職長（リーダー）">
                <InputWithVoice value={record.foremanName} onChange={(e) => patch({ foremanName: e.target.value })} placeholder="氏名" />
              </SheetField>
              <SheetField label="元請会社">
                <InputWithVoice value={record.coop1Name} onChange={(e) => patch({ coop1Name: e.target.value })} placeholder="会社名" />
              </SheetField>
              <SheetField label="作業日">
                <div className="flex items-center gap-1">
                  <Pulldown ariaLabel="年" value={record.workDateYear} onChange={(v) => patch({ workDateYear: v })} options={years.map((y) => ({ value: String(y), label: String(y) }))} minWidthClassName="min-w-14" />
                  <span className="text-xs">年</span>
                  <Pulldown ariaLabel="月" value={record.workDateMonth} onChange={(v) => patch({ workDateMonth: v })} options={MONTH_OPTIONS.map((m) => ({ value: String(m), label: String(m) }))} minWidthClassName="min-w-11" />
                  <span className="text-xs">月</span>
                  <Pulldown ariaLabel="日" value={record.workDateDay} onChange={(v) => patch({ workDateDay: v })} options={days.map((d) => ({ value: String(d), label: String(d) }))} minWidthClassName="min-w-11" />
                  <span className="text-xs">日</span>
                </div>
              </SheetField>
              <SheetField label="天気・気温（自動取得）">
                <div className="flex flex-wrap items-center gap-1">
                  <select aria-label="地域" value={region} onChange={(e) => setRegion(e.target.value)} className="rounded border border-slate-300 px-1.5 py-1.5 text-xs">
                    {WEATHER_REGIONS.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                  <button type="button" onClick={handleWeather} disabled={weatherBusy} className="rounded border border-sky-300 bg-sky-50 px-2 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-100 disabled:opacity-50 print:hidden">
                    {weatherBusy ? "取得中…" : "自動取得"}
                  </button>
                  <input value={record.weather} onChange={(e) => patch({ weather: e.target.value })} placeholder="天気" className="w-16 rounded border border-slate-300 px-2 py-1.5 text-sm" />
                  <Pulldown ariaLabel="気温" value={record.temperature} onChange={(v) => patch({ temperature: v })} options={[{ value: "", label: "—" }, ...temps.map((t) => ({ value: String(t), label: String(t) }))]} />
                  <span className="text-xs">℃</span>
                </div>
              </SheetField>
            </div>

            {/* 作業内容 */}
            <SheetSection id="ky-work" title="本日の作業内容">
              <TextareaWithVoice rows={2} value={record.workRows[0]?.workDetail ?? ""} onChange={(e) => setRecord((prev) => ({ ...prev, workRows: prev.workRows.map((r, i) => (i === 0 ? { ...r, workDetail: e.target.value } : r)) }))} placeholder="今日やる作業（例: 3F鉄骨建方、ボルト本締め）" className="text-sm" />
            </SheetSection>

            {/* 4R: 危険のポイントと対策（リスクアセスメント） */}
            <SheetSection id="ky-risks" title="危険のポイントと対策（1R〜3R）">
              {/* Phase 5: 本物のAI（Gemini）による危険箇所提案。印刷時は隠す。 */}
              <div className="mb-2 print:hidden">
                <button
                  type="button"
                  onClick={() => void handleSuggest()}
                  disabled={suggestBusy}
                  className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-800 hover:bg-indigo-100 disabled:opacity-50"
                >
                  {suggestBusy ? "AIが分析中…" : "🤖 AIに危険箇所を提案させる"}
                </button>
                {suggestSource && suggestions.length > 0 && (
                  <div className="mt-2 space-y-1.5 rounded-lg border border-indigo-200 bg-indigo-50/40 p-2">
                    <p className="text-[11px] font-semibold text-indigo-900">
                      {suggestSource === "gemini"
                        ? "本物のAI（Gemini）の提案"
                        : "定型提案（AI未設定/応答不可のフォールバック）"}
                      ：気になる項目を「反映」で危険欄へ取り込めます
                    </p>
                    {suggestions.map((s, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 rounded border border-indigo-200 bg-white p-1.5">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800">
                            {s.hazard}
                            <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] text-slate-600">
                              評価値{s.evaluation}（{s.riskLabel}）
                            </span>
                            {!s.grounded && (
                              <StatusBadge tone="warning" size="sm" className="ml-1">要確認</StatusBadge>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-600">対策: {s.reduction || "—"}</p>
                          {s.basis && <p className="text-[10px] text-slate-400">根拠: {s.basis}</p>}
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
                    <div key={i} className="rounded border border-slate-300 p-2">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-white">{row.targetLabel || i}</span>
                        <StatusBadge
                          size="sm"
                          tone={grade.grade === "high" ? "danger" : grade.grade === "medium" ? "warning" : "neutral"}
                        >
                          評価値 {score}（{grade.label}）
                        </StatusBadge>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        <label className="space-y-0.5">
                          <span className="text-[10px] font-semibold text-rose-700">どんな危険（1R）</span>
                          <TextareaWithVoice rows={2} value={row.hazard} onChange={(e) => setRisk(i, { ...row, hazard: e.target.value })} className="text-xs" />
                        </label>
                        <label className="space-y-0.5">
                          <span className="text-[10px] font-semibold text-emerald-700">対策（3R）</span>
                          <TextareaWithVoice rows={2} value={row.reduction} onChange={(e) => setRisk(i, { ...row, reduction: e.target.value })} className="text-xs" />
                        </label>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1 text-[10px] text-slate-600">
                          可能性
                          <Pulldown ariaLabel="可能性" value={String(row.likelihood)} onChange={(v) => setRisk(i, { ...row, likelihood: (Number(v) as 1 | 2 | 3) })} options={LIKELIHOOD_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))} />
                        </label>
                        <label className="flex items-center gap-1 text-[10px] text-slate-600">
                          重大性
                          <Pulldown ariaLabel="重大性" value={String(row.severity)} onChange={(v) => setRisk(i, { ...row, severity: (Number(v) as 1 | 2 | 3) })} options={SEVERITY_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))} />
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
                  <TextareaWithVoice rows={2} value={record.teamGoal} onChange={(e) => patch({ teamGoal: e.target.value })} placeholder="例: 高所では必ず親綱に掛けてから移動しよう" className="text-sm" />
                </SheetField>
                <SheetField label="重点実施項目">
                  <TextareaWithVoice rows={2} value={record.priorityItems} onChange={(e) => patch({ priorityItems: e.target.value })} placeholder="今日必ずやること" className="text-sm" />
                </SheetField>
                <SheetField label="指差呼称項目（ヨシ！）">
                  <InputWithVoice value={record.pointingCall} onChange={(e) => patch({ pointingCall: e.target.value })} placeholder="例: 親綱 ヨシ！ 足元 ヨシ！" />
                </SheetField>
              </div>
            </SheetSection>

            {/* 参加者: マスターから選ぶ */}
            <SheetSection id="ky-members" title={`参加者（${participantCount}名）`}>
              {workers.length === 0 ? (
                <p className="text-xs text-slate-500">
                  <Link href="/ky/workers" className="font-semibold text-emerald-700 underline">作業員マスター</Link>
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
                        ⭐ 常用{regularWorkers.length}名をまとめて選ぶ
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
                      <div key={g.affiliation} className="flex flex-wrap items-center gap-1.5">
                        {workerGroups.length > 1 && (
                          <span className="w-full text-[11px] font-semibold text-slate-400 sm:w-auto sm:pr-1">
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
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition min-h-[44px] ${checked ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
                            >
                              {checked ? "✓ " : ""}{w.name}
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
                {record.participants.filter((p) => p.name.trim()).map((p, i) => (
                  <span key={i} className="border-b border-slate-400 px-1">{p.name}{p.qualNo ? `（${p.qualNo}）` : ""}</span>
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

      {/* 転記支援（画面オーバーレイ。元請Excel様式への貼り付け用） */}
      {showTranscribe && <KyTranscribePanel record={record} onClose={() => setShowTranscribe(false)} />}

      {/* 印刷プレビュー（画面オーバーレイ。印刷物には出さない） */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-40 overflow-auto bg-slate-700/70 p-4 print:hidden">
          <div className="mx-auto max-w-[210mm] rounded bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">印刷プレビュー（A4・確認印枠つき）</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => window.print()} className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-sky-700">印刷 / PDF</button>
                <button type="button" onClick={() => setShowPrintPreview(false)} className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">閉じる</button>
              </div>
            </div>
            <div className="overflow-x-auto rounded border border-slate-200 p-2">
              <KyPrintSheet record={record} />
            </div>
          </div>
        </div>
      )}

      {/* 柱C-9 操作集中: 下部バーは「保存（主ボタン・solid常設）」＋「…（その他）」の2つだけに絞る。
          複製/共有/転記/印刷/連携は「…」シートへ退避し、保存が同格ボタンに埋もれないようにする。 */}
      {/* モバイルの全画面共通ボトムナビ(z-40・≤480px)の上に重ねる。--mobile-bottom-nav-h は
          デスクトップで 0px のため、PCでは従来どおり画面最下部に固定される。 */}
      <div
        className="fixed left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur print:hidden"
        style={{ bottom: "calc(var(--mobile-bottom-nav-h, 0px) + env(safe-area-inset-bottom, 0px))" }}
      >
        {/* モバイルは全画面共通の共有FAB(右下・z-30)があるため右端を空ける。PC(sm)はFABが画面端で
            中央寄せの本バーと重ならないため余白不要。 */}
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 pr-16 sm:pr-0">
          <span className="min-w-0 truncate text-[11px] text-slate-500">
            {savedLabel}
            <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">{KY_SYNC_LABEL[syncStatus]}</span>
            {shareCode && (
              <span className="ml-2 rounded bg-violet-100 px-2 py-0.5 font-bold text-violet-800">共有コード {shareCode}</span>
            )}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              className="min-h-[44px] rounded-lg bg-emerald-600 px-7 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => setShowActions(true)}
              aria-haspopup="menu"
              aria-expanded={showActions}
              aria-label="その他の操作（複製・共有・転記・印刷）"
              className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-base font-bold leading-none text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              …
            </button>
          </div>
        </div>
      </div>

      {/* 柱C-9: その他の操作シート（複製・共有・転記・印刷・連携）。下から出る・タップしやすい1列。 */}
      {showActions && (
        <>
          <div className="fixed inset-0 z-[45] bg-slate-900/40 print:hidden" onClick={() => setShowActions(false)} aria-hidden="true" />
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

            <p className="mb-1.5 text-[11px] font-bold text-slate-400">記録</p>
            <div className="mb-3 space-y-1.5">
              <button type="button" role="menuitem" onClick={() => runAction(handleCopyLatest)} className="flex min-h-[48px] w-full flex-col items-start justify-center gap-0.5 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-2.5 text-left hover:bg-amber-100">
                <span className="text-sm font-bold text-amber-800">↻ 前回を複製</span>
                <span className="text-[11px] font-normal text-amber-600">前回のKYを今日の分として引き継ぐ</span>
              </button>
            </div>

            <p className="mb-1.5 text-[11px] font-bold text-slate-400">共有・連携</p>
            <div className="mb-3 space-y-1.5">
              <button type="button" role="menuitem" disabled={shareBusy} onClick={() => runAction(() => void handleShare())} className="flex min-h-[48px] w-full flex-col items-start justify-center gap-0.5 rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-2.5 text-left hover:bg-violet-100 disabled:opacity-50">
                <span className="text-sm font-bold text-violet-800">📡 {shareBusy ? "発行中…" : "別端末で共有"}</span>
                <span className="text-[11px] font-normal text-violet-600">サイネージ用の共有コードを発行</span>
              </button>
              {isKyCloudEnabled() && (
                <button type="button" role="menuitem" onClick={() => runAction(() => void handleFetchLatest())} className="flex min-h-[48px] w-full flex-col items-start justify-center gap-0.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left hover:bg-slate-50">
                  <span className="text-sm font-semibold text-slate-700">☁ クラウド最新取得</span>
                  <span className="text-[11px] font-normal text-slate-500">別端末で保存したKYを読み込む</span>
                </button>
              )}
              <Link href="/ky/morning" role="menuitem" onClick={() => setShowActions(false)} className="flex min-h-[48px] w-full items-center rounded-xl border border-violet-200 bg-white px-4 py-3 text-left text-sm font-semibold text-violet-700 hover:bg-violet-50">
                🖥 朝礼サイネージへ →
              </Link>
              <button type="button" role="menuitem" onClick={() => runAction(() => setShowTranscribe(true))} className="flex min-h-[48px] w-full flex-col items-start justify-center gap-0.5 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-left hover:bg-emerald-50" title="元請指定のExcel様式へ項目ごとにコピーして貼り付け">
                <span className="text-sm font-semibold text-emerald-700">📋 Excel転記</span>
                <span className="text-[11px] font-normal text-emerald-600">元請のExcel様式へ項目ごとにコピー</span>
              </button>
            </div>

            <p className="mb-1.5 text-[11px] font-bold text-slate-400">印刷・PDF</p>
            <div className="mb-1 space-y-1.5">
              <button type="button" role="menuitem" onClick={() => runAction(() => setShowPrintPreview(true))} className="flex min-h-[48px] w-full flex-col items-start justify-center gap-0.5 rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-left hover:bg-sky-50">
                <span className="text-sm font-semibold text-sky-700">🔍 印刷プレビュー</span>
                <span className="text-[11px] font-normal text-sky-600">A4の体裁を確認してから印刷</span>
              </button>
              <button type="button" role="menuitem" onClick={() => { setShowActions(false); window.print(); }} className="flex min-h-[48px] w-full items-center rounded-xl bg-sky-600 px-4 py-3 text-left text-sm font-bold text-white hover:bg-sky-700">
                🖨 印刷 / PDF
              </button>
            </div>

            {(chemHint.matched || accHint.matched || (record.workRows[0]?.workDetail?.trim() ?? "") !== "") && (
              <>
                <p className="mb-1.5 mt-3 text-[11px] font-bold text-slate-400">この作業の関連情報</p>
                <div className="space-y-1.5">
                  {chemHint.matched && (
                    <Link href={chemicalRaHref(chemHint)} role="menuitem" onClick={() => setShowActions(false)} className="flex min-h-[48px] w-full items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-left text-sm font-semibold text-amber-800 hover:bg-amber-100" title={`この作業（${chemHint.keywords.join("・")}）で扱う化学物質の規制・ばく露注意を確認`}>
                      ⚗ 化学物質リスクを見る →
                    </Link>
                  )}
                  {accHint.matched && (
                    <Link href={accidentsHref(accHint)} role="menuitem" onClick={() => setShowActions(false)} className="flex min-h-[48px] w-full items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-left text-sm font-semibold text-rose-700 hover:bg-rose-100" title="この作業の類似労災事例・AI注意喚起を見る">
                      ⚠ 類似の労災事例を見る →
                    </Link>
                  )}
                  {/* P1-3完: KY→チャットボット双方向動線。作業内容を文脈として渡す */}
                  {(record.workRows[0]?.workDetail?.trim() ?? "") !== "" && (
                    <Link
                      href={`/chatbot?context=ky&work=${encodeURIComponent(
                        (record.workRows[0]?.workDetail ?? "").trim().slice(0, 60),
                      )}`}
                      role="menuitem"
                      onClick={() => setShowActions(false)}
                      className="flex min-h-[48px] w-full items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 text-left text-sm font-semibold text-blue-700 hover:bg-blue-100"
                      title="この作業の法的根拠・必要な措置をAIチャットに質問"
                    >
                      💬 法的根拠をAIに聞く →
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SheetField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-0.5">
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <div>{children}</div>
    </label>
  );
}

function SheetSection({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-slate-400 py-3 last:border-b-0">
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
