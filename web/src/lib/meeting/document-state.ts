import { computeMeetingPaperStatus } from "@/lib/meeting/paper-status";
import type {
  MeetingDocumentControl,
  MeetingDocumentHistoryEntry,
  MeetingRecord,
} from "@/lib/meeting/schema";
import { validateMeetingForApproval } from "@/lib/meeting/readiness";

export type MeetingApprovalState = "unapproved" | "approved" | "stale";
export type MeetingPrintState = "never" | "current" | "stale";

export type MeetingDocumentState = {
  contentRevision: string;
  approval: MeetingApprovalState;
  print: MeetingPrintState;
  canApprove: boolean;
  canPrint: boolean;
  legacyImported: boolean;
};

export type MeetingDocumentMutationResult =
  | { ok: true; record: MeetingRecord; state: MeetingDocumentState }
  | {
      ok: false;
      reason:
        | "incomplete"
        | "reviewer-required"
        | "invalid-timestamp"
        | "not-approved"
        | "approval-stale";
      state: MeetingDocumentState;
    };

/**
 * 帳票本文を明示的な順序へ並べる。savedAt、承認・印刷状態、自動集計machinesは
 * revisionから除外し、保存や印刷そのものが本文変更扱いにならないようにする。
 */
function meetingContent(record: MeetingRecord): unknown {
  return {
    workDate: [
      record.workDateYear,
      record.workDateMonth,
      record.workDateDay,
    ],
    weather: record.weather,
    temperature: record.temperature,
    siteName: record.siteName,
    siteManager: record.siteManager,
    supervisor: record.supervisor,
    author: record.author,
    meetingDate: record.meetingDate,
    contractors: record.contractors.map((row) => ({
      id: row.id,
      type: row.type,
      parentId: row.parentId,
      companyName: row.companyName,
      workContent: row.workContent,
      machines: row.machines,
      qualifications: [...row.qualifications],
      plannedCount: row.plannedCount,
      predictedDisasters: [...row.predictedDisasters],
      risk: {
        severity: row.risk.severity,
        likelihood: row.risk.likelihood,
        priority: row.risk.priority,
        reviewed: row.risk.reviewed,
      },
      safetyInstructions: row.safetyInstructions,
      responsibleName: row.responsibleName,
      actualCount: row.actualCount,
      appendNote: row.appendNote,
    })),
    tomorrowEvents: {
      safetyMeeting: record.tomorrowEvents.safetyMeeting,
      inspection: record.tomorrowEvents.inspection,
      patrol: record.tomorrowEvents.patrol,
      tomorrowGoal: record.tomorrowEvents.tomorrowGoal,
      free: record.tomorrowEvents.free,
    },
    deliveries: record.deliveries.map((row) => ({
      id: row.id,
      item: row.item,
      time: row.time,
      place: row.place,
    })),
    supervisorComment: record.supervisorComment,
    checklist: record.checklist.map((category) => ({
      key: category.key,
      label: category.label,
      items: category.items.map((item) => ({
        key: item.key,
        label: item.label,
        status: item.status,
      })),
    })),
    coordination: { ...record.coordination },
  };
}

/**
 * 変更検知用の決定的revision。電子署名・認証・改ざん防止hashではない。
 * localStorageを編集できる利用者に対するセキュリティ境界としては使用しない。
 */
export function meetingContentRevision(record: MeetingRecord): string {
  const text = JSON.stringify(meetingContent(record));
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `meeting-v1-${(hash >>> 0).toString(16).padStart(8, "0")}-${text.length.toString(36)}`;
}

export function getMeetingDocumentState(
  record: MeetingRecord,
): MeetingDocumentState {
  const contentRevision = meetingContentRevision(record);
  const paper = computeMeetingPaperStatus(record);
  const readinessIssues = validateMeetingForApproval(record);
  const approval = !record.documentControl.approval
    ? "unapproved"
    : record.documentControl.approval.contentRevision === contentRevision &&
        readinessIssues.length === 0
      ? "approved"
      : "stale";
  const print = !record.documentControl.lastPrint
    ? "never"
    : record.documentControl.lastPrint.contentRevision === contentRevision &&
        record.documentControl.lastPrint.approvalRevision === contentRevision &&
        approval === "approved"
      ? "current"
      : "stale";
  return {
    contentRevision,
    approval,
    print,
    canApprove:
      paper.kind !== "incomplete" && readinessIssues.length === 0,
    canPrint:
      approval === "approved" &&
      paper.kind !== "incomplete" &&
      readinessIssues.length === 0,
    legacyImported: record.documentControl.legacyImported,
  };
}

function validTimestamp(value: string): boolean {
  return value.trim() !== "" && Number.isFinite(Date.parse(value));
}

function appendHistory(
  control: MeetingDocumentControl,
  entry: MeetingDocumentHistoryEntry,
): MeetingDocumentHistoryEntry[] {
  return [...control.history, entry].slice(-100);
}

export function approveMeetingRecord(
  record: MeetingRecord,
  input: { reviewerName: string; approvedAt?: string },
): MeetingDocumentMutationResult {
  const initialState = getMeetingDocumentState(record);
  const reviewerName = input.reviewerName.trim();
  if (!reviewerName) {
    return {
      ok: false,
      reason: "reviewer-required",
      state: initialState,
    };
  }
  if (!initialState.canApprove) {
    return { ok: false, reason: "incomplete", state: initialState };
  }
  const approvedAt = input.approvedAt ?? new Date().toISOString();
  if (!validTimestamp(approvedAt)) {
    return {
      ok: false,
      reason: "invalid-timestamp",
      state: initialState,
    };
  }
  const entry: MeetingDocumentHistoryEntry = {
    action: "approved",
    at: approvedAt,
    contentRevision: initialState.contentRevision,
    reviewerName,
  };
  const next: MeetingRecord = {
    ...record,
    documentControl: {
      ...record.documentControl,
      approval: {
        reviewerName,
        approvedAt,
        contentRevision: initialState.contentRevision,
      },
      // 新しい承認は過去版の印刷を現版印刷にはしない。
      lastPrint: null,
      history: appendHistory(record.documentControl, entry),
    },
  };
  return { ok: true, record: next, state: getMeetingDocumentState(next) };
}

export function recordMeetingPrint(
  record: MeetingRecord,
  input: { printedAt?: string } = {},
): MeetingDocumentMutationResult {
  const initialState = getMeetingDocumentState(record);
  if (initialState.approval === "unapproved") {
    return { ok: false, reason: "not-approved", state: initialState };
  }
  if (initialState.approval === "stale") {
    return { ok: false, reason: "approval-stale", state: initialState };
  }
  const printedAt = input.printedAt ?? new Date().toISOString();
  if (!validTimestamp(printedAt)) {
    return {
      ok: false,
      reason: "invalid-timestamp",
      state: initialState,
    };
  }
  const revision = initialState.contentRevision;
  const entry: MeetingDocumentHistoryEntry = {
    action: "printed",
    at: printedAt,
    contentRevision: revision,
  };
  const next: MeetingRecord = {
    ...record,
    documentControl: {
      ...record.documentControl,
      lastPrint: {
        printedAt,
        contentRevision: revision,
        approvalRevision: revision,
      },
      history: appendHistory(record.documentControl, entry),
    },
  };
  return { ok: true, record: next, state: getMeetingDocumentState(next) };
}
