/**
 * KY全面再設計 Phase 4: KY記録のクラウド保管 API。
 * service_role を使うサーバー専用ルート。env 未設定なら 503 → ブラウザは localStorage 継続。
 *  - POST: KY記録を1件追加（履歴行として insert）。
 *  - GET ?deviceId=...: 端末の最新KY記録＋直近一覧サマリーを返す（別端末からの引き継ぎ用）。
 */
import { getServiceSupabase } from "@/lib/supabase/server";
import { cloudAuthRequired, getCloudOwnerId, privateJson, readBoundedJson, requireCloudConsent } from "@/lib/server/cloud-owner";
import { buildKyRecordSummary, normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import type { KyRecordSummary } from "@/lib/types/operations";

export const dynamic = "force-dynamic";

const MAX_LIST = 30;

function pad(s: string): string {
  return String(s ?? "").padStart(2, "0");
}

function cloudNotConfigured() {
  return privateJson({ ok: false, reason: "cloud_not_configured" }, 503);
}

export async function POST(request: Request) {
  const deviceId = await getCloudOwnerId();
  if (!deviceId) return cloudAuthRequired();
  const consentError = requireCloudConsent(request, "ky-v1");
  if (consentError) return consentError;
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  const parsed = await readBoundedJson(request);
  if (!parsed.ok) return privateJson({ ok: false, reason: parsed.reason }, parsed.reason === "payload_too_large" ? 413 : 400);
  const body = parsed.value as { record?: unknown };
  if (!body.record || typeof body.record !== "object") {
    return privateJson({ ok: false, reason: "missing_field" }, 400);
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
    return privateJson({ ok: false, reason: "storage_unavailable" }, 502);
  }
  return privateJson({ ok: true });
}

export async function GET(request: Request) {
  const deviceId = await getCloudOwnerId();
  if (!deviceId) return cloudAuthRequired();
  const consentError = requireCloudConsent(request, "ky-v1");
  if (consentError) return consentError;
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  const params = new URL(request.url).searchParams;
  const id = params.get("id")?.trim() ?? "";
  if (id.length > 128) return privateJson({ ok: false, reason: "invalid_field" }, 400);

  // P0-A: id 指定時は単一KYの full payload を返す（一覧から再編集で開くため）。
  if (id) {
    const { data, error } = await supabase
      .from("ky_records")
      .select("payload")
      .eq("device_id", deviceId)
      .eq("id", id)
      .maybeSingle();
    if (error) {
      return privateJson({ ok: false, reason: "storage_unavailable" }, 502);
    }
    const record = data ? normalizeKyInstructionRecord((data as { payload: unknown }).payload) : null;
    return privateJson({ ok: true, record });
  }

  const { data, error } = await supabase
    .from("ky_records")
    .select("id, payload, updated_at")
    .eq("device_id", deviceId)
    .order("updated_at", { ascending: false })
    .limit(MAX_LIST);
  if (error) {
    return privateJson({ ok: false, reason: "storage_unavailable" }, 502);
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
  return privateJson({ ok: true, latest, list });
}

export async function DELETE(request: Request) {
  const deviceId = await getCloudOwnerId();
  if (!deviceId) return cloudAuthRequired();
  const consentError = requireCloudConsent(request, "ky-v1");
  if (consentError) return consentError;
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  const params = new URL(request.url).searchParams;
  const id = params.get("id")?.trim() ?? "";
  if (!id || id.length > 128) {
    return privateJson({ ok: false, reason: "missing_field" }, 400);
  }
  const { error } = await supabase.from("ky_records").delete().eq("device_id", deviceId).eq("id", id);
  if (error) {
    return privateJson({ ok: false, reason: "storage_unavailable" }, 502);
  }
  return privateJson({ ok: true });
}
