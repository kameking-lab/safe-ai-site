/**
 * 閉端末 Web Push の購読登録／解除 API。
 *
 *  - POST { subscription: PushSubscription.toJSON(), prefecture? }:
 *      endpoint をキーに push_subscriptions へ upsert（service_role 経由）。
 *  - DELETE { endpoint } または ?endpoint=... : 該当購読を削除（通知解除）。
 *
 * 正直な段階応答（Path A: スキーマ変更はオーナー実施）:
 *  - VAPID鍵未設定            → 501 not_configured
 *  - Supabase未設定           → 503 cloud_not_configured
 *  - push_subscriptions 未作成 → 501 table_not_ready（DDL実行後は自動で機能）
 *
 * 既読・設定は端末内 localStorage（notification-store）に隔離済みのため、この
 * 購読テーブルとは競合しない（通知センターのベルとも二重管理にならない）。
 */
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { isMissingTableError, isWebPushConfigured } from "@/lib/notifications/push-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "push_subscriptions";

function notConfigured() {
  return NextResponse.json(
    { ok: false, reason: "not_configured", message: "プッシュ通知の鍵が未設定です。" },
    { status: 501 }
  );
}

function cloudNotConfigured() {
  return NextResponse.json({ ok: false, reason: "cloud_not_configured" }, { status: 503 });
}

function tableNotReady() {
  return NextResponse.json(
    {
      ok: false,
      reason: "table_not_ready",
      message:
        "購読テーブル(push_subscriptions)が未作成です。管理者がSupabaseで作成後に有効になります。",
    },
    { status: 501 }
  );
}

type IncomingSubscription = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: Request) {
  if (!isWebPushConfigured()) return notConfigured();

  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  let body: { subscription?: IncomingSubscription; prefecture?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const sub = body.subscription;
  const endpoint = str(sub?.endpoint);
  const p256dh = str(sub?.keys?.p256dh);
  const auth = str(sub?.keys?.auth);
  const prefecture = str(body.prefecture) || null;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { ok: false, reason: "missing_field", message: "購読情報が不完全です。" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from(TABLE).upsert(
    { endpoint, p256dh, auth, prefecture },
    { onConflict: "endpoint" }
  );
  if (error) {
    if (isMissingTableError(error)) return tableNotReady();
    return NextResponse.json({ ok: false, reason: "db_error", detail: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!isWebPushConfigured()) return notConfigured();

  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  let endpoint = new URL(request.url).searchParams.get("endpoint")?.trim() ?? "";
  if (!endpoint) {
    try {
      const body = (await request.json()) as { endpoint?: unknown };
      endpoint = str(body.endpoint);
    } catch {
      /* body 無しは ?endpoint= のみ許容 */
    }
  }
  if (!endpoint) {
    return NextResponse.json({ ok: false, reason: "missing_field" }, { status: 400 });
  }

  const { error } = await supabase.from(TABLE).delete().eq("endpoint", endpoint);
  if (error) {
    if (isMissingTableError(error)) return tableNotReady();
    return NextResponse.json({ ok: false, reason: "db_error", detail: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
