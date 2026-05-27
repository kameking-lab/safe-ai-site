/**
 * 朝礼サイネージ向け 事故啓発ケース選択（Phase B P2-2・純粋関数）。
 *
 * 過去の労働災害事例から、朝礼での安全啓発に使うケースを決定論的に選ぶ。
 * 重大度の高いもの（死亡・重傷）を優先し、事故型の重複を避けて多様性を持たせる。
 * 創作はせず既存事例のみ。seed で日替わり等の安定ローテーションが可能。
 */
import type { AccidentCase } from "@/lib/types/domain";

const SEVERITY_RANK: Record<AccidentCase["severity"], number> = {
  死亡: 3,
  重傷: 2,
  中等傷: 1,
  軽傷: 0,
};

export interface EducationCase {
  id: string;
  title: string;
  type: string;
  severity: string;
  workCategory: string;
  preventionPoint: string;
}

/**
 * 啓発用ケースを選ぶ。
 * @param category 業種で絞る場合（指定時はその業種を優先、不足分は全体から補完）。
 * @param count 件数。
 * @param seed ローテーション用シード（日替わり等）。同seedなら同結果。
 */
export function pickEducationAccidents(
  cases: readonly AccidentCase[],
  opts: { category?: string; count?: number; seed?: number } = {}
): EducationCase[] {
  const count = opts.count ?? 3;
  const pool = opts.category
    ? cases.filter((c) => c.workCategory === opts.category)
    : cases.slice();
  const base = pool.length >= count ? pool : cases.slice();

  // 重大度降順 → 同点はseedで安定シャッフル。
  const seed = opts.seed ?? 0;
  const scored = base.map((c, i) => ({
    c,
    score: SEVERITY_RANK[c.severity] * 1000 + ((i * 31 + seed * 17) % 997) / 1000,
  }));
  scored.sort((a, b) => b.score - a.score);

  // 事故型の重複を避けて多様性を確保。
  const picked: AccidentCase[] = [];
  const seenTypes = new Set<string>();
  for (const { c } of scored) {
    if (picked.length >= count) break;
    if (seenTypes.has(c.type) && picked.length < base.length) continue;
    picked.push(c);
    seenTypes.add(c.type);
  }
  // それでも不足ならスコア順で補完。
  if (picked.length < count) {
    for (const { c } of scored) {
      if (picked.length >= count) break;
      if (!picked.includes(c)) picked.push(c);
    }
  }

  return picked.slice(0, count).map((c) => ({
    id: c.id,
    title: c.title,
    type: c.type,
    severity: c.severity,
    workCategory: c.workCategory,
    preventionPoint: c.preventionPoints[0] ?? "",
  }));
}
