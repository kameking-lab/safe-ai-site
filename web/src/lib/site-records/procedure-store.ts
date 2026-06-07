"use client";

/**
 * 作業手順書のローカル保存。
 *
 * 作業手順書は、作業を安全に進めるための標準手順を「手順／急所（危険）／対策」で
 * 明文化したもの。労働安全衛生規則第35条（雇入れ時等教育の「作業手順に関すること」）
 * の教育や、KY・新規入場者教育の土台になる現場の基本文書。当日のKY（危険予知）が
 * 「その日の危険」を扱うのに対し、作業手順書は「作業の標準手順」を定める再利用文書。
 */

export type WorkStep = {
  id: string;
  step: string; // 作業手順
  hazard: string; // 危険・急所
  measure: string; // 対策
};

export type WorkProcedure = {
  id: string;
  title: string; // 作業名
  site: string;
  author: string;
  date: string;
  equipment: string; // 使用する機械・工具
  qualifications: string; // 必要な資格・特別教育
  steps: WorkStep[];
  notes: string;
  savedAt: string;
};

export type ProcedureSummary = {
  id: string;
  title: string;
  site: string;
  date: string;
  stepCount: number;
  savedAt: string;
};

const LIST_KEY = "safe-ai:procedure-list:v1";
const BYID_KEY = "safe-ai:procedure-by-id:v1";
export const MAX_PROCEDURE_LIST = 150;

let stepSeq = 0;
function localStepId(): string {
  stepSeq += 1;
  return `step-${stepSeq}`;
}

// ---- 純関数（テスト対象） ----

export function emptyStep(): WorkStep {
  return { id: localStepId(), step: "", hazard: "", measure: "" };
}

export function defaultSteps(n = 3): WorkStep[] {
  return Array.from({ length: n }, () => emptyStep());
}

export function summarizeProcedure(rec: WorkProcedure): ProcedureSummary {
  return {
    id: rec.id,
    title: rec.title,
    site: rec.site,
    date: rec.date,
    stepCount: rec.steps.length,
    savedAt: rec.savedAt,
  };
}

const CSV_HEADER = ["作業名", "現場", "作成日", "No", "作業手順", "危険・急所", "対策"];

function csvCell(v: string | number | null): string {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function procedureToCsv(rec: WorkProcedure): string {
  const rows = rec.steps.map((s, i) =>
    [rec.title, rec.site, rec.date, i + 1, s.step, s.hazard, s.measure].map(csvCell).join(","),
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

export function newProcedureId(): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `procedure-${Date.now().toString(36)}-${rnd}`;
}

export function newStepId(): string {
  const rnd = Math.random().toString(36).slice(2, 6);
  return `step-${Date.now().toString(36)}-${rnd}`;
}

export function getProcedureList(): ProcedureSummary[] {
  const list = readRaw<ProcedureSummary[]>(LIST_KEY, []);
  return Array.isArray(list) ? list : [];
}

function getById(): Record<string, WorkProcedure> {
  const byId = readRaw<Record<string, WorkProcedure>>(BYID_KEY, {});
  return byId && typeof byId === "object" && !Array.isArray(byId) ? byId : {};
}

export function getProcedureById(id: string): WorkProcedure | null {
  return getById()[id] ?? null;
}

export function saveProcedure(rec: WorkProcedure): ProcedureSummary[] {
  const summary = summarizeProcedure(rec);
  const list = getProcedureList().filter((s) => s.id !== rec.id);
  const updated = [summary, ...list]
    .sort((a, b) => (Date.parse(b.savedAt) || 0) - (Date.parse(a.savedAt) || 0))
    .slice(0, MAX_PROCEDURE_LIST);
  writeRaw(LIST_KEY, updated);

  const byId = { ...getById() };
  byId[rec.id] = rec;
  const keep = new Set(updated.map((s) => s.id));
  const pruned: Record<string, WorkProcedure> = {};
  for (const k of Object.keys(byId)) if (keep.has(k)) pruned[k] = byId[k]!;
  writeRaw(BYID_KEY, pruned);
  return updated;
}

export function deleteProcedure(id: string): ProcedureSummary[] {
  const updated = getProcedureList().filter((s) => s.id !== id);
  writeRaw(LIST_KEY, updated);
  const byId = { ...getById() };
  if (id in byId) {
    delete byId[id];
    writeRaw(BYID_KEY, byId);
  }
  return updated;
}
