/**
 * /api/chemical-ra
 *
 * 収録済みの公的データを、物質の完全一致を確認して返す。
 * 作業条件だけから濃度やCREATE-SIMPLEの判定値を推定することはしない。
 */
import { NextResponse } from "next/server";
import {
  buildOfficialResponse,
  resolveExactChemical,
} from "@/lib/chemical/official-ra-response";
import { sharedRateLimitGuard } from "@/lib/security/shared-state";

export type ChemicalRaRequest = {
  chemicalName: string;
  workContent?: string;
  casNumber?: string;
  ventilation?: "none" | "general" | "local";
  amount?: "small" | "medium" | "large";
  durationHours?: number;
};

/**
 * 旧保存データの読み取り互換用。新規API応答では生成しない。
 * @deprecated 独自計算値を公的なCREATE-SIMPLE判定として扱えないため廃止。
 */
export type CreateSimpleAssessment = {
  level: "I" | "II" | "III" | "IV";
  label: string;
  exposureRatio: number;
  inputSummary: { ventilation: string; amount: string; durationHours: number };
  limit8h?: string;
  rationale: string[];
};

export type GhsHazard = {
  category: string;
  classification: string;
  signal?: string;
  hazardStatement?: string;
};

export type PpeRecommendation = {
  item: string;
  specification: string;
  searchQuery: string;
};

export type SafetyMeasure = {
  category: string;
  action: string;
  priority?: 1 | 2 | 3;
};

export type ChemicalRaResponse = {
  chemicalName: string;
  casNumber?: string;
  ghsHazards: GhsHazard[];
  flashPoint?: string;
  exposureLimit?: string;
  ppeRecommendations: PpeRecommendation[];
  safetyMeasures: SafetyMeasure[];
  emergencyMeasures: string[];
  regulatoryNotes: string[];
  rawReply: string;
  aiStatus?: "ok" | "apikey_missing" | "ai_failed" | "demo" | "disabled_for_safety";
  aiErrorDetail?: string;
  /** 旧保存データの読み取り互換用。新規応答では常に省略する。 */
  createSimple?: CreateSimpleAssessment;
  relatedHazards?: string[];
  assessmentStatus?: "unavailable";
  assessmentNotice?: string;
  sourceLinks?: Array<{ label: string; url: string }>;
};

function validationError(message: string) {
  return NextResponse.json(
    { error: { code: "VALIDATION", message } },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  const limited = await sharedRateLimitGuard(request, {
    routeKey: "chemical-ra-screening",
    limit: 30,
    windowMs: 10 * 60 * 1_000,
  });
  if (limited) return limited;

  let body: ChemicalRaRequest;
  try {
    body = (await request.json()) as ChemicalRaRequest;
  } catch {
    return validationError("リクエスト形式が不正です。");
  }

  const chemicalName = typeof body.chemicalName === "string" ? body.chemicalName.trim() : "";
  const casNumber = typeof body.casNumber === "string" ? body.casNumber.trim() : undefined;
  if (!chemicalName) return validationError("化学物質名を入力してください。");
  if (chemicalName.length > 200 || (body.workContent?.length ?? 0) > 2_000) {
    return validationError("入力が長すぎます。");
  }
  if (
    body.durationHours !== undefined &&
    (!Number.isFinite(body.durationHours) || body.durationHours < 0 || body.durationHours > 24)
  ) {
    return validationError("作業時間は0〜24時間で入力してください。");
  }
  if (body.ventilation && !["none", "general", "local"].includes(body.ventilation)) {
    return validationError("換気条件が不正です。");
  }
  if (body.amount && !["small", "medium", "large"].includes(body.amount)) {
    return validationError("取扱量が不正です。");
  }

  const resolution = resolveExactChemical(chemicalName, casNumber);
  if (!resolution.ok) {
    return NextResponse.json(
      {
        error: {
          code: resolution.code,
          message: resolution.message,
        },
      },
      { status: 422 },
    );
  }

  return NextResponse.json(buildOfficialResponse(resolution.chemical), {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
