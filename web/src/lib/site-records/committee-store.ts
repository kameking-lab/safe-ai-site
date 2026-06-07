"use client";

/**
 * 安全衛生委員会 議事録のローカル保存。
 *
 * 労働安全衛生法第17〜19条（安全委員会・衛生委員会・安全衛生委員会）に基づき、
 * 常時50人以上（業種により100人以上）の事業場は委員会を設置し、労働安全衛生規則
 * 第23条により「毎月1回以上」開催、議事の概要等を記録して「3年間保存」し、議事の
 * 概要を労働者へ周知する義務がある。付議事項は安衛則第21・22条。
 * 本ツールはその議事録づくり・保管・周知用印刷を支援する。
 */

export type CommitteeType = "safety" | "health" | "both";

export type AgendaItem = {
  id: string;
  topic: string;
  discussion: string;
  decision: string;
  owner: string;
  due: string;
};

export type CommitteeMinutes = {
  id: string;
  /** 開催日 ISO（YYYY-MM-DD）。 */
  date: string;
  startTime: string;
  place: string;
  committeeType: CommitteeType;
  chair: string; // 委員長・議長
  secretary: string; // 書記
  attendees: string; // 出席者（労使委員）
  agenda: AgendaItem[];
  remarks: string;
  nextDate: string;
  savedAt: string;
};

export type CommitteeSummary = {
  id: string;
  date: string;
  committeeType: CommitteeType;
  place: string;
  agendaCount: number;
  decidedCount: number;
  savedAt: string;
};

export const COMMITTEE_TYPE_JA: Record<CommitteeType, string> = {
  safety: "安全委員会",
  health: "衛生委員会",
  both: "安全衛生委員会",
};

/** 付議事項（安衛則21・22条）に基づく標準議題の既定セット。 */
export const DEFAULT_AGENDA_TOPICS: string[] = [
  "前回議事録の確認・決定事項の措置状況",
  "労働災害・ヒヤリハットの報告と再発防止対策",
  "危険性・有害性等の調査（リスクアセスメント）と結果に基づく措置",
  "安全衛生教育の計画・実施状況",
  "健康診断の結果と事後措置・長時間労働者の状況",
  "メンタルヘルス・ストレスチェック対策の状況",
  "職場巡視（安全パトロール）の結果と改善",
  "その他（法改正・季節対策（熱中症等）・規程の整備）",
];

const LIST_KEY = "safe-ai:committee-list:v1";
const BYID_KEY = "safe-ai:committee-by-id:v1";
export const MAX_COMMITTEE_LIST = 120;

// ---- 純関数（テスト対象） ----

let agendaSeq = 0;
function localAgendaId(): string {
  agendaSeq += 1;
  return `ag-${agendaSeq}`;
}

export function defaultAgenda(): AgendaItem[] {
  return DEFAULT_AGENDA_TOPICS.map((topic) => ({
    id: localAgendaId(),
    topic,
    discussion: "",
    decision: "",
    owner: "",
    due: "",
  }));
}

export function summarizeMinutes(rec: CommitteeMinutes): CommitteeSummary {
  return {
    id: rec.id,
    date: rec.date,
    committeeType: rec.committeeType,
    place: rec.place,
    agendaCount: rec.agenda.length,
    decidedCount: rec.agenda.filter((a) => a.decision.trim() !== "").length,
    savedAt: rec.savedAt,
  };
}

const CSV_HEADER = ["開催日", "委員会", "場所", "議題", "議事内容", "決定・措置", "担当", "期日"];

function csvCell(v: string | number | null): string {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function minutesToCsv(rec: CommitteeMinutes): string {
  const rows = rec.agenda.map((a) =>
    [rec.date, COMMITTEE_TYPE_JA[rec.committeeType], rec.place, a.topic, a.discussion, a.decision, a.owner, a.due]
      .map(csvCell)
      .join(","),
  );
  return [CSV_HEADER.join(","), ...rows].join("\r\n");
}

// ---- 永続化（window 依存） ----

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
    /* ignore */
  }
}

export function newCommitteeId(): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `committee-${Date.now().toString(36)}-${rnd}`;
}

export function newAgendaId(): string {
  const rnd = Math.random().toString(36).slice(2, 6);
  return `ag-${Date.now().toString(36)}-${rnd}`;
}

export function getCommitteeList(): CommitteeSummary[] {
  const list = readRaw<CommitteeSummary[]>(LIST_KEY, []);
  return Array.isArray(list) ? list : [];
}

function getById(): Record<string, CommitteeMinutes> {
  const byId = readRaw<Record<string, CommitteeMinutes>>(BYID_KEY, {});
  return byId && typeof byId === "object" && !Array.isArray(byId) ? byId : {};
}

export function getCommitteeById(id: string): CommitteeMinutes | null {
  return getById()[id] ?? null;
}

export function saveCommittee(rec: CommitteeMinutes): CommitteeSummary[] {
  const summary = summarizeMinutes(rec);
  const list = getCommitteeList().filter((s) => s.id !== rec.id);
  const updated = [summary, ...list]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (Date.parse(b.savedAt) || 0) - (Date.parse(a.savedAt) || 0)))
    .slice(0, MAX_COMMITTEE_LIST);
  writeRaw(LIST_KEY, updated);

  const byId = { ...getById() };
  byId[rec.id] = rec;
  const keep = new Set(updated.map((s) => s.id));
  const pruned: Record<string, CommitteeMinutes> = {};
  for (const k of Object.keys(byId)) if (keep.has(k)) pruned[k] = byId[k]!;
  writeRaw(BYID_KEY, pruned);
  return updated;
}

export function deleteCommittee(id: string): CommitteeSummary[] {
  const updated = getCommitteeList().filter((s) => s.id !== id);
  writeRaw(LIST_KEY, updated);
  const byId = { ...getById() };
  if (id in byId) {
    delete byId[id];
    writeRaw(BYID_KEY, byId);
  }
  return updated;
}
