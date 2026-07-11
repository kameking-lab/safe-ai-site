/**
 * GET /api/chemical/legal-profile?q=<CAS または 名称>
 *
 * 一窓化（2026-07-11）の法令結論API。物質のCAS番号または名称（溶接ヒューム等の
 * CASレス告示名・群指定名を含む）を受け、正本突合済みの法令プロファイル＋
 * 事業者の主要義務を返す。クライアントに正本スナップショットを同梱せずに
 * 「該当法令の結論カード」を出すためのサーバー側解決点。
 *
 * 応答（resolved=true）:
 *   { resolved, key, label, casless, designations, oshaTags, specialControl,
 *     raTarget, checkups, duties, hierarchy }
 * 応答（resolved=false）= 法令索引に突合キーが無い（収載外の明示はUI側）
 */
import { NextRequest, NextResponse } from "next/server";
import {
  buildSubstanceLegalProfile,
  type LegalDesignation,
} from "@/data/legal/substance-legal-profile";
import {
  oshaTagsForCas,
  isSpecialControlSubstance,
  type RegulationTag,
} from "@/lib/regulation-tag-labels";
import { healthCheckupsFromTags } from "@/lib/chemical/health-checkup-from-tags";
import { resolveLegalEntity } from "@/lib/chemical/legal-entity-resolver";
import {
  DUTIES_BY_TAG,
  DOKUGEKI_DUTIES,
  KAKANHO_DUTIES,
  RA_TARGET_DUTIES,
  HIERARCHY_OF_CONTROLS,
  type LegalDuty,
} from "@/lib/chemical/legal-duties";
import { CONCENTRATION_LIMITS, getAllMergedChemicals } from "@/lib/mhlw-chemicals";

function dutiesFor(
  tags: RegulationTag[],
  designations: readonly LegalDesignation[],
  raTarget: boolean,
): { group: string; items: LegalDuty[] }[] {
  const groups: { group: string; items: LegalDuty[] }[] = [];
  const seenGroup = new Set<string>();
  for (const t of tags) {
    const d = DUTIES_BY_TAG[t];
    if (!d) continue;
    const label = t.startsWith("tokutei")
      ? "特定化学物質障害予防規則（特化則）"
      : t.startsWith("yuki")
        ? "有機溶剤中毒予防規則（有機則）"
        : t === "namari"
          ? "鉛中毒予防規則"
          : t === "yonalkyl"
            ? "四アルキル鉛中毒予防規則"
            : t === "sekimen"
              ? "石綿障害予防規則"
              : t === "funjin"
                ? "粉じん障害防止規則"
                : t === "sankketsu"
                  ? "酸素欠乏症等防止規則"
                  : t;
    if (seenGroup.has(label)) continue;
    seenGroup.add(label);
    groups.push({ group: label, items: d });
  }
  if (designations.some((x) => x.domain === "dokugeki" && x.status === "designated")) {
    groups.push({ group: "毒物及び劇物取締法", items: DOKUGEKI_DUTIES });
  }
  const prtr = designations.filter(
    (x) => x.domain === "kakanho-prtr" && x.status === "designated",
  );
  if (prtr.some((x) => x.classification === "第一種指定化学物質")) {
    groups.push({ group: "化管法（PRTR 第一種）", items: KAKANHO_DUTIES[1] });
  } else if (prtr.length > 0) {
    groups.push({ group: "化管法（第二種指定化学物質）", items: KAKANHO_DUTIES[2] });
  }
  if (raTarget) {
    groups.unshift({ group: "リスクアセスメント対象物（安衛法）", items: RA_TARGET_DUTIES });
  }
  return groups;
}

/** ラベル・SDS義務（リスクアセスメント対象物）該否を統合DBのフラグから引く */
function raTargetFor(key: string, label: string): boolean {
  const all = getAllMergedChemicals();
  const byCas = all.find((m) => m.cas === key);
  if (byCas) return byCas.flags.label_sds;
  const byName = all.find((m) => m.cas === null && m.primaryName === label);
  return byName?.flags.label_sds ?? false;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.slice(0, 120) ?? "";
  const entity = resolveLegalEntity(q);
  if (!entity) {
    return NextResponse.json(
      { resolved: false },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=86400" } },
    );
  }
  const profile = buildSubstanceLegalProfile(entity.key);
  const tags = oshaTagsForCas(entity.key);
  const clEntry = CONCENTRATION_LIMITS.substances[entity.key];
  const mergedTags = [...new Set([...(clEntry?.regulationTags ?? []), ...tags])];
  const checkups = healthCheckupsFromTags(mergedTags, entity.key);
  const designations = profile?.designations ?? [];
  const raTarget = raTargetFor(entity.key, entity.label);
  return NextResponse.json(
    {
      resolved: true,
      key: entity.key,
      label: entity.label,
      casless: entity.casless,
      matchedBy: entity.matchedBy,
      designations,
      oshaTags: tags,
      specialControl: isSpecialControlSubstance(entity.key),
      raTarget,
      checkups,
      duties: dutiesFor(tags, designations, raTarget),
      hierarchy: HIERARCHY_OF_CONTROLS,
      hasIndexEntry: profile != null,
    },
    { status: 200, headers: { "Cache-Control": "public, s-maxage=86400" } },
  );
}
