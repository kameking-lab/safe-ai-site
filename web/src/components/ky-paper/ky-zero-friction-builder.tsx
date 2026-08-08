"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { UsageNotesLink } from "@/components/usage-notes-link";
import {
  InputWithVoice,
  TextareaWithVoice,
} from "@/components/voice-input-field";
import {
  officialAreaCandidateById,
  resolveOfficialAreaQuery,
  type OfficialAreaCandidate,
} from "@/lib/area/official-area-resolver";
import {
  parseKyHandoffFromLocation,
} from "@/lib/ky/handoff";
import { parseLegacyPresetKyHandoff } from "@/lib/ky/legacy-preset-handoff";
import { formatJmaWarning } from "@/lib/jma/warning-label";
import {
  deleteAllKyMembersLocal,
  deleteKyDraftLocal,
  deleteKyMemberLocal,
  loadKyLocalSnapshot,
  previousMembersFromDrafts,
  saveKyDraftLocal,
  saveKyMemberLocal,
  touchKyMembers,
} from "@/lib/ky/local-registry";
import {
  fetchKyWeatherPrefill,
  overrideKyWeatherField,
} from "@/lib/ky/weather-prefill-v2";
import { downloadKyPdf } from "@/lib/ky/pdf-export";
import { shouldShowKyCandidateNotice } from "@/lib/ky/candidate-notice";
import {
  clearWorkers,
  loadWorkers,
  visibleWorkers,
} from "@/lib/ky/workers-master";
import {
  dedupeHazardCandidates,
  hasDuplicateHazardText,
  measuresForHazardText,
  suggestVerifiedHazards,
  verifiedHazardById,
} from "@/lib/ky/verified-suggestions";
import {
  KY_RETENTION_DAYS,
  addDaysIso,
  cloneKyDraftForNewWork,
  createEmptyKyDraft,
  createLocalId,
  deriveKyDraftState,
  invalidateKyConfirmation,
  isKyDraftContentConfirmable,
  markKyPdfExportedIfUnchanged,
  revalidateKyWeatherStaleness,
  type KyDraftState,
  type KyHazardCandidate,
  type KyLocalDraft,
  type KyMember,
  type KySelectedHazard,
  type KySelectedMeasure,
  type KyStorageMode,
  type KyWeatherSnapshot,
} from "@/lib/ky/zero-friction-types";

type KyZeroFrictionBuilderProps = {
  initialNowIso: string;
};

type SaveStatus = "idle" | "saving" | "saved" | "memory" | "quota";
type WeatherStatus =
  | "idle"
  | "loading"
  | "loaded"
  | "partial"
  | "forecast-out-of-range"
  | "unavailable";

const CONTROL_LABELS = {
  elimination: "なくす・変更",
  engineering: "工学的対策",
  administrative: "管理的対策",
  ppe: "保護具",
} as const;

const ORIGIN_LABELS = {
  "reviewed-visual-kyt": "確認済みVisual KYT",
  "accident-classification": "事故分類",
  "official-guidance": "公式資料",
  "verified-library": "検証済みライブラリ",
  weather: "気象からの候補",
  handoff: "引継ぎ候補",
  manual: "手入力",
} as const;

const WORK_CATEGORY_LABELS = {
  construction: "建設",
  manufacturing: "製造",
  transport: "運輸",
  chemical: "化学物質",
  outdoor: "屋外",
  unknown: "カテゴリ未確認",
} as const;

const EMPTY_HANDOFF_IDS: string[] = [];
const EMPTY_HANDOFF_HAZARDS: NonNullable<
  KyLocalDraft["handoffHazardDrafts"]
> = [];
const EMPTY_HANDOFF_MEASURES: NonNullable<
  KyLocalDraft["handoffMeasureDrafts"]
> = [];

function makeInitialDraft(initialNowIso: string): KyLocalDraft {
  const parsed = new Date(initialNowIso);
  const safeNow = Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
  return { ...createEmptyKyDraft(safeNow), id: "ky_initial" };
}

