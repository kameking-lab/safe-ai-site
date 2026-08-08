/**
 * KY全面再設計 P1-D: クラウド同期状態の判定（純関数・テスト可能）。
 */
export type KySyncStatus =
  | "local-only"
  | "consent-required"
  | "ready"
  | "offline"
  | "pending"
  | "synced"
  | "failed";

export function computeKySyncStatus(input: {
  cloudEnabled: boolean;
  consentGranted?: boolean;
  online: boolean;
  pending: boolean;
  lastTransfer?: "none" | "success" | "failed";
}): KySyncStatus {
  if (!input.cloudEnabled) return "local-only";
  if (!input.consentGranted) return "consent-required";
  if (!input.online) return "offline";
  if (input.pending) return "pending";
  if (input.lastTransfer === "success") return "synced";
  if (input.lastTransfer === "failed") return "failed";
  return "ready";
}

export const KY_SYNC_LABEL: Record<KySyncStatus, string> = {
  "local-only": "端末内保存",
  "consent-required": "端末内保存（クラウド未同意）",
  ready: "クラウド利用可（未同期）",
  offline: "オフライン（端末内保存）",
  pending: "未同期あり",
  synced: "クラウド同期済み",
  failed: "クラウド同期失敗（端末内保存済み）",
};

/** 表示色のトークン（UI側で使うTailwind色名の素片） */
export const KY_SYNC_TONE: Record<KySyncStatus, string> = {
  "local-only": "slate",
  "consent-required": "slate",
  ready: "sky",
  offline: "amber",
  pending: "amber",
  synced: "emerald",
  failed: "rose",
};
