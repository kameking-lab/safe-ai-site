import { NextResponse } from "next/server";
import { z } from "zod";
import { buildKyAssistText, type KyAssistField } from "@/data/mock/ky-assist-responses";

const kyAssistSchema = z.object({
  field: z.enum(["hazard", "reduction", "rereduction"], { message: "field が不正です" }),
  targetLabel: z.string().max(100, "targetLabelは100文字以内で入力してください。").optional(),
  workContext: z.string().max(400, "作業内容は400文字以内で入力してください。").optional(),
  hazardSoFar: z.string().max(500, "危険内容は500文字以内で入力してください。").optional(),
  reductionSoFar: z.string().max(500, "対策内容は500文字以内で入力してください。").optional(),
  likelihood: z.number().int().min(1).max(5).optional(),
  severity: z.number().int().min(1).max(5).optional(),
  reLikelihood: z.number().int().min(1).max(5).optional(),
  reSeverity: z.number().int().min(1).max(5).optional(),
  seed: z.number().optional(),
});

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "JSONが不正です" }, { status: 400 });
  }

  const parsed = kyAssistSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "入力内容が不正です" }, { status: 400 });
  }

  const body = parsed.data;
  const field = body.field as KyAssistField;

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
