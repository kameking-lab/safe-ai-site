/**
 * Phase 7: 打合せ書のクラウド保管 API（service_role・サーバー専用）。
 * env 未設定なら 503 → ブラウザは localStorage 継続（KY ky_records と同方針）。
 *  - POST: 打合せ書を upsert（device_id + meeting_id 主キー）。
 *  - GET ?deviceId=&id=: 単一 full payload / 一覧サマリー。
 *  - DELETE ?deviceId=&id=
 */
import { getServiceSupabase } from "@/lib/supabase/server";
import { normalizeMeetingRecord } from "@/lib/meeting/schema";
import { cloudAuthRequired, getCloudOwnerId, privateJson, readBoundedJson, requireCloudConsent } from "@/lib/server/cloud-owner";

export const dynamic = "force-dynamic";
const MAX_LIST = 50;

function pad(s: string): string {
  return String(s ?? "").padStart(2, "0");
}
function cloudNotConfigured() {
  return privateJson({ ok: false, reason: "cloud_not_configured" }, 503);
}

export async function POST(request: Request) {
  const deviceId = await getCloudOwnerId();
  if (!deviceId) return cloudAuthRequired();
  const consentError = requireCloudConsent(request, "meeting-v1");
  if (consentError) return consentError;
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  const parsed = await readBoundedJson(request);
  if (!parsed.ok) return privateJson({ ok: false, reason: parsed.reason }, parsed.reason === "payload_too_large" ? 413 : 400);
  const body = parsed.value as { record?: unknown };
  if (!body.record || typeof body.record !== "object") {
    return privateJson({ ok: false, reason: "missing_field" }, 400);
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
    return privateJson({ ok: false, reason: "storage_unavailable" }, 502);
  }
  return privateJson({ ok: true });
}

export async function GET(request: Request) {
  const deviceId = await getCloudOwnerId();
  if (!deviceId) return cloudAuthRequired();
  const consentError = requireCloudConsent(request, "meeting-v1");
  if (consentError) return consentError;
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  const params = new URL(request.url).searchParams;
  const id = params.get("id")?.trim() ?? "";
  if (id.length > 128) return privateJson({ ok: false, reason: "invalid_field" }, 400);

  if (id) {
    const { data, error } = await supabase
      .from("meeting_records")
      .select("payload")
      .eq("device_id", deviceId)
      .eq("meeting_id", id)
      .maybeSingle();
    if (error) return privateJson({ ok: false, reason: "storage_unavailable" }, 502);
    const record = data ? normalizeMeetingRecord((data as { payload: unknown }).payload) : null;
    return privateJson({ ok: true, record });
  }

  const { data, error } = await supabase
    .from("meeting_records")
    .select("meeting_id, payload, updated_at")
    .eq("device_id", deviceId)
    .order("updated_at", { ascending: false })
    .limit(MAX_LIST);
  if (error) return privateJson({ ok: false, reason: "storage_unavailable" }, 502);

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
  return privateJson({ ok: true, list });
}

export async function DELETE(request: Request) {
  const deviceId = await getCloudOwnerId();
  if (!deviceId) return cloudAuthRequired();
  const consentError = requireCloudConsent(request, "meeting-v1");
  if (consentError) return consentError;
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  const params = new URL(request.url).searchParams;
  const id = params.get("id")?.trim() ?? "";
  if (!id || id.length > 128) {
    return privateJson({ ok: false, reason: "missing_field" }, 400);
  }
  const { error } = await supabase.from("meeting_records").delete().eq("device_id", deviceId).eq("meeting_id", id);
  if (error) return privateJson({ ok: false, reason: "storage_unavailable" }, 502);
  return privateJson({ ok: true });
}
