/**
 * KY全面再設計 Phase 6: 朝礼サイネージ別端末共有 API。
 *  - POST { record }: 6桁コードを発行し signage_sessions に保存（24h有効）。
 *  - GET ?code=XXXXXX: 共有KYを取得（不存在404・期限切れ410）。
 * service_role 専用。env 未設定なら 503（同一端末の localStorage 表示は引き続き可能）。
 */
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import { generateSignageCode, isValidSignageCode, SIGNAGE_CODE_TTL_MS } from "@/lib/ky/signage-code";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cloudNotConfigured() {
  return NextResponse.json({ ok: false, reason: "cloud_not_configured" }, { status: 503 });
}

export async function POST(request: Request) {
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  let body: { record?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }
  if (!body.record || typeof body.record !== "object") {
    return NextResponse.json({ ok: false, reason: "missing_field" }, { status: 400 });
  }
  const record = normalizeKyInstructionRecord(body.record);
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SIGNAGE_CODE_TTL_MS).toISOString();

  // 期限切れセッションの掃除（ベストエフォート・失敗は無視）。
  await supabase.from("signage_sessions").delete().lt("expires_at", nowIso);

  // 6桁コードを衝突回避で発行（最大6回再試行）。
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generateSignageCode();
    const { error } = await supabase
      .from("signage_sessions")
      .insert({ code, payload: record, expires_at: expiresAt });
    if (!error) {
      return NextResponse.json({ ok: true, code, expiresAt });
    }
    // 23505 = unique_violation（コード衝突）なら再生成。それ以外はDBエラー。
    if (error.code !== "23505") {
      return NextResponse.json({ ok: false, reason: "db_error", detail: error.message }, { status: 502 });
    }
  }
  return NextResponse.json({ ok: false, reason: "code_collision" }, { status: 503 });
}

export async function GET(request: Request) {
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  const code = new URL(request.url).searchParams.get("code")?.trim() ?? "";
  if (!isValidSignageCode(code)) {
    return NextResponse.json({ ok: false, reason: "invalid_code" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("signage_sessions")
    .select("payload, expires_at")
    .eq("code", code)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ ok: false, reason: "db_error", detail: error.message }, { status: 502 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }
  const row = data as { payload: unknown; expires_at: string };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ ok: false, reason: "expired" }, { status: 410 });
  }
  return NextResponse.json({
    ok: true,
    record: normalizeKyInstructionRecord(row.payload),
    expiresAt: row.expires_at,
  });
}
