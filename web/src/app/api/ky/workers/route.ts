/**
 * KY全面再設計 Phase 4: 作業員マスターのクラウド保管 API。
 * service_role を使うサーバー専用ルート。env 未設定なら 503 → ブラウザは localStorage 継続。
 * worker_master は device_id 単位で1行（端末のマスター全体を payload に upsert）。
 */
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { normalizeWorkers } from "@/lib/ky/workers-master";

export const dynamic = "force-dynamic";

function cloudNotConfigured() {
  return NextResponse.json({ ok: false, reason: "cloud_not_configured" }, { status: 503 });
}

export async function POST(request: Request) {
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  let body: { deviceId?: unknown; workers?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }
  const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : "";
  if (!deviceId || !Array.isArray(body.workers)) {
    return NextResponse.json({ ok: false, reason: "missing_field" }, { status: 400 });
  }
  const workers = normalizeWorkers(body.workers);

  const { error } = await supabase
    .from("worker_master")
    .upsert(
      { device_id: deviceId, payload: workers, updated_at: new Date().toISOString() },
      { onConflict: "device_id" }
    );
  if (error) {
    return NextResponse.json({ ok: false, reason: "db_error", detail: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  const deviceId = new URL(request.url).searchParams.get("deviceId")?.trim() ?? "";
  if (!deviceId) {
    return NextResponse.json({ ok: false, reason: "missing_field" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("worker_master")
    .select("payload")
    .eq("device_id", deviceId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ ok: false, reason: "db_error", detail: error.message }, { status: 502 });
  }
  const workers = data && typeof data === "object" ? normalizeWorkers((data as { payload: unknown }).payload) : [];
  return NextResponse.json({ ok: true, workers });
}
