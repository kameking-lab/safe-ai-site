/**
 * P1-5 化学物質RA結果のクラウド保管 API（chemical_ra_records）。
 * KY の /api/ky/records と同方針: service_role を使うサーバー専用ルート。
 * env 未設定／テーブル未作成なら 503/502 → ブラウザは localStorage で継続。
 *  - POST { deviceId, record }: RA結果を1件 upsert。
 *  - GET ?deviceId=...: 端末の保存一覧（最新順）。
 *  - DELETE ?deviceId=...&id=...: 1件削除。
 */
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIST = 50;

function cloudNotConfigured() {
  return NextResponse.json({ ok: false, reason: "cloud_not_configured" }, { status: 503 });
}

type IncomingRecord = {
  raId?: unknown;
  cas?: unknown;
  substance?: unknown;
  workContent?: unknown;
  exposureBand?: unknown;
  payload?: unknown;
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function POST(request: Request) {
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  let body: { deviceId?: unknown; record?: IncomingRecord };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }
  const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : "";
  const record = body.record;
  if (!deviceId || !record || typeof record !== "object" || !record.payload) {
    return NextResponse.json({ ok: false, reason: "missing_field" }, { status: 400 });
  }
  const raId = str(record.raId).trim() || `ra_${Date.now().toString(36)}`;

  const { error } = await supabase.from("chemical_ra_records").upsert(
    {
      device_id: deviceId,
      ra_id: raId,
      cas: str(record.cas) || null,
      substance: str(record.substance) || null,
      work_content: str(record.workContent) || null,
      exposure_band: str(record.exposureBand) || null,
      payload: record.payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "device_id,ra_id" }
  );
  if (error) {
    return NextResponse.json({ ok: false, reason: "db_error", detail: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true, raId });
}

export async function GET(request: Request) {
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  const deviceId = new URL(request.url).searchParams.get("deviceId")?.trim() ?? "";
  if (!deviceId) {
    return NextResponse.json({ ok: false, reason: "missing_field" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("chemical_ra_records")
    .select("ra_id, cas, substance, work_content, exposure_band, payload, updated_at")
    .eq("device_id", deviceId)
    .order("updated_at", { ascending: false })
    .limit(MAX_LIST);
  if (error) {
    return NextResponse.json({ ok: false, reason: "db_error", detail: error.message }, { status: 502 });
  }
  const rows = Array.isArray(data) ? data : [];
  const list = rows.map((r) => {
    const row = r as {
      ra_id: string;
      cas: string | null;
      substance: string | null;
      work_content: string | null;
      exposure_band: string | null;
      payload: unknown;
      updated_at: string;
    };
    return {
      raId: row.ra_id,
      cas: row.cas ?? "",
      substance: row.substance ?? "",
      workContent: row.work_content ?? "",
      exposureBand: row.exposure_band ?? "",
      payload: row.payload,
      savedAt: row.updated_at,
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
  const { error } = await supabase
    .from("chemical_ra_records")
    .delete()
    .eq("device_id", deviceId)
    .eq("ra_id", id);
  if (error) {
    return NextResponse.json({ ok: false, reason: "db_error", detail: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
