"use client";

/**
 * Phase 7: 打合せ書のクラウド同期クライアント。KYの device_id / cloud-enabled 判定を流用。
 * クラウド未設定・失敗時は黙って null/false（呼び出し側は localStorage で継続）。
 */
import { getDeviceId, isKyCloudEnabled } from "@/lib/ky/storage-adapter";
import { normalizeMeetingRecord, type MeetingRecord } from "@/lib/meeting/schema";
import type { MeetingSummary } from "@/lib/meeting/store";
import type { MeetingContribution, ContributionPayload } from "@/lib/meeting/distributed";

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

// ── 分散入力（協力会社 → 元請 集約） ───────────────────────────

/** 元請: 打合せ書の共有トークンを発行。クラウド未設定/失敗は null。 */
export async function cloudCreateMeetingShare(
  meetingId: string,
  siteName: string,
  workDate: string
): Promise<string | null> {
  if (!isKyCloudEnabled()) return null;
  try {
    const res = await fetch("/api/meeting/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: getDeviceId(), meetingId, siteName, workDate }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; token?: string };
    return data.ok && typeof data.token === "string" ? data.token : null;
  } catch {
    return null;
  }
}

/** 元請: 自分の打合せ書に集まった協力会社の投稿を取得。クラウド未設定/失敗は null。 */
export async function cloudFetchMeetingContributions(
  meetingId: string
): Promise<MeetingContribution[] | null> {
  if (!isKyCloudEnabled()) return null;
  try {
    const res = await fetch(
      `/api/meeting/share?deviceId=${encodeURIComponent(getDeviceId())}&meetingId=${encodeURIComponent(meetingId)}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; contributions?: MeetingContribution[] };
    return Array.isArray(data.contributions) ? data.contributions : null;
  } catch {
    return null;
  }
}

// ── 協力会社側（token がアクセス鍵。deviceId は不要） ──────────

export type ContributeContext = {
  context: { siteName: string; workDate: string };
  mine: { contributionId: string; payload: ContributionPayload } | null;
};

/** 協力会社: 共有コンテキスト＋（cid指定時）自社の投稿を取得。token無効/期限切れは null。 */
export async function fetchContributeContext(
  token: string,
  cid?: string
): Promise<ContributeContext | null> {
  try {
    const q = cid ? `?cid=${encodeURIComponent(cid)}` : "";
    const res = await fetch(`/api/meeting/contribute/${encodeURIComponent(token)}${q}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean } & ContributeContext;
    return data.ok ? { context: data.context, mine: data.mine } : null;
  } catch {
    return null;
  }
}

/** 協力会社: 自社分を投稿/更新。返り値は contributionId（自社行の編集鍵）。失敗は null。 */
export async function submitContribution(
  token: string,
  payload: ContributionPayload,
  cid?: string
): Promise<string | null> {
  try {
    const res = await fetch(`/api/meeting/contribute/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contributionId: cid, payload }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; contributionId?: string };
    return data.ok && typeof data.contributionId === "string" ? data.contributionId : null;
  } catch {
    return null;
  }
}
