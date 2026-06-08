"use client";

/**
 * 労働者死傷病報告 作成補助（下書き）のローカル保存。
 *
 * 労働安全衛生規則第97条により、労働者が労働災害等で死亡・休業したときは、事業者は
 * 「労働者死傷病報告」を所轄労働基準監督署長に提出しなければならない（休業4日以上は
 * 様式第23号で遅滞なく、休業4日未満は様式第24号で四半期ごと）。2025年1月からは
 * 電子申請が原則義務化されている。
 *
 * 本ツールは提出様式そのものではなく、報告に必要な情報を整理する「下書き」を作成し、
 * 印刷・保存できるようにするもの（実際の提出は電子申請等で行う）。
 */

export type ReportFormType = "23" | "24"; // 様式23号(休業4日以上) / 24号(4日未満)

export const FORM_TYPE_JA: Record<ReportFormType, string> = {
  "23": "様式第23号（休業4日以上・死亡）",
  "24": "様式第24号（休業4日未満・四半期報告）",
};

export type IncidentReport = {
  id: string;
  createdDate: string; // 作成日 ISO
  formType: ReportFormType;
  // 事業場
  bizType: string; // 事業の種類
  siteName: string; // 事業場の名称
  siteAddress: string; // 所在地
  workerCount: string; // 労働者数
  // 被災者
  victimName: string;
  victimSexAge: string; // 性別・年齢
  victimJob: string; // 職種
  victimExperience: string; // 経験期間
  // 災害
  occurredAt: string; // 発生年月日・時刻
  place: string; // 発生場所
  injuryName: string; // 傷病名・部位
  absenceDays: string; // 休業見込み日数
  situation: string; // 災害発生状況・原因
  note: string;
  savedAt: string;
};

export type IncidentReportSummary = {
  id: string;
  createdDate: string;
  formType: ReportFormType;
  siteName: string;
  victimName: string;
  occurredAt: string;
  savedAt: string;
};

const LIST_KEY = "safe-ai:incident-report-list:v1";
const BYID_KEY = "safe-ai:incident-report-by-id:v1";
export const MAX_INCIDENT_LIST = 120;

/** 災害発生状況の記入を促すための観点（様式の「どのような〜」に対応）。 */
export const SITUATION_HINTS: string[] = [
  "どのような場所で",
  "どのような作業をしているときに",
  "どのような物・環境に",
  "どのような不安全な・有害な状態があって",
  "どのような災害が発生したか",
];

// ---- 純関数（テスト対象） ----

export function summarizeIncident(rec: IncidentReport): IncidentReportSummary {
  return {
    id: rec.id,
    createdDate: rec.createdDate,
    formType: rec.formType,
    siteName: rec.siteName,
    victimName: rec.victimName,
    occurredAt: rec.occurredAt,
    savedAt: rec.savedAt,
  };
}

const CSV_HEADER = ["作成日", "様式", "事業場", "被災者", "発生日時", "場所", "傷病名・部位", "休業見込", "災害発生状況"];

function csvCell(v: string | null): string {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function incidentToCsv(rec: IncidentReport): string {
  const row = [
    rec.createdDate,
    FORM_TYPE_JA[rec.formType],
    rec.siteName,
    rec.victimName,
    rec.occurredAt,
    rec.place,
    rec.injuryName,
    rec.absenceDays,
    rec.situation,
  ]
    .map(csvCell)
    .join(",");
  return [CSV_HEADER.join(","), row].join("\r\n");
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

export function newIncidentId(): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `incident-${Date.now().toString(36)}-${rnd}`;
}

export function getIncidentList(): IncidentReportSummary[] {
  const list = readRaw<IncidentReportSummary[]>(LIST_KEY, []);
  return Array.isArray(list) ? list : [];
}

function getById(): Record<string, IncidentReport> {
  const byId = readRaw<Record<string, IncidentReport>>(BYID_KEY, {});
  return byId && typeof byId === "object" && !Array.isArray(byId) ? byId : {};
}

export function getIncidentById(id: string): IncidentReport | null {
  return getById()[id] ?? null;
}

export function saveIncident(rec: IncidentReport): IncidentReportSummary[] {
  const summary = summarizeIncident(rec);
  const list = getIncidentList().filter((s) => s.id !== rec.id);
  const updated = [summary, ...list]
    .sort((a, b) => (Date.parse(b.savedAt) || 0) - (Date.parse(a.savedAt) || 0))
    .slice(0, MAX_INCIDENT_LIST);
  writeRaw(LIST_KEY, updated);

  const byId = { ...getById() };
  byId[rec.id] = rec;
  const keep = new Set(updated.map((s) => s.id));
  const pruned: Record<string, IncidentReport> = {};
  for (const k of Object.keys(byId)) if (keep.has(k)) pruned[k] = byId[k]!;
  writeRaw(BYID_KEY, pruned);
  return updated;
}

export function deleteIncident(id: string): IncidentReportSummary[] {
  const updated = getIncidentList().filter((s) => s.id !== id);
  writeRaw(LIST_KEY, updated);
  const byId = { ...getById() };
  if (id in byId) {
    delete byId[id];
    writeRaw(BYID_KEY, byId);
  }
  return updated;
}
