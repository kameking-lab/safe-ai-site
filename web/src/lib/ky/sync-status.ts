/**
 * KY全面再設計 P1-D: クラウド同期状態の判定（純関数・テスト可能）。
 */
export type KySyncStatus = "cloud-disabled" | "offline" | "pending" | "synced";

export function computeKySyncStatus(input: {
  cloudEnabled: boolean;
  online: boolean;
  pending: boolean;
}): KySyncStatus {
  if (!input.cloudEnabled) return "cloud-disabled";
  if (!input.online) return "offline";
  if (input.pending) return "pending";
  return "synced";
}

export const KY_SYNC_LABEL: Record<KySyncStatus, string> = {
  "cloud-disabled": "端末内保存",
  offline: "オフライン（復帰後に同期）",
  pending: "未同期あり",
  synced: "クラウド同期済み",
};

/** 表示色のトークン（UI側で使うTailwind色名の素片） */
export const KY_SYNC_TONE: Record<KySyncStatus, string> = {
  "cloud-disabled": "slate",
  offline: "amber",
  pending: "amber",
  synced: "emerald",
};
