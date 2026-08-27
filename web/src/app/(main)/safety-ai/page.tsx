import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Bot,
  FlaskConical,
  Newspaper,
  ShieldCheck,
  ThermometerSun,
  Workflow,
} from "lucide-react";
import { JsonLd, breadcrumbSchema, webPageSchema } from "@/components/json-ld";
import { Mascot } from "@/components/mascot";
import { ogImageUrl } from "@/lib/og-url";
import {
  SITE_URL,
  withSiteAlternates,
  withSiteOpenGraph,
  withSiteTwitter,
} from "@/lib/seo-metadata";
import { getAutomationConsultAvailability } from "@/lib/automation-consult/availability";
import { UsageNotesLink } from "@/components/usage-notes-link";

const PATH = "/safety-ai";
const URL = `${SITE_URL}${PATH}`;
const TITLE = "安全AIポータルとは｜現場で使える労働安全ツール";
const DESCRIPTION =
  "職長、一人親方、安全衛生担当者が、WBGT、法令、化学物質、労災事故、教育、Visual KYTを無料で使える入口です。会社独自の帳票や通知、自動化の相談にも対応します。";
const PUBLISHED_AT = "2026-07-31";
const MODIFIED_AT = "2026-08-01";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: withSiteAlternates(PATH),
  openGraph: withSiteOpenGraph(PATH, {
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: ogImageUrl("安全情報を、現場で使える行動へ。", DESCRIPTION),
        width: 1200,
        height: 630,
        alt: TITLE,
      },
    ],
  }),
  twitter: withSiteTwitter({
    title: TITLE,
    description: DESCRIPTION,
    images: [ogImageUrl("安全情報を、現場で使える行動へ。", DESCRIPTION)],
  }),
};

const CAPABILITIES = [
  {
    icon: ThermometerSun,
    title: "WBGT・熱中症",
    description: "地域を選び、現在の暑さ指数と公式の警戒情報を確認します。",
    href: "/risk",
    cta: "WBGTを見る",
  },
  {
    icon: Bot,
    title: "安衛法AI・法令検索",
    description: "現場の言葉で質問し、根拠候補から法令原文へ進みます。",
    href: "/chatbot",
    cta: "法令を聞く",
  },
  {
    icon: FlaskConical,
    title: "化学物質RA",
    description: "物質名やCAS番号から、公的データと作業条件を整理します。",
    href: "/chemical-ra",
    cta: "物質を調べる",
  },
  {
    icon: Newspaper,
    title: "事故ニュース・法改正",
    description: "事故の確認状態と施行日を分け、一次資料までたどれます。",
    href: "/accident-news",
    cta: "最新事故を見る",
  },
  {
    icon: BookOpenCheck,
    title: "5分教材・安全系資格",
    description: "短時間教材と作業条件に合う資格情報を確認できます。",
    href: "/education",
    cta: "5分学ぶ",
  },
  {
    icon: ShieldCheck,
    title: "Visual KYT",
    description: "一枚の場面から危険を探し、朝礼や個人学習に使えます。",
    href: "/training/visual-ky",
    cta: "KYTを始める",
  },
] as const;

const STANDARD_FEATURES = [
  "法令・事故・化学物質・気象の確認",
  "KYT・教育・資格情報",
  "一般的な帳票・検索・通知のサンプル",
] as const;

const CUSTOM_FEATURES = [
  "会社独自の帳票",
  "承認フロー",
  "社内通知",
  "安全教育資料",
  "サイネージ",
  "社内データ・API連携",
  "定型業務の自動化",
] as const;

function CtaLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      data-lp-cta=""
      className={`inline-flex min-h-12 max-w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-center font-black [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/30 ${className}`}
    >
      {children}
    </Link>
  );
}

