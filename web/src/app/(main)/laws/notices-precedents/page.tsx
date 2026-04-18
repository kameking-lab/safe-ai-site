import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Scale, ExternalLink, ArrowLeft, Gavel } from "lucide-react";
import {
  officialNotices,
  courtPrecedents,
} from "@/data/mock/notices-and-precedents";

const TITLE = "通達・判例 — 労働安全衛生の第2層出典";
const DESCRIPTION =
  "監督官・士業・弁護士が実務で参照する通達（基発・安衛発）と、安全配慮義務関連の最高裁・高裁判例30件。条文の向こう側にある行政解釈・司法解釈をまとめて確認できます。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: `${TITLE}｜ANZEN AI`,
    description: DESCRIPTION,
  },
};

export default function NoticesPrecedentsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-4">
        <Link
          href="/laws"
          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          法改正一覧に戻る
        </Link>
      </div>

      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">
          <Gavel className="h-4 w-4" aria-hidden="true" />
          第2層出典（通達・判例）
        </div>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          通達・判例でたどる労働安全衛生
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700 sm:text-base">
          労安衛法は条文だけでは読めません。行政解釈を示す <strong>通達（基発・安衛発）</strong> と、
          安全配慮義務の司法解釈を示す <strong>最高裁判例</strong> が揃って初めて実務に届きます。
          監督官・社労士・弁護士が一次情報として参照する第2層出典を合計 30 件整理しました。
        </p>
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          ⚠️ 各通達・判例の本文は必ず出典元（裁判所・厚労省）で原文を確認してください。本ページの要旨は概観のためのものです。
        </div>
      </header>

      <section aria-labelledby="notices-heading" className="mb-10">
        <h2
          id="notices-heading"
          className="mb-3 flex items-center gap-2 text-xl font-bold text-slate-900"
        >
          <FileText className="h-5 w-5 text-blue-600" aria-hidden="true" />
          通達・告示 ({officialNotices.length}件)
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          厚生労働省労働基準局が発出する行政解釈。条文の運用細目・経過措置・事業者指針を示します。
        </p>
        <ul className="space-y-3">
          {officialNotices.map((n) => (
            <li
              key={n.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
                      {n.notice_no ?? n.official_notice_number}
                    </span>
                    {n.enforcement_date && (
                      <span className="text-xs text-slate-500">
                        施行 {n.enforcement_date}
                      </span>
                    )}
                    {n.impact && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                        影響 {n.impact}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 text-base font-bold text-slate-900">
                    {n.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">
                    {n.summary}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                {n.notice_link && (
                  <a
                    href={n.notice_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    通達原文
                  </a>
                )}
                {n.source_url && (
                  <a
                    href={n.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    関連条文 (e-Gov)
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="precedents-heading">
        <h2
          id="precedents-heading"
          className="mb-3 flex items-center gap-2 text-xl font-bold text-slate-900"
        >
          <Scale className="h-5 w-5 text-rose-600" aria-hidden="true" />
          判例 ({courtPrecedents.length}件)
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          安全配慮義務・労災認定・両罰規定に関する主要な最高裁・高裁判例。事件番号をクリックで裁判所データベースを参照できます。
        </p>
        <ul className="space-y-3">
          {courtPrecedents.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
                  {c.court_case ?? c.revisionNumber}
                </span>
                <span className="text-xs text-slate-500">{c.issuer}</span>
                {c.impact && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                    影響 {c.impact}
                  </span>
                )}
              </div>
              <h3 className="mt-1 text-base font-bold text-slate-900">
                {c.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                {c.summary}
              </p>
              {c.court_case_summary && (
                <p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  📌 要旨: {c.court_case_summary}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                {c.court_case_url && (
                  <a
                    href={c.court_case_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-md bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    裁判所判例検索
                  </a>
                )}
                {c.source_url && (
                  <a
                    href={c.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    関連条文 (e-Gov)
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
