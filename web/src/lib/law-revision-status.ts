/**
 * P0-1: 法改正の「施行前／施行済」ステータス判定（news-deep-audit 2026-05-28）
 *
 * 設計（誤読リスク低）:
 * - e-Gov 法令API v2 の current_revision_status（UnEnforced/CurrentEnforced）を一次に使う
 *   （公式値をそのまま採用＝自前で断定解釈しない）。
 * - 公式ステータスが無い手書きデータは、enforcement_date と「今日」の日付事実のみで判定。
 * - 施行日が不明（空文字/未設定）なら "undetermined"（推測しない）。
 */

export type EnforcementStatus = "enforced" | "upcoming" | "undetermined";

/** e-Gov current_revision_status → 内部ステータスへの正規化 */
export function normalizeEgovStatus(raw: string | null | undefined): EnforcementStatus | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === "currentenforced" || v === "enforced") return "enforced";
  if (v === "unenforced" || v === "upcoming") return "upcoming";
  return null; // 不明値は判定に使わない
}

function parseYmd(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * 施行ステータスを判定する。
 * 優先: 明示ステータス（e-Gov公式値）> 施行日と今日の比較 > undetermined。
 */
export function getEnforcementStatus(
  rev: { enforcement_date?: string; enforcement_status?: EnforcementStatus },
  now: Date = new Date(),
): EnforcementStatus {
  if (rev.enforcement_status) return rev.enforcement_status;
  const date = parseYmd(rev.enforcement_date);
  if (!date) return "undetermined";
  const today = startOfDay(now);
  return startOfDay(date).getTime() <= today.getTime() ? "enforced" : "upcoming";
}

/**
 * 施行日までの残日数（施行前のみ正の整数）。
 * 施行日不明 or 施行済なら null。
 */
export function daysUntilEnforcement(
  enforcement_date: string | undefined,
  now: Date = new Date(),
): number | null {
  const date = parseYmd(enforcement_date);
  if (!date) return null;
  const today = startOfDay(now).getTime();
  const target = startOfDay(date).getTime();
  if (target <= today) return null;
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

export type EnforcementBadge = {
  status: EnforcementStatus;
  label: string;
  /** UIのトーン（色分け用キー） */
  tone: "enforced" | "upcoming" | "undetermined";
  /** 施行前の残日数（あれば） */
  daysLeft: number | null;
};

/** バッジ表示用のラベル＋トーンを返す。 */
export function buildEnforcementBadge(
  rev: { enforcement_date?: string; enforcement_status?: EnforcementStatus },
  now: Date = new Date(),
): EnforcementBadge {
  const status = getEnforcementStatus(rev, now);
  if (status === "enforced") {
    return { status, label: "施行済", tone: "enforced", daysLeft: null };
  }
  if (status === "upcoming") {
    const daysLeft = daysUntilEnforcement(rev.enforcement_date, now);
    const label = daysLeft != null ? `施行前（あと${daysLeft}日）` : "施行前";
    return { status, label, tone: "upcoming", daysLeft };
  }
  return { status, label: "施行日未定", tone: "undetermined", daysLeft: null };
}
