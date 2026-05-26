"use client";

/**
 * Phase 7: 打合せ書のクラウド同期クライアント。KYの device_id / cloud-enabled 判定を流用。
 * クラウド未設定・失敗時は黙って null/false（呼び出し側は localStorage で継続）。
 */
import { getDeviceId, isKyCloudEnabled } from "@/lib/ky/storage-adapter";
import { normalizeMeetingRecord, type MeetingRecord } from "@/lib/meeting/schema";
import type { MeetingSummary } from "@/lib/meeting/store";

export function isMeetingCloudEnabled(): boolean {
  return isKyCloudEnabled();
}

export async function cloudPushMeeting(rec: MeetingRecord): Promise<boolean> {
  if (!isKyCloudEnabled()) return false;
  try {
    const res = await fetch("/api/meeting/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: getDeviceId(), record: rec }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function cloudPullMeetings(): Promise<MeetingSummary[] | null> {
  if (!isKyCloudEnabled()) return null;
  try {
    const res = await fetch(`/api/meeting/records?deviceId=${encodeURIComponent(getDeviceId())}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; list?: MeetingSummary[] };
    return Array.isArray(data.list) ? data.list : null;
  } catch {
    return null;
  }
}

export async function cloudGetMeetingById(id: string): Promise<MeetingRecord | null> {
  if (!isKyCloudEnabled()) return null;
  try {
    const res = await fetch(`/api/meeting/records?deviceId=${encodeURIComponent(getDeviceId())}&id=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { record?: unknown };
    return data.record ? normalizeMeetingRecord(data.record) : null;
  } catch {
    return null;
  }
}

export async function cloudDeleteMeeting(id: string): Promise<boolean> {
  if (!isKyCloudEnabled()) return false;
  try {
    const res = await fetch(
      `/api/meeting/records?deviceId=${encodeURIComponent(getDeviceId())}&id=${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    return res.ok;
  } catch {
    return false;
  }
}
