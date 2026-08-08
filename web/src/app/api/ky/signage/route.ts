import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/api-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sharingNotOperationallyVerified() {
  return NextResponse.json(
    {
      ok: false,
      reason: "sharing_not_operationally_verified",
      message:
        "別端末共有は、高エントロピーの共有権限と分散レート制限の検証が完了するまで停止しています。",
    },
    {
      status: 503,
      headers: {
        ...noStoreHeaders(),
        "X-Feature-Status": "quarantined",
      },
    },
  );
}

/**
 * Sharing is deliberately fail-closed independent of environment flags.
 * Do not parse or retain a KY record until authentication, explicit consent,
 * high-entropy capabilities, and distributed abuse protection are deployed
 * and independently verified.
 */
export async function POST(_request: Request) {
  return sharingNotOperationallyVerified();
}

/** Never resolve a short code while the sharing design is quarantined. */
export async function GET(_request: Request) {
  return sharingNotOperationallyVerified();
}
