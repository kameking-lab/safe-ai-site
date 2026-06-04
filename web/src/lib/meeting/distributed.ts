/**
 * 打合せ書「協力会社 分散入力 → 元請 自動集約」の純粋ロジック（DB非依存・テスト対象）。
 *
 * セキュリティ設計（サーバー強制モデル＝既存 meeting API と同方針）:
 *  - DBアクセスはすべてサーバールート（service_role）経由。匿名キーはテーブルに一切触れない（RLSで遮断）。
 *  - 共有トークン(token)は「ケイパビリティ」。token を知る者だけが、その打合せ書への入力にアクセスできる。
 *    token は1つの打合せ書(meeting_id)にスコープされ、別の打合せ書には使えない（サーバーが照合）。
 *  - 各協力会社の投稿(contribution)は、サーバー生成の推測不能な contributionId を鍵に編集する。
 *    他社は他社の contributionId を知らないため、他社の入力を書き換えられない。
 *  - 元請の確定欄・他社の行は協力会社の投稿テーブル(meeting_share_inputs)とは別物。元請が「取り込む」操作で
 *    自分の打合せ書(meeting_records)に反映するため、協力会社は元請の確定データを直接書き換えられない。
 */
import type { MeetingContractorRow, ContractorType, MeetingRiskEval } from "@/lib/meeting/schema";
import { CONTRACTOR_TYPES } from "@/lib/meeting/schema";

/** 共有トークン／投稿IDの形式（16進64文字＝32バイト）。推測不能。 */
const TOKEN_RE = /^[0-9a-f]{64}$/;

/** 推測不能なランダムトークンを生成（Web Crypto。サーバー/ブラウザ両対応）。 */
export function generateShareToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function isValidToken(s: unknown): s is string {
  return typeof s === "string" && TOKEN_RE.test(s);
}

/** 協力会社が送信できるフィールドのみ（元請確定欄・当日欄・階層は含めない）。 */
export type ContributionPayload = {
  companyName: string;
  type: ContractorType;
  workContent: string;
  machines: string;
  qualifications: string[];
  plannedCount: string;
  predictedDisasters: string[];
  risk: MeetingRiskEval;
  safetyInstructions: string;
  responsibleName: string;
};

/** 1協力会社の投稿（サーバー保存形）。 */
export type MeetingContribution = {
  contributionId: string;
  token: string;
  payload: ContributionPayload;
  submittedAt: string;
};

/** 投稿履歴の1スナップショット（追記専用・監査＆復元用）。 */
export type MeetingContributionHistory = {
  historyId: string;
  contributionId: string;
  token: string;
  payload: ContributionPayload;
  recordedAt: string; // ISO
};

/** 履歴の保持期間（日）。これを過ぎた履歴は読み取り時に除外＆書き込み時に自動削除（ゼロ運用）。 */
export const HISTORY_RETENTION_DAYS = 30;

/** recordedAt が保持期間を過ぎているか（読み取り時の期限切れ除外用）。 */
export function isHistoryExpired(
  recordedAt: string,
  now: number = Date.now(),
  days: number = HISTORY_RETENTION_DAYS
): boolean {
  const t = new Date(recordedAt).getTime();
  if (Number.isNaN(t)) return false; // 不正日付は除外しない（消さない安全側）
  return now - t > days * 24 * 60 * 60 * 1000;
}

