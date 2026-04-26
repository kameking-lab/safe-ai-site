import { NextResponse } from "next/server";
import { buildKyAssistText, buildRiskAssessmentTable, type KyAssistField } from "@/data/mock/ky-assist-responses";

type Body = {
  /** "table" を指定するとリスクアセスメント表を一括生成。未指定時は単項目補完。 */
  mode?: "single" | "table";
  field?: KyAssistField;
  targetLabel?: string;
  workContext?: string;
  hazardSoFar?: string;
  reductionSoFar?: string;
  likelihood?: number;
  severity?: number;
  reLikelihood?: number;
  reSeverity?: number;
  seed?: number;
  /** 業種プリセットID（建設/製造/物流/医療/介護施設…） */
  industryId?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSONが不正です" }, { status: 400 });
  }

  // モード: リスクアセスメント表の一括生成
  if (body.mode === "table") {
    const result = buildRiskAssessmentTable({
      workContext: body.workContext?.trim() || "",
      industryId: body.industryId,
    });
    return NextResponse.json(result, { status: 200 });
  }

  // モード: 単一項目（hazard/reduction/rereduction）の補完
  const field = body.field;
  if (field !== "hazard" && field !== "reduction" && field !== "rereduction") {
    return NextResponse.json({ error: "field が不正です" }, { status: 400 });
  }

  const text = buildKyAssistText({
    field,
    targetLabel: body.targetLabel?.trim() || "—",
    workContext: body.workContext?.trim() || "",
    hazardSoFar: body.hazardSoFar,
    reductionSoFar: body.reductionSoFar,
    likelihood: body.likelihood,
    severity: body.severity,
    reLikelihood: body.reLikelihood,
    reSeverity: body.reSeverity,
    seed: typeof body.seed === "number" ? body.seed : Date.now(),
    industryId: body.industryId,
  });

  return NextResponse.json({ text }, { status: 200 });
}
