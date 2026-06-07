"use client";

/**
 * 安全パトロール／職場巡視 記録のローカル保存。
 *
 * 労働安全衛生法第13条・労働安全衛生規則第6条等により、衛生管理者は少なくとも
 * 毎週1回、安全管理者は作業場等を巡視し、危険・健康障害のおそれがあるときは必要な
 * 措置を講じることとされている。組織的な安全パトロールも月1回以上が標準。
 * 本ツールは巡視時のチェックと指摘事項の是正管理（担当・期日・完了）を記録する。
 */

export type PatrolCheckResult = "ok" | "ng" | "na";
export type PatrolSeverity = "low" | "high";

export type PatrolCheckItem = { key: string; label: string; result: PatrolCheckResult };

export type PatrolFinding = {
  id: string;
  location: string;
  content: string;
  severity: PatrolSeverity;
  owner: string;
  due: string;
  resolved: boolean;
};

export type PatrolRecord = {
  id: string;
  date: string;
  time: string;
  inspector: string;
  role: string; // 巡視者の職位（安全管理者・衛生管理者・職長等）
  area: string; // 巡視範囲
  checks: PatrolCheckItem[];
  findings: PatrolFinding[];
  summary: string;
  savedAt: string;
};

export type PatrolSummary = {
  id: string;
  date: string;
  inspector: string;
  area: string;
  ngCount: number;
  findingCount: number;
  openCount: number; // 未是正
  savedAt: string;
};

export const RESULT_JA: Record<PatrolCheckResult, string> = { ok: "良", ng: "要改善", na: "対象外" };
export const SEVERITY_JA: Record<PatrolSeverity, string> = { low: "軽微", high: "重大" };

/** 5大災害＋衛生の標準チェック項目。 */
export const DEFAULT_PATROL_ITEMS: { key: string; label: string }[] = [
  { key: "fall", label: "墜落・転落防止（手すり・開口部養生・安全帯/フルハーネス）" },
  { key: "drop", label: "飛来・落下防止（上下作業・工具の落下対策・ネット）" },
  { key: "caught", label: "はさまれ・巻き込まれ防止（機械の安全装置・可動部）" },
  { key: "elec", label: "感電防止（漏電・絶縁・アース・分電盤の管理）" },
  { key: "collapse", label: "崩壊・倒壊防止（足場・土留め・型枠支保工）" },
  { key: "fire", label: "火災・爆発防止（火気管理・可燃物・消火器）" },
  { key: "tidy", label: "整理・整頓・通路確保（つまずき・清掃）" },
  { key: "ppe", label: "保護具の着用（ヘルメット・安全靴・保護メガネ等）" },
  { key: "chem", label: "化学物質・粉じん・換気" },
  { key: "noise", label: "騒音・振動対策" },
  { key: "heat", label: "熱中症対策（WBGT・水分塩分・休憩）" },
  { key: "third", label: "第三者災害防止（仮囲い・誘導員・近隣養生）" },
];

const LIST_KEY = "safe-ai:patrol-list:v1";
const BYID_KEY = "safe-ai:patrol-by-id:v1";
export const MAX_PATROL_LIST = 120;

// ---- 純関数（テスト対象） ----

export function defaultPatrolChecks(): PatrolCheckItem[] {
  return DEFAULT_PATROL_ITEMS.map((i) => ({ ...i, result: "na" as PatrolCheckResult }));
}

export function summarizePatrol(rec: PatrolRecord): PatrolSummary {
  return {
    id: rec.id,
    date: rec.date,
    inspector: rec.inspector,
    area: rec.area,
    ngCount: rec.checks.filter((c) => c.result === "ng").length,
    findingCount: rec.findings.length,
    openCount: rec.findings.filter((f) => !f.resolved).length,
    savedAt: rec.savedAt,
  };
}

const CSV_HEADER = ["巡視日", "巡視者", "範囲", "場所", "指摘内容", "危険度", "担当", "期日", "状態"];

function csvCell(v: string | number | null): string {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 指摘事項一覧をCSVに（是正管理用）。純関数。 */
export function findingsToCsv(rec: PatrolRecord): string {
  const rows = rec.findings.map((f) =>
    [rec.date, rec.inspector, rec.area, f.location, f.content, SEVERITY_JA[f.severity], f.owner, f.due, f.resolved ? "是正済" : "未是正"]
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

export function newPatrolId(): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `patrol-${Date.now().toString(36)}-${rnd}`;
}

export function newFindingId(): string {
  const rnd = Math.random().toString(36).slice(2, 6);
  return `find-${Date.now().toString(36)}-${rnd}`;
}

export function getPatrolList(): PatrolSummary[] {
  const list = readRaw<PatrolSummary[]>(LIST_KEY, []);
  return Array.isArray(list) ? list : [];
}

function getById(): Record<string, PatrolRecord> {
  const byId = readRaw<Record<string, PatrolRecord>>(BYID_KEY, {});
  return byId && typeof byId === "object" && !Array.isArray(byId) ? byId : {};
}

export function getPatrolById(id: string): PatrolRecord | null {
  return getById()[id] ?? null;
}

export function savePatrol(rec: PatrolRecord): PatrolSummary[] {
  const summary = summarizePatrol(rec);
  const list = getPatrolList().filter((s) => s.id !== rec.id);
  const updated = [summary, ...list]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (Date.parse(b.savedAt) || 0) - (Date.parse(a.savedAt) || 0)))
    .slice(0, MAX_PATROL_LIST);
  writeRaw(LIST_KEY, updated);

  const byId = { ...getById() };
  byId[rec.id] = rec;
  const keep = new Set(updated.map((s) => s.id));
  const pruned: Record<string, PatrolRecord> = {};
  for (const k of Object.keys(byId)) if (keep.has(k)) pruned[k] = byId[k]!;
  writeRaw(BYID_KEY, pruned);
  return updated;
}

export function deletePatrol(id: string): PatrolSummary[] {
  const updated = getPatrolList().filter((s) => s.id !== id);
  writeRaw(LIST_KEY, updated);
  const byId = { ...getById() };
  if (id in byId) {
    delete byId[id];
    writeRaw(BYID_KEY, byId);
  }
  return updated;
}
