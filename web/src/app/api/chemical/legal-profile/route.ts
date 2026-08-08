/**
 * POST /api/chemical/legal-profile { q: <CAS または 名称> }
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
import { checkRaTargetByName, RA_TARGET_NAMES_META } from "@/data/legal/ra-target-names";
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
): {
  group: string;
  applicability: "undetermined";
  items: LegalDuty[];
}[] {
  const groups: {
    group: string;
    applicability: "undetermined";
    items: LegalDuty[];
  }[] = [];
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
    groups.push({
      group: label,
      applicability: "undetermined",
      items: d,
    });
  }
  if (designations.some((x) => x.domain === "dokugeki" && x.status === "designated")) {
    groups.push({
      group: "毒物及び劇物取締法",
      applicability: "undetermined",
      items: DOKUGEKI_DUTIES,
    });
  }
  const prtr = designations.filter(
    (x) => x.domain === "kakanho-prtr" && x.status === "designated",
  );
  if (prtr.some((x) => x.classification === "第一種指定化学物質")) {
    groups.push({
      group: "化管法（PRTR 第一種）",
      applicability: "undetermined",
      items: KAKANHO_DUTIES[1],
    });
  } else if (prtr.length > 0) {
    groups.push({
      group: "化管法（第二種指定化学物質）",
      applicability: "undetermined",
      items: KAKANHO_DUTIES[2],
    });
  }
  if (raTarget) {
    groups.unshift({
      group: "リスクアセスメント対象物（安衛法）",
      applicability: "undetermined",
      items: RA_TARGET_DUTIES,
    });
  }
  return groups;
}

const APPLICABILITY_REQUIRED_CONDITIONS = [
  "最新SDSの製品名・発行日・成分・各成分の含有率",
  "作業内容、取扱量、年間取扱量、作業時間、頻度、使用温度",
  "屋内外、密閉・タンク内、飛散・噴霧、局所排気・全体換気の状況",
  "混合物としての裾切値、適用除外、用途・工程ごとの適用条件",
  "事業者の業種・規模、作業者と監督者の立場、対象作業への従事状況",
] as const;

/** ラベル・SDS義務（リスクアセスメント対象物）該否を統合DBのフラグから引く */
function raTargetFor(key: string, label: string): boolean {
  const all = getAllMergedChemicals();
  const byCas = all.find((m) => m.cas === key);
  if (byCas) return byCas.flags.label_sds;
  const byName = all.find((m) => m.cas === null && m.primaryName === label);
  return byName?.flags.label_sds ?? false;
}

async function respondToLegalProfileQuery(
  q: string,
  cacheControl: string,
) {
  const entity = resolveLegalEntity(q);
  if (!entity) {
    return NextResponse.json(
      { resolved: false },
      { status: 200, headers: { "Cache-Control": cacheControl } },
    );
  }
  const profile = buildSubstanceLegalProfile(entity.key);
  const tags = oshaTagsForCas(entity.key);
  const clEntry = CONCENTRATION_LIMITS.substances[entity.key];
  const mergedTags = [...new Set([...(clEntry?.regulationTags ?? []), ...tags])];
  const checkups = healthCheckupsFromTags(mergedTags, entity.key);
  const designations = [...(profile?.designations ?? [])];

  // RA対象物（表示・通知対象物）の該否（P1-9）:
  // 統合DBのフラグ（CASベース）→ 無ければ名称突合（令別表第9＋安衛則別表第2）。
  // CASレス告示名（溶接ヒューム等）も designated / not-designated / unverified の
  // 3値で正直に返す（#874 で断定を避けていた箇所の解消）。
  const flagsRa = raTargetFor(entity.key, entity.label);
  const nameRa = checkRaTargetByName(entity.label);
  const raTarget = flagsRa || nameRa.status === "designated";
  designations.push(
    flagsRa && nameRa.status !== "designated"
      ? {
          domain: "anei-ra",
          status: "designated",
          classification: "リスクアセスメント対象物（表示・通知対象物）",
          scopeNote: "厚労省 表示・通知対象物質リスト（統合DBのCAS収載）に基づく",
          verifiedAt: RA_TARGET_NAMES_META.retrievedAt,
        }
      : {
          domain: "anei-ra",
          status: nameRa.status,
          ...(nameRa.status === "designated"
            ? { classification: "リスクアセスメント対象物（表示・通知対象物）" }
            : {}),
          ...(nameRa.basis ? { basis: nameRa.basis } : {}),
          ...(nameRa.scopeNote ? { scopeNote: nameRa.scopeNote } : {}),
          ...(nameRa.status !== "unverified"
            ? { verifiedAt: RA_TARGET_NAMES_META.retrievedAt }
            : {}),
        },
  );

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
      applicabilityDecision: "undetermined",
      applicabilityRequiredConditions: APPLICABILITY_REQUIRED_CONDITIONS,
      applicabilityNote:
        "CAS番号または物質名の収載状況だけでは、作業主任者、作業環境測定、特殊健康診断、PRTR届出その他の義務を確定できません。",
      checkupApplicability: "undetermined",
      checkups,
      duties: dutiesFor(tags, designations, raTarget),
      hierarchy: HIERARCHY_OF_CONTROLS,
      hasIndexEntry: profile != null,
    },
    { status: 200, headers: { "Cache-Control": cacheControl } },
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const q =
    body && typeof body === "object" && "q" in body && typeof body.q === "string"
      ? body.q.slice(0, 120)
      : "";
  return respondToLegalProfileQuery(q, "private, no-store");
}

export function GET() {
  return NextResponse.json(
    { error: "method_not_allowed" },
    {
      status: 405,
      headers: { Allow: "POST", "Cache-Control": "no-store" },
    },
  );
}
