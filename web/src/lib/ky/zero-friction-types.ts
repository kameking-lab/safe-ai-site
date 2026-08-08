export const KY_LOCAL_SCHEMA_VERSION = 2 as const;
export const KY_RETENTION_DAYS = 31;
export const KY_MAX_DRAFTS = 40;
export const KY_MAX_MEMBERS = 80;
export const KY_WEATHER_STALE_AFTER_MS = 2 * 60 * 60 * 1000;

export type KyControlLevel =
  | "elimination"
  | "engineering"
  | "administrative"
  | "ppe";

export type KyWorkCategory =
  | "construction"
  | "manufacturing"
  | "transport"
  | "chemical"
  | "outdoor"
  | "unknown";

export type KyCandidateOrigin =
  | "reviewed-visual-kyt"
  | "accident-classification"
  | "official-guidance"
  | "verified-library"
  | "weather"
  | "handoff"
  | "manual";

export type KyMeasureCandidate = {
  id: string;
  text: string;
  level: KyControlLevel;
  sourceLabel: string;
  sourceRef: string;
  /** 対策そのものの根拠。危険の入力元とは独立して保持する。 */
  origin?: Exclude<KyCandidateOrigin, "manual">;
};

export type KyHazardCandidate = {
  id: string;
  title: string;
  accidentType: string;
  reason: string;
  sourceLabel: string;
  sourceRef: string;
  origin: Exclude<KyCandidateOrigin, "manual">;
  relevance: number;
  measures: KyMeasureCandidate[];
};

export type KySelectedMeasure = {
  id: string;
  candidateId: string | null;
  text: string;
  originalText: string | null;
  level: KyControlLevel | null;
  origin: KyCandidateOrigin;
  sourceLabel: string;
  edited: boolean;
};

export type KySelectedHazard = {
  id: string;
  candidateId: string | null;
  title: string;
  originalTitle: string | null;
  accidentType: string;
  reason: string;
  origin: KyCandidateOrigin;
  sourceLabel: string;
  sourceRef: string;
  edited: boolean;
  measures: KySelectedMeasure[];
};

export type KyWeatherAvailability =
  | "live"
  | "estimated"
  | "stale"
  | "degraded"
  | "unavailable";

export type KyWeatherSnapshot = {
  areaId: string;
  areaLabel: string;
  resolutionLabel: string;
  weather: string | null;
  temperatureCelsius: number | null;
  relativeHumidityPercent: number | null;
  windSpeedMs: number | null;
  precipitationMm: number | null;
  wbgtCelsius: number | null;
  wbgtKind: "estimated" | "unavailable";
  heatAlert: "active" | "inactive" | "candidate" | "unavailable";
  specialHeatAlert: "active" | "inactive" | "candidate" | "unavailable";
  warningStatus: "live" | "degraded" | "unresolved" | "unavailable";
  warnings: Array<{
    code: string;
    status: string;
    name?: string;
    level: "advisory" | "warning" | "special";
  }>;
  targetAt: string | null;
  /** 時刻を持たない日予報の対象日。targetAtを正午等へ捏造しない。 */
  targetDate?: string | null;
  fetchedAt: string;
  wbgtTargetAt: string | null;
  wbgtRetrievedAt: string | null;
  providers: string[];
  availability: KyWeatherAvailability;
  stale: boolean;
  degraded: boolean;
  manuallyEditedFields: Array<
    "weather" | "temperature" | "humidity" | "wbgt"
  >;
};

export type KyMember = {
  id: string;
  displayName: string;
  role: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
};

export type KySelectedMember = Pick<KyMember, "id" | "displayName" | "role">;

export type KyHandoffSource =
  | "home"
  | "heat"
  | "risk"
  | "accident"
  | "visual-kyt"
  | "chemical-ra"
  | "meeting";

export type KyHandoffState = {
  source: KyHandoffSource;
  sourceId: string | null;
  label: string;
  loadedAt: string;
  requiresHumanReview: true;
  reviewedAt?: string | null;
  workCategory?: KyWorkCategory | null;
};

