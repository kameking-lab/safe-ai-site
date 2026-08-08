import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function unavailable() {
  return NextResponse.json(
    {
      ok: false,
      reason: "distributed_input_reverification_required",
    },
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

/**
 * Capability-link sharing is fail-closed until a shared rate limiter,
 * bounded payload handling, atomic history writes and an operational abuse
 * runbook have been independently verified.
 */
export async function GET() {
  return unavailable();
}

export async function POST() {
  return unavailable();
}
