"use client";

/**
 * 新規入場者 受入教育の実施記録のローカル保存。
 *
 * 労働安全衛生法第59条（雇入れ時・作業内容変更時の安全衛生教育）と労働安全衛生
 * 規則第35条（教育事項。2024年改正で全業種に拡大）に基づく実施記録を作成・保管する。
 * 建設現場では新規入場者の受入教育として標準的に実施され、実施記録は監督指導時の
 * 証跡となる（教育の記録は3年間保存）。
 *
 * 既存の heat-illness（log/acclimatization）と同じ localStorage パターン。
 */

export type InductionCheckItem = { key: string; label: string; checked: boolean };

export type InductionRecord = {
  id: string;
  /** 実施日 ISO（YYYY-MM-DD）。 */
  date: string;
  siteName: string;
  /** 新規入場者の氏名。 */
  workerName: string;
  /** 所属（下請会社名等）。 */
  company: string;
  /** 職種。 */
  trade: string;
  /** 教育実施者（職長・安全衛生責任者等）。 */
  educator: string;
  items: InductionCheckItem[];
  note: string;
  /** 本人の受講確認。 */
  confirmedWorker: boolean;
  /** 実施者の確認。 */
  confirmedEducator: boolean;
  savedAt: string;
};

export type InductionSummary = {
  id: string;
  date: string;
  siteName: string;
  workerName: string;
  company: string;
  doneCount: number;
  total: number;
  savedAt: string;
};

/**
 * 教育項目の既定セット。安衛則第35条の8項目＋建設現場の受入教育で標準的な項目。
 * 現場に合わせて追加・チェックできる。
 */
export const DEFAULT_INDUCTION_ITEMS: { key: string; label: string }[] = [
  // --- 安衛則第35条 雇入れ時等の教育事項 ---
  { key: "machine", label: "機械・原材料等の危険性／有害性と取扱い方法（安衛則35条1号）" },
  { key: "ppe", label: "安全装置・保護具の性能と取扱い方法（同2号）" },
  { key: "procedure", label: "作業手順（同3号）" },
  { key: "inspection", label: "作業開始時の点検（同4号）" },
  { key: "disease", label: "業務で発生するおそれのある疾病の原因と予防（同5号）" },
  { key: "tidy", label: "整理・整頓・清潔の保持（同6号）" },
  { key: "emergency", label: "事故時等の応急措置と退避（同7号）" },
  { key: "other", label: "その他 当該業務の安全衛生に必要な事項（同8号）" },
  // --- 建設現場 受入教育で標準的な項目 ---
  { key: "site-rule", label: "現場の概要・作業所ルール・指揮命令系統" },
  { key: "no-entry", label: "立入禁止区域・通行経路・第三者災害防止" },
  { key: "signal", label: "合図・連絡方法・緊急時の連絡先" },
  { key: "ky", label: "当該作業の危険ポイント（KY）・過去の災害事例" },
  { key: "health", label: "健康管理（熱中症・体調不良時の申告）" },
];

const LIST_KEY = "safe-ai:induction-list:v1";
const BYID_KEY = "safe-ai:induction-by-id:v1";
export const MAX_INDUCTION_LIST = 200;

// ---- 純関数（テスト対象） ----

export function defaultInductionItems(): InductionCheckItem[] {
  return DEFAULT_INDUCTION_ITEMS.map((i) => ({ ...i, checked: false }));
}

export function summarizeInduction(rec: InductionRecord): InductionSummary {
  return {
    id: rec.id,
    date: rec.date,
    siteName: rec.siteName,
    workerName: rec.workerName,
    company: rec.company,
    doneCount: rec.items.filter((i) => i.checked).length,
    total: rec.items.length,
    savedAt: rec.savedAt,
  };
}

const ROSTER_HEADER = [
  "実施日",
  "現場",
  "氏名",
  "所属",
  "職種",
  "実施者",
  "教育項目(実施/全)",
  "本人確認",
  "実施者確認",
  "備考",
];

function csvCell(v: string | number | boolean | null): string {
  const s = v === null ? "" : typeof v === "boolean" ? (v ? "○" : "") : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 保存済み記録の名簿CSV（1行=1名）。月次報告・人事提出用。純関数。 */
export function rosterToCsv(records: InductionRecord[]): string {
  const rows = records.map((r) =>
    [
      r.date,
      r.siteName,
      r.workerName,
      r.company,
      r.trade,
      r.educator,
      `${r.items.filter((i) => i.checked).length}/${r.items.length}`,
      r.confirmedWorker,
      r.confirmedEducator,
      r.note,
    ]
      .map(csvCell)
      .join(","),
  );
  return [ROSTER_HEADER.join(","), ...rows].join("\r\n");
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

export function newInductionId(): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `induction-${Date.now().toString(36)}-${rnd}`;
}

export function getInductionList(): InductionSummary[] {
  const list = readRaw<InductionSummary[]>(LIST_KEY, []);
  return Array.isArray(list) ? list : [];
}

function getById(): Record<string, InductionRecord> {
  const byId = readRaw<Record<string, InductionRecord>>(BYID_KEY, {});
  return byId && typeof byId === "object" && !Array.isArray(byId) ? byId : {};
}

export function getInductionById(id: string): InductionRecord | null {
  return getById()[id] ?? null;
}

/** 名簿CSV用に全フルレコードを取得（一覧順）。 */
export function getAllInductionFull(): InductionRecord[] {
  const byId = getById();
  return getInductionList()
    .map((s) => byId[s.id])
    .filter((r): r is InductionRecord => Boolean(r));
}

export function saveInduction(rec: InductionRecord): InductionSummary[] {
  const summary = summarizeInduction(rec);
  const list = getInductionList().filter((s) => s.id !== rec.id);
  const updated = [summary, ...list]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (Date.parse(b.savedAt) || 0) - (Date.parse(a.savedAt) || 0)))
    .slice(0, MAX_INDUCTION_LIST);
  writeRaw(LIST_KEY, updated);

  const byId = { ...getById() };
  byId[rec.id] = rec;
  const keep = new Set(updated.map((s) => s.id));
  const pruned: Record<string, InductionRecord> = {};
  for (const k of Object.keys(byId)) if (keep.has(k)) pruned[k] = byId[k]!;
  writeRaw(BYID_KEY, pruned);
  return updated;
}

export function deleteInduction(id: string): InductionSummary[] {
  const updated = getInductionList().filter((s) => s.id !== id);
  writeRaw(LIST_KEY, updated);
  const byId = { ...getById() };
  if (id in byId) {
    delete byId[id];
    writeRaw(BYID_KEY, byId);
  }
  return updated;
}