export type KyStoredHandoffHazardDraft = {
  id: string;
  title: string;
};

export type KyStoredHandoffMeasureDraft = {
  id: string;
  text: string;
  level: KyControlLevel;
  hazardId?: string;
};

export type KyDraftState =
  | "draft"
  | "candidates"
  | "needs-review"
  | "confirmed"
  | "pdf-exported";

export type KyLocalDraft = {
  schemaVersion: typeof KY_LOCAL_SCHEMA_VERSION;
  id: string;
  state: KyDraftState;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  workDate: string;
  workStartTime: string;
  workCategory?: KyWorkCategory | null;
  locationQuery: string;
  areaId: string | null;
  areaLabel: string;
  weather: KyWeatherSnapshot | null;
  selectedMembers: KySelectedMember[];
  workDescription: string;
  /** 追加確定前の手入力も離脱時に失わない端末内下書き。 */
  pendingManualHazard?: string;
  pendingManualMeasures?: Record<string, string>;
  hazards: KySelectedHazard[];
  reviewerName: string;
  notes: string;
  confirmedAt: string | null;
  pdfExportedAt: string | null;
  handoff: KyHandoffState | null;
  /** one-shot session引継ぎを下書き再開後も候補として復元する端末内状態。 */
  handoffCandidateIds?: string[];
  handoffHazardDrafts?: KyStoredHandoffHazardDraft[];
  handoffMeasureIds?: string[];
  handoffMeasureDrafts?: KyStoredHandoffMeasureDraft[];
};

export type KyStorageMode = "indexeddb" | "memory";

export type KyLocalSnapshot = {
  drafts: KyLocalDraft[];
  members: KyMember[];
  storageMode: KyStorageMode;
  error: "unavailable" | "quota" | null;
};

/**
 * 保存済みの気象スナップショットは値を保持したまま、表示時点で鮮度だけを
 * 再評価する。古い値を現在情報へ読み替えたり、外部取得で上書きしたりしない。
 */
export function revalidateKyWeatherStaleness(
  weather: KyWeatherSnapshot,
  now: Date = new Date(),
): KyWeatherSnapshot {
  const relevantTimestamps = [
    weather.fetchedAt,
    ...(weather.wbgtCelsius != null ||
    weather.heatAlert !== "unavailable" ||
    weather.specialHeatAlert !== "unavailable"
      ? [weather.wbgtRetrievedAt]
      : []),
  ];
  const newlyStale = relevantTimestamps.some((timestamp) => {
    if (!timestamp) return true;
    const parsed = Date.parse(timestamp);
    if (!Number.isFinite(parsed)) return true;
    const ageMs = now.getTime() - parsed;
    return ageMs < -10 * 60 * 1000 || ageMs > KY_WEATHER_STALE_AFTER_MS;
  });
  if (weather.stale && weather.availability === "stale") return weather;
  if (!newlyStale) return weather;
  return {
    ...weather,
    stale: true,
    availability: "stale",
  };
}

/** 人が確認済みにできる最小境界。配列件数だけでなく本文の非空も検証する。 */
export function isKyDraftContentConfirmable(
  draft: Pick<KyLocalDraft, "workDescription" | "hazards">,
): boolean {
  const normalizedHazards = draft.hazards.map((hazard) =>
    hazard.title.normalize("NFKC").replace(/\s+/gu, "").toLowerCase(),
  );
  return Boolean(
    draft.workDescription.trim() &&
      draft.hazards.length > 0 &&
      new Set(normalizedHazards).size === normalizedHazards.length &&
      draft.hazards.every(
        (hazard) =>
          hazard.title.trim() &&
          hazard.measures.length > 0 &&
          hazard.measures.every((measure) => measure.text.trim()),
      ),
  );
}

export function addDaysIso(iso: string, days: number): string {
  const base = Date.parse(iso);
  const safeBase = Number.isFinite(base) ? base : Date.now();
  return new Date(safeBase + days * 24 * 60 * 60 * 1000).toISOString();
}

