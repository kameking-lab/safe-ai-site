import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  ClipboardList,
  CloudSun,
  FileText,
  FlaskConical,
  GraduationCap,
  Monitor,
  Search,
  Workflow,
} from "lucide-react";
import {
  SITE_STATS,
  SITE_STATS_META,
  type SiteStatKey,
} from "@/data/site-stats";
import { AutomationConsultCta } from "@/components/automation/automation-consult-cta";
import { getAutomationConsultAvailability } from "@/lib/automation-consult/availability";

type StatItem = {
  key: SiteStatKey;
  value: string;
  labelJa: string;
  labelEn: string;
  hintJa: string;
  hintEn: string;
};

const STATS: StatItem[] = [
  {
    key: "mhlwNoticeCount",
    value: SITE_STATS.mhlwNoticeCount,
    labelJa: "個別原文確認済み 通達・告示",
    labelEn: "Individually verified directives",
    hintJa: `二次索引${SITE_STATS.mhlwNoticeIndexCount}件は本文未確認・公開停止`,
    hintEn: `${SITE_STATS.mhlwNoticeIndexCount} index candidates remain unpublished pending verification`,
  },
];

/** 今日の安全行動から始めるトップページヒーロー。 */
export function NewHomeHero() {
  const isEn = false;
  const automationAvailability = getAutomationConsultAvailability();

  return (
    <section
      aria-labelledby="home-hero-title"
      className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-slate-50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-950"
    >
      {/* 背景イラスト（夜明けの現場・生成画・20.9KB）: sm以上のみ＝モバイルLCP不可侵。
          文字コントラストAAは白/濃紺オーバーレイで担保する */}
      <div
        className="pointer-events-none absolute inset-0 hidden sm:block"
        aria-hidden="true"
      >
        <Image
          src="/mascot/hero-bg-dawn.webp"
          alt=""
          fill
          sizes="(min-width: 1024px) calc(100vw - 16rem), 100vw"
          loading="eager"
          fetchPriority="high"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/75 via-white/65 to-white/85 dark:from-slate-950/85 dark:via-slate-950/75 dark:to-slate-950/90" />
      </div>
      {/* マスコット（指差呼称）: PC装飾。絶対配置＋明示寸法でCLS 0 */}
      <div
        className="pointer-events-none absolute bottom-2 right-6 hidden xl:block"
        aria-hidden="true"
      >
        <Image
          src="/mascot/mascot-pointing.webp"
          alt=""
          width={155}
          height={150}
          loading="lazy"
          style={{ width: 155, height: 150, objectFit: "contain" }}
        />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:py-14 lg:py-16">
        <div className="text-center">
          <p className="text-xs font-bold tracking-widest text-emerald-700 dark:text-emerald-300">
            {isEn ? "Anzen AI Portal (Japan OSH research)" : "安全AIポータル"}
          </p>
          <h1
            id="home-hero-title"
            className="mt-3 text-3xl font-bold leading-tight text-slate-900 dark:text-slate-50 sm:text-4xl lg:text-5xl"
          >
            {isEn
              ? "Transform workplace safety with AI."
              : "労働安全衛生のAI・DX活用ポータル"}
          </h1>
          {!isEn && (
            <h2 className="mt-1 text-lg font-semibold leading-tight text-slate-600 dark:text-slate-400 sm:text-xl lg:text-2xl">
              公式資料をたどり、今日の安全行動へつなげる
            </h2>
          )}
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
            {isEn
              ? "A research project on AI and DX for occupational safety and health. One-stop support for field operations in construction, manufacturing, transportation, healthcare, and forestry."
              : "職長・一人親方・安全衛生担当者・作業者が、気象確認、KY、法令・資格調査を一連の業務として進めるための実務ポータルです。主要機能は無料で利用できます。"}
          </p>
          <div className="mx-auto mt-3 max-w-3xl rounded-xl border border-sky-200 bg-sky-50/95 px-4 py-3 text-left text-xs leading-5 text-slate-700 dark:border-sky-700 dark:bg-sky-950/70 dark:text-slate-200">
            <p>
              <span className="font-bold">情報の正本:</span>{" "}
              厚生労働省、e-Gov、気象庁などの公式一次資料です。各機能から出典と対象時点を確認できます。
            </p>
            <p className="mt-1">
              <span className="font-bold">AIの役割:</span>{" "}
              検索・整理・下書きの補助です。法的判断、作業開始、帳票確定は公式資料と責任者による確認が必要です。
            </p>
            <p className="mt-1">
              安全衛生の帳票・研修資料・定型作業を見直す
              <Link
                href="/services/automation"
                prefetch={false}
                className="ml-1 inline-flex min-h-11 items-center font-bold text-sky-900 underline underline-offset-4 dark:text-sky-200"
              >
                業務自動化相談
              </Link>
              にも対応しています。
            </p>
          </div>
          <Link
            href="/safety-ai"
            prefetch={false}
            data-first-visitor-link=""
            className="mt-1 inline-flex min-h-[44px] items-center text-xs font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-950 dark:text-emerald-300"
          >
            初めての方へ｜安全AIとは
          </Link>

          {/* 現場の主要3目的。必要入力を省略せず、各canonical機能へ直接つなぐ。 */}
          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Link
              href="/risk"
              prefetch={false}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition hover:from-emerald-600 hover:to-emerald-800 hover:shadow-lg hover:shadow-emerald-600/30 active:translate-y-px"
            >
              <CloudSun className="h-5 w-5" aria-hidden="true" />
              {isEn ? "Today's safety" : "今日の安全を確認"}
            </Link>
            <Link
              href="/ky/paper"
              prefetch={false}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition hover:from-emerald-600 hover:to-emerald-800 hover:shadow-lg hover:shadow-emerald-600/30 active:translate-y-px"
            >
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
              {isEn ? "KY and work plan" : "KY・工程書を作る"}
            </Link>
            <Link
              href="/education-certification/finder"
              prefetch={false}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition hover:from-emerald-600 hover:to-emerald-800 hover:shadow-lg hover:shadow-emerald-600/30 active:translate-y-px"
            >
              <GraduationCap className="h-5 w-5" aria-hidden="true" />
              {isEn ? "Qualifications and law" : "資格・法令を確認"}
            </Link>
          </div>

          {/* 対応する補助操作。役割別入口も同じcanonical機能URLへ着地する。 */}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/safety-diary"
              prefetch={false}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 dark:border-emerald-500/40 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              {isEn ? "Work coordination sheet" : "安全工程打合せ書を作る"}
            </Link>
            <Link
              href="/law-search"
              prefetch={false}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 dark:border-emerald-500/40 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800"
            >
              <Search className="h-3.5 w-3.5" />
              {isEn ? "Search law / articles" : "法令・条文を一次資料から検索"}
            </Link>
            <Link
              href="/accidents"
              prefetch={false}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 dark:border-emerald-500/40 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800"
            >
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              事故・ヒヤリハットを調べる
            </Link>
            <Link
              href="/chemical-ra"
              prefetch={false}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 dark:border-emerald-500/40 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800"
            >
              <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
              化学物質リスクを確認する
            </Link>
            <Link
              href="/signage"
              prefetch={false}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 dark:border-emerald-500/40 dark:bg-slate-900 dark:text-emerald-200 dark:hover:bg-slate-800"
            >
              <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
              安全サイネージを見る
            </Link>
            <AutomationConsultCta
              position="home_hero"
              href={
                automationAvailability.contactMode === "mail_client"
                  ? "/contact/automation-email"
                  : "/services/automation"
              }
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-sky-300 bg-white px-3.5 py-2 text-xs font-semibold text-sky-900 shadow-sm transition hover:bg-sky-50 dark:border-sky-500/40 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
            >
              <Workflow className="h-3.5 w-3.5" aria-hidden="true" />
              {automationAvailability.contactMode === "mail_client"
                ? "メールで相談する"
                : "業務自動化の料金を見る"}
            </AutomationConsultCta>
          </div>
        </div>

        <ul className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {STATS.map((s) => {
            const meta = SITE_STATS_META[s.key];
            return (
              <li
                key={s.key}
                className="flex min-h-[96px] flex-col rounded-xl border border-slate-200 bg-white px-3 py-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:min-h-[108px] sm:px-4 sm:py-4"
              >
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 sm:text-2xl lg:text-3xl">
                  {s.value}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 sm:text-xs">
                  {isEn ? s.labelEn : s.labelJa}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isEn ? s.hintEn : s.hintJa}
                </p>
                {meta?.sourceUrl ? (
                  <a
                    href={meta.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-[11px] leading-4 text-emerald-700 underline hover:text-emerald-800 dark:text-emerald-400"
                  >
                    {isEn ? `Source · ${meta.asOf}` : `出典・${meta.asOf}`}
                  </a>
                ) : (
                  <p
                    className="mt-1 line-clamp-1 text-[11px] leading-4 text-slate-600"
                    title={meta?.source ?? ""}
                  >
                    {isEn
                      ? `Source: ${meta?.source ?? ""}`
                      : `出典: ${meta?.source ?? ""}`}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