function formatJst(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "未確認";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function shortWork(value: string): string {
  const oneLine = value.replace(/\s+/gu, " ").trim();
  if (!oneLine) return "作業内容未入力";
  return oneLine.length > 28 ? `${oneLine.slice(0, 28)}…` : oneLine;
}

function stateLabel(state: KyDraftState): string {
  switch (state) {
    case "candidates":
      return "候補あり";
    case "needs-review":
      return "人の確認が必要";
    case "confirmed":
      return "確認済み";
    case "pdf-exported":
      return "PDF出力済み";
    default:
      return "下書き";
  }
}

function weatherAvailabilityLabel(weather: KyWeatherSnapshot): string {
  if (weather.stale && weather.manuallyEditedFields.length) {
    return "古い情報・手動修正あり";
  }
  if (weather.stale) return "古い情報";
  if (weather.manuallyEditedFields.length) return "手動修正あり";
  if (weather.availability === "degraded") return "一部取得不能";
  if (weather.availability === "unavailable") return "未確認";
  return "推定・公開情報";
}

function heatAlertLabel(
  value: KyWeatherSnapshot["heatAlert"],
): string {
  switch (value) {
    case "active":
      return "発表中";
    case "inactive":
      return "発表確認なし（取得時点）";
    case "candidate":
      return "発表候補・未確定";
    default:
      return "未確認";
  }
}

function meaningfulDraft(draft: KyLocalDraft): boolean {
  return Boolean(
    draft.locationQuery.trim() ||
      draft.selectedMembers.length ||
      draft.workDescription.trim() ||
      draft.pendingManualHazard?.trim() ||
      Object.values(draft.pendingManualMeasures ?? {}).some((value) => value.trim()) ||
      draft.hazards.length ||
      draft.reviewerName.trim() ||
      draft.notes.trim() ||
      draft.handoff,
  );
}

function candidateToSelected(
  candidate: KyHazardCandidate,
  origin: KySelectedHazard["origin"] = candidate.origin,
): KySelectedHazard {
  return {
    id: createLocalId("hazard"),
    candidateId: candidate.id,
    title: candidate.title,
    originalTitle: candidate.title,
    accidentType: candidate.accidentType,
    reason: candidate.reason,
    origin,
    sourceLabel: candidate.sourceLabel,
    sourceRef: candidate.sourceRef,
    edited: false,
    measures: [],
  };
}

function measureToSelected(
  candidate: KyHazardCandidate["measures"][number],
  origin: KySelectedMeasure["origin"],
): KySelectedMeasure {
  return {
    id: createLocalId("measure"),
    candidateId: candidate.id,
    text: candidate.text,
    originalText: candidate.text,
    level: candidate.level,
    origin,
    sourceLabel: candidate.sourceLabel,
    edited: false,
  };
}

function storageMessage(mode: KyStorageMode, status: SaveStatus): string {
  if (status === "saving") return "保存中";
  if (status === "saved") return "保存済み";
  if (status === "quota") return "容量不足：この画面では作成を続けられます";
  if (mode === "memory" || status === "memory") {
    return "端末保存を利用できません。この画面では作成を続けられます";
  }
  return `この端末に${KY_RETENTION_DAYS}日保存`;
}

function SectionHeading({
  step,
  title,
  badge,
}: {
  step: number;
  title: string;
  badge?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-800 text-sm font-black text-white forced-colors:border forced-colors:border-[ButtonText]">
        {step}
      </span>
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      {badge ? (
        <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-bold text-slate-700">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

function CandidateOption({
  candidate,
  selected,
  handoff,
  onToggle,
  children,
}: {
  candidate: KyHazardCandidate;
  selected: boolean;
  handoff: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      data-hazard-candidate-id={candidate.id}
      className={`block cursor-pointer rounded-xl border p-3 transition motion-reduce:transition-none forced-colors:border-[ButtonText] ${
        selected
          ? "border-emerald-700 bg-emerald-50 ring-2 ring-emerald-700"
          : "border-slate-300 bg-white hover:border-emerald-500"
      }`}
    >
      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          aria-label={`危険候補「${candidate.title}」を選択`}
          checked={selected}
          onChange={onToggle}
          className="mt-1 h-5 w-5 shrink-0 accent-emerald-700"
        />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-black text-slate-950">{candidate.title}</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-700">
              {candidate.accidentType}
            </span>
            {handoff ? (
              <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[11px] font-bold text-sky-900">
                引継ぎ候補
              </span>
            ) : candidate.origin === "weather" ? (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-950">
                気象から
              </span>
            ) : null}
          </span>
          <span className="mt-1 block truncate text-xs text-slate-700" title={candidate.reason}>
            {candidate.reason}
          </span>
          <span className="mt-1 block text-[11px] text-slate-500">
            根拠: {candidate.sourceLabel}
          </span>
        </span>
      </label>
      {children}
    </div>
  );
}

function WeatherSummary({
  weather,
  status,
  onOverride,
}: {
  weather: KyWeatherSnapshot | null;
  status: WeatherStatus;
  onOverride: (
    field: "weather" | "temperature" | "humidity" | "wbgt",
    value: string,
  ) => void;
}) {
  if (status === "loading") {
    return (
      <p role="status" className="mt-2 text-sm font-bold text-sky-800">
        気象・WBGTを取得中…
      </p>
    );
  }
  if (!weather) {
    const message =
      status === "forecast-out-of-range"
        ? "予報範囲外のため取得できません。現在値では代用しません。"
        : status === "unavailable"
          ? "気象・WBGTを取得できません。"
          : "地域を確定すると気象・WBGTを自動入力します。";
    return (
      <p
        role={status === "unavailable" ? "alert" : "status"}
        className="mt-2 text-xs font-bold text-slate-700"
      >
        {message}
      </p>
    );
  }
  const value = (number: number | null, suffix: string, digits = 0) =>
    number == null ? "未確認" : `${number.toFixed(digits)}${suffix}`;
  return (
    <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 p-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <strong>{weather.weather || "天気 未確認"}</strong>
        <span>気温 {value(weather.temperatureCelsius, "℃", 1)}</span>
        <span>湿度 {value(weather.relativeHumidityPercent, "%")}</span>
        <span className="font-black">
          WBGT {value(weather.wbgtCelsius, "℃", 1)}
          {weather.wbgtCelsius != null
            ? weather.manuallyEditedFields.includes("wbgt")
              ? "・手動修正"
              : "・推定"
            : ""}
        </span>
        <span className="rounded-full border border-sky-400 bg-white px-2 py-0.5 text-[11px] font-bold">
          {weatherAvailabilityLabel(weather)}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-slate-700">
        {weather.targetAt
          ? `対象時刻 ${formatJst(weather.targetAt)}`
          : weather.targetDate
            ? `対象日 ${weather.targetDate}（日予報・時刻指定なし）`
            : "対象時刻 未確認"} / 取得 {formatJst(weather.fetchedAt)}
      </p>
      <details className="mt-1 text-xs text-slate-700">
        <summary className="min-h-11 cursor-pointer py-3 font-bold">
          警報・提供元・手動修正
        </summary>
        <div className="space-y-2 border-t border-sky-200 pt-2">
          <p>
            熱中症警戒アラート: {heatAlertLabel(weather.heatAlert)} / 特別警戒アラート: {heatAlertLabel(weather.specialHeatAlert)}
          </p>
          <p>
            警報・注意報: {weather.warningStatus === "live"
              ? weather.warnings.length
                ? weather.warnings
                    .map(formatJmaWarning)
                    .join("、")
                : "発表なし（取得時点）"
              : "未確認または一部取得不能"}
          </p>
          <p>
            WBGT対象: {formatJst(weather.wbgtTargetAt ?? "")} / WBGT取得: {formatJst(weather.wbgtRetrievedAt ?? "")}
          </p>
          <p>提供元: {weather.providers.join("、") || "未確認"}</p>
          <p>公開値・推定値であり、現場実測値ではありません。</p>
          <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-4">
            <label className="text-[11px] font-bold">
              天気
              <InputWithVoice
                aria-label="天気を手動修正"
                voiceLabel="天気の手動修正"
                value={weather.weather ?? ""}
                onChange={(event) => onOverride("weather", event.target.value)}
                className="mt-1 min-h-11 w-full bg-white"
              />
            </label>
            <label className="text-[11px] font-bold">
              気温 ℃
              <input
                type="number"
                inputMode="decimal"
                aria-label="気温を手動修正"
                value={weather.temperatureCelsius ?? ""}
                onChange={(event) => onOverride("temperature", event.target.value)}
                className="mt-1 min-h-11 w-full rounded border border-slate-300 bg-white px-2 text-base"
              />
            </label>
            <label className="text-[11px] font-bold">
              湿度 %
              <input
                type="number"
                inputMode="numeric"
                aria-label="湿度を手動修正"
                value={weather.relativeHumidityPercent ?? ""}
                onChange={(event) => onOverride("humidity", event.target.value)}
                className="mt-1 min-h-11 w-full rounded border border-slate-300 bg-white px-2 text-base"
              />
            </label>
            <label className="text-[11px] font-bold">
              WBGT ℃
              <input
                type="number"
                inputMode="decimal"
                aria-label="WBGTを手動修正"
                value={weather.wbgtCelsius ?? ""}
                onChange={(event) => onOverride("wbgt", event.target.value)}
                className="mt-1 min-h-11 w-full rounded border border-slate-300 bg-white px-2 text-base"
              />
            </label>
          </div>
        </div>
      </details>
    </div>
  );
}

export function KyZeroFrictionBuilder({
  initialNowIso,
}: KyZeroFrictionBuilderProps) {
  const [draft, setDraft] = useState<KyLocalDraft>(() =>
    makeInitialDraft(initialNowIso),
  );
  const [storedDrafts, setStoredDrafts] = useState<KyLocalDraft[]>([]);
  const [members, setMembers] = useState<KyMember[]>([]);
  const [storageMode, setStorageMode] = useState<KyStorageMode>("indexeddb");
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [weatherStatus, setWeatherStatus] = useState<WeatherStatus>("idle");
  const [suggestionWork, setSuggestionWork] = useState("");
  const [showAllCandidates, setShowAllCandidates] = useState(false);
  const handoffCandidateIds = draft.handoffCandidateIds ?? EMPTY_HANDOFF_IDS;
  const handoffHazardDrafts =
    draft.handoffHazardDrafts ?? EMPTY_HANDOFF_HAZARDS;
  const handoffMeasureIds = draft.handoffMeasureIds ?? EMPTY_HANDOFF_IDS;
  const handoffMeasureDrafts =
    draft.handoffMeasureDrafts ?? EMPTY_HANDOFF_MEASURES;
  const [manualHazardError, setManualHazardError] = useState("");
  const [candidateSelectionError, setCandidateSelectionError] = useState("");
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [legacyWorkerCount, setLegacyWorkerCount] = useState(0);
  const [memberImportMessage, setMemberImportMessage] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [pdfStatus, setPdfStatus] = useState<
    "idle" | "building" | "done" | "error"
  >("idle");
  const [pdfMessage, setPdfMessage] = useState("");
  const [online, setOnline] = useState(true);
  const weatherAbortRef = useRef<AbortController | null>(null);
  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const updateDraft = useCallback(
    (
      updater: (current: KyLocalDraft) => KyLocalDraft,
      options: { invalidate?: boolean } = {},
    ) => {
      setDraft((current) => {
        const now = new Date().toISOString();
        let next = updater(current);
        next = {
          ...next,
          updatedAt: now,
          expiresAt: addDaysIso(now, KY_RETENTION_DAYS),
        };
        if (options.invalidate !== false) {
          next = invalidateKyConfirmation(next);
        }
        return {
          ...next,
          state: deriveKyDraftState(next),
        };
      });
    },
    [],
  );

  const loadWeather = useCallback(
    async (areaId: string, workDate: string) => {
      weatherAbortRef.current?.abort();
      const controller = new AbortController();
      weatherAbortRef.current = controller;
      setWeatherStatus("loading");
      const result = await fetchKyWeatherPrefill({
        areaId,
        workDate,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (result.snapshot) {
        updateDraft(
          (current) =>
            current.areaId === areaId
              ? { ...current, weather: result.snapshot }
              : current,
        );
      } else {
        updateDraft(
          (current) =>
            current.areaId === areaId ? { ...current, weather: null } : current,
        );
      }
      if (result.ok) {
        setWeatherStatus("loaded");
      } else if (result.reason === "forecast-out-of-range") {
        setWeatherStatus("forecast-out-of-range");
      } else if (result.snapshot) {
        setWeatherStatus("partial");
      } else {
        setWeatherStatus("unavailable");
      }
    },
    [updateDraft],
  );

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadKyLocalSnapshot().then((snapshot) => {
      if (cancelled) return;
      setStoredDrafts(snapshot.drafts);
      setMembers(snapshot.members);
      setLegacyWorkerCount(visibleWorkers(loadWorkers()).length);
      setStorageMode(snapshot.storageMode);
      setSaveStatus(snapshot.error === "unavailable" ? "memory" : "idle");
      setDraft((current) =>
        current.id === "ky_initial"
          ? { ...current, id: createLocalId("ky") }
          : current,
      );

      const parsed =
        parseKyHandoffFromLocation(window.location.search) ??
        parseLegacyPresetKyHandoff(window.location.search);
      if (parsed) {
        if (parsed.workDraft) setSuggestionWork(parsed.workDraft);
        const area = parsed.areaId
          ? officialAreaCandidateById(parsed.areaId)
          : null;
        setDraft((current) => ({
          ...current,
          id: current.id === "ky_initial" ? createLocalId("ky") : current.id,
          handoff: {
            source: parsed.source,
            sourceId: parsed.sourceId,
            label: parsed.label,
            loadedAt: new Date().toISOString(),
            requiresHumanReview: true,
            reviewedAt: null,
            workCategory: parsed.workCategory,
          },
          workCategory: parsed.workCategory,
          handoffCandidateIds: [
            ...parsed.hazardIds,
            ...parsed.hazardDrafts.map((item) => item.id),
          ],
          handoffHazardDrafts: parsed.hazardDrafts,
          handoffMeasureIds: parsed.measureIds,
          handoffMeasureDrafts: parsed.measureDrafts,
          ...(parsed.workDraft ? { workDescription: parsed.workDraft } : {}),
          ...(area
            ? {
                areaId: area.id,
                areaLabel: area.label,
                locationQuery: area.label,
                weather: parsed.weather,
              }
            : {}),
        }));
        if (area && !parsed.weather) {
          window.setTimeout(() => {
            void loadWeather(area.id, draftRef.current.workDate);
          }, 0);
        } else if (parsed.weather) {
          setWeatherStatus(
            parsed.weather.stale || parsed.weather.degraded ? "partial" : "loaded",
          );
        }
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
      weatherAbortRef.current?.abort();
    };
  }, [loadWeather]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSuggestionWork(draft.workDescription);
    }, 550);
    return () => window.clearTimeout(timer);
  }, [draft.workDescription]);

  useEffect(() => {
    if (!ready || !meaningfulDraft(draft)) return;
    const statusTimer = window.setTimeout(() => setSaveStatus("saving"), 0);
    const timer = window.setTimeout(() => {
      void saveKyDraftLocal(draft).then((result) => {
        if (result.ok) {
          setSaveStatus("saved");
          setStorageMode(result.mode);
        } else {
          setStorageMode("memory");
          setSaveStatus(result.error === "quota" ? "quota" : "memory");
        }
        setStoredDrafts((current) =>
          [draft, ...current.filter((item) => item.id !== draft.id)]
            .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
            .slice(0, 40),
        );
      });
    }, 750);
    return () => {
      window.clearTimeout(statusTimer);
      window.clearTimeout(timer);
    };
  }, [draft, ready]);

  useEffect(() => {
    const persist = () => {
      const current = draftRef.current;
      if (meaningfulDraft(current)) void saveKyDraftLocal(current);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") persist();
    };
    window.addEventListener("pagehide", persist);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", persist);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!draft.weather || draft.weather.stale) return;
    const timer = window.setInterval(() => {
      const current = draftRef.current;
      if (!current.weather || current.weather.stale) return;
      const refreshed = revalidateKyWeatherStaleness(current.weather);
      if (refreshed === current.weather) return;
      updateDraft((value) => ({ ...value, weather: refreshed }));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [draft.weather, updateDraft]);

  const areaResolution = useMemo(
    () => resolveOfficialAreaQuery(draft.locationQuery),
    [draft.locationQuery],
  );

  useEffect(() => {
    const unique = areaResolution.unique;
    if (!unique || draft.areaId === unique.id || !draft.locationQuery.trim()) {
      return;
    }
    const timer = window.setTimeout(() => {
      updateDraft((current) => ({
        ...current,
        areaId: unique.id,
        areaLabel: unique.label,
        // 利用者の場所入力はKY本文として保持し、外部取得には粗いareaIdだけを使う。
        locationQuery: current.locationQuery,
        weather: null,
      }));
      void loadWeather(unique.id, draftRef.current.workDate);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [areaResolution.unique, draft.areaId, draft.locationQuery, loadWeather, updateDraft]);

  const handoffCandidates = useMemo(
    () => {
      const verified = handoffCandidateIds.flatMap((id) => {
        const candidate = verifiedHazardById(id);
        return candidate
          ? [
              {
                ...candidate,
                relevance: 140,
                reason: `引継ぎ候補：${candidate.reason}`,
              },
            ]
          : [];
      });
      const localOnly = handoffHazardDrafts.map((hazardDraft, index) => ({
        id: hazardDraft.id,
        title: hazardDraft.title,
        accidentType: "引継ぎ候補",
        reason:
          draft.handoff?.source === "visual-kyt"
            ? "Visual KYTで利用者が選択した危険"
            : draft.handoff?.source === "meeting"
              ? "工程打合せ書で入力された予想災害"
              : "引継ぎ元で利用者が選択した危険",
        origin: "handoff" as const,
        sourceLabel: draft.handoff?.label ?? "同一端末の引継ぎ元",
        sourceRef: `session:${hazardDraft.id}`,
        relevance: 145 - index,
        measures: [],
      }));
      return dedupeHazardCandidates([...verified, ...localOnly]);
    },
    [draft.handoff?.label, draft.handoff?.source, handoffCandidateIds, handoffHazardDrafts],
  );

  const hazardCandidates = useMemo(() => {
    const workCandidates =
      suggestionWork.trim().length >= 4
        ? suggestVerifiedHazards(suggestionWork, draft.weather)
        : draft.weather
          ? suggestVerifiedHazards("現場作業", draft.weather).filter(
              (candidate) => candidate.origin === "weather",
            )
          : [];
    return dedupeHazardCandidates([...handoffCandidates, ...workCandidates]);
  }, [draft.weather, handoffCandidates, suggestionWork]);

  const selectedCandidateIds = useMemo(
    () => new Set(draft.hazards.flatMap((hazard) => hazard.candidateId ?? [])),
    [draft.hazards],
  );

  const visibleCandidates = showAllCandidates
    ? hazardCandidates
    : hazardCandidates.slice(0, 6);

  const chooseArea = (candidate: OfficialAreaCandidate) => {
    updateDraft((current) => ({
      ...current,
      locationQuery: candidate.label,
      areaId: candidate.id,
      areaLabel: candidate.label,
      weather: null,
    }));
    void loadWeather(candidate.id, draft.workDate);
  };

  const toggleCandidate = (candidate: KyHazardCandidate) => {
    const selected = draft.hazards.find(
      (hazard) => hazard.candidateId === candidate.id,
    );
    if (
      !selected &&
      hasDuplicateHazardText(
        draft.hazards.map((hazard) => hazard.title),
        candidate.title,
      )
    ) {
      setCandidateSelectionError(
        `「${candidate.title}」と同じ危険が入力済みです。内容をまとめてから選択してください。`,
      );
      return;
    }
    setCandidateSelectionError("");
    updateDraft((current) => {
      const existing = current.hazards.find(
        (hazard) => hazard.candidateId === candidate.id,
      );
      return {
        ...current,
        hazards: existing
          ? current.hazards.filter((hazard) => hazard.id !== existing.id)
          : [
              ...current.hazards,
              candidateToSelected(
                candidate,
                handoffCandidateIds.includes(candidate.id)
                  ? "handoff"
                  : candidate.origin,
              ),
            ],
      };
    });
  };

  const addManualHazard = () => {
    const title = (draft.pendingManualHazard ?? "").trim();
    if (!title) return;
    if (
      hasDuplicateHazardText(
        [
          ...draft.hazards.map((item) => item.title),
          ...hazardCandidates.map((item) => item.title),
        ],
        title,
      )
    ) {
      setManualHazardError(
        "同じ危険が入力済みまたは候補にあります。入力は残しています。",
      );
      return;
    }
    setManualHazardError("");
    updateDraft((current) => ({
      ...current,
      pendingManualHazard: "",
      hazards: [
        ...current.hazards,
        {
          id: createLocalId("hazard"),
          candidateId: null,
          title,
          originalTitle: title,
          accidentType: "利用者確認",
          reason: "利用者が現場条件から追加",
          origin: "manual",
          sourceLabel: "手入力",
          sourceRef: "local:manual",
          edited: false,
          measures: [],
        },
      ],
    }));
  };

  const candidateMeasuresFor = (hazard: KySelectedHazard) => {
    const direct = hazard.candidateId && !hazard.edited
      ? verifiedHazardById(hazard.candidateId)?.measures ?? []
      : [];
    const library = direct.length ? direct : measuresForHazardText(hazard.title);
    const inherited =
      hazard.origin === "handoff"
        ? handoffMeasureDrafts
            .filter(
              (measure) =>
                !measure.hazardId || measure.hazardId === hazard.candidateId,
            )
            .map((measure) => ({
              ...measure,
              origin: "handoff" as const,
              sourceLabel: "引継ぎ候補（引継ぎ元で選択）",
              sourceRef: `handoff:${measure.id}`,
            }))
        : [];
    return [...inherited, ...library].filter(
      (measure, index, all) =>
        all.findIndex((candidate) => candidate.id === measure.id) === index,
    );
  };

  const toggleMeasure = (
    hazardId: string,
    candidate: KyHazardCandidate["measures"][number],
  ) => {
    updateDraft((current) => ({
      ...current,
      hazards: current.hazards.map((hazard) => {
        if (hazard.id !== hazardId) return hazard;
        const existing = hazard.measures.find(
          (measure) => measure.candidateId === candidate.id,
        );
        return {
          ...hazard,
          measures: existing
            ? hazard.measures.filter((measure) => measure.id !== existing.id)
            : [
                ...hazard.measures,
                measureToSelected(
                  candidate,
                  handoffMeasureIds.includes(candidate.id)
                    || handoffMeasureDrafts.some((item) => item.id === candidate.id)
                    ? "handoff"
                    : candidate.origin ?? "verified-library",
                ),
              ],
        };
      }),
    }));
  };

  const addManualMeasure = (hazardId: string) => {
    const text = (draft.pendingManualMeasures?.[hazardId] ?? "").trim();
    if (!text) return;
    updateDraft((current) => ({
      ...current,
      pendingManualMeasures: {
        ...(current.pendingManualMeasures ?? {}),
        [hazardId]: "",
      },
      hazards: current.hazards.map((hazard) =>
        hazard.id === hazardId
          ? {
              ...hazard,
              measures: [
                ...hazard.measures,
                {
                  id: createLocalId("measure"),
                  candidateId: null,
                  text,
                  originalText: text,
                  level: null,
                  origin: "manual",
                  sourceLabel: "手入力",
                  edited: false,
                },
              ],
            }
          : hazard,
      ),
    }));
  };

  const addMember = () => {
    const displayName = memberName.trim().slice(0, 40);
    const role = memberRole.trim().slice(0, 40);
    if (!displayName || !role) return;
    const now = new Date().toISOString();
    const existing = members.find(
      (member) =>
        member.displayName.normalize("NFKC") === displayName.normalize("NFKC") &&
        member.role.normalize("NFKC") === role.normalize("NFKC"),
    );
    const member: KyMember = existing
      ? { ...existing, lastUsedAt: now, expiresAt: addDaysIso(now, KY_RETENTION_DAYS) }
      : {
          id: createLocalId("member"),
          displayName,
          role,
          createdAt: now,
          lastUsedAt: now,
          expiresAt: addDaysIso(now, KY_RETENTION_DAYS),
        };
    void saveKyMemberLocal(member).then((result) => {
      if (!result.ok) {
        setStorageMode("memory");
        setSaveStatus(result.error === "quota" ? "quota" : "memory");
      }
    });
    setMembers((current) => [
      member,
      ...current.filter((item) => item.id !== member.id),
    ]);
    updateDraft((current) => ({
      ...current,
      selectedMembers: current.selectedMembers.some((item) => item.id === member.id)
        ? current.selectedMembers
        : [
            ...current.selectedMembers,
            {
              id: member.id,
              displayName: member.displayName,
              role: member.role,
            },
          ],
    }));
    setMemberName("");
    setMemberRole("");
  };

  const importLegacyWorkers = () => {
    const legacy = visibleWorkers(loadWorkers());
    const existing = new Set(
      members.map((member) => member.displayName.normalize("NFKC").trim()),
    );
    const now = new Date().toISOString();
    const imported: KyMember[] = legacy.flatMap((worker) => {
      const normalized = worker.name.normalize("NFKC").trim();
      if (!normalized || existing.has(normalized)) return [];
      existing.add(normalized);
      return [{
        id: `legacy_${worker.id}`,
        displayName: worker.name.trim().slice(0, 40),
        role: "作業員",
        createdAt: now,
        lastUsedAt: now,
        expiresAt: addDaysIso(now, KY_RETENTION_DAYS),
      }];
    });
    if (!imported.length) {
      clearWorkers();
      setLegacyWorkerCount(0);
      setMemberImportMessage("新しく取り込める作業員はいません。");
      return;
    }
    setMembers((current) => [...imported, ...current]);
    void Promise.all(imported.map((member) => saveKyMemberLocal(member))).then(
      (results) => {
        if (results.every((result) => result.ok)) {
          clearWorkers();
          setLegacyWorkerCount(0);
          setMemberImportMessage(
            `${imported.length}名をこの端末の31日メンバーへ取り込みました。旧台帳も削除しました。`,
          );
          return;
        }
        setMemberImportMessage(
          `${imported.length}名を一時利用できます。端末保存を利用できないため旧台帳は保持しました。`,
        );
      },
    );
  };

  const toggleMember = (member: KyMember) => {
    const selected = draft.selectedMembers.some((item) => item.id === member.id);
    updateDraft((current) => ({
      ...current,
      selectedMembers: selected
        ? current.selectedMembers.filter((item) => item.id !== member.id)
        : [
            ...current.selectedMembers,
            {
              id: member.id,
              displayName: member.displayName,
              role: member.role,
            },
          ],
    }));
    if (!selected) {
      const now = new Date().toISOString();
      const touched = {
        ...member,
        lastUsedAt: now,
        expiresAt: addDaysIso(now, KY_RETENTION_DAYS),
      };
      setMembers((current) =>
        current.map((item) => (item.id === touched.id ? touched : item)),
      );
      void saveKyMemberLocal(touched);
    }
  };

  const previousMembers = useMemo(
    () => previousMembersFromDrafts(storedDrafts.filter((item) => item.id !== draft.id)),
    [draft.id, storedDrafts],
  );

  const recentDrafts = useMemo(
    () => storedDrafts.filter((item) => item.id !== draft.id).slice(0, 3),
    [draft.id, storedDrafts],
  );

  const refreshSelectedMemberRetention = (
    selected: KyLocalDraft["selectedMembers"],
  ) => {
    const registryMatches = members.filter((member) =>
      selected.some((item) => item.id === member.id),
    );
    if (!registryMatches.length) return;
    void touchKyMembers(registryMatches).then((touched) => {
      const byId = new Map(touched.map((member) => [member.id, member]));
      setMembers((current) =>
        current.map((member) => byId.get(member.id) ?? member),
      );
    });
  };

  const resumeDraft = (selected: KyLocalDraft) => {
    weatherAbortRef.current?.abort();
    const resumed = {
      ...selected,
      weather: selected.weather
        ? revalidateKyWeatherStaleness(selected.weather)
        : null,
    };
    setDraft(resumed);
    setSuggestionWork(selected.workDescription);
    setWeatherStatus(
      resumed.weather
        ? resumed.weather.stale || resumed.weather.degraded
          ? "partial"
          : "loaded"
        : "idle",
    );
    setSaveStatus("saved");
    refreshSelectedMemberRetention(selected.selectedMembers);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const duplicateDraft = (selected: KyLocalDraft) => {
    const duplicate = cloneKyDraftForNewWork(selected);
    setDraft(duplicate);
    setSuggestionWork(duplicate.workDescription);
    setWeatherStatus("idle");
    setSaveStatus("idle");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    if (!draft.workDescription.trim()) issues.push("作業内容が未入力");
    if (draft.hazards.length === 0) issues.push("危険が未選択");
    const withoutMeasure = draft.hazards.filter(
      (hazard) =>
        hazard.measures.length === 0 ||
        hazard.measures.every((measure) => !measure.text.trim()),
    );
    if (withoutMeasure.length) {
      issues.push(`対策がない危険 ${withoutMeasure.length}件`);
    }
    const emptyHazards = draft.hazards.filter((hazard) => !hazard.title.trim());
    if (emptyHazards.length) issues.push(`内容が空の危険 ${emptyHazards.length}件`);
    const emptyMeasures = draft.hazards.reduce(
      (count, hazard) =>
        count + hazard.measures.filter((measure) => !measure.text.trim()).length,
      0,
    );
    if (emptyMeasures) issues.push(`内容が空の対策 ${emptyMeasures}件`);
    const normalizedHazards = draft.hazards.map((hazard) =>
      hazard.title.normalize("NFKC").replace(/\s+/gu, "").toLowerCase(),
    );
    if (new Set(normalizedHazards).size !== normalizedHazards.length) {
      issues.push("同じ危険が重複");
    }
    const unselectedCandidates = hazardCandidates.filter(
      (candidate) => !selectedCandidateIds.has(candidate.id),
    ).length;
    if (unselectedCandidates) {
      issues.push(`未選択の危険候補 ${unselectedCandidates}件（採用しない候補を含む）`);
    }
    if (!draft.reviewerName.trim()) issues.push("確認者が未入力");
    if (!draft.weather) issues.push("気象・WBGTが未確認");
    else if (draft.weather.stale) issues.push("気象に古い情報あり");
    else if (draft.weather.degraded) issues.push("気象の一部が取得不能");
    if (draft.handoff && !draft.handoff.reviewedAt) {
      issues.push("引継ぎ候補は人の確認が必要");
    }
    return issues;
  }, [draft, hazardCandidates, selectedCandidateIds]);

  const canConfirmContent = isKyDraftContentConfirmable(draft);
  const canConfirm = Boolean(canConfirmContent && draft.reviewerName.trim());

  const confirmDraft = (reviewerOverride?: string) => {
    const reviewer = reviewerOverride?.trim() || draft.reviewerName.trim();
    if (!canConfirmContent || !reviewer) return;
    updateDraft(
      (current) => {
        const confirmedAt = new Date().toISOString();
        return {
          ...current,
          reviewerName: reviewer,
          confirmedAt,
          pdfExportedAt: null,
          state: "confirmed",
          handoff: current.handoff
            ? { ...current.handoff, reviewedAt: confirmedAt }
            : null,
        };
      },
      { invalidate: false },
    );
  };

  const exportPdf = async () => {
    setPdfStatus("building");
    setPdfMessage("PDFを端末内で作成中…");
    try {
      const current = draftRef.current;
      const refreshedWeather = current.weather
        ? revalidateKyWeatherStaleness(current.weather)
        : null;
      const exportDraft =
        refreshedWeather && refreshedWeather !== current.weather
          ? invalidateKyConfirmation({ ...current, weather: refreshedWeather })
          : current;
      const result = await downloadKyPdf(exportDraft);
      const exportedAt = new Date().toISOString();
      const changedDuringBuild =
        draftRef.current.id !== exportDraft.id ||
        draftRef.current.updatedAt !== exportDraft.updatedAt;
      setDraft(
        (latest) =>
          markKyPdfExportedIfUnchanged({
            latest,
            exportedDraft: exportDraft,
            exportedAt,
          }).draft,
      );
      setPdfStatus("done");
      setPdfMessage(
        changedDuringBuild
          ? `${result.filename}を保存しました。作成中の変更は未出力のため、もう一度PDF保存してください。`
          : `${result.filename}（${result.pageCount}ページ）を保存しました。`,
      );
    } catch {
      setPdfStatus("error");
      setPdfMessage("PDFを生成できませんでした。印刷画面からPDF保存を利用できます。");
    }
  };

  return (
    <div
      id="ky-paper-start"
      className="ky-zero-friction mx-auto w-full max-w-6xl px-[min(0.75rem,12px)] pb-28 pt-[min(0.75rem,12px)] sm:px-6 sm:pt-5 lg:px-8"
    >
      <a
        href="#ky-work-description"
        className="sr-only focus:not-sr-only focus:mb-2 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-lg focus:bg-white focus:px-3 focus:font-bold focus:text-emerald-900 focus:ring-2 focus:ring-emerald-700"
      >
        作業入力へ移動
      </a>
      <div className="rounded-2xl border border-emerald-200 bg-white shadow-sm">
        <div className="border-b border-emerald-100 px-[min(0.75rem,12px)] py-[min(0.75rem,12px)] sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                KYを作る
              </h1>
              <p className="mt-0.5 text-sm text-slate-700">
                作業を入れると、危険と対策の候補が出ます。
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-1">
              <span className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
                {stateLabel(draft.state)}
              </span>
              {recentDrafts[0] ? (
                <button
                  type="button"
                  onClick={() => resumeDraft(recentDrafts[0])}
                  className="min-h-11 rounded-full border border-emerald-600 bg-white px-3 py-2 text-xs font-bold text-emerald-900"
                >
                  前回の続き
                </button>
              ) : null}
            </div>
          </div>
          {draft.handoff ? (
            <p
              role="status"
              data-ky-handoff-banner=""
              {...(draft.handoff.source === "accident"
                ? { "data-home-accident-context": "" }
                : {})}
              className="mt-2 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-950"
            >
              {draft.handoff.label} 候補を確認してください。
            </p>
          ) : null}
          {!online ? (
            <p
              role="alert"
              className="mt-2 rounded-lg border border-amber-500 bg-amber-50 px-3 py-2 text-xs text-amber-950"
            >
              <strong>オフラインモード</strong>
              <span>：気象を再取得できません。入力とPDF保存は続けられます。</span>
            </p>
          ) : null}
        </div>

        <section aria-labelledby="ky-work-heading" className="space-y-2 px-[min(0.75rem,12px)] py-[min(0.5rem,8px)] sm:px-5 sm:py-3">
          <h2 id="ky-work-heading" className="sr-only">1. 作業</h2>
          <div data-primary-action="true">
            <label htmlFor="ky-work-description" className="text-xs font-bold text-slate-700">
              作業内容
            </label>
            {draft.workCategory ? (
              <span className="ml-2 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700">
                引継ぎカテゴリ: {WORK_CATEGORY_LABELS[draft.workCategory]}
              </span>
            ) : null}
            <TextareaWithVoice
              id="ky-work-description"
              aria-label="作業内容"
              voiceLabel="作業内容"
              onVoiceFinalText={setSuggestionWork}
              rows={3}
              value={draft.workDescription}
              onKeyDown={(event) => {
                if (event.key === "Enter") setSuggestionWork(event.currentTarget.value);
              }}
              onChange={(event) =>
                updateDraft((current) => ({
                  ...current,
                  workDescription: event.target.value,
                }))
              }
              placeholder="例：足場上で外壁パネルを取り付ける"
              className="min-h-24 resize-y"
            />
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)] gap-2 sm:max-w-xl">
            <label className="min-w-0 text-xs font-bold text-slate-700">
              作業日
              <input
                type="date"
                value={draft.workDate}
                onChange={(event) => {
                  const workDate = event.target.value;
                  updateDraft((current) => ({ ...current, workDate, weather: null }));
                  if (draft.areaId) void loadWeather(draft.areaId, workDate);
                }}
                className="mt-1 min-h-11 min-w-0 w-full rounded-lg border border-slate-300 px-2 text-base"
              />
            </label>
            <label className="min-w-0 text-xs font-bold text-slate-700">
              開始
              <input
                type="time"
                value={draft.workStartTime}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    workStartTime: event.target.value,
                  }))
                }
                className="mt-1 min-h-11 min-w-0 w-full rounded-lg border border-slate-300 px-2 text-base"
              />
            </label>
          </div>
          <p className="-mt-1 text-[11px] text-slate-500">
            作成日時 {formatJst(draft.createdAt)} JST
          </p>

          <div>
            <label htmlFor="ky-location" className="text-xs font-bold text-slate-700">
              場所
            </label>
            <InputWithVoice
              id="ky-location"
              aria-label="場所"
              voiceLabel="場所"
              autoComplete="address-level2"
              placeholder="例：新宿区"
              value={draft.locationQuery}
              preservePreHydrationInput
              onChange={(event) => {
                const locationQuery = event.target.value;
                updateDraft((current) => ({
                  ...current,
                  locationQuery,
                  areaId: null,
                  areaLabel: "",
                  weather: null,
                }));
                setWeatherStatus("idle");
              }}
            />
            {draft.locationQuery.trim() && !draft.areaId && areaResolution.candidates.length ? (
              <div
                role="listbox"
                aria-label="地域候補"
                className="mt-1 flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2"
              >
                {areaResolution.candidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    role="option"
                    aria-selected="false"
                    onClick={() => chooseArea(candidate)}
                    className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    {candidate.label}
                  </button>
                ))}
                {areaResolution.exact && !areaResolution.unique ? (
                  <p className="w-full text-[11px] font-bold text-amber-900">
                    同名地域です。候補を選んでください。先頭候補は自動確定しません。
                  </p>
                ) : null}
              </div>
            ) : null}
            {draft.locationQuery.trim().length >= 2 &&
            !draft.areaId &&
            areaResolution.candidates.length === 0 ? (
              <p role="status" className="mt-1 text-[11px] font-bold text-amber-900">
                地域を特定できません。市区町村に都道府県名を付けるか、都道府県名を入力してください。
              </p>
            ) : null}
            {draft.areaId ? (
              <p className="mt-1 text-[11px] font-bold text-sky-900">
                {officialAreaCandidateById(draft.areaId)?.resolutionLabel}
              </p>
            ) : null}
            <WeatherSummary
              weather={draft.weather}
              status={weatherStatus}
              onOverride={(field, value) => {
                if (!draft.weather) return;
                updateDraft((current) =>
                  current.weather
                    ? {
                        ...current,
                        weather: overrideKyWeatherField(current.weather, field, value),
                      }
                    : current,
                );
              }}
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="text-xs font-bold text-slate-700">メンバー</span>
              <span className="text-[11px] text-slate-500">この端末だけ・最終利用から31日</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {(showAllMembers ? members : members.slice(0, 10)).map((member) => {
                const selected = draft.selectedMembers.some(
                  (item) => item.id === member.id,
                );
                return (
                  <button
                    key={member.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleMember(member)}
                    className={`min-h-11 rounded-full border px-3 py-2 text-xs font-bold forced-colors:border-[ButtonText] ${
                      selected
                        ? "border-emerald-700 bg-emerald-100 text-emerald-950"
                        : "border-slate-300 bg-white text-slate-800"
                    }`}
                  >
                    {selected ? "✓ " : ""}{member.displayName}／{member.role}
                  </button>
                );
              })}
              {members.length > 10 ? (
                <button
                  type="button"
                  aria-expanded={showAllMembers}
                  onClick={() => setShowAllMembers((current) => !current)}
                  className="min-h-11 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800"
                >
                  {showAllMembers
                    ? "最近の10名に戻す"
                    : `他のメンバーを表示（${members.length - 10}名）`}
                </button>
              ) : null}
              {previousMembers.length ? (
                <button
                  type="button"
                  onClick={() =>
                    {
                      updateDraft((current) => ({
                        ...current,
                        selectedMembers: previousMembers,
                      }));
                      refreshSelectedMemberRetention(previousMembers);
                    }
                  }
                  className="min-h-11 rounded-full border border-sky-400 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900"
                >
                  前回のメンバー
                </button>
              ) : null}
              {draft.selectedMembers.length ? (
                <button
                  type="button"
                  onClick={() =>
                    updateDraft((current) => ({ ...current, selectedMembers: [] }))
                  }
                  className="min-h-11 rounded-full px-3 py-2 text-xs font-bold text-slate-700 underline"
                >
                  全員解除
                </button>
              ) : null}
              {legacyWorkerCount ? (
                <button
                  type="button"
                  onClick={importLegacyWorkers}
                  className="min-h-11 rounded-full border border-violet-400 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-900"
                >
                  作業員マスターから取り込む（{legacyWorkerCount}名）
                </button>
              ) : null}
            </div>
            {memberImportMessage ? (
              <p role="status" className="mt-1 text-[11px] font-bold text-slate-700">
                {memberImportMessage}
              </p>
            ) : null}
            <details className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-2">
              <summary className="min-h-11 cursor-pointer py-3 text-xs font-bold text-slate-800">
                メンバーを追加・管理
              </summary>
              <div className="space-y-2 border-t border-slate-200 py-2">
                <label className="block text-xs font-bold">
                  表示名・呼び名
                  <InputWithVoice
                    aria-label="メンバー名"
                    voiceLabel="メンバー名"
                    value={memberName}
                    onChange={(event) => setMemberName(event.target.value)}
                    placeholder="例：山田"
                  />
                </label>
                <label className="block text-xs font-bold">
                  役割
                  <InputWithVoice
                    aria-label="メンバーの役割"
                    voiceLabel="メンバーの役割"
                    value={memberRole}
                    onChange={(event) => setMemberRole(event.target.value)}
                    placeholder="例：職長"
                  />
                </label>
                <button
                  type="button"
                  onClick={addMember}
                  disabled={!memberName.trim() || !memberRole.trim()}
                  className="min-h-11 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  メンバーを登録して選ぶ
                </button>
                {members.length ? (
                  <div className="space-y-1 border-t border-slate-200 pt-2">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between gap-2 text-xs">
                        <span>{member.displayName}／{member.role}</span>
                        <button
                          type="button"
                          aria-label={`${member.displayName}を端末から削除`}
                          onClick={() => {
                            void deleteKyMemberLocal(member.id);
                            setMembers((current) =>
                              current.filter((item) => item.id !== member.id),
                            );
                            updateDraft((current) => ({
                              ...current,
                              selectedMembers: current.selectedMembers.filter(
                                (item) => item.id !== member.id,
                              ),
                            }));
                          }}
                          className="min-h-11 px-3 text-xs font-bold text-rose-800 underline"
                        >
                          削除
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm("この端末に登録したメンバーをすべて削除しますか？")) return;
                        void deleteAllKyMembersLocal();
                        setMembers([]);
                        updateDraft((current) => ({ ...current, selectedMembers: [] }));
                      }}
                      className="min-h-11 text-xs font-bold text-rose-800 underline"
                    >
                      登録メンバーを全削除
                    </button>
                  </div>
                ) : null}
              </div>
            </details>
          </div>

          {shouldShowKyCandidateNotice({
            availableCandidateCount:
              handoffCandidates.length + hazardCandidates.length,
            selectedCandidateCount: draft.hazards.filter(
              (hazard) => Boolean(hazard.candidateId),
            ).length,
          }) ? (
            <p className="text-xs font-bold leading-5 text-amber-950">
              <span className="mr-1 rounded bg-amber-100 px-1.5 py-0.5">未確認</span>
              候補を現場で確認してください。
            </p>
          ) : null}

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
            <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">
                {recentDrafts[0]
                  ? `前回：${shortWork(recentDrafts[0].workDescription)}`
                  : "最近の下書きはありません"}
              </span>
              {recentDrafts[0] ? (
                <button
                  type="button"
                  onClick={() => resumeDraft(recentDrafts[0])}
                  className="min-h-11 rounded-lg border border-emerald-600 bg-white px-3 py-2 text-xs font-bold text-emerald-900"
                >
                  続きから
                </button>
              ) : null}
            </div>
            {recentDrafts.length ? (
              <details>
                <summary className="min-h-11 cursor-pointer py-3 text-xs font-bold text-slate-700">
                  最近のKYを管理（最大3件表示）
                </summary>
                <div className="space-y-2 border-t border-slate-200 pt-2">
                  {recentDrafts.map((item) => (
                    <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-2">
                      <p className="text-xs font-bold">
                        {item.workDate} / {item.areaLabel || "場所未確認"} / {stateLabel(item.state)}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-600">{shortWork(item.workDescription)}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => resumeDraft(item)}
                          className="min-h-11 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white"
                        >
                          続きから
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateDraft(item)}
                          className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold"
                        >
                          複製して作る
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void deleteKyDraftLocal(item.id);
                            setStoredDrafts((current) =>
                              current.filter((draftItem) => draftItem.id !== item.id),
                            );
                          }}
                          className="min-h-11 px-3 py-2 text-xs font-bold text-rose-800 underline"
                        >
                          削除
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
          <p aria-live="polite" className="text-right text-[11px] font-bold text-slate-600">
            {ready ? storageMessage(storageMode, saveStatus) : "端末保存を準備中"}
          </p>
        </section>
      </div>

      <section
        aria-labelledby="ky-hazard-heading"
        className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/40 p-[min(0.75rem,12px)] sm:p-5"
      >
        <div id="ky-hazard-heading">
          <SectionHeading
            step={2}
            title="危険"
            badge={hazardCandidates.length ? `${hazardCandidates.length}候補` : "手入力可"}
          />
        </div>
        {candidateSelectionError ? (
          <p role="alert" className="mt-2 text-xs font-bold text-rose-800">
            {candidateSelectionError}
          </p>
        ) : null}
        {suggestionWork.trim().length >= 4 || handoffCandidates.length || hazardCandidates.length ? (
          hazardCandidates.length ? (
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              {visibleCandidates.map((candidate) => {
                const selectedHazard = draft.hazards.find(
                  (hazard) => hazard.candidateId === candidate.id,
                );
                const hazardIndex = selectedHazard
                  ? draft.hazards.findIndex((hazard) => hazard.id === selectedHazard.id)
                  : -1;
                const measureCandidates = selectedHazard
                  ? candidateMeasuresFor(selectedHazard).slice(0, 5)
                  : [];
                const selectedMeasureIds = new Set(
                  selectedHazard?.measures.flatMap(
                    (measure) => measure.candidateId ?? [],
                  ) ?? [],
                );
                return (
                  <CandidateOption
                    key={candidate.id}
                    candidate={candidate}
                    selected={Boolean(selectedHazard)}
                    handoff={handoffCandidateIds.includes(candidate.id)}
                    onToggle={() => toggleCandidate(candidate)}
                  >
                    {selectedHazard ? (
                      <fieldset
                        data-inline-measures-for={candidate.id}
                        className="mt-2 border-t border-rose-200 pt-2"
                      >
                        <legend className="px-1 text-xs font-black text-slate-900">
                          対策候補（複数選択）
                        </legend>
                        {measureCandidates.length ? (
                          <div className="mt-1 space-y-1.5">
                            {measureCandidates.map((measure) => (
                              <label
                                key={measure.id}
                                className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-lg border bg-white p-2.5 forced-colors:border-[ButtonText] ${
                                  selectedMeasureIds.has(measure.id)
                                    ? "border-emerald-700 ring-2 ring-emerald-700"
                                    : "border-slate-300"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  aria-label={`危険${hazardIndex + 1}の対策候補「${measure.text}」を選択`}
                                  checked={selectedMeasureIds.has(measure.id)}
                                  onChange={() => toggleMeasure(selectedHazard.id, measure)}
                                  className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-700"
                                />
                                <span className="min-w-0 text-sm text-slate-900">
                                  <span className="mr-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold">
                                    {CONTROL_LABELS[measure.level]}
                                  </span>
                                  {measure.text}
                                  {measure.origin === "handoff" ? (
                                    <span className="ml-1 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-900">
                                      引継ぎ候補
                                    </span>
                                  ) : null}
                                </span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1 text-xs font-bold text-amber-900">
                            検証済み対策を特定できません。下の対策欄で手入力してください。
                          </p>
                        )}
                      </fieldset>
                    ) : null}
                  </CandidateOption>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm font-bold text-slate-700">
              関連候補を特定できません。現場で確認した危険を手入力してください。
            </p>
          )
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            作業内容を4文字以上入力すると、ここへ候補が自動表示されます。
          </p>
        )}
        {hazardCandidates.length > 6 ? (
          <button
            type="button"
            aria-expanded={showAllCandidates}
            onClick={() => setShowAllCandidates((current) => !current)}
            className="mt-2 min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800"
          >
            {showAllCandidates ? "候補を絞る" : `他の候補を見る（${hazardCandidates.length - 6}件）`}
          </button>
        ) : null}
        <div className="mt-3 rounded-xl border border-dashed border-rose-300 bg-white p-3">
          <label className="text-xs font-bold text-slate-800">危険を追加</label>
          <InputWithVoice
            aria-label="手入力の危険"
            voiceLabel="手入力の危険"
            value={draft.pendingManualHazard ?? ""}
            onChange={(event) => {
              updateDraft((current) => ({
                ...current,
                pendingManualHazard: event.target.value,
              }));
              setManualHazardError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addManualHazard();
              }
            }}
            placeholder="現場で確認した危険"
          />
          <button
            type="button"
            onClick={addManualHazard}
            disabled={!(draft.pendingManualHazard ?? "").trim()}
            className="mt-2 min-h-11 rounded-lg bg-rose-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            危険を追加
          </button>
          {manualHazardError ? (
            <p role="alert" className="mt-1 text-xs font-bold text-rose-800">
              {manualHazardError}
            </p>
          ) : null}
        </div>
      </section>

      <section
        aria-labelledby="ky-measure-heading"
        className="mt-4 rounded-2xl border border-sky-200 bg-sky-50/40 p-[min(0.75rem,12px)] sm:p-5"
      >
        <div id="ky-measure-heading">
          <SectionHeading step={3} title="対策" badge={`${draft.hazards.length}危険を選択`} />
        </div>
        {draft.hazards.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            危険を選ぶと、その危険に対応する具体的な対策候補がすぐ表示されます。
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {draft.hazards.map((hazard, hazardIndex) => {
              const measureCandidates = candidateMeasuresFor(hazard).slice(0, 5);
              const selectedMeasureIds = new Set(
                hazard.measures.flatMap((measure) => measure.candidateId ?? []),
              );
              return (
                <article
                  key={hazard.id}
                  id={`ky-measures-${hazard.id}`}
                  className="rounded-xl border border-sky-300 bg-white p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-base text-slate-950">
                        危険{hazardIndex + 1}
                      </strong>
                      <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-bold">
                        {ORIGIN_LABELS[hazard.origin]}
                      </span>
                      {hazard.edited ? (
                        <span className="rounded bg-violet-100 px-2 py-1 text-[11px] font-bold text-violet-900">
                          編集済み
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateDraft((current) => ({
                          ...current,
                          hazards: current.hazards.filter((item) => item.id !== hazard.id),
                        }))
                      }
                      className="min-h-11 px-3 text-xs font-bold text-rose-800 underline"
                    >
                      危険を外す
                    </button>
                  </div>
                  <label className="mt-1 block text-xs font-bold text-slate-700">
                    危険{hazardIndex + 1}の内容
                    <InputWithVoice
                      aria-label={`危険${hazardIndex + 1}の内容`}
                      voiceLabel={`危険${hazardIndex + 1}`}
                      value={hazard.title}
                      onChange={(event) => {
                        const title = event.target.value;
                        updateDraft((current) => ({
                          ...current,
                          hazards: current.hazards.map((item) =>
                            item.id === hazard.id
                              ? (() => {
                                  const edited = title.trim() !== (item.originalTitle ?? "").trim();
                                  const detachCandidate = Boolean(item.candidateId && edited);
                                  return {
                                    ...item,
                                    title,
                                    edited,
                                    candidateId: detachCandidate ? null : item.candidateId,
                                    origin: detachCandidate ? "manual" : item.origin,
                                    sourceLabel: detachCandidate
                                      ? "手入力（候補を編集）"
                                      : item.sourceLabel,
                                    sourceRef: detachCandidate
                                      ? "local:edited-candidate"
                                      : item.sourceRef,
                                    reason: detachCandidate
                                      ? "利用者が候補を現場条件に合わせて編集"
                                      : item.reason,
                                    accidentType: detachCandidate
                                      ? "利用者確認"
                                      : item.accidentType,
                                    // 危険の意味が変わった時は、旧危険にだけ結び付く
                                    // 候補対策を確認済み扱いにしない。手入力は保持する。
                                    measures: detachCandidate
                                      ? item.measures.filter(
                                          (measure) => measure.origin === "manual",
                                        )
                                      : item.measures,
                                  };
                                })()
                              : item,
                          ),
                        }));
                      }}
                    />
                  </label>
                  <p className="mt-1 truncate text-[11px] text-slate-600" title={hazard.reason}>
                    {hazard.reason} / 根拠: {hazard.sourceLabel}
                  </p>
                  {hazard.edited ? (
                    <p className="mt-1 text-[11px] font-bold text-amber-900">
                      危険を編集したため、現在の文面で対策候補を再照合しています。候補対策は選び直してください。
                    </p>
                  ) : null}

                  {!hazard.candidateId && measureCandidates.length ? (
                    <fieldset className="mt-3">
                      <legend className="text-xs font-black text-slate-800">
                        対策候補（複数選択）
                      </legend>
                      <div className="mt-1 space-y-1.5">
                        {measureCandidates.map((candidate) => {
                          const selected = selectedMeasureIds.has(candidate.id);
                          return (
                            <label
                              key={candidate.id}
                              className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-lg border p-2.5 forced-colors:border-[ButtonText] ${
                                selected
                                  ? "border-emerald-700 bg-emerald-50"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              <input
                                type="checkbox"
                                aria-label={`危険${hazardIndex + 1}の対策候補「${candidate.text}」を選択`}
                                checked={selected}
                                onChange={() => toggleMeasure(hazard.id, candidate)}
                                className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-700"
                              />
                              <span className="min-w-0 text-sm text-slate-900">
                                <span className="mr-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold">
                                  {CONTROL_LABELS[candidate.level]}
                                </span>
                                {candidate.text}
                                {handoffMeasureIds.includes(candidate.id) ||
                                handoffMeasureDrafts.some((item) => item.id === candidate.id) ? (
                                  <span className="ml-1 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-900">
                                    引継ぎ候補
                                  </span>
                                ) : null}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  ) : !hazard.candidateId ? (
                    <p className="mt-2 text-xs font-bold text-amber-900">
                      この手入力危険に合う検証済み候補を特定できません。対策を手入力してください。
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-600">
                      対策候補は、選んだ危険カードの直下で確認できます。
                    </p>
                  )}

                  {hazard.measures.length ? (
                    <div className="mt-3 space-y-2 border-t border-sky-100 pt-3">
                      <p className="text-xs font-black">選んだ対策（確定前・編集可）</p>
                      {hazard.measures.map((measure, measureIndex) => (
                        <div key={measure.id} className="rounded-lg bg-slate-50 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <label className="min-w-0 flex-1 text-xs font-bold">
                              危険{hazardIndex + 1}の対策{measureIndex + 1}
                              <InputWithVoice
                                aria-label={`危険${hazardIndex + 1}の対策${measureIndex + 1}`}
                                voiceLabel={`対策${hazardIndex + 1}-${measureIndex + 1}`}
                                value={measure.text}
                                onChange={(event) => {
                                  const text = event.target.value;
                                  updateDraft((current) => ({
                                    ...current,
                                    hazards: current.hazards.map((item) =>
                                      item.id === hazard.id
                                        ? {
                                            ...item,
                                            measures: item.measures.map((entry) =>
                                              entry.id === measure.id
                                                ? {
                                                    ...entry,
                                                    text,
                                                    edited: text !== entry.originalText,
                                                  }
                                                : entry,
                                            ),
                                          }
                                        : item,
                                    ),
                                  }));
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              aria-label={`危険${hazardIndex + 1}の対策${measureIndex + 1}を外す`}
                              onClick={() =>
                                updateDraft((current) => ({
                                  ...current,
                                  hazards: current.hazards.map((item) =>
                                    item.id === hazard.id
                                      ? {
                                          ...item,
                                          measures: item.measures.filter(
                                            (entry) => entry.id !== measure.id,
                                          ),
                                        }
                                      : item,
                                  ),
                                }))
                              }
                              className="min-h-11 shrink-0 px-2 text-xs font-bold text-rose-800 underline"
                            >
                              外す
                            </button>
                          </div>
                          <p className="mt-1 text-[10px] text-slate-600">
                            {ORIGIN_LABELS[measure.origin]}{measure.edited ? "・編集済み" : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-3 rounded-lg border border-dashed border-sky-300 p-2">
                    <label className="text-xs font-bold">
                      危険{hazardIndex + 1}の対策を追加
                    </label>
                    <InputWithVoice
                      aria-label={`危険${hazardIndex + 1}の手入力対策`}
                      voiceLabel={`危険${hazardIndex + 1}の手入力対策`}
                      value={draft.pendingManualMeasures?.[hazard.id] ?? ""}
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          pendingManualMeasures: {
                            ...(current.pendingManualMeasures ?? {}),
                            [hazard.id]: event.target.value,
                          },
                        }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addManualMeasure(hazard.id);
                        }
                      }}
                      placeholder="現場に合う具体的な対策"
                    />
                    <button
                      type="button"
                      onClick={() => addManualMeasure(hazard.id)}
                      disabled={!(draft.pendingManualMeasures?.[hazard.id] ?? "").trim()}
                      className="mt-2 min-h-11 rounded-lg bg-sky-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                    >
                      対策を追加
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section
        id="ky-approval"
        aria-labelledby="ky-confirm-heading"
        className="mt-4 rounded-2xl border border-emerald-200 bg-white p-[min(0.75rem,12px)] shadow-sm sm:p-5"
      >
        <div id="ky-confirm-heading">
          <SectionHeading step={4} title="確認・保存" badge={stateLabel(draft.state)} />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="min-w-0 space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              確認者
              <InputWithVoice
                aria-label="確認者"
                voiceLabel="確認者"
                value={draft.reviewerName}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    reviewerName: event.target.value,
                  }))
                }
                placeholder="確認した人の表示名"
              />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              備考
              <TextareaWithVoice
                aria-label="備考"
                voiceLabel="備考"
                rows={3}
                value={draft.notes}
                onChange={(event) =>
                  updateDraft((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-[min(0.75rem,12px)]">
            <h3 className="text-sm font-black text-slate-900">確認ポイント</h3>
            {validationIssues.length ? (
              <ul className="mt-2 space-y-1 text-xs text-slate-700">
                {validationIssues.map((issue) => (
                  <li key={issue}>・{issue}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs font-bold text-emerald-900">
                必須項目を入力済みです。現場条件を確認して確定してください。
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {!draft.reviewerName.trim() && draft.selectedMembers.length
            ? draft.selectedMembers.map((member) => (
                <button
                  key={`confirm-${member.id}`}
                  type="button"
                  onClick={() =>
                    confirmDraft(`${member.displayName}／${member.role}`)
                  }
                  disabled={!canConfirmContent}
                  className="min-h-12 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {member.displayName}として確認
                </button>
              ))
            : null}
          <button
            type="button"
            onClick={() => confirmDraft()}
            disabled={!canConfirm}
            className="min-h-12 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            内容を確認して確定
          </button>
          <button
            type="button"
            onClick={() => void exportPdf()}
            disabled={pdfStatus === "building"}
            className="min-h-12 rounded-xl border-2 border-emerald-800 bg-white px-5 py-3 text-sm font-black text-emerald-900 disabled:opacity-50"
          >
            {pdfStatus === "building" ? "PDF作成中…" : "PDFで保存"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800"
          >
            印刷画面を開く
          </button>
        </div>
        {!draft.confirmedAt ? (
          <p className="mt-2 text-xs font-bold text-amber-900">
            未完成でもPDF保存できます。PDFには「下書き・未確認」と表示します。
          </p>
        ) : (
          <p className="mt-2 text-xs font-bold text-emerald-900">
            確認日時 {formatJst(draft.confirmedAt)} JST
          </p>
        )}
        {pdfMessage ? (
          <p
            role={pdfStatus === "error" ? "alert" : "status"}
            aria-live="polite"
            className={`mt-2 text-xs font-bold ${
              pdfStatus === "error" ? "text-rose-800" : "text-emerald-900"
            }`}
          >
            {pdfMessage}
          </p>
        ) : null}
      </section>

      <section
        aria-labelledby="ky-next-actions-heading"
        className="mt-4 rounded-xl border border-slate-200 bg-white p-3"
      >
        <h2 id="ky-next-actions-heading" className="text-base font-black text-slate-900">
          次にできること
        </h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href="/risk"
            className="inline-flex min-h-11 items-center rounded-lg border border-emerald-600 px-3 py-2 text-sm font-bold text-emerald-900"
          >
            今日の現場リスクを確認
          </Link>
          <Link
            href="/ky-examples"
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800"
          >
            KY記入例を見る
          </Link>
          <UsageNotesLink className="text-slate-700" />
        </div>
      </section>
    </div>
  );
}
