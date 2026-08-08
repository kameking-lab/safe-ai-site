import { NextResponse } from "next/server";

const BODY = {
  status: "disabled",
  reasonCode: "LOCAL_ONLY_PINS",
  message:
    "サイネージのピンは端末内だけに保存されます。サーバー保存とメール通知は行いません。",
} as const;

function disabledResponse() {
  return NextResponse.json(BODY, {
    status: 410,
    headers: {
      "Cache-Control": "no-store",
      "X-Data-Status": "local-only",
    },
  });
}

/** 旧サーバー保存APIは誤った永続化・通知期待を生むため停止する。 */
export async function GET() {
  return disabledResponse();
}

export async function POST() {
  return disabledResponse();
}

export async function DELETE() {
  return disabledResponse();
}
