import { NextRequest, NextResponse } from "next/server";
import { lawRevisionCores } from "@/data/mock/law-revisions";
import type { RevisionListApiResponse } from "@/lib/types/api";

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  const delayMs = Number(request.nextUrl.searchParams.get("delayMs") ?? "0");
  const forceError = request.nextUrl.searchParams.get("forceError");

  if (delayMs > 0) {
    await wait(delayMs);
  }

  if (forceError === "5xx") {
    return NextResponse.json(
      {
        error: {
          code: "UNAVAILABLE",
          message: "法改正一覧APIが一時的に利用できません。",
          retryable: true,
        },
      },
      { status: 503 }
    );
  }

  const body: RevisionListApiResponse = {
    revisions: lawRevisionCores,
  };
  return NextResponse.json(body);
}
