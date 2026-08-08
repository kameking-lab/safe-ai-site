/**
 * P1-5 化学物質RA結果のクラウド保管 API（chemical_ra_records）。
 * KY の /api/ky/records と同方針: service_role を使うサーバー専用ルート。
 * env 未設定／テーブル未作成なら 503/502 → ブラウザは localStorage で継続。
 *  - POST { deviceId, record }: RA結果を1件 upsert。
 *  - GET ?deviceId=...: 端末の保存一覧（最新順）。
 *  - DELETE ?deviceId=...&id=...: 1件削除。
 */
import { getServiceSupabase } from "@/lib/supabase/server";
import { cloudAuthRequired, getCloudOwnerId, privateJson, readBoundedJson } from "@/lib/server/cloud-owner";
import { findByCasSlim } from "@/lib/mhlw-chemicals-slim";
import { validateMixtureComponents } from "@/lib/chemical/mixture-ra";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIST = 50;

function cloudNotConfigured() {
  return privateJson({ ok: false, reason: "cloud_not_configured" }, 503);
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

function validateRecordPayload(payload: unknown):
  | { ok: true; payload: unknown }
  | { ok: false; reason: string } {
  if (!payload || typeof payload !== "object") {
    return { ok: false, reason: "invalid_payload" };
  }
  const value = payload as Record<string, unknown>;
  if (value.type !== "mixture") return { ok: true, payload };
  if (value.humanReviewConfirmed !== true || typeof value.humanReviewAt !== "string") {
    return { ok: false, reason: "human_review_required" };
  }
  const reviewedAt = new Date(value.humanReviewAt);
  const ageMs = Date.now() - reviewedAt.getTime();
  if (
    !Number.isFinite(reviewedAt.getTime()) ||
    ageMs < -5 * 60 * 1_000 ||
    ageMs > 24 * 60 * 60 * 1_000
  ) {
    return { ok: false, reason: "human_review_invalid" };
  }
  const validated = validateMixtureComponents(value.components, (cas) => {
    const chemical = findByCasSlim(cas);
    return chemical
      ? { primaryName: chemical.primaryName, aliases: chemical.aliases }
      : undefined;
  });
  if (!validated.ok) return { ok: false, reason: validated.reason };
  return {
    ok: true,
    payload: {
      type: "mixture",
      components: validated.components,
      humanReviewConfirmed: true,
      humanReviewAt: reviewedAt.toISOString(),
    },
  };
}

export async function POST(request: Request) {
  const deviceId = await getCloudOwnerId();
  if (!deviceId) return cloudAuthRequired();
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  const parsed = await readBoundedJson(request);
  if (!parsed.ok) return privateJson({ ok: false, reason: parsed.reason }, parsed.reason === "payload_too_large" ? 413 : 400);
  const body = parsed.value as { record?: IncomingRecord; cloudConsent?: unknown };
  if (body.cloudConsent !== true) {
    return privateJson({ ok: false, reason: "cloud_consent_required" }, 428);
  }
  const record = body.record;
  if (!record || typeof record !== "object" || !record.payload) {
    return privateJson({ ok: false, reason: "missing_field" }, 400);
  }
  const validatedPayload = validateRecordPayload(record.payload);
  if (!validatedPayload.ok) {
    return privateJson(
      {
        ok: false,
        reason: validatedPayload.reason,
        requiresHumanReview: true,
      },
      422,
    );
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
      payload: validatedPayload.payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "device_id,ra_id" }
  );
  if (error) {
    return privateJson({ ok: false, reason: "storage_unavailable" }, 502);
  }
  return privateJson({ ok: true, raId });
}

export async function GET(request: Request) {
  const deviceId = await getCloudOwnerId();
  if (!deviceId) return cloudAuthRequired();
  if (request.headers.get("x-cloud-consent") !== "chemical-ra") {
    return privateJson({ ok: false, reason: "cloud_consent_required" }, 428);
  }
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  const { data, error } = await supabase
    .from("chemical_ra_records")
    .select("ra_id, cas, substance, work_content, exposure_band, payload, updated_at")
    .eq("device_id", deviceId)
    .order("updated_at", { ascending: false })
    .limit(MAX_LIST);
  if (error) {
    return privateJson({ ok: false, reason: "storage_unavailable" }, 502);
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
      syncState: "synced",
      syncedAt: row.updated_at,
    };
  });
  return privateJson({ ok: true, list });
}

export async function DELETE(request: Request) {
  const deviceId = await getCloudOwnerId();
  if (!deviceId) return cloudAuthRequired();
  if (request.headers.get("x-cloud-consent") !== "chemical-ra") {
    return privateJson({ ok: false, reason: "cloud_consent_required" }, 428);
  }
  const supabase = getServiceSupabase();
  if (!supabase) return cloudNotConfigured();

  const params = new URL(request.url).searchParams;
  const id = params.get("id")?.trim() ?? "";
  if (!id || id.length > 128) {
    return privateJson({ ok: false, reason: "missing_field" }, 400);
  }
  const { error } = await supabase
    .from("chemical_ra_records")
    .delete()
    .eq("device_id", deviceId)
    .eq("ra_id", id);
  if (error) {
    return privateJson({ ok: false, reason: "storage_unavailable" }, 502);
  }
  return privateJson({ ok: true });
}
