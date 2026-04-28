import { NextRequest, NextResponse } from "next/server";

/**
 * サイネージのピン登録API（DB接続前のフォールバック）。
 * - 永続化はクライアント側 localStorage
 * - サーバ側は browserToken をキーにメモリ保持（再起動で消える前提）
 * - DB導入後はここを差し替えるだけで動く設計
 */

type PinRecord = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  email: string | null;
  createdAt: string;
};

const PIN_LIMIT_PER_TOKEN = 10;
const memoryStore = new Map<string, PinRecord[]>();

function tokenFrom(req: NextRequest): string | null {
  const t = req.headers.get("x-browser-token") ?? req.nextUrl.searchParams.get("token");
  if (!t || t.length < 8 || t.length > 128) return null;
  return t;
}

export async function GET(req: NextRequest) {
  const token = tokenFrom(req);
  if (!token) {
    return NextResponse.json({ error: { code: "TOKEN_REQUIRED" } }, { status: 400 });
  }
  return NextResponse.json({ pins: memoryStore.get(token) ?? [] });
}

export async function POST(req: NextRequest) {
  const token = tokenFrom(req);
  if (!token) {
    return NextResponse.json({ error: { code: "TOKEN_REQUIRED" } }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_JSON" } }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: { code: "INVALID_BODY" } }, { status: 400 });
  }

  const { label, lat, lng, email } = body as Record<string, unknown>;
  if (typeof label !== "string" || label.trim().length === 0 || label.length > 60) {
    return NextResponse.json({ error: { code: "INVALID_LABEL" } }, { status: 400 });
  }
  if (typeof lat !== "number" || lat < 24 || lat > 46) {
    return NextResponse.json({ error: { code: "INVALID_LAT" } }, { status: 400 });
  }
  if (typeof lng !== "number" || lng < 122 || lng > 154) {
    return NextResponse.json({ error: { code: "INVALID_LNG" } }, { status: 400 });
  }
  const emailValue =
    typeof email === "string" && email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? email
      : null;

  const list = memoryStore.get(token) ?? [];
  if (list.length >= PIN_LIMIT_PER_TOKEN) {
    return NextResponse.json(
      { error: { code: "LIMIT_EXCEEDED", message: `ピンは1ユーザー${PIN_LIMIT_PER_TOKEN}件までです。` } },
      { status: 409 },
    );
  }

  const record: PinRecord = {
    id: crypto.randomUUID(),
    label: label.trim(),
    lat,
    lng,
    email: emailValue,
    createdAt: new Date().toISOString(),
  };
  list.push(record);
  memoryStore.set(token, list);

  return NextResponse.json({ pin: record }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const token = tokenFrom(req);
  if (!token) {
    return NextResponse.json({ error: { code: "TOKEN_REQUIRED" } }, { status: 400 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: { code: "ID_REQUIRED" } }, { status: 400 });
  }
  const list = memoryStore.get(token) ?? [];
  const next = list.filter((p) => p.id !== id);
  memoryStore.set(token, next);
  return NextResponse.json({ ok: true, removed: list.length - next.length });
}
