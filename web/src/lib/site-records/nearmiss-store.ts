"use client";

/**
 * ヒヤリハット報告・集計のローカル保存。
 *
 * ヒヤリハット活動（重大災害の背後にある多数の軽微な異常・危険を収集し対策する活動。
 * いわゆるハインリッヒの法則）は労働災害予防の基本サイクル。報告を蓄積し、事故の型
 * 別に集計して傾向を把握、対策の進捗を管理する。各報告はこの端末に保存し、印刷・
 * CSV出力で共有・月次集計に使える。
 */

export type NearMissType =
  | "墜落・転落"
  | "転倒"
  | "はさまれ・巻き込まれ"
  | "飛来・落下"
  | "切れ・こすれ"
  | "激突・衝突"
  | "感電"
  | "火災・爆発"
  | "交通"
  | "熱中症・体調"
  | "化学物質・有害物"
  | "その他";

export const NEAR_MISS_TYPES: NearMissType[] = [
  "墜落・転落",
  "転倒",
  "はさまれ・巻き込まれ",
  "飛来・落下",
  "切れ・こすれ",
  "激突・衝突",
  "感電",
  "火災・爆発",
  "交通",
  "熱中症・体調",
  "化学物質・有害物",
  "その他",
];

export type NearMissPotential = "low" | "high";
export const POTENTIAL_JA: Record<NearMissPotential, string> = { low: "軽微", high: "重大の可能性" };

export type NearMissReport = {
  id: string;
  date: string;
  site: string;
  reporter: string;
  type: NearMissType;
  location: string;
  situation: string; // どんなヒヤリ・ハットか
  cause: string; // 要因
  countermeasure: string; // 対策
  potential: NearMissPotential;
  resolved: boolean;
  savedAt: string;
};

const LIST_KEY = "safe-ai:nearmiss-list:v1";
export const MAX_NEARMISS = 300;

// ---- 純関数（テスト対象） ----

/** 事故の型別の件数集計（報告の多い順）。 */
export function countByType(reports: NearMissReport[]): { type: NearMissType; count: number }[] {
  const map = new Map<NearMissType, number>();
  for (const r of reports) map.set(r.type, (map.get(r.type) ?? 0) + 1);
  return [...map.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

export function openCount(reports: NearMissReport[]): number {
  return reports.filter((r) => !r.resolved).length;
}

/** 重大の可能性 × 未対策 の件数（最優先で対策すべき報告）。 */
export function openHighCount(reports: NearMissReport[]): number {
  return reports.filter((r) => !r.resolved && r.potential === "high").length;
}

/**
 * 対策の緊急度ランク（小さいほど先に対応すべき）。
 * 0=未対策×重大 / 1=未対策×軽微 / 2=対策済×重大 / 3=対策済×軽微
 */
export function priorityRank(r: NearMissReport): 0 | 1 | 2 | 3 {
  if (!r.resolved) return r.potential === "high" ? 0 : 1;
  return r.potential === "high" ? 2 : 3;
}

/**
 * 「対策すべきもの優先」の並び替え。
 * 未対策×重大 → 未対策×軽微 → 対策済… の順。同ランク内は日付の新しい順。
 * 元配列は破壊しない。
 */
export function sortByPriority(reports: NearMissReport[]): NearMissReport[] {
  return [...reports].sort((a, b) => {
    const ra = priorityRank(a);
    const rb = priorityRank(b);
    if (ra !== rb) return ra - rb;
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (Date.parse(b.savedAt) || 0) - (Date.parse(a.savedAt) || 0);
  });
}

/** openOnly=true のとき未対策のみに絞り込む（元配列は破壊しない）。 */
export function filterOpenOnly(reports: NearMissReport[], openOnly: boolean): NearMissReport[] {
  return openOnly ? reports.filter((r) => !r.resolved) : [...reports];
}

const CSV_HEADER = ["日付", "現場", "報告者", "事故の型", "場所", "状況", "要因", "対策", "危険度", "状態"];

function csvCell(v: string | number | null): string {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function nearMissToCsv(reports: NearMissReport[]): string {
  const rows = reports.map((r) =>
    [r.date, r.site, r.reporter, r.type, r.location, r.situation, r.cause, r.countermeasure, POTENTIAL_JA[r.potential], r.resolved ? "対策済" : "対応中"]
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

export function newNearMissId(): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `nearmiss-${Date.now().toString(36)}-${rnd}`;
}

export function getNearMissReports(): NearMissReport[] {
  const list = readRaw<NearMissReport[]>(LIST_KEY, []);
  return Array.isArray(list) ? list : [];
}

/** 追加または更新（同id）。新しい順に保持。 */
export function saveNearMiss(rec: NearMissReport): NearMissReport[] {
  const list = getNearMissReports().filter((r) => r.id !== rec.id);
  const updated = [rec, ...list]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (Date.parse(b.savedAt) || 0) - (Date.parse(a.savedAt) || 0)))
    .slice(0, MAX_NEARMISS);
  writeRaw(LIST_KEY, updated);
  return updated;
}

export function deleteNearMiss(id: string): NearMissReport[] {
  const updated = getNearMissReports().filter((r) => r.id !== id);
  writeRaw(LIST_KEY, updated);
  return updated;
}
