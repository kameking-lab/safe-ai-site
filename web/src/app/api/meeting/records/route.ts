/**
 * Phase 7: 打合せ書のクラウド保管 API（service_role・サーバー専用）。
 * env 未設定なら 503 → ブラウザは localStorage 継続（KY ky_records と同方針）。
 *  - POST: 打合せ書を upsert（device_id + meeting_id 主キー）。
 *  - GET ?deviceId=&id=: 単一 full payload / 一覧サマリー。
 *  - DELETE ?deviceId=&id=
 */
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { normalizeMeetingRecord } from "@/lib/meeting/schema";

export const dynamic = "force-dynamic";
const MAX_LIST = 50;

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
  const record = normalizeMeetingRecord(body.record);
  const workDate = `${record.workDateYear}-${pad(record.workDateMonth)}-${pad(record.workDateDay)}`;

  const { error } = await supabase
    .from("meeting_records")
    .upsert(
      {
        device_id: deviceId,
        meeting_id: record.id,
        work_date: workDate,
        site_name: record.siteName || null,
        author: record.author || null,
        payload: record,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "device_id,meeting_id" }
    );
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

  if (id) {
    const { data, error } = await supabase
      .from("meeting_records")
      .select("payload")
      .eq("device_id", deviceId)
      .eq("meeting_id", id)
      .maybeSingle();
    if (error) return NextResponse.json({ ok: false, reason: "db_error", detail: error.message }, { status: 502 });
    const record = data ? normalizeMeetingRecord((data as { payload: unknown }).payload) : null;
    return NextResponse.json({ ok: true, record });
  }

  const { data, error } = await supabase
    .from("meeting_records")
    .select("meeting_id, payload, updated_at")
    .eq("device_id", deviceId)
    .order("updated_at", { ascending: false })
    .limit(MAX_LIST);
  if (error) return NextResponse.json({ ok: false, reason: "db_error", detail: error.message }, { status: 502 });

  const list = (data ?? []).map((row) => {
    const r = row as { meeting_id: string; payload: unknown; updated_at: string };
    const rec = normalizeMeetingRecord(r.payload);
    return {
      id: String(r.meeting_id),
      savedAt: r.updated_at,
      workDate: `${rec.workDateYear}-${pad(rec.workDateMonth)}-${pad(rec.workDateDay)}`,
      siteName: rec.siteName,
      author: rec.author,
      contractorCount: rec.contractors.length,
    };
  });
  return NextResponse.json({ ok: true, list });
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
  const { error } = await supabase.from("meeting_records").delete().eq("device_id", deviceId).eq("meeting_id", id);
  if (error) return NextResponse.json({ ok: false, reason: "db_error", detail: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}
