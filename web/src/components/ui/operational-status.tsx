import type { ReactNode } from "react";

export type OperationalState =
  | "loading"
  | "empty"
  | "error"
  | "offline"
  | "stale"
  | "partial-failure"
  | "saving"
  | "saved"
  | "syncing"
  | "synced"
  | "shared"
  | "verification-required";

const DEFAULT_LABEL: Record<OperationalState, string> = {
  loading: "読み込み中",
  empty: "データなし",
  error: "取得・処理エラー",
  offline: "オフライン",
  stale: "情報が古い可能性",
  "partial-failure": "一部取得失敗",
  saving: "保存中",
  saved: "保存済み",
  syncing: "同期中",
  synced: "同期済み",
  shared: "共有済み",
  "verification-required": "人による確認が必要",
};

const CLASS_NAME: Record<OperationalState, string> = {
  loading: "border-sky-300 bg-sky-50 text-sky-950",
  empty: "border-slate-300 bg-slate-50 text-slate-800",
  error: "border-rose-400 bg-rose-50 text-rose-950",
  offline: "border-amber-400 bg-amber-50 text-amber-950",
  stale: "border-amber-400 bg-amber-50 text-amber-950",
  "partial-failure": "border-amber-400 bg-amber-50 text-amber-950",
  saving: "border-sky-300 bg-sky-50 text-sky-950",
  saved: "border-slate-300 bg-slate-50 text-slate-800",
  syncing: "border-sky-300 bg-sky-50 text-sky-950",
  synced: "border-emerald-300 bg-emerald-50 text-emerald-950",
  shared: "border-violet-300 bg-violet-50 text-violet-950",
  "verification-required": "border-amber-400 bg-amber-50 text-amber-950",
};

export function OperationalStatus({
  state,
  label,
  children,
  compact = false,
}: {
  state: OperationalState;
  label?: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  const urgent = ["error", "offline", "stale", "partial-failure", "verification-required"].includes(state);
  return (
    <div
      role={urgent ? "alert" : "status"}
      aria-live={urgent ? "assertive" : "polite"}
      data-operational-state={state}
      className={`inline-flex items-center gap-1.5 rounded-lg border font-semibold ${CLASS_NAME[state]} ${
        compact ? "px-2 py-1 text-[11px]" : "px-3 py-2 text-xs"
      }`}
    >
      <span>{label ?? DEFAULT_LABEL[state]}</span>
      {children}
    </div>
  );
}
