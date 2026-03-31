import type { ServiceError } from "@/lib/types/api";

type ErrorNoticeProps = {
  title?: string;
  error: ServiceError;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorNotice({
  title = "エラーが発生しました",
  error,
  onRetry,
  retryLabel = "もう一度試す",
}: ErrorNoticeProps) {
  return (
    <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:p-4">
      <p className="font-semibold text-rose-800">{title}</p>
      <p className="mt-1 leading-6">{error.message}</p>
      {!error.retryable && (
        <p className="mt-1 text-xs text-rose-600">このエラーは再試行対象外です。</p>
      )}
      {error.retryable && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 active:scale-[0.99]"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
