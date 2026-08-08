import type { AccidentCase } from "@/lib/types/domain";
import { foldKana, normalizeSearchText } from "@/lib/fuzzy-search";

export type AccidentMatchField =
  | "タイトル"
  | "概要"
  | "事故の型"
  | "作業カテゴリ"
  | "主な原因"
  | "再発防止"
  | "発生状況"
  | "原因詳細"
  | "対策詳細";

export type AccidentSearchResult = {
  accident: AccidentCase;
  score: number;
  matchFields: AccidentMatchField[];
  matchSnippets: string[];
};

const FIELD_WEIGHT: Array<[AccidentMatchField, number]> = [
  ["タイトル", 12],
  ["主な原因", 10],
  ["再発防止", 9],
  ["概要", 7],
  ["発生状況", 6],
  ["原因詳細", 6],
  ["対策詳細", 5],
  ["事故の型", 4],
  ["作業カテゴリ", 3],
];

function normalize(value: string): string {
  return foldKana(normalizeSearchText(value));
}

function fieldValues(accident: AccidentCase): Record<AccidentMatchField, string> {
  const extended = accident as AccidentCase & {
    description?: unknown;
    causes?: unknown;
    countermeasures?: unknown;
    recurrencePrevention?: unknown;
  };
  return {
    タイトル: accident.title,
    概要: accident.summary,
    事故の型: accident.type,
    作業カテゴリ: accident.workCategory,
    主な原因: accident.mainCauses.join(" "),
    再発防止: accident.preventionPoints.join(" "),
    発生状況: typeof extended.description === "string" ? extended.description : "",
    原因詳細: typeof extended.causes === "string" ? extended.causes : "",
    対策詳細: [extended.countermeasures, extended.recurrencePrevention]
      .filter((value): value is string => typeof value === "string")
      .join(" "),
  };
}

function queryTokens(query: string): string[] {
  return normalize(query)
    .split(/[\s、,・/]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function snippet(value: string, token: string): string {
  const normalizedValue = normalize(value);
  const index = normalizedValue.indexOf(token);
  if (index < 0) return value.slice(0, 72);
  const start = Math.max(0, index - 24);
  const end = Math.min(value.length, index + token.length + 48);
  return `${start > 0 ? "…" : ""}${value.slice(start, end)}${end < value.length ? "…" : ""}`;
}

export function rankAccidents(cases: AccidentCase[], query: string): AccidentSearchResult[] {
  const tokens = queryTokens(query);
  if (tokens.length === 0) {
    return cases.map((accident) => ({ accident, score: 0, matchFields: [], matchSnippets: [] }));
  }

  return cases
    .map((accident, originalIndex) => {
      const values = fieldValues(accident);
      const normalizedFields = new Map(
        Object.entries(values).map(([field, value]) => [field as AccidentMatchField, normalize(value)])
      );
      if (!tokens.every((token) => [...normalizedFields.values()].some((value) => value.includes(token)))) {
        return null;
      }
      let score = 0;
      const matchFields: AccidentMatchField[] = [];
      const matchSnippets: string[] = [];
      for (const [field, weight] of FIELD_WEIGHT) {
        const matchedTokens = tokens.filter((token) => normalizedFields.get(field)?.includes(token));
        if (matchedTokens.length === 0) continue;
        matchFields.push(field);
        score += weight * matchedTokens.length;
        matchSnippets.push(`${field}: ${snippet(values[field], matchedTokens[0])}`);
      }
      if (normalize(accident.title) === normalize(query.trim())) score += 20;
      return { accident, score, matchFields, matchSnippets, originalIndex };
    })
    .filter((result): result is AccidentSearchResult & { originalIndex: number } => result !== null)
    .sort((left, right) => right.score - left.score || left.originalIndex - right.originalIndex)
    .map(({ originalIndex: _originalIndex, ...result }) => result);
}

export function precisionAt(results: AccidentSearchResult[], relevantIds: Set<string>, k = 10): number {
  if (k <= 0) return 0;
  const top = results.slice(0, k);
  if (top.length === 0) return 0;
  return top.filter((result) => relevantIds.has(result.accident.id)).length / top.length;
}
