"use client";

/**
 * KY全面再設計 Phase 1: 用紙ファーストUI（ベータ / 追加ルート /ky/paper）。
 *
 * 社長要件: 完成KY用紙を最初に表示し、ズームで目視確認、入力箇所は音声/キーボード。
 * 既存 /ky を壊さないため別ルートに追加し、保存先は既存 `ky-record` を共有する
 * （朝礼サイネージ /ky/morning とそのまま連携）。視覚確認はプレビュー環境で要実施。
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { InputWithVoice, TextareaWithVoice } from "@/components/voice-input-field";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";
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

function makeToday(): KyInstructionRecordState {
  const base = normalizeKyInstructionRecord({});
  const d = new Date();
  base.workDateYear = String(d.getFullYear());
  base.workDateMonth = String(d.getMonth() + 1);
  base.workDateDay = String(d.getDate());
  return base;
}

export function KyPaperView() {
  const services = useMemo(() => createServices(), []);
  const [record, setRecord] = useState<KyInstructionRecordState>(makeToday);
  const [zoom, setZoom] = useState(1);
  const [region, setRegion] = useState(DEFAULT_WEATHER_REGION);
  const [weatherBusy, setWeatherBusy] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [savedLabel, setSavedLabel] = useState("記入すると自動保存されます");
  const [notice, setNotice] = useState<string | null>(null);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<KyHazardSuggestion[]>([]);
  const [suggestSource, setSuggestSource] = useState<"gemini" | "fallback" | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [approvalActor, setApprovalActor] = useState("");
  const [approvalComment, setApprovalComment] = useState("");
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
    if (params && DEEP_LINK_KEYS.some((k) => params!.has(k))) {
      const res = applyKyDeepLink(params, baseRec ?? makeToday());
      setRecord(res.record);
      if (res.notice) setNotice(res.notice);
    } else if (baseRec) {
      setRecord(baseRec);
    }
    setWorkers(visibleWorkers(loadWorkers()));
  }, []);

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
        setNotice("別端末のクラウド保存から最新KYを引き継ぎました。");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const setRisk = useCallback((i: number, row: KyInstructionRiskRow) => {
    setRecord((prev) => ({
      ...prev,
      riskRows: prev.riskRows.map((r, idx) => (idx === i ? row : r)),
    }));
  }, []);

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
        setNotice("天気の自動取得に失敗しました。手動で入力してください。");
      }
    } finally {
      setWeatherBusy(false);
    }
  };

  const handleCopyLatest = () => {
    const latest = loadLatestKyRecord();
    if (!latest) {
      setNotice("複製できる過去のKYが見つかりませんでした。");
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
      setNotice(res.error?.message ?? "保存に失敗しました");
    }
  };

  // Phase 5: 本物のAI（Gemini）に危険箇所を提案させる。未設定/失敗時はAPI側で擬似AIにフォールバック。
  const handleSuggest = async () => {
    const workContent = record.workRows[0]?.workDetail?.trim() ?? "";
    if (!workContent) {
      setNotice("先に「本日の作業内容」を入力してください（AI提案の手がかりになります）。");
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
        setNotice("AI提案の取得に失敗しました。時間をおいて再度お試しください。");
        return;
      }
      const data = (await res.json()) as HazardSuggestionResponse;
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      setSuggestSource(data.source ?? null);
      if (!data.suggestions || data.suggestions.length === 0) {
        setNotice("提案が得られませんでした。作業内容を具体的にすると精度が上がります。");
      } else if (data.note) {
        setNotice(data.note);
      }
    } catch {
      setNotice("AI提案の通信に失敗しました。");
    } finally {
      setSuggestBusy(false);
    }
  };

  // 提案を最初の空き危険欄に取り込む（埋まっていれば新しい行を追加）。
  const applySuggestion = (s: KyHazardSuggestion) => {
    setRecord((prev) => {
      const rows = [...prev.riskRows];
      const emptyIdx = rows.findIndex((r) => !r.hazard.trim());
      const base = emptyIdx >= 0 ? rows[emptyIdx] : undefined;
      if (base) {
        rows[emptyIdx] = {
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
      setNotice("クラウド未設定のため別端末共有は使えません。同じ端末なら「サイネージへ」ボタンですぐ表示できます。");
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
        setNotice("クラウド未設定のため別端末共有は使えません。同じ端末なら「サイネージへ」ボタンですぐ表示できます。");
      } else if (result.reason === "server_error") {
        setNotice("別端末共有サーバーが一時的に利用できません（管理者が対応中の可能性）。お急ぎの場合は、同じ端末で「サイネージへ」ボタンを押せばこのKYをすぐ表示できます。");
      } else if (result.reason === "busy") {
        setNotice("共有コードが混み合っています。少し待って再度「別端末で共有」をお試しください。すぐ表示したい場合は同じ端末の「サイネージへ」をご利用ください。");
      } else {
        setNotice("共有コードの発行に失敗しました。通信状況をご確認のうえ、もう一度お試しください。同じ端末なら「サイネージへ」ボタンで表示できます。");
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
      setNotice("クラウドに保存済みのKYが見つかりませんでした。");
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
    setNotice("元請に提出しました。確認待ちです（提出中は編集ロック）。");
  };
  const handleApprove = () => {
    applyApproval(approveKy(approval, approvalActor || "元請担当者", new Date(), approvalComment || undefined));
    setApprovalComment("");
    setNotice("承認しました。");
  };
  const handleReject = () => {
    applyApproval(rejectKy(approval, approvalActor || "元請担当者", new Date(), approvalComment || undefined));
    setApprovalComment("");
    setNotice("差し戻しました。編集できるようになりました。");
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

  return (
    <div className="min-h-screen bg-slate-100 pb-24 print:bg-white print:pb-0">
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
          </div>
          {/* ズーム */}
          <div className="flex items-center gap-1 rounded-full border border-slate-300 bg-white p-0.5">
            <button type="button" aria-label="縮小" onClick={() => setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 10) / 10))} className="rounded-full px-3 py-1 text-sm font-bold text-slate-700 hover:bg-slate-100">－</button>
            <button type="button" onClick={() => setZoom(1)} className="min-w-[3.5rem] rounded-full px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">{Math.round(zoom * 100)}%</button>
            <button type="button" aria-label="拡大" onClick={() => setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 10) / 10))} className="rounded-full px-3 py-1 text-sm font-bold text-slate-700 hover:bg-slate-100">＋</button>
          </div>
        </div>
      </div>

      {notice && (
        <div className="mx-auto mt-3 max-w-5xl px-4 print:hidden">
          <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5">
            <p className="text-sm font-semibold text-emerald-900">{notice}</p>
            <button type="button" onClick={() => setNotice(null)} aria-label="閉じる" className="rounded px-1.5 text-emerald-700 hover:bg-emerald-100">×</button>
          </div>
        </div>
      )}

      {/* P1-B: 元請確認・承認パネル */}
      <div className="mx-auto mt-3 max-w-5xl px-4 print:hidden">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">元請確認・承認</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  approval.status === "approved"
                    ? "bg-emerald-100 text-emerald-800"
                    : approval.status === "submitted"
                      ? "bg-amber-100 text-amber-800"
                      : approval.status === "rejected"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-slate-600"
                }`}
              >
                {KY_APPROVAL_LABEL[approval.status]}
              </span>
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
                  <Pulldown ariaLabel="年" value={record.workDateYear} onChange={(v) => patch({ workDateYear: v })} options={years.map((y) => ({ value: String(y), label: String(y) }))} />
                  <span className="text-xs">年</span>
                  <Pulldown ariaLabel="月" value={record.workDateMonth} onChange={(v) => patch({ workDateMonth: v })} options={MONTH_OPTIONS.map((m) => ({ value: String(m), label: String(m) }))} />
                  <span className="text-xs">月</span>
                  <Pulldown ariaLabel="日" value={record.workDateDay} onChange={(v) => patch({ workDateDay: v })} options={days.map((d) => ({ value: String(d), label: String(d) }))} />
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
            <SheetSection title="本日の作業内容">
              <TextareaWithVoice rows={2} value={record.workRows[0]?.workDetail ?? ""} onChange={(e) => setRecord((prev) => ({ ...prev, workRows: prev.workRows.map((r, i) => (i === 0 ? { ...r, workDetail: e.target.value } : r)) }))} placeholder="今日やる作業（例: 3F鉄骨建方、ボルト本締め）" className="text-sm" />
            </SheetSection>

            {/* 4R: 危険のポイントと対策（リスクアセスメント） */}
            <SheetSection title="危険のポイントと対策（1R〜3R）">
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
                              <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-700">要確認</span>
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
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${grade.grade === "high" ? "bg-red-100 text-red-700" : grade.grade === "medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                          評価値 {score}（{grade.label}）
                        </span>
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
            <SheetSection title="本日の目標（4R）と指差呼称">
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
            <SheetSection title={`参加者（${participantCount}名）`}>
              {workers.length === 0 ? (
                <p className="text-xs text-slate-500">
                  <Link href="/ky/workers" className="font-semibold text-emerald-700 underline">作業員マスター</Link>
                  に登録すると、ここでチェックするだけで参加者を選べます。
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 print:hidden">
                  {workers.map((w) => {
                    const checked = selectedNames.has(w.name);
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => toggleWorker(w, !checked)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${checked ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
                      >
                        {checked ? "✓ " : ""}{w.name}
                      </button>
                    );
                  })}
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

      {/* P1-A: A4印刷用シート（画面では非表示・印刷時のみ描画＝元請提出体裁） */}
      <div className="hidden print:block">
        <KyPrintSheet record={record} />
      </div>

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

      {/* 下部アクションバー */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500">
            {savedLabel}
            <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">{KY_SYNC_LABEL[syncStatus]}</span>
            {shareCode && (
              <span className="ml-2 rounded bg-violet-100 px-2 py-0.5 font-bold text-violet-800">共有コード {shareCode}</span>
            )}
          </span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleCopyLatest} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50">前回を複製</button>
            <button type="button" onClick={() => void handleSave()} className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">保存</button>
            {isKyCloudEnabled() && (
              <button type="button" onClick={() => void handleFetchLatest()} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">クラウド最新取得</button>
            )}
            <button type="button" onClick={() => void handleShare()} disabled={shareBusy} className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50">{shareBusy ? "発行中…" : "別端末で共有"}</button>
            <Link href="/ky/morning" className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50">サイネージへ →</Link>
            {chemHint.matched && (
              <Link
                href={chemicalRaHref(chemHint)}
                className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                title={`この作業（${chemHint.keywords.join("・")}）で扱う化学物質の規制・ばく露注意を確認`}
              >
                ⚗ 化学物質リスクを見る →
              </Link>
            )}
            {accHint.matched && (
              <Link
                href={accidentsHref(accHint)}
                className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                title="この作業の類似労災事例・AI注意喚起を見る"
              >
                ⚠ 類似の労災事例を見る →
              </Link>
            )}
            {/* P1-3完: KY→チャットボット双方向動線。作業内容を文脈として渡す */}
            {(record.workRows[0]?.workDetail?.trim() ?? "") !== "" && (
              <Link
                href={`/chatbot?context=ky&work=${encodeURIComponent(
                  (record.workRows[0]?.workDetail ?? "").trim().slice(0, 60),
                )}`}
                className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                title="この作業の法的根拠・必要な措置をAIチャットに質問"
              >
                💬 法的根拠をAIに聞く →
              </Link>
            )}
            <button type="button" onClick={() => setShowPrintPreview(true)} className="rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50">印刷プレビュー</button>
            <button type="button" onClick={() => window.print()} className="rounded-lg bg-sky-600 px-5 py-1.5 text-xs font-bold text-white shadow hover:bg-sky-700">印刷 / PDF</button>
          </div>
        </div>
      </div>
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

function SheetSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-slate-400 py-3 last:border-b-0">
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
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border border-slate-300 bg-white px-1.5 py-1.5 text-sm"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
