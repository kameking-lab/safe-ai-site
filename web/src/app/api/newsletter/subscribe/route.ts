import { NextResponse } from "next/server";
import { addSubscriber, type Industry } from "@/lib/newsletter";

const VALID_INDUSTRIES: Industry[] = [
  "建設",
  "製造",
  "医療福祉",
  "運輸",
  "IT",
  "その他",
];

interface SubscribeRequest {
  email: string;
  industry?: string;
}

export async function POST(req: Request) {
  let body: SubscribeRequest;
  try {
    body = (await req.json()) as SubscribeRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { ok: false, error: "有効なメールアドレスを入力してください。" },
      { status: 400 }
    );
  }

  const industry: Industry = VALID_INDUSTRIES.includes(body.industry as Industry)
    ? (body.industry as Industry)
    : "その他";

  const result = await addSubscriber({
    email,
    industry,
    subscribedAt: new Date().toISOString(),
    active: true,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
  }

  return NextResponse.json({ ok: true, email });
}
