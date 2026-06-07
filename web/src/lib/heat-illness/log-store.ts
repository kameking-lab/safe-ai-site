"use client";

/**
 * 熱中症 WBGT日次記録簿のローカル保存（打合せ書 meeting/store.ts と同じ思想）。
 *
 * 令和7年6月施行の安衛則改正（第612条の2）は、WBGT基準値以上の作業について
 * 体制整備・対応手順の整備等を求めており、実務上は「いつ・どこで・WBGT値・
 * 実施した対策」を日次で記録・保管しておくことが監督指導時の証跡になる。
 * この記録簿はその日次運用を Web で完結させる（端末ローカル保存・印刷・CSV）。
 *
 * - LIST_KEY: 一覧サマリー（最大 MAX_LOG_LIST 件）
 * - BYID_KEY: 再編集用に full record を id 別保持
 * - DRAFT_KEY: WBGT計算機からの「記録簿に追加」受け渡し（1件分の下書き）
 * 数値計算（WBGT・リスク判定）は lib/wbgt-engine.ts を再利用し、ここでは保存と
 * 帳票化（要約・CSV）だけを担う。
 */
import type {
  AcclimatizationState,
  Environment,
  RiskLevel,
  WorkIntensity,
} from "@/types/heat-illness";

/** 1回分の測定＋実施記録。 */
export type HeatLogEntry = {
  id: string;
  /** 測定時刻 "HH:MM"。 */
  time: string;
  airTempC: number;
  humidity: number;
  /** 黒球温度（未測定は null）。 */
  globeTempC: number | null;
  environment: Environment;
  workIntensity: WorkIntensity;
  acclimatization: AcclimatizationState;
  /** 算出 WBGT（℃）。 */
  wbgt: number;
  riskLevel: RiskLevel;
  /** リスク区分の和名ラベル（注意・警戒 等）。 */
  riskLabel: string;
  /** 実施した対策（推奨から自動充填し編集可）。 */
  measures: string;
  /** 体調確認・特記事項。 */
  note: string;
};

/** 1日分（現場×日付）の記録。 */
export type HeatLogRecord = {
  id: string;
  /** 記録日 ISO（YYYY-MM-DD）。 */
  date: string;
  siteName: string;
  author: string;
  entries: HeatLogEntry[];
  /** 保存時刻 ISO。 */
  savedAt: string;
};

/** 一覧サマリー。 */
export type HeatLogSummary = {
  id: string;
  date: string;
  siteName: string;
  author: string;
  entryCount: number;
  /** その日の最高 WBGT（記録なしは null）。 */
  maxWbgt: number | null;
  /** その日の最も高いリスク区分（記録なしは null）。 */
  maxRiskLevel: RiskLevel | null;
  savedAt: string;
};

const LIST_KEY = "safe-ai:heat-log-list:v1";
const BYID_KEY = "safe-ai:heat-log-by-id:v1";
const DRAFT_KEY = "safe-ai:heat-log-draft:v1";
export const MAX_LOG_LIST = 120;

/** リスク区分の重み（要約で最悪値を取るため）。純関数。 */
export const RISK_RANK: Record<RiskLevel, number> = {
  safe: 0,
  caution: 1,
  warning: 2,
  "severe-warning": 3,
  danger: 4,
};

/** WBGT計算機から渡す下書き（1件分の入力＋算出結果）。 */
export type HeatLogDraft = Omit<HeatLogEntry, "id" | "time" | "measures" | "note"> & {
  /** 推奨対策の要約（記録簿側で measures の初期値に使う）。 */
  suggestedMeasures?: string;
};

// ---- 純関数（テスト対象。window 非依存） ----

/** その日の記録から一覧サマリーを作る。 */
export function summarizeRecord(rec: HeatLogRecord): HeatLogSummary {
  let maxWbgt: number | null = null;
  let maxRiskLevel: RiskLevel | null = null;
  for (const e of rec.entries) {
    if (maxWbgt === null || e.wbgt > maxWbgt) maxWbgt = e.wbgt;
    if (maxRiskLevel === null || RISK_RANK[e.riskLevel] > RISK_RANK[maxRiskLevel]) {
      maxRiskLevel = e.riskLevel;
    }
  }
  return {
    id: rec.id,
    date: rec.date,
    siteName: rec.siteName,
    author: rec.author,
    entryCount: rec.entries.length,
    maxWbgt,
    maxRiskLevel,
    savedAt: rec.savedAt,
  };
}

