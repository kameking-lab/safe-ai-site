/**
 * KY全面再設計 Phase 4: KY記録のクラウド保管 API。
 * service_role を使うサーバー専用ルート。env 未設定なら 503 → ブラウザは localStorage 継続。
 *  - POST: KY記録を1件追加（履歴行として insert）。
 *  - GET ?deviceId=...: 端末の最新KY記録＋直近一覧サマリーを返す（別端末からの引き継ぎ用）。
 */
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { buildKyRecordSummary, normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import type { KyRecordSummary } from "@/lib/types/operations";

export const dynamic = "force-dynamic";

const MAX_LIST = 30;

function pad(s: string): string {
  return String(s ?? "").padStart(2, "0");
}

function cloudNotConfigured() {
  return NextResponse.json({ ok: false, reason: "cloud_not_configured" }, { status: 503 });
}

export async function POST(request: Request) {
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  let body: { deviceId?: unknown; record?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }
  const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : "";
  if (!deviceId || !body.record || typeof body.record !== "object") {
    return NextResponse.json({ ok: false, reason: "missing_field" }, { status: 400 });
  }

  const record = normalizeKyInstructionRecord(body.record);
  const workDate = `${record.workDateYear}-${pad(record.workDateMonth)}-${pad(record.workDateDay)}`;

  const { error } = await supabase.from("ky_records").insert({
    device_id: deviceId,
    work_date: workDate,
    site_name: record.siteName || null,
    project_name: record.projectName || null,
    foreman_name: record.foremanName || null,
    payload: record,
  });
  if (error) {
    return NextResponse.json({ ok: false, reason: "db_error", detail: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  const params = new URL(request.url).searchParams;
  const deviceId = params.get("deviceId")?.trim() ?? "";
  const id = params.get("id")?.trim() ?? "";
  if (!deviceId) {
    return NextResponse.json({ ok: false, reason: "missing_field" }, { status: 400 });
  }

  // P0-A: id 指定時は単一KYの full payload を返す（一覧から再編集で開くため）。
  if (id) {
    const { data, error } = await supabase
      .from("ky_records")
      .select("payload")
      .eq("device_id", deviceId)
      .eq("id", id)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ ok: false, reason: "db_error", detail: error.message }, { status: 502 });
    }
    const record = data ? normalizeKyInstructionRecord((data as { payload: unknown }).payload) : null;
    return NextResponse.json({ ok: true, record });
  }

  const { data, error } = await supabase
    .from("ky_records")
    .select("id, payload, updated_at")
    .eq("device_id", deviceId)
    .order("updated_at", { ascending: false })
    .limit(MAX_LIST);
  if (error) {
    return NextResponse.json({ ok: false, reason: "db_error", detail: error.message }, { status: 502 });
  }

  const rows = Array.isArray(data) ? data : [];
  const latest = rows.length > 0 ? normalizeKyInstructionRecord((rows[0] as { payload: unknown }).payload) : null;
  const list: KyRecordSummary[] = rows.map((row) => {
    const r = row as { id: string; payload: unknown; updated_at: string };
    return buildKyRecordSummary(normalizeKyInstructionRecord(r.payload), {
      id: String(r.id),
      savedAt: r.updated_at,
    });
  });
  return NextResponse.json({ ok: true, latest, list });
}

export async function DELETE(request: Request) {
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  const params = new URL(request.url).searchParams;
  const deviceId = params.get("deviceId")?.trim() ?? "";
  const id = params.get("id")?.trim() ?? "";
  if (!deviceId || !id) {
    return NextResponse.json({ ok: false, reason: "missing_field" }, { status: 400 });
  }
  const { error } = await supabase.from("ky_records").delete().eq("device_id", deviceId).eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, reason: "db_error", detail: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
