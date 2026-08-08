export type KySuggestionContextInput = {
  workContent?: unknown;
  /** Authoritative schema-v2 operational context. */
  context?: unknown;
  /** Legacy flat fields remain accepted for existing clients. */
  workLocation?: unknown;
  peopleCount?: unknown;
  plannedPeopleCount?: unknown;
  weather?: unknown;
  equipment?: unknown;
  heavyEquipment?: unknown;
  simultaneousWork?: unknown;
  changes?: unknown;
  newEntrants?: unknown;
  nightWork?: unknown;
  chemicals?: unknown;
  heatStress?: unknown;
};

export type KySuggestionContext = {
  workContent: string;
  workLocation: string;
  equipment: string;
  heavyEquipment: string;
  plannedPeopleCount: string;
  weather: string;
  simultaneousWork: string;
  changes: string;
  newEntrants: string;
  nightWork: string;
  chemicals: string;
  heatStress: string;
};

const LABELS: Record<keyof KySuggestionContext, string> = {
  workContent: "作業",
  workLocation: "場所",
  equipment: "設備・機械",
  heavyEquipment: "重機",
  plannedPeopleCount: "人数",
  weather: "天候",
  simultaneousWork: "同時作業",
  changes: "変更点",
  newEntrants: "新規入場者",
  nightWork: "夜間作業",
  chemicals: "化学物質",
  heatStress: "熱中症条件",
};

function normalizeValue(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Prefer the authoritative schema-v2 context and fall back to legacy flat
 * fields. reviewerName/reviewedAt are deliberately excluded from AI transfer.
 */
export function flattenKySuggestionContextInput(
  input: KySuggestionContextInput,
): Record<keyof KySuggestionContext, unknown> {
  const context = asRecord(input.context);
  return {
    workContent: input.workContent,
    workLocation: context.workLocation ?? input.workLocation,
    equipment: context.equipment ?? input.equipment,
    heavyEquipment: context.heavyEquipment ?? input.heavyEquipment,
    plannedPeopleCount:
      context.plannedPeopleCount ??
      input.plannedPeopleCount ??
      input.peopleCount,
    weather: context.weather ?? input.weather,
    simultaneousWork: context.simultaneousWork ?? input.simultaneousWork,
    changes: context.changes ?? input.changes,
    newEntrants: context.newEntrants ?? input.newEntrants,
    nightWork: context.nightWork ?? input.nightWork,
    chemicals: context.chemicals ?? input.chemicals,
    heatStress: context.heatStress ?? input.heatStress,
  };
}

export function parseKySuggestionContext(input: KySuggestionContextInput): {
  context: KySuggestionContext | null;
  missing: string[];
} {
  const flattened = flattenKySuggestionContextInput(input);
  const context = Object.fromEntries(
    (Object.keys(flattened) as Array<keyof KySuggestionContext>).map(
      (key) => [key, normalizeValue(flattened[key])],
    ),
  ) as KySuggestionContext;
  const missing = (Object.keys(context) as Array<keyof KySuggestionContext>)
    .filter((key) => context[key].length === 0)
    .map((key) => LABELS[key]);
  return { context: missing.length === 0 ? context : null, missing };
}

export function buildKySuggestionPromptContext(context: KySuggestionContext): string {
  return [
    `作業: ${context.workContent}`,
    `場所: ${context.workLocation}`,
    `設備・機械: ${context.equipment}`,
    `重機: ${context.heavyEquipment}`,
    `人数: ${context.plannedPeopleCount}`,
    `天候: ${context.weather}`,
    `同時作業: ${context.simultaneousWork}`,
    `変更点: ${context.changes}`,
    `新規入場者: ${context.newEntrants}`,
    `夜間作業: ${context.nightWork}`,
    `化学物質: ${context.chemicals}`,
    `熱中症条件: ${context.heatStress}`,
  ].join("\n");
}
