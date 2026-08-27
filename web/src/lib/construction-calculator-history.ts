import type { CalculationResult, PortableValue } from "@/lib/construction-calculators/types";

export const CONSTRUCTION_CALCULATOR_HISTORY_KEY = "anzen-ai:construction-calculators:history:v1";
export const CONSTRUCTION_CALCULATOR_HISTORY_DAYS = 31;
export const CONSTRUCTION_CALCULATOR_HISTORY_LIMIT = 20;

export type ConstructionCalculatorHistoryEntry = {
  id: string;
  slug: string;
  title: string;
  createdAt: string;
  input: Record<string, PortableValue>;
  result: CalculationResult;
};

export function pruneConstructionCalculatorHistory(
  entries: ConstructionCalculatorHistoryEntry[],
  now = new Date(),
): ConstructionCalculatorHistoryEntry[] {
  const cutoff = now.getTime() - CONSTRUCTION_CALCULATOR_HISTORY_DAYS * 24 * 60 * 60 * 1_000;
  return entries
    .filter((entry) => {
      const created = Date.parse(entry.createdAt);
      return Number.isFinite(created) && created >= cutoff && created <= now.getTime() + 60_000;
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, CONSTRUCTION_CALCULATOR_HISTORY_LIMIT);
}

export function loadConstructionCalculatorHistory(
  storage: Pick<Storage, "getItem" | "setItem">,
  now = new Date(),
): ConstructionCalculatorHistoryEntry[] {
  try {
    const parsed = JSON.parse(storage.getItem(CONSTRUCTION_CALCULATOR_HISTORY_KEY) ?? "[]") as unknown;
    const entries = Array.isArray(parsed) ? (parsed as ConstructionCalculatorHistoryEntry[]) : [];
    const pruned = pruneConstructionCalculatorHistory(entries, now);
    storage.setItem(CONSTRUCTION_CALCULATOR_HISTORY_KEY, JSON.stringify(pruned));
    return pruned;
  } catch {
    storage.setItem(CONSTRUCTION_CALCULATOR_HISTORY_KEY, "[]");
    return [];
  }
}

export function addConstructionCalculatorHistory(
  storage: Pick<Storage, "getItem" | "setItem">,
  entry: ConstructionCalculatorHistoryEntry,
  now = new Date(),
): ConstructionCalculatorHistoryEntry[] {
  const current = loadConstructionCalculatorHistory(storage, now);
  const next = pruneConstructionCalculatorHistory(
    [entry, ...current.filter((item) => item.id !== entry.id)],
    now,
  );
  storage.setItem(CONSTRUCTION_CALCULATOR_HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function removeConstructionCalculatorHistory(
  storage: Pick<Storage, "getItem" | "setItem">,
  id: string,
  now = new Date(),
): ConstructionCalculatorHistoryEntry[] {
  const next = loadConstructionCalculatorHistory(storage, now).filter((entry) => entry.id !== id);
  storage.setItem(CONSTRUCTION_CALCULATOR_HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function clearConstructionCalculatorHistory(storage: Pick<Storage, "setItem">): [] {
  storage.setItem(CONSTRUCTION_CALCULATOR_HISTORY_KEY, "[]");
  return [];
}
