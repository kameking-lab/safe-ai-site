"use client";

/**
 * 暑熱順化（暑熱馴化）計画・進捗管理のローカル保存。
 *
 * 厚生労働省「職場における熱中症予防」では、暑熱作業に新たに従事する者・長期の
 * 中断から復帰する者について、7日以上かけて熱へのばく露時間を漸増させる「計画的な
 * 暑熱順化」を求めている（中断すると4日後から順化が失われ始め、3〜4週間で完全に
 * 失われる）。令和7年6月施行の改正安衛則の体制整備とあわせ、本ツールは作業者ごとの
 * 7日間（以上）の順化計画と日々の実施・体調を記録する。
 *
 * 既定の「目安(%)」はあくまで現場で調整するための編集可能な初期値であり、特定の
 * 公的数値ではない（漸増させるという原則のみが公的根拠）。WBGT算出は扱わない。
 */

export type AcclimatizationCategory = "new" | "returning" | "season-first";

export type AcclimatizationCondition = "" | "ok" | "caution" | "stop";

export type AcclimatizationDay = {
  /** 1始まりの日数。 */
  day: number;
  /** その日の日付 ISO（開始日からの導出）。 */
  date: string;
  /** ばく露・作業負荷の目安(%)。編集可能な初期値。 */
  targetPercent: number;
  /** 実施したか。 */
  done: boolean;
  /** 体調確認。 */
  condition: AcclimatizationCondition;
  note: string;
};

export type AcclimatizationPlan = {
  id: string;
  workerName: string;
  category: AcclimatizationCategory;
  siteName: string;
  /** 順化開始日 ISO（YYYY-MM-DD）。 */
  startDate: string;
  days: AcclimatizationDay[];
  savedAt: string;
};

export type AcclimatizationSummary = {
  id: string;
  workerName: string;
  category: AcclimatizationCategory;
  siteName: string;
  startDate: string;
  doneCount: number;
  total: number;
  complete: boolean;
  savedAt: string;
};

export const CATEGORY_JA: Record<AcclimatizationCategory, string> = {
  new: "新規入場者",
  returning: "長期休み明け・復帰者",
  "season-first": "今季初めての暑熱作業",
};

export const CONDITION_JA: Record<AcclimatizationCondition, string> = {
  "": "—",
  ok: "異常なし",
  caution: "要注意",
  stop: "作業中止",
};

/** 7日間（以上）の既定ランプ（編集可能な目安・公的な固定値ではない）。 */
export const DEFAULT_RAMP = [40, 50, 60, 70, 80, 90, 100];

const LIST_KEY = "safe-ai:heat-acclim-list:v1";
const BYID_KEY = "safe-ai:heat-acclim-by-id:v1";
export const MAX_ACCLIM_LIST = 120;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** ISO 日付に n 日加算（UTC基準で計算しタイムゾーン差異を排除）。純関数。 */
export function addDaysIso(iso: string, n: number): string {
  const parts = iso.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const t = Date.UTC(y, m - 1, d) + n * 86_400_000;
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

/** 開始日から days 日（最低7日）の順化計画を生成。純関数。 */
export function generatePlanDays(startDate: string, days = 7): AcclimatizationDay[] {
  const n = Math.max(7, days);
  const out: AcclimatizationDay[] = [];
  for (let i = 0; i < n; i++) {
    const ramp =
      i < DEFAULT_RAMP.length ? DEFAULT_RAMP[i]! : 100;
    out.push({
      day: i + 1,
      date: addDaysIso(startDate, i),
      targetPercent: ramp,
      done: false,
      condition: "",
      note: "",
    });
  }
  return out;
}

/** 進捗集計。純関数。 */
export function planProgress(plan: Pick<AcclimatizationPlan, "days">): {
  doneCount: number;
  total: number;
  complete: boolean;
} {
  const total = plan.days.length;
  const doneCount = plan.days.filter((d) => d.done).length;
  return { doneCount, total, complete: total > 0 && doneCount >= total };
}

export function summarizePlan(plan: AcclimatizationPlan): AcclimatizationSummary {
  const { doneCount, total, complete } = planProgress(plan);
  return {
    id: plan.id,
    workerName: plan.workerName,
    category: plan.category,
    siteName: plan.siteName,
    startDate: plan.startDate,
    doneCount,
    total,
    complete,
    savedAt: plan.savedAt,
  };
}

const CSV_HEADER = [
  "作業者",
  "区分",
  "現場",
  "開始日",
  "日数",
  "日付",
  "目安(%)",
  "実施",
  "体調",
  "メモ",
];

function csvCell(v: string | number | boolean | null): string {
  const s = v === null ? "" : typeof v === "boolean" ? (v ? "済" : "未") : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function planToCsv(plan: AcclimatizationPlan): string {
  const rows = plan.days.map((d) =>
    [
      plan.workerName,
      CATEGORY_JA[plan.category],
      plan.siteName,
      plan.startDate,
      d.day,
      d.date,
      d.targetPercent,
      d.done,
      CONDITION_JA[d.condition],
      d.note,
    ]
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
    /* quota 等は黙って無視 */
  }
}

export function newAcclimId(): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `acclim-${Date.now().toString(36)}-${rnd}`;
}

export function getAcclimList(): AcclimatizationSummary[] {
  const list = readRaw<AcclimatizationSummary[]>(LIST_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function getAcclimById(id: string): AcclimatizationPlan | null {
  const byId = readRaw<Record<string, AcclimatizationPlan>>(BYID_KEY, {});
  const rec = byId && typeof byId === "object" && !Array.isArray(byId) ? byId[id] : undefined;
  return rec ?? null;
}

export function saveAcclim(plan: AcclimatizationPlan): AcclimatizationSummary[] {
  const summary = summarizePlan(plan);
  const list = getAcclimList().filter((s) => s.id !== plan.id);
  const updated = [summary, ...list]
    .sort((a, b) => (Date.parse(b.savedAt) || 0) - (Date.parse(a.savedAt) || 0))
    .slice(0, MAX_ACCLIM_LIST);
  writeRaw(LIST_KEY, updated);

  const byId = readRaw<Record<string, AcclimatizationPlan>>(BYID_KEY, {});
  const safe = byId && typeof byId === "object" && !Array.isArray(byId) ? { ...byId } : {};
  safe[plan.id] = plan;
  const keep = new Set(updated.map((s) => s.id));
  const pruned: Record<string, AcclimatizationPlan> = {};
  for (const k of Object.keys(safe)) if (keep.has(k)) pruned[k] = safe[k]!;
  writeRaw(BYID_KEY, pruned);
  return updated;
}

export function deleteAcclim(id: string): AcclimatizationSummary[] {
  const updated = getAcclimList().filter((s) => s.id !== id);
  writeRaw(LIST_KEY, updated);
  const byId = readRaw<Record<string, AcclimatizationPlan>>(BYID_KEY, {});
  if (byId && typeof byId === "object" && !Array.isArray(byId) && id in byId) {
    const next = { ...byId };
    delete next[id];
    writeRaw(BYID_KEY, next);
  }
  return updated;
}
