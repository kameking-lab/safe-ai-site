import Link from "next/link";

import {
  ACCIDENT_PROVENANCE_INFO,
  resolveAccidentProvenance,
  resolveAccidentSource,
} from "@/lib/accident-source";
import { compactAccidentSummary } from "@/lib/accidents/compact-summary";
import type { AccidentCase } from "@/lib/types/domain";

const OFFICIAL_ACCIDENT_DATABASE_URL =
  "https://anzeninfo.mhlw.go.jp/anzen_pg/SIB_FND.html";

export function AccidentsNoScriptFallback({
  totalCount,
  featuredCase,
}: {
  totalCount: number;
  featuredCase: AccidentCase | null;
}) {
  const verifiedCase =
    featuredCase && resolveAccidentProvenance(featuredCase) === "mhlw"
      ? featuredCase
      : null;
  const source = verifiedCase ? resolveAccidentSource(verifiedCase) : null;

  return (
    <>
      <style>{`[data-accidents-client-only] { display: none !important; }`}</style>
      <section
        data-accidents-noscript
        aria-labelledby="accidents-noscript-title"
        className="mt-4 rounded-xl border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="accidents-noscript-title" className="text-lg font-bold text-slate-950">
            公表事例
          </h2>
          <p className="text-sm font-semibold text-slate-700">サイト収録 {totalCount}件</p>
        </div>

        {verifiedCase && source?.url ? (
          <article
            data-accidents-noscript-result
            className="mt-3 rounded-lg border border-slate-200 p-3"
          >
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="font-bold text-emerald-800">
                {ACCIDENT_PROVENANCE_INFO.mhlw.label}
              </span>
              <span>{verifiedCase.occurredOn}</span>
              <span>{verifiedCase.type}</span>
            </div>
            <h3 className="mt-2 text-base font-bold text-slate-950">
              {verifiedCase.title}
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {compactAccidentSummary(verifiedCase.summary)}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
              <Link
                href={`/accidents/${verifiedCase.id}`}
                className="inline-flex min-h-11 items-center text-brand-primary underline underline-offset-4"
              >
                詳細を見る
              </Link>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center text-brand-primary underline underline-offset-4"
              >
                厚労省の原文
              </a>
            </div>
          </article>
        ) : null}

        <a
          href={OFFICIAL_ACCIDENT_DATABASE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-brand-primary underline underline-offset-4"
        >
          厚労省の死亡災害データベースで探す
        </a>
      </section>
    </>
  );
}
