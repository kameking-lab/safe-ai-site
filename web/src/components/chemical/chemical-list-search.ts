import type { ChemicalSubstance } from "@/data/mock/chemical-substances-db";
import type { MergedChemical } from "@/lib/mhlw-chemicals";
import type { ChemicalCategory } from "@/data/mock/chemical-substances-db";
import type { RegulationTag } from "@/lib/regulation-tag-labels";

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ja-JP").replace(/\s+/gu, "").trim();
}

function identityRank(query: string, identities: readonly (string | null | undefined)[]): number | null {
  const values = identities.filter((value): value is string => Boolean(value)).map(normalize);
  if (values.some((value) => value === query)) return 0;
  if (values.some((value) => value.startsWith(query))) return 1;
  if (values.some((value) => value.includes(query))) return 2;
  return null;
}

/** Preserve source order within each relevance tier. */
export function rankChemicalMatches<T>(
  items: readonly T[],
  rawQuery: string,
  identities: (item: T) => readonly (string | null | undefined)[],
  otherFields?: (item: T) => readonly string[],
): T[] {
  const query = normalize(rawQuery);
  if (!query) return [...items];
  return items
    .map((item, index) => {
      const rank = identityRank(query, identities(item));
      const otherMatch = otherFields?.(item).some((field) => normalize(field).includes(query)) ?? false;
      return { item, index, rank: rank ?? (otherMatch ? 3 : null) };
    })
    .filter((entry): entry is { item: T; index: number; rank: number } => entry.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ item }) => item);
}

export function rankMergedChemicals(items: readonly MergedChemical[], query: string): MergedChemical[] {
  return rankChemicalMatches(items, query, (item) => [item.primaryName, item.cas, ...item.aliases]);
}

export function rankCuratedChemicals(items: readonly ChemicalSubstance[], query: string): ChemicalSubstance[] {
  return rankChemicalMatches(
    items,
    query,
    (item) => [item.name, item.name_en, item.cas, ...(item.synonyms ?? [])],
    (item) => [item.uses, item.health_effects, ...item.categories, ...item.related_laws],
  );
}

export type ChemicalListSnapshot = {
  sourcePathAndSearch: string;
  mode: "curated" | "mhlw";
  query: string;
  category: ChemicalCategory | "";
  skinOnly: boolean;
  selectedTags: RegulationTag[];
  tagMatchMode: "and" | "or";
  constructionOnly: boolean;
  scrollY: number;
};

type StagedSnapshot = { value: ChemicalListSnapshot; stagedAt: number };
const KEY = "__safeAiChemicalListSnapshotV1" as const;
const MAX_AGE_MS = 30 * 60 * 1000;

type SnapshotWindow = Window & { [KEY]?: StagedSnapshot };

/** One-tab memory only; never serialize free-form queries into a URL, history state or storage. */
export function stageChemicalListSnapshot(value: ChemicalListSnapshot): void {
  if (typeof window === "undefined") return;
  (window as SnapshotWindow)[KEY] = { value, stagedAt: Date.now() };
}

export function consumeChemicalListSnapshot(): ChemicalListSnapshot | null {
  if (typeof window === "undefined") return null;
  const scope = window as SnapshotWindow;
  const staged = scope[KEY];
  delete scope[KEY];
  return staged && Date.now() - staged.stagedAt <= MAX_AGE_MS ? staged.value : null;
}