export function deriveKyDraftState(
  draft: Pick<
    KyLocalDraft,
    "confirmedAt" | "pdfExportedAt" | "workDescription" | "hazards"
  >,
  candidateCount = 0,
): KyDraftState {
  if (draft.pdfExportedAt) return "pdf-exported";
  if (draft.confirmedAt) return "confirmed";
  if (
    draft.hazards.length > 0 ||
    draft.workDescription.trim().length >= 4
  ) {
    return "needs-review";
  }
  if (candidateCount > 0) return "candidates";
  return "draft";
}

export function cloneKyDraftForNewWork(
  draft: KyLocalDraft,
  now: Date = new Date(),
): KyLocalDraft {
  const next = createEmptyKyDraft(now);
  return {
    ...next,
    locationQuery: draft.areaLabel || draft.locationQuery,
    workCategory: draft.workCategory ?? null,
    // 過去の粗い区域名は入力補助として残すが、区域確定と気象は新しい
    // 作業について利用者が選び直す。古い気象を現在値へ流用しない。
    areaId: null,
    areaLabel: "",
    selectedMembers: draft.selectedMembers,
    workDescription: draft.workDescription,
    hazards: draft.hazards.map((hazard) => ({
      ...hazard,
      id: createLocalId("hazard"),
      measures: hazard.measures.map((measure) => ({
        ...measure,
        id: createLocalId("measure"),
      })),
    })),
    notes: draft.notes,
    weather: null,
    handoff: {
      source: "home",
      sourceId: draft.id,
      label: "過去のKYを複製しました。日時と気象は新しい作業用に再確認してください。",
      loadedAt: next.createdAt,
      requiresHumanReview: true,
    },
  };
}

export function createLocalId(prefix: string): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }
  const random = Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

export function jstDateTimeParts(now: Date = new Date()): {
  date: string;
  time: string;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
}

export function createEmptyKyDraft(now: Date = new Date()): KyLocalDraft {
  const iso = now.toISOString();
  const jst = jstDateTimeParts(now);
  return {
    schemaVersion: KY_LOCAL_SCHEMA_VERSION,
    id: createLocalId("ky"),
    state: "draft",
    createdAt: iso,
    updatedAt: iso,
    expiresAt: addDaysIso(iso, KY_RETENTION_DAYS),
    workDate: jst.date,
    workStartTime: jst.time,
    workCategory: null,
    locationQuery: "",
    areaId: null,
    areaLabel: "",
    weather: null,
    selectedMembers: [],
    workDescription: "",
    pendingManualHazard: "",
    pendingManualMeasures: {},
    hazards: [],
    reviewerName: "",
    notes: "",
    confirmedAt: null,
    pdfExportedAt: null,
    handoff: null,
    handoffCandidateIds: [],
    handoffHazardDrafts: [],
    handoffMeasureIds: [],
    handoffMeasureDrafts: [],
  };
}

export function invalidateKyConfirmation(draft: KyLocalDraft): KyLocalDraft {
  return {
    ...draft,
    state: draft.workDescription.trim() ? "needs-review" : "draft",
    confirmedAt: null,
    pdfExportedAt: null,
    handoff: draft.handoff
      ? { ...draft.handoff, reviewedAt: null }
      : null,
  };
}

/**
 * PDF生成中に本文が変わった場合、古いPDFを新しいrevisionの「出力済み」にしない。
 */
export function markKyPdfExportedIfUnchanged(input: {
  latest: KyLocalDraft;
  exportedDraft: KyLocalDraft;
  exportedAt: string;
}): { draft: KyLocalDraft; applied: boolean } {
  if (
    input.latest.id !== input.exportedDraft.id ||
    input.latest.updatedAt !== input.exportedDraft.updatedAt
  ) {
    return { draft: input.latest, applied: false };
  }
  return {
    applied: true,
    draft: {
      ...input.exportedDraft,
      updatedAt: input.exportedAt,
      expiresAt: addDaysIso(input.exportedAt, KY_RETENTION_DAYS),
      pdfExportedAt: input.exportedAt,
      state: "pdf-exported",
    },
  };
}
