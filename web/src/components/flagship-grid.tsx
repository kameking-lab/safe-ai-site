import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FLAGSHIP_FEATURES } from "@/config/flagship-nav";

/** トップページの7目玉機能カードグリッド */
export function FlagshipGrid() {
  return (
    <section aria-labelledby="flagship-grid-title">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-emerald-700">FEATURES</p>
            <h2 id="flagship-grid-title" className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
              7つの主要機能
            </h2>
            <p className="mt-1 text-xs leading-snug text-slate-500 sm:text-sm">
              安全衛生日誌・KY・化学物質RA・サイネージ・法改正・AIチャット・事故ニュースで、現場運用をワンストップで支援。
            </p>
          </div>
          <Link
            href="/features"
            className="hidden shrink-0 text-xs font-semibold text-emerald-700 hover:underline sm:block"
          >
            機能一覧（全機能）→
          </Link>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {FLAGSHIP_FEATURES.map((f) => (
            <li key={f.id}>
              <Link
                href={f.href}
                className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl" aria-hidden>
                    {f.icon}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 sm:text-base">
                    {f.cardTitle}
                  </h3>
                </div>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-600 sm:text-sm">
                  {f.cardDescription}
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <span>配下機能 {f.subItems.length} 件</span>
                  <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-700 group-hover:gap-1.5">
                    開く <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
