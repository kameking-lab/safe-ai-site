import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export type BreadcrumbItem = {
  name: string;
  href?: string;
};

/**
 * Visible breadcrumb navigation.
 * Mirrors BreadcrumbList JSON-LD data as a visible <nav> for users and crawlers.
 */
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="パンくずリスト" className="mb-3 flex flex-wrap items-center gap-1 text-xs text-slate-500">
      <Link
        href="/"
        className="flex min-h-[44px] items-center gap-0.5 rounded px-1 py-0.5 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        aria-label="ホーム"
      >
        <Home className="h-3 w-3" aria-hidden="true" />
      </Link>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={item.name} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-slate-400" aria-hidden="true" />
            {isLast || !item.href ? (
              <span className="font-medium text-slate-700" aria-current="page">
                {item.name}
              </span>
            ) : (
              <Link
                href={item.href}
                className="inline-flex min-h-[44px] items-center rounded px-1 py-0.5 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                {item.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
