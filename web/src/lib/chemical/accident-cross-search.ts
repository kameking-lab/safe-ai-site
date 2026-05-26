/**
 * 物質名 × 事故事例DB クロス検索（Phase B P1-3・純粋関数）。
 *
 * 既存の労働災害事例DB（accidentCasesMock）を物質名で横断検索し、
 * /chemical-database/[cas] に「この物質関連の過去事故」を表示するためのヘルパー。
 * 事故事例は質的記述のため、title / summary / mainCauses に物質名を含むものを抽出する。
 */
import type { AccidentCase } from "@/lib/types/domain";

export interface AccidentMatch {
  id: string;
  title: string;
  type: string;
  severity: string;
  occurredOn: string;
}

/**
 * 物質名（および任意の別名）を含む事故事例を抽出する。
 * @param name 物質名（2文字以上で有効。短すぎる名前は誤マッチ防止のため無視）。
 * @param cases 事故事例配列。
 * @param opts.aliases 追加で照合する別名・略称（CAS等）。
 * @param opts.limit 最大件数（既定5）。
 */
export function findAccidentsBySubstance(
  name: string | null | undefined,
  cases: readonly AccidentCase[],
  opts: { aliases?: readonly string[]; limit?: number } = {}
): AccidentMatch[] {
  const limit = opts.limit ?? 5;
  const terms = [name, ...(opts.aliases ?? [])]
    .map((t) => (typeof t === "string" ? t.trim() : ""))
    .filter((t) => t.length >= 2);
  if (terms.length === 0) return [];

  const out: AccidentMatch[] = [];
  for (const c of cases) {
    const haystack = `${c.title}\n${c.summary}\n${(c.mainCauses ?? []).join("\n")}`;
    if (terms.some((t) => haystack.includes(t))) {
      out.push({
        id: c.id,
        title: c.title,
        type: c.type,
        severity: c.severity,
        occurredOn: c.occurredOn,
      });
      if (out.length >= limit) break;
    }
  }
  return out;
}
