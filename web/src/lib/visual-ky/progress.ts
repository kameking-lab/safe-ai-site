export const VISUAL_KY_PROGRESS_KEY = "safe-ai:visual-ky-progress:v1";

export const VISUAL_KY_BADGES = {
  first: {
    id: "first",
    label: "はじめてのKYT",
    description: "端末内で最初の1問を完了",
  },
  threeCategories: {
    id: "three-categories",
    label: "3分野修了",
    description: "異なる3分野の問題を完了",
  },
  heat: {
    id: "heat",
    label: "熱中症対策",
    description: "熱中症分野を完了",
  },
  fall: {
    id: "fall",
    label: "墜落防止",
    description: "墜落・足場・高所分野を完了",
  },
  streakSeven: {
    id: "streak-seven",
    label: "7日チャレンジ",
    description: "7日連続でKYTを利用",
  },
} as const;

export type VisualKyBadgeId =
  (typeof VISUAL_KY_BADGES)[keyof typeof VISUAL_KY_BADGES]["id"];
export type VisualKyCoarseResult = "none" | "partial" | "all";

export type VisualKyProgress = {
  version: 1;
  completedScenarioIds: string[];
  coarseResults: Record<string, VisualKyCoarseResult>;
  lastUsedDate: string | null;
  streakDays: number;
  badgeIds: VisualKyBadgeId[];
};

export type VisualKyProgressCatalogItem = {
  id: string;
  categoryTags: readonly string[];
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const EMPTY_VISUAL_KY_PROGRESS: VisualKyProgress = {
  version: 1,
  completedScenarioIds: [],
  coarseResults: {},
  lastUsedDate: null,
  streakDays: 0,
  badgeIds: [],
};

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isScenarioId(value: unknown): value is string {
  return typeof value === "string" && /^vkyt-\d{3}$/.test(value);
}

function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isBadgeId(value: unknown): value is VisualKyBadgeId {
  return Object.values(VISUAL_KY_BADGES).some(
    (badge) => badge.id === value,
  );
}

function sanitizeProgress(value: unknown): VisualKyProgress {
  if (!value || typeof value !== "object") {
    return { ...EMPTY_VISUAL_KY_PROGRESS };
  }
  const candidate = value as Record<string, unknown>;
  const completedScenarioIds = Array.isArray(candidate.completedScenarioIds)
    ? [...new Set(candidate.completedScenarioIds.filter(isScenarioId))].slice(
        0,
        100,
      )
    : [];
  const rawResults =
    candidate.coarseResults &&
    typeof candidate.coarseResults === "object" &&
    !Array.isArray(candidate.coarseResults)
      ? (candidate.coarseResults as Record<string, unknown>)
      : {};
  const coarseResults: Record<string, VisualKyCoarseResult> = {};
  for (const [id, result] of Object.entries(rawResults)) {
    if (
      isScenarioId(id) &&
      (result === "none" || result === "partial" || result === "all")
    ) {
      coarseResults[id] = result;
    }
  }

  return {
    version: 1,
    completedScenarioIds,
    coarseResults,
    lastUsedDate: isDateKey(candidate.lastUsedDate)
      ? candidate.lastUsedDate
      : null,
    streakDays:
      typeof candidate.streakDays === "number" &&
      Number.isInteger(candidate.streakDays)
        ? Math.max(0, Math.min(366, candidate.streakDays))
        : 0,
    badgeIds: Array.isArray(candidate.badgeIds)
      ? [...new Set(candidate.badgeIds.filter(isBadgeId))]
      : [],
  };
}

export function readVisualKyProgress(
  storage: StorageLike | null = browserStorage(),
): { progress: VisualKyProgress; available: boolean } {
  if (!storage) {
    return {
      progress: { ...EMPTY_VISUAL_KY_PROGRESS },
      available: false,
    };
  }
  try {
    const raw = storage.getItem(VISUAL_KY_PROGRESS_KEY);
    if (!raw) {
      return {
        progress: { ...EMPTY_VISUAL_KY_PROGRESS },
        available: true,
      };
    }
    return { progress: sanitizeProgress(JSON.parse(raw)), available: true };
  } catch {
    return {
      progress: { ...EMPTY_VISUAL_KY_PROGRESS },
      available: false,
    };
  }
}

export function writeVisualKyProgress(
  progress: VisualKyProgress,
  storage: StorageLike | null = browserStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(
      VISUAL_KY_PROGRESS_KEY,
      JSON.stringify(sanitizeProgress(progress)),
    );
    return true;
  } catch {
    return false;
  }
}

export function resetVisualKyProgress(
  storage: StorageLike | null = browserStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(VISUAL_KY_PROGRESS_KEY);
    return true;
  } catch {
    return false;
  }
}

function previousDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1))
    .toISOString()
    .slice(0, 10);
}

export function completeVisualKyScenario(input: {
  progress: VisualKyProgress;
  scenarioId: string;
  selectedHazardCount: number;
  totalHazardCount: number;
  dateKey: string;
  catalog: readonly VisualKyProgressCatalogItem[];
}): VisualKyProgress {
  const current = sanitizeProgress(input.progress);
  const completedScenarioIds = [
    ...new Set([...current.completedScenarioIds, input.scenarioId]),
  ];
  const coarseResult: VisualKyCoarseResult =
    input.selectedHazardCount <= 0
      ? "none"
      : input.selectedHazardCount >= input.totalHazardCount
        ? "all"
        : "partial";
  const streakDays =
    current.lastUsedDate === input.dateKey
      ? Math.max(1, current.streakDays)
      : current.lastUsedDate === previousDateKey(input.dateKey)
        ? current.streakDays + 1
        : 1;

  const completedCategories = new Set(
    input.catalog
      .filter((item) => completedScenarioIds.includes(item.id))
      .flatMap((item) => item.categoryTags),
  );
  const badgeIds = new Set<VisualKyBadgeId>(current.badgeIds);
  badgeIds.add(VISUAL_KY_BADGES.first.id);
  if (completedCategories.size >= 3) {
    badgeIds.add(VISUAL_KY_BADGES.threeCategories.id);
  }
  if (completedCategories.has("heat")) {
    badgeIds.add(VISUAL_KY_BADGES.heat.id);
  }
  if (
    ["fall", "scaffold", "high-work-platform"].some((category) =>
      completedCategories.has(category),
    )
  ) {
    badgeIds.add(VISUAL_KY_BADGES.fall.id);
  }
  if (streakDays >= 7) {
    badgeIds.add(VISUAL_KY_BADGES.streakSeven.id);
  }

  return {
    version: 1,
    completedScenarioIds,
    coarseResults: {
      ...current.coarseResults,
      [input.scenarioId]: coarseResult,
    },
    lastUsedDate: input.dateKey,
    streakDays,
    badgeIds: [...badgeIds],
  };
}
