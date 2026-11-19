import Link from "next/link";
import { ArrowRight } from "lucide-react";

const guides = [
  { href: "/guides/ky-sheet", label: "KY用紙の記入例" },
  { href: "/guides/chemical-ra-create-simple", label: "化学物質RAの進め方" },
  { href: "/guides/safety-signage", label: "サイネージの使い方" },
];

export function SafetyGuideLinks() {
  return (
    <nav aria-labelledby="safety-guide-links-heading" className="border-t border-slate-200 py-4">
      <h2 id="safety-guide-links-heading" className="text-base font-bold text-slate-900">
        現場の安全ガイド
      </h2>
      <ul className="mt-1 flex flex-wrap gap-x-6">
        {guides.map(({ href, label }) => (
          <li key={href} className="max-sm:basis-full">
            <Link href={href} prefetch={false} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-emerald-800 underline underline-offset-4 hover:text-emerald-950">
              {label}
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
