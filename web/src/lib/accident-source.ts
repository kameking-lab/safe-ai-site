import type {
  AccidentCase,
  AccidentProvenance,
  AccidentSource,
} from "@/lib/types/domain";

const MHLW_ID_PATTERN = /^mhlw-(\d+)$/;
/**
 * 本文を同一 joho_no の厚労省個票と人手照合した事例だけを列挙する。
 * ID/URL の形式だけでは追加しないこと。
 */
const VERIFIED_MHLW_CASE_IDS = new Set<string>(["100620"]);

type AccidentSourceIdentity = Pick<
  AccidentCase,
  "id" | "provenance" | "source"
>;

export function hasMatchingMhlwSource(accident: AccidentSourceIdentity): boolean {
  const idMatch = MHLW_ID_PATTERN.exec(accident.id);
  const source = accident.source;
  if (!idMatch || !source?.caseId || !source.url) return false;
  if (source.caseId !== idMatch[1]) return false;
  try {
    const url = new URL(source.url);
    const urlMatches =
      url.protocol === "https:" &&
      url.hostname === "anzeninfo.mhlw.go.jp" &&
      url.pathname === "/anzen_pg/SAI_DET.aspx" &&
      url.searchParams.get("joho_no") === source.caseId;
    return urlMatches && VERIFIED_MHLW_CASE_IDS.has(source.caseId);
  } catch {
    return false;
  }
}

export const ACCIDENT_PROVENANCE_INFO: Record<
  AccidentProvenance,
  { label: string; description: string }
> = {
  mhlw: {
    label: "公表事例（厚労省）",
    description: "厚生労働省「職場のあんぜんサイト」の公開事例を再収録しています。",
  },
  curated: {
    label: "編集再構成",
    description:
      "公開情報をもとに編集部が匿名化・再構成した事例です。公式の個票そのものではありません。",
  },
  synthetic: {
    label: "教材用の想定例",
    description:
      "事故型の学習用に編集部が合成した架空事例です。実際に発生した事故の記録ではありません。",
  },
  preliminary: {
    label: "速報統計ベースの想定例",
    description:
      "厚生労働省の速報集計値から導出した代表パターンです。実際の個票ではなく、確定値でもありません。",
  },
};

export function resolveAccidentProvenance(
  accident: AccidentSourceIdentity,
): AccidentProvenance {
  if (accident.provenance === "mhlw") {
    return hasMatchingMhlwSource(accident) ? "mhlw" : "curated";
  }
  if (accident.provenance) return accident.provenance;
  const id = accident.id.toLowerCase();
  if (
    (id.startsWith("mhlw-") || id.startsWith("mhlw_")) &&
    hasMatchingMhlwSource(accident)
  ) {
    return "mhlw";
  }
  if (id.startsWith("synthetic-")) return "synthetic";
  if (id.startsWith("preliminary-")) return "preliminary";
  return "curated";
}

/**
 * AIによる注意喚起や傾向集計へ利用できる事故参考事例だけを返す。
 *
 * synthetic は教育用の架空事例、preliminary は速報統計から導いた想定例であり、
 * 実在事故の根拠として扱えないため、運用判断へつながる集計・類似検索から除外する。
 */
export function isAccidentEligibleForOperationalEvidence(
  accident: AccidentSourceIdentity,
): boolean {
  return resolveAccidentProvenance(accident) === "mhlw";
}

export function resolveAccidentSource(accident: AccidentCase): AccidentSource | null {
  if (accident.source) return accident.source;

  if (accident.id.startsWith("industry-")) {
    return { site: "当サイト独自収集事例（業種網羅分）" };
  }

  return null;
}
