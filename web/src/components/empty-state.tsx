import type { ReactNode } from "react";
import { Mascot, type MascotVariant } from "@/components/mascot";

type EmptyStateProps = {
  /** 状態の一言（例: 「まだ記録がありません」） */
  title: string;
  /** 次の一歩の説明（任意） */
  description?: string;
  /** CTA等（任意） */
  action?: ReactNode;
  /** マスコットのポーズ。空状態は thinking が既定 */
  variant?: MascotVariant;
  className?: string;
};

/**
 * 統一空状態コンポーネント（視覚刷新キャンペーン 2026-07-12 新設）。
 * 各ページのインライン「〜がありません」を段階的にこれへ置換する。
 * マスコットは装飾（alt=""）でスクリーンリーダーには読ませない。
 */
export function EmptyState({
  title,
  description,
  action,
  variant = "thinking",
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/40 ${className}`}
    >
      <Mascot variant={variant} size="lg" alt="" />
      <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
