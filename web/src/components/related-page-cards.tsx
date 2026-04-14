import Link from "next/link";

export type RelatedPage = {
  href: string;
  label: string;
  description: string;
  /** Tailwind color theme key */
  color: "blue" | "emerald" | "orange" | "sky" | "amber" | "purple" | "rose";
  cta: string;
};

const COLOR_MAP: Record<
  RelatedPage["color"],
  { card: string; badge: string; btn: string }
> = {
  blue: {
    card: "border-blue-200 bg-blue-50",
    badge: "bg-blue-100 text-blue-700",
    btn: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  emerald: {
    card: "border-emerald-200 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-700",
    btn: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  orange: {
    card: "border-orange-200 bg-orange-50",
    badge: "bg-orange-100 text-orange-700",
    btn: "bg-orange-600 hover:bg-orange-700 text-white",
  },
  sky: {
    card: "border-sky-200 bg-sky-50",
    badge: "bg-sky-100 text-sky-700",
    btn: "bg-sky-600 hover:bg-sky-700 text-white",
  },
  amber: {
    card: "border-amber-200 bg-amber-50",
    badge: "bg-amber-100 text-amber-700",
    btn: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  purple: {
    card: "border-purple-200 bg-purple-50",
    badge: "bg-purple-100 text-purple-700",
    btn: "bg-purple-600 hover:bg-purple-700 text-white",
  },
  rose: {
    card: "border-rose-200 bg-rose-50",
    badge: "bg-rose-100 text-rose-700",
    btn: "bg-rose-600 hover:bg-rose-700 text-white",
  },
};

interface RelatedPageCardsProps {
  pages: RelatedPage[];
  heading?: string;
}

export function RelatedPageCards({
  pages,
  heading = "関連機能",
}: RelatedPageCardsProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-8 pt-2" aria-label={heading}>
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
        {heading}
      </p>
      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-${Math.min(pages.length, 3)}`}>
        {pages.map((page) => {
          const c = COLOR_MAP[page.color];
          return (
            <div
              key={page.href}
              className={`flex flex-col justify-between rounded-xl border p-4 transition-shadow hover:shadow-md ${c.card}`}
            >
              <div>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${c.badge}`}
                >
                  {page.label}
                </span>
                <p className="mt-2 text-xs leading-5 text-slate-700">
                  {page.description}
                </p>
              </div>
              <Link
                href={page.href}
                className={`mt-3 inline-block rounded-md px-3 py-2 text-center text-xs font-semibold transition-colors ${c.btn}`}
              >
                {page.cta} →
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
