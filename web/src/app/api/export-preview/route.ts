import { NextResponse } from "next/server";
import { z } from "zod";

const exportPreviewSchema = z.object({
  target: z.enum(["ky-sheet", "morning-briefing"]).optional(),
  lines: z.array(z.string().max(500)).max(100).optional(),
});

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディのJSON形式が不正です。" }, { status: 400 });
  }

  const parsed = exportPreviewSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "入力内容が不正です。" }, { status: 400 });
  }

  const target = parsed.data.target ?? "ky-sheet";
  const lines = parsed.data.lines ?? [];

  return NextResponse.json({
    ok: true,
    data: {
      target,
      preview: [`${target} preview`, ...lines].join("\n"),
    },
    note: "mock route: 実PDF生成エンジンへ差し替え予定",
  });
}
