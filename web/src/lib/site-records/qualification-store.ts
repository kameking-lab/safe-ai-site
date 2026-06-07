"use client";

/**
 * 特別教育・技能講習・資格の受講管理簿のローカル保存。
 *
 * 危険・有害業務には特別教育（安衛則36条）や技能講習・免許が必要で、誰がどの資格・
 * 教育を修了しているかを把握しておくことは、適正な配置と「有資格者に行わせている」
 * ことの証跡づくりに不可欠。本ツールは作業者ごとに保有資格・修了教育と取得日を記録する。
 * （必要な資格の逆引きは /education-certification/finder を参照）
 */

export type QualHeld = {
  id: string;
  name: string;
  date: string; // 取得・修了日
};

export type WorkerQual = {
  id: string;
  workerName: string;
  company: string;
  trade: string;
  quals: QualHeld[];
  note: string;
  savedAt: string;
};

export type WorkerQualSummary = {
  id: string;
  workerName: string;
  company: string;
  qualCount: number;
  savedAt: string;
};

/** 建設現場で多い特別教育・技能講習・資格（クイック追加用の候補）。 */
export const PRESET_QUALIFICATIONS: string[] = [
  "フルハーネス型墜落制止用器具 特別教育",
  "足場の組立て等 特別教育",
  "ローラー等 特別教育",
  "研削といし取替え 特別教育",
  "アーク溶接 特別教育",
  "低圧電気取扱い 特別教育",
  "酸素欠乏・硫化水素危険作業 特別教育",
  "石綿取扱い作業従事者 特別教育",
  "玉掛け 技能講習",
  "小型移動式クレーン運転 技能講習",
  "高所作業車運転 技能講習",
  "車両系建設機械（整地等）運転 技能講習",
  "フォークリフト運転 技能講習",
  "ガス溶接 技能講習",
  "職長・安全衛生責任者教育",
];

const LIST_KEY = "safe-ai:qual-list:v1";
const BYID_KEY = "safe-ai:qual-by-id:v1";
export const MAX_QUAL_LIST = 300;

// ---- 純関数（テスト対象） ----

export function summarizeWorkerQual(rec: WorkerQual): WorkerQualSummary {
  return {
    id: rec.id,
    workerName: rec.workerName,
    company: rec.company,
    qualCount: rec.quals.length,
    savedAt: rec.savedAt,
  };
}

const CSV_HEADER = ["氏名", "所属", "職種", "資格・教育", "取得・修了日"];

function csvCell(v: string | number | null): string {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 全作業者の名簿CSV（1行=作業者×資格）。純関数。 */
export function qualRosterToCsv(workers: WorkerQual[]): string {
  const rows: string[] = [];
  for (const w of workers) {
    if (w.quals.length === 0) {
      rows.push([w.workerName, w.company, w.trade, "", ""].map(csvCell).join(","));
    } else {
      for (const q of w.quals) {
        rows.push([w.workerName, w.company, w.trade, q.name, q.date].map(csvCell).join(","));
      }
    }
  }
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

export function newWorkerId(): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `qual-${Date.now().toString(36)}-${rnd}`;
}

export function newQualId(): string {
  const rnd = Math.random().toString(36).slice(2, 6);
  return `q-${Date.now().toString(36)}-${rnd}`;
}

export function getWorkerQualList(): WorkerQualSummary[] {
  const list = readRaw<WorkerQualSummary[]>(LIST_KEY, []);
  return Array.isArray(list) ? list : [];
}

function getById(): Record<string, WorkerQual> {
  const byId = readRaw<Record<string, WorkerQual>>(BYID_KEY, {});
  return byId && typeof byId === "object" && !Array.isArray(byId) ? byId : {};
}

export function getWorkerQualById(id: string): WorkerQual | null {
  return getById()[id] ?? null;
}

export function getAllWorkerQualFull(): WorkerQual[] {
  const byId = getById();
  return getWorkerQualList()
    .map((s) => byId[s.id])
    .filter((w): w is WorkerQual => Boolean(w));
}

export function saveWorkerQual(rec: WorkerQual): WorkerQualSummary[] {
  const summary = summarizeWorkerQual(rec);
  const list = getWorkerQualList().filter((s) => s.id !== rec.id);
  const updated = [summary, ...list]
    .sort((a, b) => (Date.parse(b.savedAt) || 0) - (Date.parse(a.savedAt) || 0))
    .slice(0, MAX_QUAL_LIST);
  writeRaw(LIST_KEY, updated);

  const byId = { ...getById() };
  byId[rec.id] = rec;
  const keep = new Set(updated.map((s) => s.id));
  const pruned: Record<string, WorkerQual> = {};
  for (const k of Object.keys(byId)) if (keep.has(k)) pruned[k] = byId[k]!;
  writeRaw(BYID_KEY, pruned);
  return updated;
}

export function deleteWorkerQual(id: string): WorkerQualSummary[] {
  const updated = getWorkerQualList().filter((s) => s.id !== id);
  writeRaw(LIST_KEY, updated);
  const byId = { ...getById() };
  if (id in byId) {
    delete byId[id];
    writeRaw(BYID_KEY, byId);
  }
  return updated;
}
