/**
 * KY全面再設計 P1-B: 元請確認・承認フロー（純粋な状態遷移・テスト可能）。
 *
 * 認証基盤は本Phase対象外のため、承認は「承認者名（作業員マスター/手入力）＋タイムスタンプ＋コメント」を
 * 記録する“確認記録”モデル（法的な本人認証は将来のPhaseでAUTH導入時に強化）。
 * 状態は KY記録(payload)内に保持し、提出/承認中は編集ロック、差し戻しで編集可に戻す。
 */
export type KyApprovalStatus = "draft" | "submitted" | "approved" | "rejected";

export type KyApprovalAction = "submit" | "approve" | "reject";

export type KyApprovalEvent = {
  action: KyApprovalAction;
  /** 実施者名（職長/元請担当者など。マスター選択 or 手入力） */
  by: string;
  /** ISO タイムスタンプ */
  at: string;
  comment?: string;
};

export type KyApproval = {
  status: KyApprovalStatus;
  history: KyApprovalEvent[];
};

export const DEFAULT_APPROVAL: KyApproval = { status: "draft", history: [] };

const VALID_STATUS: readonly KyApprovalStatus[] = ["draft", "submitted", "approved", "rejected"];
const VALID_ACTION: readonly KyApprovalAction[] = ["submit", "approve", "reject"];

export function normalizeApproval(raw: unknown): KyApproval {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_APPROVAL };
  const r = raw as Record<string, unknown>;
  const status = VALID_STATUS.includes(r.status as KyApprovalStatus) ? (r.status as KyApprovalStatus) : "draft";
  const historyRaw = Array.isArray(r.history) ? r.history : [];
  const history: KyApprovalEvent[] = [];
  for (const item of historyRaw) {
    if (!item || typeof item !== "object") continue;
    const e = item as Record<string, unknown>;
    if (!VALID_ACTION.includes(e.action as KyApprovalAction)) continue;
    if (typeof e.by !== "string" || typeof e.at !== "string") continue;
    history.push({
      action: e.action as KyApprovalAction,
      by: e.by,
      at: e.at,
      ...(typeof e.comment === "string" && e.comment ? { comment: e.comment } : {}),
    });
  }
  return { status, history };
}

/** 提出/承認中は編集ロック。draft/rejected は編集可。 */
export function isKyLocked(approval: KyApproval | undefined | null): boolean {
  const s = approval?.status ?? "draft";
  return s === "submitted" || s === "approved";
}

function withEvent(approval: KyApproval, status: KyApprovalStatus, ev: KyApprovalEvent): KyApproval {
  return { status, history: [...approval.history, ev] };
}

/** 元請に提出（draft/rejected → submitted）。 */
export function submitKy(approval: KyApproval, by: string, now: Date = new Date(), comment?: string): KyApproval {
  if (approval.status === "submitted" || approval.status === "approved") return approval;
  return withEvent(approval, "submitted", { action: "submit", by: by || "職長", at: now.toISOString(), ...(comment ? { comment } : {}) });
}

/** 承認（submitted → approved）。 */
export function approveKy(approval: KyApproval, by: string, now: Date = new Date(), comment?: string): KyApproval {
  if (approval.status !== "submitted") return approval;
  return withEvent(approval, "approved", { action: "approve", by: by || "元請担当者", at: now.toISOString(), ...(comment ? { comment } : {}) });
}

/** 差し戻し（submitted/approved → rejected＝編集可に戻す）。 */
export function rejectKy(approval: KyApproval, by: string, now: Date = new Date(), comment?: string): KyApproval {
  if (approval.status !== "submitted" && approval.status !== "approved") return approval;
  return withEvent(approval, "rejected", { action: "reject", by: by || "元請担当者", at: now.toISOString(), ...(comment ? { comment } : {}) });
}

export const KY_APPROVAL_LABEL: Record<KyApprovalStatus, string> = {
  draft: "作成中",
  submitted: "提出済み（確認待ち）",
  approved: "承認済み",
  rejected: "差し戻し",
};