/** 期限切れ（保持期間超過）の履歴を除外して新しい順に返す純関数。 */
export function activeHistory(
  history: MeetingContributionHistory[],
  now: number = Date.now()
): MeetingContributionHistory[] {
  return history
    .filter((h) => !isHistoryExpired(h.recordedAt, now))
    .slice()
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

/**
 * 「一つ前の状態」のペイロードを返す（復元用）。
 * 現在のスナップショット(recordedAt=currentRecordedAt)より厳密に前の、最も新しい履歴の payload。
 * 無ければ null（戻す先が無い）。期限切れは対象外。
 */
export function pickPreviousPayload(
  history: MeetingContributionHistory[],
  currentRecordedAt: string,
  now: number = Date.now()
): ContributionPayload | null {
  const prev = activeHistory(history, now).filter((h) => h.recordedAt.localeCompare(currentRecordedAt) < 0);
  return prev.length > 0 ? prev[0].payload : null;
}

/**
 * 楽観ロックの競合検知（同一行を複数主体が同時更新する唯一の箇所＝同一contributionIdの並行更新用）。
 * クライアントが最後に見た submitted_at(base) と、サーバー現在値(current) が食い違えば競合＝true。
 * base 未指定（新規 or 競合検知しない呼び出し）や current 無し（新規行）は競合なし。
 */
export function hasWriteConflict(
  currentSubmittedAt: string | null | undefined,
  baseSubmittedAt: string | null | undefined
): boolean {
  if (!baseSubmittedAt || !currentSubmittedAt) return false;
  // 「同一時刻」を文字列ではなく時刻(エポックms)で比較する。
  // DBは timestamptz を "…+00:00" で返し、サーバー生成は "…Z" のため、同一瞬間でも
  // 文字列比較だと誤って競合扱いになり、正当な自社行の更新が全て弾かれてしまう（実DB検証で発覚）。
  const a = new Date(currentSubmittedAt).getTime();
  const b = new Date(baseSubmittedAt).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return currentSubmittedAt !== baseSubmittedAt; // 解釈不能は文字列比較に退避
  return a !== b;
}

const cap = (s: unknown, n: number): string =>
  (typeof s === "string" ? s : "").slice(0, n);

const capArray = (a: unknown, n: number, each: number): string[] =>
  Array.isArray(a) ? a.filter((x) => typeof x === "string").slice(0, n).map((x: string) => x.slice(0, each)) : [];

function clampRisk(r: unknown): MeetingRiskEval {
  const o = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
  const num = (v: unknown, lo: number, hi: number, d: number) => {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) return d;
    return Math.min(hi, Math.max(lo, Math.round(n)));
  };
  return {
    severity: num(o.severity, 1, 3, 1),
    likelihood: num(o.likelihood, 1, 3, 1),
    priority: num(o.priority, 1, 4, 1),
  };
}

/**
 * 協力会社入力を安全なペイロードに正規化（許可フィールドのみ・文字数上限・型強制）。
 * 元請の確定欄(actualCount/appendNote)・階層(parentId)・任意のidは受け付けない＝混入を防ぐ。
 */
export function sanitizeContribution(input: unknown): ContributionPayload {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const type = CONTRACTOR_TYPES.includes(o.type as ContractorType) ? (o.type as ContractorType) : "1次";
  return {
    companyName: cap(o.companyName, 100),
    type,
    workContent: cap(o.workContent, 2000),
    machines: cap(o.machines, 1000),
    qualifications: capArray(o.qualifications, 30, 60),
    plannedCount: cap(o.plannedCount, 12),
    predictedDisasters: capArray(o.predictedDisasters, 30, 200),
    risk: clampRisk(o.risk),
    safetyInstructions: cap(o.safetyInstructions, 2000),
    responsibleName: cap(o.responsibleName, 100),
  };
}

/** 投稿 → 元請の打合せ書 contractor 行へ変換。行idは contributionId に紐付け（再取り込みで同一行を更新）。 */
export function contributionToContractorRow(c: MeetingContribution): MeetingContractorRow {
  return {
    id: `contrib-${c.contributionId}`,
    type: c.payload.type,
    parentId: null,
    companyName: c.payload.companyName,
    workContent: c.payload.workContent,
    machines: c.payload.machines,
    qualifications: c.payload.qualifications,
    plannedCount: c.payload.plannedCount,
    predictedDisasters: c.payload.predictedDisasters,
    risk: c.payload.risk,
    safetyInstructions: c.payload.safetyInstructions,
    responsibleName: c.payload.responsibleName,
    actualCount: "",
    appendNote: "",
  };
}

/**
 * 協力会社の投稿群を元請の contractors[] に集約（純粋）。
 *  - 既存の協力会社行（id=contrib-<id>）は、協力会社の申告フィールドのみ更新。
 *    元請が記入する当日欄(actualCount)・追記欄(appendNote)・階層(parentId)は保持する（協力会社に上書きさせない）。
 *  - 未取り込みの投稿は新規行として追加。
 *  - 元請が手で作った行（contrib- 接頭辞でない行）は一切触らない。
 */
export function mergeContributionsIntoContractors(
  contractors: MeetingContractorRow[],
  contributions: MeetingContribution[]
): MeetingContractorRow[] {
  const byId = new Map(contractors.map((c) => [c.id, c]));
  const result = [...contractors];
  for (const contrib of contributions) {
    const rowId = `contrib-${contrib.contributionId}`;
    const existing = byId.get(rowId);
    const incoming = contributionToContractorRow(contrib);
    if (existing) {
      // 協力会社の申告のみ反映。元請の当日欄・追記欄・階層は保持。
      const merged: MeetingContractorRow = {
        ...incoming,
        parentId: existing.parentId,
        actualCount: existing.actualCount,
        appendNote: existing.appendNote,
      };
      const idx = result.findIndex((r) => r.id === rowId);
      if (idx >= 0) result[idx] = merged;
    } else {
      result.push(incoming);
    }
  }
  return result;
}
