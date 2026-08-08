import { MascotGuide } from "@/components/mascot-guide";
import type { ServiceError } from "@/lib/types/api";

type ErrorNoticeProps = {
  title?: string;
  error: ServiceError;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  compact?: boolean;
};

export function ErrorNotice({
  title = "エラーが発生しました",
  error,
  onRetry,
  retryLabel = "もう一度試す",
  className = "",
  compact = false,
}: ErrorNoticeProps) {
  const message = (
    <>
      <p>{error.message}</p>
      {!error.retryable ? (
        <p className="mt-1 text-xs">このエラーは再試行対象外です。</p>
      ) : null}
    </>
  );
  const action =
    error.retryable && onRetry ? (
      <button
        type="button"
        onClick={onRetry}
        className="portal-button-secondary text-xs"
      >
        {retryLabel}
      </button>
    ) : undefined;

  return (
    <MascotGuide
      variant="error"
      title={title}
      message={message}
      action={action}
      compact={compact}
      className={`${compact ? "mt-2" : "mt-3"} ${className}`}
    />
  );
}
