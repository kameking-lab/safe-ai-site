/**
 * KY全面再設計 Phase 4: 作業員マスターのクラウド保管 API。
 * service_role を使うサーバー専用ルート。env 未設定なら 503 → ブラウザは localStorage 継続。
 * worker_master は device_id 単位で1行（端末のマスター全体を payload に upsert）。
 */
import { getServiceSupabase } from "@/lib/supabase/server";
import { normalizeWorkers } from "@/lib/ky/workers-master";
import { cloudAuthRequired, getCloudOwnerId, privateJson, readBoundedJson, requireCloudConsent } from "@/lib/server/cloud-owner";

export const dynamic = "force-dynamic";

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
  const body = parsed.value as { workers?: unknown };
  if (!Array.isArray(body.workers)) {
    return privateJson({ ok: false, reason: "missing_field" }, 400);
  }
  const workers = normalizeWorkers(body.workers);

  const { error } = await supabase
    .from("worker_master")
    .upsert(
      { device_id: deviceId, payload: workers, updated_at: new Date().toISOString() },
      { onConflict: "device_id" }
    );
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

  const { data, error } = await supabase
    .from("worker_master")
    .select("payload")
    .eq("device_id", deviceId)
    .maybeSingle();
  if (error) {
    return privateJson({ ok: false, reason: "storage_unavailable" }, 502);
  }
  const workers = data && typeof data === "object" ? normalizeWorkers((data as { payload: unknown }).payload) : [];
  return privateJson({ ok: true, workers });
}
