import type { AccidentCase, AccidentSource } from "@/lib/types/domain";

const MHLW_ANZEN_SITE = "職場のあんぜんサイト";
const MHLW_ANZEN_BASE = "https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx";
const MHLW_ID_PATTERN = /^mhlw-(\d+)$/;

export function resolveAccidentSource(accident: AccidentCase): AccidentSource | null {
  if (accident.source) return accident.source;

  const mhlwMatch = MHLW_ID_PATTERN.exec(accident.id);
  if (mhlwMatch) {
    const caseId = mhlwMatch[1];
    return {
      site: MHLW_ANZEN_SITE,
      caseId,
      url: `${MHLW_ANZEN_BASE}?joho_no=${caseId}`,
    };
  }

  if (accident.id.startsWith("industry-")) {
    return { site: "当サイト独自収集事例（業種網羅分）" };
  }

  return null;
}
