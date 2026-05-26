"use client";

/**
 * 打合せ書のローカル保存（KYの operations-service と同じ思想）。
 * - CURRENT_KEY: 作業中の1枚（自動保存）
 * - LIST_KEY: 一覧サマリー（最大50件）
 * - BYID_KEY: 再編集用に full record を id 別保持
 * Phase 7 でこの上に Supabase 同期（storage-adapter パターン）を載せる。
 */
import { normalizeMeetingRecord, newMeetingId, type MeetingRecord } from "./schema";

const CURRENT_KEY = "meeting-record";
const LIST_KEY = "safe-ai:meeting-list:v1";
const BYID_KEY = "safe-ai:meeting-by-id:v1";
export const MAX_MEETING_LIST = 50;

export type MeetingSummary = {
  id: string;
  savedAt: string;
  workDate: string;
  siteName: string;
  author: string;
  contractorCount: number;
};

function readRaw<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeRaw(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota 等は黙って無視 */
  }
}

export function loadCurrentMeeting(): MeetingRecord | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(CURRENT_KEY);
  if (!raw) return null;
  try {
    return normalizeMeetingRecord(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveCurrentMeeting(rec: MeetingRecord): void {
  writeRaw(CURRENT_KEY, rec);
}

export function buildMeetingSummary(rec: MeetingRecord): MeetingSummary {
  return {
    id: rec.id,
    savedAt: rec.savedAt || new Date().toISOString(),
    workDate: `${rec.workDateYear}-${String(rec.workDateMonth).padStart(2, "0")}-${String(rec.workDateDay).padStart(2, "0")}`,
    siteName: rec.siteName,
    author: rec.author,
    contractorCount: rec.contractors.length,
  };
}

/** 一覧＋by-id に保存（手動「保存」操作用）。更新後の一覧を返す。 */
export function snapshotMeeting(rec: MeetingRecord): MeetingSummary[] {
  const summary = buildMeetingSummary(rec);
  const list = getMeetingList().filter((s) => s.id !== rec.id);
  const updated = [summary, ...list].slice(0, MAX_MEETING_LIST);
  writeRaw(LIST_KEY, updated);

  const byId = readRaw<Record<string, MeetingRecord>>(BYID_KEY, {});
  const safe = byId && typeof byId === "object" && !Array.isArray(byId) ? { ...byId } : {};
  safe[rec.id] = rec;
  const keep = new Set(updated.map((s) => s.id));
  const pruned: Record<string, MeetingRecord> = {};
  for (const k of Object.keys(safe)) if (keep.has(k)) pruned[k] = safe[k]!;
  writeRaw(BYID_KEY, pruned);
  return updated;
}

export function getMeetingList(): MeetingSummary[] {
  const list = readRaw<MeetingSummary[]>(LIST_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function getMeetingById(id: string): MeetingRecord | null {
  const byId = readRaw<Record<string, MeetingRecord>>(BYID_KEY, {});
  const rec = byId && typeof byId === "object" && !Array.isArray(byId) ? byId[id] : undefined;
  return rec ? normalizeMeetingRecord(rec) : null;
}

export function deleteMeeting(id: string): MeetingSummary[] {
  const updated = getMeetingList().filter((s) => s.id !== id);
  writeRaw(LIST_KEY, updated);
  const byId = readRaw<Record<string, MeetingRecord>>(BYID_KEY, {});
  if (byId && typeof byId === "object" && !Array.isArray(byId) && id in byId) {
    const next = { ...byId };
    delete next[id];
    writeRaw(BYID_KEY, next);
  }
  return updated;
}

export type MeetingHistory = {
  sites: string[];
  companies: string[];
  works: string[];
  machines: string[];
  responsibles: string[];
  authors: string[];
  managers: string[];
  supervisors: string[];
};

/** Phase3: 過去の打合せ書から入力候補（履歴サジェスト）を収集（再入力の手間を削減）。 */
export function collectMeetingHistory(): MeetingHistory {
  const byId = readRaw<Record<string, MeetingRecord>>(BYID_KEY, {});
  const recs = byId && typeof byId === "object" && !Array.isArray(byId) ? Object.values(byId) : [];
  const sets = {
    sites: new Set<string>(),
    companies: new Set<string>(),
    works: new Set<string>(),
    machines: new Set<string>(),
    responsibles: new Set<string>(),
    authors: new Set<string>(),
    managers: new Set<string>(),
    supervisors: new Set<string>(),
  };
  for (const r of recs) {
    if (r.siteName) sets.sites.add(r.siteName);
    if (r.author) sets.authors.add(r.author);
    if (r.siteManager) sets.managers.add(r.siteManager);
    if (r.supervisor) sets.supervisors.add(r.supervisor);
    for (const c of r.contractors ?? []) {
      if (c.companyName) sets.companies.add(c.companyName);
      if (c.workContent) sets.works.add(c.workContent);
      if (c.responsibleName) sets.responsibles.add(c.responsibleName);
      for (const m of (c.machines || "").split(/[,、\n]/)) {
        const t = m.trim();
        if (t) sets.machines.add(t);
      }
    }
  }
  const cap = (s: Set<string>) => [...s].slice(0, 50);
  return {
    sites: cap(sets.sites),
    companies: cap(sets.companies),
    works: cap(sets.works),
    machines: cap(sets.machines),
    responsibles: cap(sets.responsibles),
    authors: cap(sets.authors),
    managers: cap(sets.managers),
    supervisors: cap(sets.supervisors),
  };
}

/** 翌日用に複製（新id・savedAt更新・実績/当日記入はクリア） */
export function duplicateForNextDay(rec: MeetingRecord): MeetingRecord {
  const d = new Date();
  const tomorrow = new Date(d.getTime() + 24 * 60 * 60 * 1000);
  return normalizeMeetingRecord({
    ...rec,
    id: newMeetingId(),
    workDateYear: String(tomorrow.getFullYear()),
    workDateMonth: String(tomorrow.getMonth() + 1),
    workDateDay: String(tomorrow.getDate()),
    meetingDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    supervisorComment: "",
    contractors: rec.contractors.map((c) => ({ ...c, actualCount: "", appendNote: "" })),
    checklist: rec.checklist.map((cat) => ({ ...cat, items: cat.items.map((i) => ({ ...i, status: "na" as const })) })),
    savedAt: new Date().toISOString(),
  });
}
