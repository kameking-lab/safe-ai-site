/**
 * P0-006 (usability-audit-day2-2026-05-24):
 * 年次安全衛生計画ジェネレータの「過去計画 履歴」localStorage 永続化。
 *
 * 既存の CopilotProvider.recordPlan は activePlan を最新1件のみ保持しており、
 * 「昨年の計画と比較」「前年テンプレから流用」のような PDCA 用途には対応
 * できなかった。本モジュールは独立した localStorage キーで最大3件の履歴を
 * 保持し、preview 画面 / フォーム画面の双方で参照する。
 *
 * 設計:
 * - キー: `safe-ai:plan-generator-history:v1`
 * - 最大 3 件 (古いものから自動切り捨て)
 * - 同一 (industry, scale, fiscalYear) のエントリは上書き
 * - SSR 中は touchしない (typeof window チェック必須)
 */

const STORAGE_KEY = "safe-ai:plan-generator-history:v1";
const MAX_HISTORY = 3;

export type PlanHistoryEntry = {
  /** ジェネレータが生成した一意 ID (templateId と一致しない: ユーザー設定差分も保持するため) */
  id: string;
  /** preview ページに遷移するための完全な URL (querystring 含む) */
  previewHref: string;
  industry: string;
  industryLabel: string;
  scale: string;
  scaleLabel: string;
  fiscalYear: number;
  organizationName: string | null;
  /** ISO 形式の作成日時 (新しい順で並べる) */
  generatedAt: string;
};

function safeRead(): PlanHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 型ガード: 必須フィールドを持つもののみ残す
    return parsed.filter(
      (e): e is PlanHistoryEntry =>
        e !== null &&
        typeof e === "object" &&
        typeof e.id === "string" &&
        typeof e.previewHref === "string" &&
        typeof e.industry === "string" &&
        typeof e.scale === "string" &&
        typeof e.fiscalYear === "number" &&
        typeof e.generatedAt === "string",
    );
  } catch {
    return [];
  }
}

function safeWrite(entries: PlanHistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage quota / disabled — fall through silently
  }
}

export function loadPlanHistory(): PlanHistoryEntry[] {
  return safeRead().sort((a, b) =>
    b.generatedAt.localeCompare(a.generatedAt),
  );
}

export function recordPlanHistory(entry: Omit<PlanHistoryEntry, "generatedAt"> & { generatedAt?: string }): PlanHistoryEntry {
  const current = safeRead();
  const generatedAt = entry.generatedAt ?? new Date().toISOString();
  const next: PlanHistoryEntry = { ...entry, generatedAt };
  // 同一 industry/scale/fiscalYear は1件にまとめる (最新で上書き)
  const filtered = current.filter(
    (e) =>
      !(
        e.industry === next.industry &&
        e.scale === next.scale &&
        e.fiscalYear === next.fiscalYear
      ),
  );
  const updated = [next, ...filtered]
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
    .slice(0, MAX_HISTORY);
  safeWrite(updated);
  return next;
}

export function clearPlanHistory() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** 「昨年の計画から作成」用に、最新の1件を返す。なければ null。 */
export function loadLatestPlan(): PlanHistoryEntry | null {
  const list = loadPlanHistory();
  return list[0] ?? null;
}
