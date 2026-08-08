import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function HomeTrustEntry() {
  return (
    <nav aria-label="品質情報" className="flex flex-wrap gap-x-4">
          <Link
            href="/about/quality"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-brand-primary underline underline-offset-4"
          >
            品質と出典
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/about/usage-notes"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-brand-primary underline underline-offset-4"
          >
            注意事項
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
    </nav>
  );
}
