export function AccidentNewsResultsFallback() {
  return (
    <section
      id="accident-news-search"
      className="mt-4 scroll-mt-24"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-sm font-bold text-slate-800">
        重大災害事例を読み込んでいます
      </p>
      <p className="mt-1 text-xs text-slate-600">
        以下は検索結果ではありません。
      </p>
      <div
        aria-hidden="true"
        data-accident-news-loading-shell
        className="motion-reduce:[&_*]:animate-none"
      >
        <div className="mt-4 h-28 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-3 h-11 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-3 h-16 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-3 h-11 animate-pulse rounded-xl bg-slate-100" />
        <ul
          className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3"
          data-accident-news-loading-grid
        >
          {Array.from({ length: 3 }, (_, index) => (
            <li
              key={index}
              className="h-48 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
