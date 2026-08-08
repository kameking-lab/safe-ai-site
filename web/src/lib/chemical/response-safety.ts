import type { ChemicalRaResponse } from "@/app/api/chemical-ra/route";

export const CHEMICAL_ASSESSMENT_NOTICE =
  "本サイトは作業条件からCREATE-SIMPLEの判定値やばく露濃度を推定しません。製品固有の最新SDS、実測値、厚生労働省の公式CREATE-SIMPLEを使い、化学物質管理者または専門家が確認してください。";

/**
 * 旧版がlocalStorage/クラウドへ保存した独自判定を、再表示時に安全判断へ使わせない。
 * 旧AI応答の各フィールドは出典単位で検証できないため、物質識別子以外を破棄する。
 */
export function sanitizeChemicalRaResponse(
  response: ChemicalRaResponse,
): ChemicalRaResponse {
  if (response.aiStatus === "disabled_for_safety") {
    const { createSimple: _unsafeLegacyScore, ...safe } = response;
    return {
      ...safe,
      assessmentStatus: "unavailable",
      assessmentNotice: CHEMICAL_ASSESSMENT_NOTICE,
    };
  }

  return {
    chemicalName: response.chemicalName,
    casNumber: response.casNumber,
    ghsHazards: [],
    ppeRecommendations: [],
    safetyMeasures: [],
    emergencyMeasures: [],
    regulatoryNotes: [],
    rawReply:
      "この保存記録は旧版の未検証な生成・独自計算を含むため、安全判断用の内容を表示していません。最新SDSと公式ツールで再確認してください。",
    aiStatus: "disabled_for_safety",
    aiErrorDetail: "旧版の未検証データを隔離",
    assessmentStatus: "unavailable",
    assessmentNotice: CHEMICAL_ASSESSMENT_NOTICE,
  };
}
