/**
 * KY全面再設計 P1-B: 元請確認・承認フロー（純粋な状態遷移・テスト可能）。
 *
 * 認証基盤は本Phase対象外のため、承認は「承認者名（作業員マスター/手入力）＋タイムスタンプ＋コメント」を
 * 記録する“確認記録”モデル（法的な本人認証は将来のPhaseでAUTH導入時に強化）。
 * 状態は KY記録(payload)内に保持し、提出/承認中は編集ロック、差し戻しで編集可に戻す。
 */
import type { KyInstructionRecordState } from "@/lib/types/operations";
import { validateKyForTransition } from "@/lib/ky/readiness";
import { kyContentRevision } from "@/lib/ky/revision";

export type KyApprovalStatus = "draft" | "submitted" | "approved" | "rejected";

export type KyApprovalAction = "submit" | "approve" | "reject" | "print";

export type KyApprovalEvent = {
  action: KyApprovalAction;
  /** 実施者名（職長/元請担当者など。マスター選択 or 手入力） */
  by: string;
  /** ISO タイムスタンプ */
  at: string;
  comment?: string;
  /** 提出・承認・印刷が対象にしたKY本文revision。 */
  contentRevision?: string;
  /** 印刷時に根拠にした承認revision。 */
  approvalRevision?: string;
};

export type KyApproval = {
  status: KyApprovalStatus;
  history: KyApprovalEvent[];
  submittedRevision?: string;
  approvedRevision?: string;
};

export const DEFAULT_APPROVAL: KyApproval = { status: "draft", history: [] };

const VALID_STATUS: readonly KyApprovalStatus[] = ["draft", "submitted", "approved", "rejected"];
const VALID_ACTION: readonly KyApprovalAction[] = ["submit", "approve", "reject", "print"];

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
      ...(typeof e.contentRevision === "string" &&
      e.contentRevision.trim()
        ? { contentRevision: e.contentRevision.slice(0, 200) }
        : {}),
      ...(typeof e.approvalRevision === "string" &&
      e.approvalRevision.trim()
        ? { approvalRevision: e.approvalRevision.slice(0, 200) }
        : {}),
    });
  }
  return {
    status,
    history,
    ...(typeof r.submittedRevision === "string" &&
    r.submittedRevision.trim()
      ? { submittedRevision: r.submittedRevision.slice(0, 200) }
      : {}),
    ...(typeof r.approvedRevision === "string" &&
    r.approvedRevision.trim()
      ? { approvedRevision: r.approvedRevision.slice(0, 200) }
      : {}),
  };
}

/** 提出/承認中は編集ロック。draft/rejected は編集可。 */
export function isKyLocked(approval: KyApproval | undefined | null): boolean {
  const s = approval?.status ?? "draft";
  return s === "submitted" || s === "approved";
}

function withEvent(approval: KyApproval, status: KyApprovalStatus, ev: KyApprovalEvent): KyApproval {
  return {
    ...approval,
    status,
    history: [...approval.history, ev].slice(-100),
  };
}

export type KyApprovalMutationResult =
  | { ok: true; approval: KyApproval }
  | {
      ok: false;
      reason:
        | "incomplete"
        | "invalid-state"
        | "reviewer-required"
        | "revision-stale";
      approval: KyApproval;
    };

/** 元請に提出（draft/rejected → submitted）。 */
export function submitKy(
  record: KyInstructionRecordState,
  by: string,
  now: Date = new Date(),
  comment?: string,
): KyApprovalMutationResult {
  const approval = record.approval ?? DEFAULT_APPROVAL;
  if (approval.status !== "draft" && approval.status !== "rejected") {
    return { ok: false, reason: "invalid-state", approval };
  }
  if (validateKyForTransition(record).length > 0) {
    return { ok: false, reason: "incomplete", approval };
  }
  const revision = kyContentRevision(record);
  const next = withEvent(approval, "submitted", {
    action: "submit",
    by: by.trim() || record.foremanName.trim() || "職長",
    at: now.toISOString(),
    ...(comment ? { comment } : {}),
    contentRevision: revision,
  });
  return {
    ok: true,
    approval: {
      ...next,
      submittedRevision: revision,
      approvedRevision: undefined,
    },
  };
}

/** 承認（submitted → approved）。 */
export function approveKy(
  record: KyInstructionRecordState,
  by: string,
  now: Date = new Date(),
  comment?: string,
): KyApprovalMutationResult {
  const approval = record.approval ?? DEFAULT_APPROVAL;
  if (approval.status !== "submitted") {
    return { ok: false, reason: "invalid-state", approval };
  }
  if (!by.trim()) {
    return { ok: false, reason: "reviewer-required", approval };
  }
  if (validateKyForTransition(record).length > 0) {
    return { ok: false, reason: "incomplete", approval };
  }
  const revision = kyContentRevision(record);
  if (approval.submittedRevision !== revision) {
    return { ok: false, reason: "revision-stale", approval };
  }
  const next = withEvent(approval, "approved", {
    action: "approve",
    by: by.trim(),
    at: now.toISOString(),
    ...(comment ? { comment } : {}),
    contentRevision: revision,
  });
  return {
    ok: true,
    approval: {
      ...next,
      submittedRevision: revision,
      approvedRevision: revision,
    },
  };
}

/** 差し戻し（submitted/approved → rejected＝編集可に戻す）。 */
export function rejectKy(approval: KyApproval, by: string, now: Date = new Date(), comment?: string): KyApproval {
  if (approval.status !== "submitted" && approval.status !== "approved") return approval;
  return {
    ...withEvent(approval, "rejected", { action: "reject", by: by || "元請担当者", at: now.toISOString(), ...(comment ? { comment } : {}) }),
    submittedRevision: undefined,
    approvedRevision: undefined,
  };
}

/** 承認済みの現版を印刷した時刻を確認履歴へ記録する。電子署名や印刷成功の保証ではない。 */
export function recordKyPrint(
  record: KyInstructionRecordState,
  by: string,
  now: Date = new Date(),
): KyApprovalMutationResult {
  const approval = record.approval ?? DEFAULT_APPROVAL;
  if (approval.status !== "approved") {
    return { ok: false, reason: "invalid-state", approval };
  }
  if (validateKyForTransition(record).length > 0) {
    return { ok: false, reason: "incomplete", approval };
  }
  const revision = kyContentRevision(record);
  if (approval.approvedRevision !== revision) {
    return { ok: false, reason: "revision-stale", approval };
  }
  return { ok: true, approval: withEvent(approval, "approved", {
    action: "print",
    by: by || "端末利用者",
    at: now.toISOString(),
    comment: "印刷ダイアログ終了時点。実際の出力完了は利用者が確認",
    contentRevision: revision,
    approvalRevision: approval.approvedRevision,
  }) };
}

export const KY_APPROVAL_LABEL: Record<KyApprovalStatus, string> = {
  draft: "作成中",
  submitted: "提出済み（確認待ち）",
  approved: "承認済み",
  rejected: "差し戻し",
};
