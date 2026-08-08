import { isCanonicalAreaId } from "@/lib/area/official-area-resolver";
import type {
  KyControlLevel,
  KyHandoffSource,
  KyWeatherSnapshot,
  KyWorkCategory,
} from "@/lib/ky/zero-friction-types";

export const KY_HANDOFF_STORAGE_KEY = "safe-ai:ky-handoff:v1";
export const KY_HANDOFF_TTL_MS = 15 * 60 * 1000;

// Same-tab, memory-only handoff used by current UI links. Keep the old
// sessionStorage key read-only so an already-open tab from the previous
// release can finish its one pending handoff without creating new stored
// work/site text.
let pendingKyHandoff: KyHandoffPayload | null = null;
const KY_HANDOFF_RUNTIME_SLOT = "__safeAiKyHandoffRuntimeV1" as const;

const SOURCES: readonly KyHandoffSource[] = [
  "home",
  "heat",
  "risk",
  "accident",
  "visual-kyt",
  "chemical-ra",
  "meeting",
];

const ACCIDENT_TYPES = [
  "fall",
  "caught",
  "traffic",
  "collapse",
  "falling-object",
  "fire-explosion",
  "electric-shock",
  "heat",
  "chemical",
  "unknown",
] as const;

const WORK_CATEGORIES = [
  "construction",
  "manufacturing",
  "transport",
  "chemical",
  "outdoor",
  "unknown",
] as const;

export type KySafeAccidentType = (typeof ACCIDENT_TYPES)[number];
export type KySafeWorkCategory = KyWorkCategory;

export type KyHandoffPayload = {
  version: 1;
  source: KyHandoffSource;
  createdAt: string;
  expiresAt: string;
  areaId?: string;
  weather?: KyWeatherSnapshot;
  accidentId?: string;
  accidentType?: KySafeAccidentType;
  workCategory?: KySafeWorkCategory;
  scenarioId?: string;
  chemicalId?: string;
  cas?: string;
  hazardIds?: string[];
  hazardDrafts?: Array<{
    id: string;
    title: string;
  }>;
  measureIds?: string[];
  measureDrafts?: Array<{
    id: string;
    text: string;
    level: KyControlLevel;
    hazardId?: string;
  }>;
  /** 同一originのsessionStorageだけに置く一時下書き。URLへは出さない。 */
  workDraft?: string;
};

type KyHandoffRuntimeWindow = Window &
  typeof globalThis & {
    __safeAiKyHandoffRuntimeV1?: KyHandoffPayload | null;
  };

function getPendingKyHandoff(): KyHandoffPayload | null {
  if (typeof window === "undefined") return pendingKyHandoff;
  return (window as KyHandoffRuntimeWindow)[KY_HANDOFF_RUNTIME_SLOT] ?? null;
}

function setPendingKyHandoff(payload: KyHandoffPayload | null) {
  pendingKyHandoff = payload;
  if (typeof window !== "undefined") {
    (window as KyHandoffRuntimeWindow)[KY_HANDOFF_RUNTIME_SLOT] = payload;
  }
}

export type ParsedKyHandoff = {
  source: KyHandoffSource;
  sourceId: string | null;
  label: string;
  areaId: string | null;
  weather: KyWeatherSnapshot | null;
  hazardIds: string[];
  hazardDrafts: NonNullable<KyHandoffPayload["hazardDrafts"]>;
  measureIds: string[];
  measureDrafts: NonNullable<KyHandoffPayload["measureDrafts"]>;
  workDraft: string | null;
  workCategory: KySafeWorkCategory | null;
};

const SCENARIO_HAZARDS: Record<string, string[]> = {
  "vkyt-001": ["fall-scaffold", "falling-object", "wind-panel"],
  "vkyt-002": ["pinch-hand", "fall-scaffold"],
  "vkyt-003": ["vehicle-collision", "pinch-hand"],
  "vkyt-004": ["pinch-hand", "manual-handling"],
  "vkyt-005": ["fall-scaffold", "forklift-load", "pinch-hand"],
  "vkyt-006": ["fall-scaffold"],
  "vkyt-007": ["electric-shock"],
  "vkyt-008": ["chemical-exposure", "falling-object"],
  "vkyt-009": ["chemical-exposure", "chemical-splash"],
  "vkyt-010": ["heat-illness"],
  "vkyt-011": ["slip-wet", "manual-handling"],
  "vkyt-012": ["electric-shock", "pinch-hand"],
  "vkyt-013": ["vehicle-collision", "falling-object"],
  "vkyt-014": ["vehicle-collision", "fall-scaffold"],
  "vkyt-015": ["vehicle-collision", "wind-panel", "slip-wet"],
};

