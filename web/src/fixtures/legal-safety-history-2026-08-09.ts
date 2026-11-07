import historical from "./legal-safety-history-2026-08-09.json";
import type { LawArticle } from "@/data/laws/law-types";

/** Test-only frozen August corpus. No production source is promoted to current. */
export function historicalSafetyCorpus(current: LawArticle[]): LawArticle[] {
  const old = new Map<string, LawArticle>(historical.records.map((a) =>
    [`${a.sourceLawId}|${a.articleNum}`, a as LawArticle]));
  const ids = new Set(historical.records.map((a) => a.sourceLawId));
  return current.flatMap((a) => {
    if (!a.sourceLawId || !ids.has(a.sourceLawId)) return [a];
    const record = old.get(`${a.sourceLawId}|${a.articleNum}`);
    return record ? [record] : [];
  });
}
