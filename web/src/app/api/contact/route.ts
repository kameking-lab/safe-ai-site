import { NextResponse } from "next/server";

export type ContactPayload = {
  company: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  category: string;
  budget: string;
  contactMethod: string;
  features: string[];
  plan?: string;
};

function isNonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(request: Request) {
  let body: ContactPayload;
  try {
    body = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (
    !isNonEmpty(body.company) ||
    !isNonEmpty(body.name) ||
    !isNonEmpty(body.email) ||
    !isNonEmpty(body.message)
  ) {
    return NextResponse.json({ ok: false, error: "missing_required_field" }, { status: 400 });
  }

  if (!isValidEmail(body.email.trim())) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const receivedAt = new Date().toISOString();
  const record = {
    receivedAt,
    company: body.company.trim(),
    name: body.name.trim(),
    email: body.email.trim(),
    phone: body.phone?.trim() ?? "",
    category: body.category,
    budget: body.budget,
    contactMethod: body.contactMethod,
    plan: body.plan ?? "",
    features: Array.isArray(body.features) ? body.features : [],
    messageLength: body.message.length,
  };

  // 現段階はサーバーログへの記録のみ。将来は Resend / Slack Webhook 連携を追加。
  console.log("[contact]", JSON.stringify(record));

  return NextResponse.json(
    {
      ok: true,
      receivedAt,
      message:
        "お問い合わせを受け付けました。2〜3営業日以内にご入力のメールアドレスへご返信いたします。",
    },
    { status: 200 }
  );
}