const ACCIDENT_HAZARDS: Record<KySafeAccidentType, string[]> = {
  fall: ["fall-scaffold"],
  caught: ["pinch-hand"],
  traffic: ["vehicle-collision"],
  collapse: ["falling-object", "pinch-hand"],
  "falling-object": ["falling-object"],
  "fire-explosion": ["chemical-exposure"],
  "electric-shock": ["electric-shock"],
  heat: ["heat-illness"],
  chemical: ["chemical-exposure", "chemical-splash"],
  unknown: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function validPublicId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-z0-9][a-z0-9._:-]{1,79}$/u.test(value)
  );
}

function validCas(value: unknown): value is string {
  return typeof value === "string" && /^\d{2,7}-\d{2}-\d$/u.test(value);
}

function safeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(validPublicId))].slice(0, 12);
}

function safeLocalWorkDraft(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/gu, "").trim();
  return normalized ? normalized.slice(0, 1_000) : undefined;
}

function safeMeasureDrafts(
  value: unknown,
): NonNullable<KyHandoffPayload["measureDrafts"]> {
  if (!Array.isArray(value)) return [];
  const levels: KyControlLevel[] = [
    "elimination",
    "engineering",
    "administrative",
    "ppe",
  ];
  return value.flatMap((entry) => {
    if (!isRecord(entry) || !validPublicId(entry.id)) return [];
    const text = safeLocalWorkDraft(entry.text);
    if (!text || !levels.includes(entry.level as KyControlLevel)) return [];
    return [
      {
        id: entry.id,
        text: text.slice(0, 300),
        level: entry.level as KyControlLevel,
        ...(validPublicId(entry.hazardId)
          ? { hazardId: entry.hazardId }
          : {}),
      },
    ];
  }).slice(0, 12);
}

function safeHazardDrafts(
  value: unknown,
): NonNullable<KyHandoffPayload["hazardDrafts"]> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry) || !validPublicId(entry.id)) return [];
    const title = safeLocalWorkDraft(entry.title);
    if (!title) return [];
    return [{ id: entry.id, title: title.slice(0, 300) }];
  }).slice(0, 12);
}

function isWeatherForArea(
  value: unknown,
  areaId: string | undefined,
): value is KyWeatherSnapshot {
  if (!areaId || !isRecord(value)) return false;
  return (
    value.areaId === areaId &&
    typeof value.areaLabel === "string" &&
    typeof value.fetchedAt === "string" &&
    Array.isArray(value.providers)
  );
}

export function validateKyHandoffPayload(
  value: unknown,
  nowMs = Date.now(),
): KyHandoffPayload | null {
  if (!isRecord(value) || value.version !== 1) return null;
  if (!SOURCES.includes(value.source as KyHandoffSource)) return null;
  if (
    typeof value.createdAt !== "string" ||
    typeof value.expiresAt !== "string"
  ) {
    return null;
  }
  const createdAtMs = Date.parse(value.createdAt);
  const expiresAtMs = Date.parse(value.expiresAt);
  if (
    !Number.isFinite(createdAtMs) ||
    !Number.isFinite(expiresAtMs) ||
    createdAtMs > nowMs + 60_000 ||
    expiresAtMs <= nowMs ||
    expiresAtMs - createdAtMs > KY_HANDOFF_TTL_MS + 1_000
  ) {
    return null;
  }
  const areaId =
    typeof value.areaId === "string" && isCanonicalAreaId(value.areaId)
      ? value.areaId
      : undefined;
  const accidentType = ACCIDENT_TYPES.includes(
    value.accidentType as KySafeAccidentType,
  )
    ? (value.accidentType as KySafeAccidentType)
    : undefined;
  const workCategory = WORK_CATEGORIES.includes(
    value.workCategory as KySafeWorkCategory,
  )
    ? (value.workCategory as KySafeWorkCategory)
    : undefined;
  return {
    version: 1,
    source: value.source as KyHandoffSource,
    createdAt: value.createdAt,
    expiresAt: value.expiresAt,
    ...(areaId ? { areaId } : {}),
    ...(isWeatherForArea(value.weather, areaId)
      ? { weather: value.weather }
      : {}),
    ...(validPublicId(value.accidentId)
      ? { accidentId: value.accidentId }
      : {}),
    ...(accidentType ? { accidentType } : {}),
    ...(workCategory ? { workCategory } : {}),
    ...(validPublicId(value.scenarioId)
      ? { scenarioId: value.scenarioId }
      : {}),
    ...(validPublicId(value.chemicalId)
      ? { chemicalId: value.chemicalId }
      : {}),
    ...(validCas(value.cas) ? { cas: value.cas } : {}),
    hazardIds: safeIds(value.hazardIds),
    hazardDrafts: safeHazardDrafts(value.hazardDrafts),
    measureIds: safeIds(value.measureIds),
    measureDrafts: safeMeasureDrafts(value.measureDrafts),
    ...(safeLocalWorkDraft(value.workDraft)
      ? { workDraft: safeLocalWorkDraft(value.workDraft) }
      : {}),
  };
}

