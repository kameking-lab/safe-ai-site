import { KY_EXAMPLES } from "@/data/ky-examples";
import type {
  KyExample,
  KyIndustryId,
  KyWorkTypeId,
} from "@/types/ky-example";

const HISTORY_KEY = "ky-suggestion-history-v1";
const HISTORY_MAX = 20;

export type KySuggestionHistoryEntry = {
  exampleId: string;
  at: number;
};

export type KySuggestionResult = {
  example: KyExample;
  /** 0-100, higher = better match. */
  score: number;
  /** Reasons used to compute the score (for UI tooltips). */
  matchedOn: ("industry" | "workType" | "keyword" | "history")[];
};

export type SuggestKyOptions = {
  industry?: KyIndustryId;
  workType?: KyWorkTypeId;
  /** Free-text from the work content cell — keywords are extracted. */
  freeText?: string;
  /** Recent history entries (most recent first). Pass [] to disable. */
  history?: KySuggestionHistoryEntry[];
  /** Maximum number of suggestions to return. */
  limit?: number;
};

/**
 * Suggest KY examples ranked by industry/work-type match, keyword overlap with
 * freeText, and prior usage from history.
 *
 * Returns at most `limit` results (default 12), sorted by descending score.
 * When no filter is provided, the result is empty rather than dumping the
 * whole dataset — callers should require at least one signal.
 */
export function suggestKyByIndustryAndWork(
  options: SuggestKyOptions
): KySuggestionResult[] {
  const {
    industry,
    workType,
    freeText,
    history = [],
    limit = 12,
  } = options;

  const noSignal =
    !industry && !workType && !freeText?.trim() && history.length === 0;
  if (noSignal) return [];

  const keywords = extractKeywords(freeText ?? "");
  const historyIds = new Set(history.map((h) => h.exampleId));
  const historyMostRecent = new Map(
    history.map((h, idx) => [h.exampleId, history.length - idx])
  );

  const results: KySuggestionResult[] = [];

  for (const ex of KY_EXAMPLES) {
    const matchedOn: KySuggestionResult["matchedOn"] = [];
    let score = 0;

    if (industry) {
      if (ex.industry === industry) {
        score += 50;
        matchedOn.push("industry");
      } else {
        // Hard filter — non-matching industry never appears when industry is set.
        continue;
      }
    }

    if (workType) {
      if (ex.workType === workType) {
        score += 40;
        matchedOn.push("workType");
      } else if (industry) {
        // When BOTH industry and workType are specified, treat workType as a hard
        // filter as well — users explicitly asked for "industry X + work type Y".
        continue;
      } else {
        // workType only, no industry — keep partial matches but at much lower score.
        continue;
      }
    }

    if (keywords.length > 0) {
      const kwScore = scoreKeywords(ex, keywords);
      if (kwScore > 0) {
        score += kwScore;
        matchedOn.push("keyword");
      }
    }

    if (historyIds.has(ex.id)) {
      const rank = historyMostRecent.get(ex.id) ?? 0;
      const historyBoost = Math.min(8, rank);
      score += historyBoost;
      matchedOn.push("history");
    }

    if (score > 0) {
      results.push({ example: ex, score, matchedOn });
    }
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.example.id.localeCompare(b.example.id);
  });

  return results.slice(0, limit);
}

function scoreKeywords(ex: KyExample, keywords: string[]): number {
  const haystack = [
    ex.title,
    ex.keywords.join(" "),
    ex.hazards.join(" "),
    ex.risks.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  let total = 0;
  for (const kw of keywords) {
    if (!kw) continue;
    if (haystack.includes(kw.toLowerCase())) total += 5;
  }
  return Math.min(total, 25);
}

function extractKeywords(text: string): string[] {
  if (!text.trim()) return [];
  return text
    .split(/[\s　・、。.,（）()「」『』【】\[\]\\\/!?！？]+/g)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
    .slice(0, 12);
}

// ── localStorage history helpers ─────────────────────────────────────
export function loadKySuggestionHistory(): KySuggestionHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is KySuggestionHistoryEntry =>
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as Record<string, unknown>).exampleId === "string" &&
          typeof (entry as Record<string, unknown>).at === "number"
      )
      .slice(0, HISTORY_MAX);
  } catch {
    return [];
  }
}

export function recordKySuggestionUsage(exampleId: string): void {
  if (typeof window === "undefined") return;
  const existing = loadKySuggestionHistory().filter(
    (e) => e.exampleId !== exampleId
  );
  const next: KySuggestionHistoryEntry[] = [
    { exampleId, at: Date.now() },
    ...existing,
  ].slice(0, HISTORY_MAX);
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("ky-suggestion-history-updated"));
  } catch {
    // localStorage may be unavailable (private mode, quota) — silently skip.
  }
}
