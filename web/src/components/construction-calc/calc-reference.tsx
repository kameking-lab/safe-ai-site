import Link from "next/link";
import { ExternalLink, BookOpenCheck, AlertTriangle } from "lucide-react";
import { CALC_DISCLAIMER, type CalcBasis } from "@/lib/construction-calc/schema";

/**
 * 建設計算の静的セクション（根拠・注意事項・免責）。
 *
 * これらは入力値に依存しない不変コンテンツなので **サーバーコンポーネント** として
 * 描画し、クライアント境界の外に出す（C-1 の空シェル是正と同じ手法）。
 * 本番HTMLに根拠条文・注意・免責が実在すること＝SEO/LCP の要件を機械的に満たす。
 * 入力値に依存する「このケース固有の警告（outcome.warnings）」だけは
 * インタラクティブな CalculatorPanel 側に残す。
 */

export function CalcBasisSection({ basis }: { basis: CalcBasis[] }) {
  return (
    <section
      aria-label="根拠となる法令・基準"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/60 sm:p-5"
    >
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
        <BookOpenCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        根拠となる法令・基準
      </h2>
      <ul className="mt-3 space-y-3">
        {basis.map((b) => (
          <li key={b.label} className="text-sm">
            <p className="font-semibold text-slate-800 dark:text-slate-200">{b.label}</p>
            <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-400">{b.description}</p>
            <div className="mt-1 flex flex-wrap gap-3">
              {b.lawNaviPath && (
                <Link
                  href={b.lawNaviPath}
                  className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800 dark:text-emerald-400"
                >
                  条文を法令ナビで読む
                </Link>
              )}
              {b.egovUrl && (
                <a
                  href={b.egovUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-sky-700 underline underline-offset-2 hover:text-sky-800 dark:text-sky-400"
                >
                  原文（e-Gov）
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CalcCautionsSection({ cautions }: { cautions: string[] }) {
  return (
    <section
      aria-label="注意事項と免責"
      className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200 sm:p-5"
    >
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        ご利用上の注意
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5">
        {cautions.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <p className="mt-3 border-t border-amber-200 pt-2 text-xs font-semibold leading-5 dark:border-amber-800">
        {CALC_DISCLAIMER}
      </p>
    </section>
  );
}