export function createKyHandoffPayload(
  input: Omit<KyHandoffPayload, "version" | "createdAt" | "expiresAt">,
  now: Date = new Date(),
): KyHandoffPayload {
  const createdAt = now.toISOString();
  return {
    ...input,
    version: 1,
    createdAt,
    expiresAt: new Date(now.getTime() + KY_HANDOFF_TTL_MS).toISOString(),
  };
}

export function writeKyHandoff(payload: KyHandoffPayload): boolean {
  if (typeof window === "undefined") return false;
  const safe = validateKyHandoffPayload(payload);
  if (!safe) return false;
  setPendingKyHandoff(safe);
  return true;
}

function readMemoryKyHandoff(
  expectedSource?: KyHandoffSource,
): KyHandoffPayload | null {
  const safe = validateKyHandoffPayload(getPendingKyHandoff());
  if (!safe) {
    setPendingKyHandoff(null);
    return null;
  }
  setPendingKyHandoff(safe);
  return !expectedSource || safe.source === expectedSource ? safe : null;
}

function readLegacyKyHandoff(
  expectedSource?: KyHandoffSource,
): KyHandoffPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KY_HANDOFF_STORAGE_KEY);
    if (!raw) return null;
    const parsed = validateKyHandoffPayload(JSON.parse(raw));
    if (!parsed) {
      window.sessionStorage.removeItem(KY_HANDOFF_STORAGE_KEY);
      return null;
    }
    return !expectedSource || parsed.source === expectedSource ? parsed : null;
  } catch {
    return null;
  }
}

export function readKyHandoff(
  expectedSource?: KyHandoffSource,
): KyHandoffPayload | null {
  return (
    readMemoryKyHandoff(expectedSource) ??
    readLegacyKyHandoff(expectedSource)
  );
}

function sourceFromParams(params: URLSearchParams): KyHandoffSource | null {
  const source = params.get("source");
  if (SOURCES.includes(source as KyHandoffSource)) {
    return source as KyHandoffSource;
  }
  if (params.get("topic") === "heat-illness") return "heat";
  if (params.get("import") === "visual-kyt") return "visual-kyt";
  if (params.get("import") === "meeting-record") return "meeting";
  if (params.has("fromAccident")) return "accident";
  return null;
}

function labelForSource(source: KyHandoffSource): string {
  switch (source) {
    case "heat":
      return "熱中症・暑さ情報を候補として読み込みました。";
    case "risk":
      return "今日の現場リスクを候補として読み込みました。";
    case "accident":
      return "公開事故の事故型を候補として読み込みました。";
    case "visual-kyt":
      return "reviewed Visual KYTを候補として読み込みました。";
    case "chemical-ra":
      return "確認済み化学物質条件を候補として読み込みました。";
    case "meeting":
      return "工程打合せ書の作業・危険・指示を候補として読み込みました。";
    default:
      return "前の画面の条件を候補として読み込みました。";
  }
}

function sessionMatchesLocation(
  session: KyHandoffPayload,
  source: KyHandoffSource,
  params: URLSearchParams,
): boolean {
  const queryArea = params.get("area");
  if (queryArea && session.areaId !== queryArea) return false;
  if (source === "visual-kyt") {
    const scenario = params.get("scenario");
    return Boolean(scenario && session.scenarioId === scenario);
  }
  if (source === "accident") {
    const id = params.get("fromAccident") ?? params.get("accidentId");
    const type = params.get("accidentType");
    return Boolean(
      id &&
        type &&
        session.accidentId === id &&
        session.accidentType === type,
    );
  }
  if (source === "chemical-ra") {
    const chemical = params.get("chemical");
    const cas = params.get("cas");
    if (!chemical && !cas) return false;
    return (
      (!chemical || session.chemicalId === chemical) &&
      (!cas || session.cas === cas)
    );
  }
  return true;
}