export default function SafetyAiLandingPage() {
  const availability = getAutomationConsultAvailability();
  const consultationHref =
    availability.contactMode === "mail_client"
      ? "/contact/automation-email"
      : availability.contactMode === "web_form"
        ? "/services/automation#consult-form"
        : "/services/automation";
  const consultationLabel =
    availability.contactMode === "mail_client"
      ? "メールで相談する"
      : availability.contactMode === "web_form"
        ? "自社向けに相談する"
        : "自動化例・料金を見る";
  return (
    <>
      <JsonLd
        schema={[
          webPageSchema({
            name: TITLE,
            description: DESCRIPTION,
            url: URL,
            datePublished: PUBLISHED_AT,
            dateModified: MODIFIED_AT,
            keywords: ["安全AI", "労働安全", "現場安全"],
          }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_URL },
            { name: "安全AIとは", url: URL },
          ]),
        ]}
      />

      <article
        data-simple-safety-ai-lp=""
        className="overflow-hidden bg-[#f8f5ed] text-slate-950 dark:bg-slate-950 dark:text-white"
      >
        <section
          data-lp-section="hero"
          aria-labelledby="safety-ai-title"
          className="relative isolate border-b-2 border-slate-900 px-4 py-10 sm:px-6 sm:py-14 dark:border-slate-600"
        >
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-40 -z-10 h-[30rem] w-[30rem] rounded-full bg-orange-300/40 blur-3xl forced-colors:hidden" />
          <div className="mx-auto grid max-w-6xl gap-7 lg:grid-cols-[minmax(0,1fr)_13rem] lg:items-center">
            <div>
              <p className="text-sm font-black tracking-wide text-emerald-800 dark:text-emerald-300">
                職長・一人親方・安全衛生担当者へ
              </p>
              <h1 id="safety-ai-title" className="mt-3 max-w-4xl text-[clamp(2.35rem,6vw,4.7rem)] font-black leading-[1.02] tracking-[-.05em]">
                安全情報を、現場で使える行動へ。
              </h1>
              <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-slate-700 dark:text-slate-200 sm:text-lg">WBGT、法令、化学物質、事故、教育を一つの場所で確認できます。</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <span data-hero-primary="" data-primary-action="true">
                  <CtaLink href="/" className="w-full bg-emerald-800 text-white shadow-[4px_4px_0_#0f172a] hover:bg-emerald-900 sm:w-auto">
                    今すぐ使う
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </CtaLink>
                </span>
                <span data-hero-secondary="" data-secondary-action="true">
                  <CtaLink href="#available" className="w-full border-2 border-slate-800 bg-white text-slate-950 hover:bg-slate-100 sm:w-auto">
                    できることを見る
                  </CtaLink>
                </span>
                <span data-hero-secondary="" data-secondary-action="true">
                  <CtaLink href={consultationHref} className="w-full border-2 border-sky-800 bg-sky-50 text-sky-950 hover:bg-sky-100 sm:w-auto">
                    {consultationLabel}
                  </CtaLink>
                </span>
              </div>
            </div>
            <div className="mx-auto rounded-[2rem] border-2 border-slate-900 bg-white/80 p-3 shadow-[7px_7px_0_#f59e0b] dark:bg-slate-900">
              <Mascot
                variant="pointing"
                size="xl"
                eager
                sizes="192px"
                alt="次に使う機能を案内するチワワ"
              />
            </div>
          </div>
        </section>

        <section data-lp-section="available" id="available" aria-labelledby="available-title" className="scroll-mt-24 px-4 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-black text-emerald-800 dark:text-emerald-300">今すぐ使えること</p>
            <h2 id="available-title" className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              必要な機能を、その場で開く
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700 dark:text-slate-200">
              確認したい機能を直接開けます。数量・勾配・座標の概算は
              <Link href="/tools/construction-calculators" className="mx-1 font-black text-emerald-800 underline underline-offset-4 dark:text-emerald-300">
                建設計算ツール
              </Link>
              を利用できます。
            </p>
            <ul className="mt-7 grid border-y-2 border-slate-900 sm:grid-cols-2 lg:grid-cols-3 dark:border-slate-500">
              {CAPABILITIES.slice(0, 3).map((item, index) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className={`p-5 ${index % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-emerald-50 dark:bg-emerald-950/30"}`}>
                    <Icon className="h-7 w-7 text-emerald-800 dark:text-emerald-300" aria-hidden="true" />
                    <h3 className="mt-3 text-lg font-black">{item.title}</h3>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-slate-700 dark:text-slate-200">{item.description}</p>
                    <Link href={item.href} prefetch={false} data-lp-cta="" className="mt-3 inline-flex min-h-11 items-center gap-2 font-black text-emerald-800 underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:text-emerald-300">
                      {item.cta}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section data-lp-section="learn" aria-labelledby="learn-title" className="border-t-2 border-slate-900 px-4 py-10 sm:px-6 sm:py-14 dark:border-slate-600">
          <div className="mx-auto max-w-6xl">
            <h2 id="learn-title" className="text-3xl font-black tracking-tight sm:text-4xl">
              事故から学び、危険を見る
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700 dark:text-slate-200">
              事故、短時間教材、Visual KYTへ直接進めます。音声付きの安全研修は
              <Link href="/training/safety-seminars" className="font-black text-emerald-800 underline underline-offset-4 dark:text-emerald-300">
                安全研修ライブラリ
              </Link>
              、生成AIの仕事での使い方は
              <Link href="/training/ai-seminars" className="font-black text-sky-800 underline underline-offset-4 dark:text-sky-300">
                AI実務研修
              </Link>
              で学べます。
            </p>
            <ul className="mt-7 grid border-y-2 border-slate-900 sm:grid-cols-3 dark:border-slate-500">
              {CAPABILITIES.slice(3).map((item, index) => {
                const Icon = item.icon;
                return (
                  <li key={item.title} className={`p-5 ${index % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-emerald-50 dark:bg-emerald-950/30"}`}>
                    <Icon className="h-7 w-7 text-emerald-800 dark:text-emerald-300" aria-hidden="true" />
                    <h3 className="mt-3 text-lg font-black">{item.title}</h3>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-slate-700 dark:text-slate-200">{item.description}</p>
                    <Link href={item.href} prefetch={false} data-lp-cta="" className="mt-3 inline-flex min-h-11 items-center gap-2 font-black text-emerald-800 underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:text-emerald-300">
                      {item.cta}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section data-lp-section="customize" id="customize" aria-labelledby="customize-title" className="scroll-mt-24 bg-slate-950 px-4 py-10 text-white sm:px-6 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <Workflow className="h-8 w-8 text-cyan-300" aria-hidden="true" />
            <h2 id="customize-title" className="mt-3 max-w-4xl text-3xl font-black tracking-tight sm:text-4xl">
              そのまま使う。合わない部分は、現場に合わせてつくる。
            </h2>
            <div className="mt-7 grid overflow-hidden rounded-2xl border border-white/30 md:grid-cols-2">
              <div className="bg-white p-5 text-slate-950 sm:p-6">
                <h3 className="text-xl font-black">標準で使えること</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  公開中の共通機能は、そのまま無料で試せます。公式情報の確認や日々の安全活動の入口として利用してください。
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm font-semibold leading-6">
                  {STANDARD_FEATURES.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div className="bg-sky-950 p-5 sm:p-6">
                <h3 className="text-xl font-black text-cyan-200">会社・現場に合わせてつくること</h3>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  既存の書式、責任分担、確認手順を聞き、必要な部分だけを調整します。最初から大きな仕組みにせず、一つの業務で試せます。
                </p>
                <ul className="mt-4 grid list-disc gap-x-5 gap-y-2 pl-5 text-sm font-semibold leading-6 sm:grid-cols-2">
                  {CUSTOM_FEATURES.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
            <p className="mt-5 max-w-3xl text-sm font-semibold leading-7 text-slate-200">
              書式や運用が違う業務は、現場の話を聞きながら個別に調整します。標準機能を試してから、必要な範囲だけ相談できます。
             </p>
             <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
               <UsageNotesLink className="text-cyan-200" />
               <Link
                 href="/about/project-story"
                 className="font-bold text-cyan-200 underline underline-offset-4"
               >
                 プロジェクトについて
               </Link>
             </div>
           </div>
        </section>
      </article>
    </>
  );
}
