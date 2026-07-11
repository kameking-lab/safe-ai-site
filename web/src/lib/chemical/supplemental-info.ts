/**
 * CAS 番号 → 管理濃度 / OEL / 健康影響 / GHS の補助テーブル（精選50物質由来）
 *
 * mhlw-chemicals.ts から分離（2026-07-11）: クライアントが補助情報のためだけに
 * 巨大JSON同梱モジュールを import しないようにするための小モジュール。
 */
import { chemicalSubstances } from "@/data/mock/chemical-substances-db";

const supplementalByCas = new Map<
  string,
  {
    oel?: string;
    healthEffects?: string;
    ghs?: string[];
    carcinogenic: boolean;
  }
>();
for (const c of chemicalSubstances) {
  if (!/^\d{2,7}-\d{2,3}-\d{1,2}$/.test(c.cas)) continue;
  const carcinogenic =
    (c.ghs ?? []).some((g) => /発がん性1[AB]?/.test(g)) ||
    /発がん|がん|胆管がん|白血病/.test(c.health_effects);
  supplementalByCas.set(c.cas, {
    oel: c.oel,
    healthEffects: c.health_effects,
    ghs: c.ghs,
    carcinogenic,
  });
}

export function getSupplementalInfo(cas: string | null | undefined) {
  if (!cas) return undefined;
  return supplementalByCas.get(cas);
}