export function parseKyHandoffFromLocation(
  search: string,
): ParsedKyHandoff | null {
  const params = new URLSearchParams(search);
  const explicitSource = sourceFromParams(params);
  const memory = readMemoryKyHandoff();
  const source = explicitSource ?? memory?.source ?? null;
  if (!source) return null;
  const storedSession =
    memory?.source === source
      ? memory
      : explicitSource
        ? readLegacyKyHandoff(source)
        : null;
  const session =
    storedSession &&
    (!explicitSource || sessionMatchesLocation(storedSession, source, params))
      ? storedSession
      : null;
  if (storedSession && !session) {
    if (storedSession === memory) setPendingKyHandoff(null);
  }
  if (
    storedSession &&
    !session &&
    storedSession !== memory &&
    typeof window !== "undefined"
  ) {
    window.sessionStorage.removeItem(KY_HANDOFF_STORAGE_KEY);
  }
  const queryArea = params.get("area");
  const areaId =
    session?.areaId ??
    (queryArea && isCanonicalAreaId(queryArea) ? queryArea : null);
  const scenario = params.get("scenario");
  const scenarioId =
    session?.scenarioId ??
    (scenario && Object.hasOwn(SCENARIO_HAZARDS, scenario) ? scenario : null);
  const accidentTypeParam = params.get("accidentType");
  const accidentType =
    session?.accidentType ??
    (ACCIDENT_TYPES.includes(accidentTypeParam as KySafeAccidentType)
      ? (accidentTypeParam as KySafeAccidentType)
      : undefined);
  const accidentIdParam = params.get("fromAccident") ?? params.get("accidentId");
  const accidentId =
    session?.accidentId ??
    (validPublicId(accidentIdParam) ? accidentIdParam : undefined);
  const chemicalParam = params.get("chemical");
  const chemicalId =
    session?.chemicalId ??
    (validPublicId(chemicalParam) ? chemicalParam : undefined);
  const cas = session?.cas ?? (validCas(params.get("cas")) ? params.get("cas")! : undefined);
  const workCategoryParam = params.get("workCategory");
  const workCategory =
    session?.workCategory ??
    (WORK_CATEGORIES.includes(workCategoryParam as KySafeWorkCategory)
      ? (workCategoryParam as KySafeWorkCategory)
      : null);

  // source名だけ、または生文字列の公開IDだけでは引継ぎと認めない。
  // 検証済みID/enumか、直前画面が作った同一origin session payloadを必須にする。
  if (source === "accident" && (!session || !accidentId || !accidentType)) return null;
  if (source === "visual-kyt" && !scenarioId) return null;
  if (source === "chemical-ra" && (!session || (!chemicalId && !cas))) return null;
  if (source === "risk" && !session && !areaId) return null;
  if (source === "meeting" && !session) return null;

  const sourceHazards =
    source === "heat"
      ? ["heat-illness"]
      : source === "visual-kyt" && scenarioId
        ? SCENARIO_HAZARDS[scenarioId] ?? []
        : source === "accident" && accidentType
          ? ACCIDENT_HAZARDS[accidentType]
          : source === "chemical-ra" && (chemicalId || cas)
            ? ["chemical-exposure", "chemical-splash"]
            : [];
  const hazardIds = [
    ...new Set([...(session?.hazardIds ?? []), ...sourceHazards]),
  ];
  const sourceId =
    scenarioId ?? accidentId ?? chemicalId ?? cas ?? areaId ?? null;
  const parsed: ParsedKyHandoff = {
    source,
    sourceId,
    label: labelForSource(source),
    areaId,
    weather: session?.weather ?? null,
    hazardIds,
    hazardDrafts: session?.hazardDrafts ?? [],
    measureIds: session?.measureIds ?? [],
    measureDrafts: session?.measureDrafts ?? [],
    workDraft: session?.workDraft ?? null,
    workCategory,
  };
  // 引継ぎ本文はone-shot。現行UIはmodule memoryだけを使い、旧版が残した
  // sessionStorage payloadも読取後に削除する。
  if (session && typeof window !== "undefined") {
    if (session === memory) setPendingKyHandoff(null);
    window.sessionStorage.removeItem(KY_HANDOFF_STORAGE_KEY);
  }
  return parsed;
}

export function safeKyHandoffHref(input: {
  source: KyHandoffSource;
  areaId?: string | null;
  accidentId?: string | null;
  accidentType?: KySafeAccidentType | null;
  workCategory?: KySafeWorkCategory | null;
  scenarioId?: string | null;
  chemicalId?: string | null;
  cas?: string | null;
}): string {
  const params = new URLSearchParams({ source: input.source });
  if (input.areaId && isCanonicalAreaId(input.areaId)) {
    params.set("area", input.areaId);
  }
  if (input.accidentId && validPublicId(input.accidentId)) {
    params.set("fromAccident", input.accidentId);
  }
  if (input.accidentType && ACCIDENT_TYPES.includes(input.accidentType)) {
    params.set("accidentType", input.accidentType);
  }
  if (input.workCategory && WORK_CATEGORIES.includes(input.workCategory)) {
    params.set("workCategory", input.workCategory);
  }
  if (input.scenarioId && Object.hasOwn(SCENARIO_HAZARDS, input.scenarioId)) {
    params.set("scenario", input.scenarioId);
  }
  if (input.chemicalId && validPublicId(input.chemicalId)) {
    params.set("chemical", input.chemicalId);
  }
  if (input.cas && validCas(input.cas)) params.set("cas", input.cas);
  return `/ky/paper?${params.toString()}`;
}
