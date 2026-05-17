import { PageContainer } from "@/components/layout/page-container";

type SkeletonProps = {
  className?: string;
  /** Accessible label read by screen readers while content is loading. */
  label?: string;
};

export function Skeleton({ className = "", label }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  );
}

/**
 * Page-level Suspense fallback: header band + content rows inside a PageContainer.
 * Matches the visual rhythm of most main pages so there's no jarring layout shift.
 */
export function PageSkeleton({ label = "読み込み中" }: { label?: string }) {
  return (
    <PageContainer>
      <div className="space-y-4" role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">{label}</span>
        <div className="h-8 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-full max-w-md animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        <div className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="h-32 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-32 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="h-48 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
    </PageContainer>
  );
}

/**
 * Inline Suspense fallback for smaller embedded panels — vertical stack of rows.
 */
export function PanelSkeleton({
  rows = 3,
  label = "読み込み中",
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <div className="space-y-3" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
        />
      ))}
    </div>
  );
}
