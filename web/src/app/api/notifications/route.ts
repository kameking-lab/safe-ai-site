import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      weatherAlerts: true,
      lawRevisions: true,
      accidentUpdates: true,
      morningReminder: false,
      reminderTime: "07:45",
    },
    note: "mock route: 本番接続時は外部通知基盤へ置換予定",
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({
    ok: true,
    data: body,
    message: "通知設定を受け付けました（mock）",
  });
}
