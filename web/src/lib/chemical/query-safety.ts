import { inspectAiOutbound } from "@/lib/ai-outbound-safety";

export const CHEMICAL_QUERY_MAX_CHARS = 120;

export type ChemicalQueryInspection =
  | { allowed: true; normalized: string }
  | {
      allowed: false;
      reason: "empty" | "sensitive";
    };

/**
 * Chemical names and CAS numbers may be placed in a noindex URL so the RA
 * screen can start without re-entry. Reject direct identifiers, health data,
 * emergency descriptions and confidential site/company text before that URL,
 * request log or search request can be created.
 */
export function inspectChemicalNavigationQuery(
  rawValue: unknown,
): ChemicalQueryInspection {
  if (typeof rawValue !== "string") {
    return { allowed: false, reason: "empty" };
  }
  const normalized = rawValue
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, CHEMICAL_QUERY_MAX_CHARS);
  if (!normalized) return { allowed: false, reason: "empty" };

  const decision = inspectAiOutbound({
    purpose: "chemical-navigation-query",
    texts: [normalized],
    consent: true,
    maxChars: CHEMICAL_QUERY_MAX_CHARS,
    contextPolicy: "no-context",
  });
  return decision.allowed
    ? { allowed: true, normalized }
    : { allowed: false, reason: "sensitive" };
}
