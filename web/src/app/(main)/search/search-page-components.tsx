import Link from "next/link";

const SEARCH_FALLBACK_CATEGORIES = [
  { label: "法令", href: "/law-search" },
  { label: "事故", href: "/accident-news" },
  { label: "化学物質", href: "/chemical-database" },
  { label: "資格", href: "/education-certification" },
  { label: "教育", href: "/resources" },
  { label: "KYT", href: "/training/visual-ky" },
  { label: "ツール", href: "/features" },
  { label: "自動化サンプル", href: "/automation-examples" },
] as const;

export function SearchPageHeader() {
  return (
    <>
      <p className="portal-section-kicker">SEARCH</p>
      <h1 className="mt-2 text-2xl font-black text-brand-secondary dark:text-white sm:text-3xl">
        サイト内を横断検索
      </h1>
      <p className="mt-1 text-sm text-portal-muted">
        法令、事故、化学物質、資格、教育、KYT、ツール、サンプルをまとめて探します。
      </p>
    </>
  );
}

export function SearchFallback() {
  return (
    <div className="mt-4">
      <p className="mt-3 max-w-2xl text-sm leading-6 text-portal-muted">
        検索を準備しています。JavaScriptを使わない場合も、分野別の入口から目的の情報へ進めます。
      </p>
      <nav
        aria-label="検索カテゴリへの代替導線"
        className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {SEARCH_FALLBACK_CATEGORIES.map((category) => (
          <Link
            key={category.label}
            href={category.href}
            prefetch={false}
            className="flex min-h-[44px] items-center justify-center rounded-portal border border-portal-border bg-portal-surface px-3 py-2 text-center text-sm font-bold text-brand-secondary transition hover:border-brand-primary hover:text-brand-primary dark:text-white"
          >
            {category.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
