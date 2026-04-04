import { NextResponse } from "next/server";
import { buildKyAssistText, type KyAssistField } from "@/data/mock/ky-assist-responses";

type Body = {
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
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSONが不正です" }, { status: 400 });
  }

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
  });

  return NextResponse.json({ text }, { status: 200 });
}
