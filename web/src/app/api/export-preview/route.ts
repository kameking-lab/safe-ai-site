import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    target?: "ky-sheet" | "morning-briefing";
    lines?: string[];
  };

  const target = body.target ?? "ky-sheet";
  const lines = body.lines ?? [];

  return NextResponse.json({
    ok: true,
    data: {
      target,
      preview: [`${target} preview`, ...lines].join("\n"),
    },
    note: "mock route: 実PDF生成エンジンへ差し替え予定",
  });
}