const CSV_HEADER = [
  "日付",
  "現場",
  "記録者",
  "時刻",
  "気温(℃)",
  "湿度(%)",
  "黒球温度(℃)",
  "環境",
  "作業強度",
  "暑熱順化",
  "WBGT(℃)",
  "リスク区分",
  "実施した対策",
  "体調・特記",
];

const ENV_JA: Record<Environment, string> = { outdoor: "屋外", indoor: "屋内" };
const INTENSITY_JA: Record<WorkIntensity, string> = {
  light: "軽作業",
  moderate: "中程度",
  heavy: "重作業",
  "very-heavy": "非常に重い",
};
const ACCLIM_JA: Record<AcclimatizationState, string> = {
  acclimatized: "順化済み",
  "non-acclimatized": "未順化",
};

function csvCell(v: string | number | null): string {
  const s = v === null ? "" : String(v);
  // ダブルクォート/カンマ/改行を含む場合はクォート（Excel互換）。
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 1日分の記録を CSV 文字列にする（Excel で開ける）。 */
export function recordToCsv(rec: HeatLogRecord): string {
  const rows = rec.entries.map((e) =>
    [
      rec.date,
      rec.siteName,
      rec.author,
      e.time,
      e.airTempC,
      e.humidity,
      e.globeTempC,
      ENV_JA[e.environment],
      INTENSITY_JA[e.workIntensity],
      ACCLIM_JA[e.acclimatization],
      e.wbgt,
      e.riskLabel,
      e.measures,
      e.note,
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

/** 衝突しにくい簡易 id。 */
export function newHeatLogId(): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `heatlog-${Date.now().toString(36)}-${rnd}`;
}

export function getHeatLogList(): HeatLogSummary[] {
  const list = readRaw<HeatLogSummary[]>(LIST_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function getHeatLogById(id: string): HeatLogRecord | null {
  const byId = readRaw<Record<string, HeatLogRecord>>(BYID_KEY, {});
  const rec = byId && typeof byId === "object" && !Array.isArray(byId) ? byId[id] : undefined;
  return rec ?? null;
}

/** 一覧＋by-id に保存。更新後の一覧を返す。 */
export function saveHeatLog(rec: HeatLogRecord): HeatLogSummary[] {
  const summary = summarizeRecord(rec);
  const list = getHeatLogList().filter((s) => s.id !== rec.id);
  const updated = [summary, ...list]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (Date.parse(b.savedAt) || 0) - (Date.parse(a.savedAt) || 0)))
    .slice(0, MAX_LOG_LIST);
  writeRaw(LIST_KEY, updated);

  const byId = readRaw<Record<string, HeatLogRecord>>(BYID_KEY, {});
  const safe = byId && typeof byId === "object" && !Array.isArray(byId) ? { ...byId } : {};
  safe[rec.id] = rec;
  const keep = new Set(updated.map((s) => s.id));
  const pruned: Record<string, HeatLogRecord> = {};
  for (const k of Object.keys(safe)) if (keep.has(k)) pruned[k] = safe[k]!;
  writeRaw(BYID_KEY, pruned);
  return updated;
}

export function deleteHeatLog(id: string): HeatLogSummary[] {
  const updated = getHeatLogList().filter((s) => s.id !== id);
  writeRaw(LIST_KEY, updated);
  const byId = readRaw<Record<string, HeatLogRecord>>(BYID_KEY, {});
  if (byId && typeof byId === "object" && !Array.isArray(byId) && id in byId) {
    const next = { ...byId };
    delete next[id];
    writeRaw(BYID_KEY, next);
  }
  return updated;
}

/** WBGT計算機 → 記録簿 の受け渡し（1件分）。 */
export function putHeatLogDraft(draft: HeatLogDraft): void {
  writeRaw(DRAFT_KEY, draft);
}

/** 下書きを取り出して消す（記録簿のマウント時に1回）。 */
export function takeHeatLogDraft(): HeatLogDraft | null {
  const d = readRaw<HeatLogDraft | null>(DRAFT_KEY, null);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }
  return d && typeof d === "object" ? d : null;
}
