import type { Metadata } from "next";
import Link from "next/link";
import { AutomationConsultCta } from "@/components/automation/automation-consult-cta";
import { PageJsonLd } from "@/components/page-json-ld";
import { PageContainer } from "@/components/layout";
import { UsageNotesLink } from "@/components/usage-notes-link";
import { HEAT_PRIMARY_LINKS } from "@/data/heat-illness-campaign";
import { getAutomationConsultAvailability } from "@/lib/automation-consult/availability";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

const PAGE_PATH = "/heat-illness-prevention";
const TITLE = "職場の熱中症対策・予防｜WBGT・KY・教育・緊急対応";
const DESCRIPTION =
  "地域を選び、WBGTと警戒状態を確認して、今日の休憩・水分・KYへ進める職場向け熱中症対策ページです。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  openGraph: withSiteOpenGraph(PAGE_PATH, {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    images: [
      {
        url: ogImageUrl("職場の熱中症対策", "WBGT・KY・教育・緊急対応"),
        width: 1200,
        height: 630,
      },
    ],
  }),
  twitter: withSiteTwitter({
    title: TITLE,
    description: DESCRIPTION,
    images: [ogImageUrl("職場の熱中症対策", "WBGT・KY・教育・緊急対応")],
  }),
  robots: { index: false, follow: true },
};

const primaryButton =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl bg-orange-700 px-5 py-3 text-center text-sm font-black text-white hover:bg-orange-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300 forced-colors:border-2 forced-colors:border-[LinkText] forced-colors:bg-[Canvas] forced-colors:text-[LinkText]";
const secondaryButton =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-slate-700 bg-white px-5 py-3 text-center text-sm font-black text-slate-950 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 forced-colors:border-[LinkText] forced-colors:bg-[Canvas] forced-colors:text-[LinkText]";
const textLink =
  "inline-flex min-h-11 items-center font-bold text-sky-900 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300";

const HEAT_AUTOMATION_CONSULTATIONS = [
  ["熱中症講習の資料作成", "heat-illness-training"],
  ["安全教育資料", "safety-education-materials"],
  ["WBGT・気象通知", "wbgt-weather-notifications"],
  ["熱中症サイネージ", "heat-signage"],
  ["KY・帳票", "ky-document-automation"],
] as const;

export default function HeatIllnessPreventionPage() {
  const consultAvailability = getAutomationConsultAvailability();

  return (
    <PageContainer width="wide">
      <PageJsonLd
        name={TITLE}
        description={DESCRIPTION}
        path={PAGE_PATH}
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          {
            name: "職場の熱中症対策",
            url: `https://www.anzen-ai-portal.jp${PAGE_PATH}`,
          },
        ]}
      />

      <header className="max-w-4xl">
        <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          職場の熱中症対策
        </h1>
        <p className="mt-2 text-base leading-7 text-slate-700">
          地域を選び、WBGTと行動を確認します。
        </p>
      </header>

      <section
        aria-labelledby="heat-current-title"
        className="mt-5 rounded-2xl border border-slate-300 bg-white p-4 sm:p-5"
      >
        <h2 id="heat-current-title" className="text-lg font-black text-slate-950">
          現在値
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <div>
            <dt className="text-xs font-bold text-slate-600">地域</dt>
            <dd className="mt-1 font-black text-slate-950">未選択</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-slate-600">WBGT</dt>
            <dd className="mt-1 font-black text-slate-950">未取得</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-slate-600">情報種別</dt>
            <dd className="mt-1 font-black text-slate-950">未取得</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-slate-600">警戒状態</dt>
            <dd className="mt-1 font-black text-slate-950">未判定</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/risk"
            data-primary-action=""
            className={primaryButton}
          >
            地域を選んで確認
          </Link>
          <Link
            href="/ky/paper?topic=heat-illness"
            className={secondaryButton}
          >
            熱中症KYを作る
          </Link>
        </div>
      </section>

      <section aria-labelledby="today-actions" className="mt-8">
        <h2 id="today-actions" className="text-2xl font-black text-slate-950">
          今日行うこと
        </h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-2">
          <li className="rounded-xl border border-orange-300 bg-orange-50 p-4 font-bold text-orange-950">
            1. 地域・時刻・WBGT種別・取得時刻を確認
          </li>
          <li className="rounded-xl border border-orange-300 bg-orange-50 p-4 font-bold text-orange-950">
            2. 休憩・水分・緊急連絡の担当を決定
          </li>
        </ol>
      </section>

      <section aria-labelledby="heat-tools" className="mt-8">
        <h2 id="heat-tools" className="text-2xl font-black text-slate-950">
          KY・教育
        </h2>
        <nav
          aria-label="熱中症対策ツール"
          className="mt-3 grid gap-3 sm:grid-cols-3"
        >
          <Link href="/ky/paper?topic=heat-illness" className={secondaryButton}>
            熱中症KY
          </Link>
          <Link href="/heat-illness-prevention/slides" className={secondaryButton}>
            14枚の教育スライド
          </Link>
          <Link
            href="/heat-illness-prevention/elearning"
            className={secondaryButton}
          >
            7問のeラーニング
          </Link>
        </nav>
        <Link href="/signage" className={`${textLink} mt-2`}>
          サイネージで表示
        </Link>
      </section>

      <section id="emergency" aria-labelledby="emergency-title" className="mt-8">
        <h2 id="emergency-title" className="text-2xl font-black text-slate-950">
          緊急時
        </h2>
        <p className="mt-3 border-l-4 border-red-700 pl-4 font-bold leading-7 text-slate-950">
          反応・意識に異常がある、または判断できない場合は119。一人にせず冷却。
        </p>
        <a
          href={HEAT_PRIMARY_LINKS.emergency}
          target="_blank"
          rel="noopener noreferrer"
          className={`${textLink} mt-2`}
        >
          厚生労働省の対応手順
        </a>
      </section>

      <section aria-labelledby="heat-details-title" className="mt-8">
        <h2 id="heat-details-title" className="text-2xl font-black text-slate-950">
          詳細
        </h2>
        <details className="mt-3 rounded-xl border border-slate-300 px-4">
          <summary className="flex min-h-11 cursor-pointer items-center font-bold text-slate-900">
            WBGTの情報種別
          </summary>
          <dl className="space-y-2 pb-4 text-sm leading-6 text-slate-700">
            <div>
              <dt className="inline font-black text-slate-900">実測値：</dt>
              <dd className="inline">測定器の値</dd>
            </div>
            <div>
              <dt className="inline font-black text-slate-900">実況推定値：</dt>
              <dd className="inline">気象データによる現在付近の推定</dd>
            </div>
            <div>
              <dt className="inline font-black text-slate-900">予測値：</dt>
              <dd className="inline">将来時刻の予測</dd>
            </div>
          </dl>
        </details>
        <details className="mt-3 rounded-xl border border-slate-300 px-4">
          <summary className="flex min-h-11 cursor-pointer items-center font-bold text-slate-900">
            公式情報
          </summary>
          <nav className="flex flex-wrap gap-x-5 gap-y-1 pb-4" aria-label="熱中症の公式情報">
            <a
              href="https://www.wbgt.env.go.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className={textLink}
            >
              環境省WBGT
            </a>
            <a
              href="https://www.jma.go.jp/bosai/warning/"
              target="_blank"
              rel="noopener noreferrer"
              className={textLink}
            >
              気象庁の警報・注意報
            </a>
            <a
              href={HEAT_PRIMARY_LINKS.law}
              target="_blank"
              rel="noopener noreferrer"
              className={textLink}
            >
              安衛則第612条の2
            </a>
          </nav>
        </details>
      </section>

      <section aria-labelledby="heat-consult-title" className="mt-8">
        <h2 id="heat-consult-title" className="text-2xl font-black text-slate-950">
          講習・資料作成
        </h2>
        <p className="mt-2 text-sm font-bold text-slate-700" role="status">
          {consultAvailability.label}
        </p>
        <AutomationConsultCta
          position="heat_hub"
          consultationType="heat-illness-training"
          href="/services/automation?consultationType=heat-illness-training#consult-form"
          className="mt-3 border-2 border-slate-700 bg-white text-slate-950"
        >
          熱中症講習の料金を見る
        </AutomationConsultCta>
        <details className="mt-3 rounded-xl border border-slate-300 px-4">
          <summary className="flex min-h-11 cursor-pointer items-center font-bold text-slate-900">
            その他の相談種別
          </summary>
          <nav className="grid gap-1 pb-4 sm:grid-cols-2" aria-label="熱中症関連の相談種別">
            {HEAT_AUTOMATION_CONSULTATIONS.slice(1).map(([label, type]) => (
              <AutomationConsultCta
                key={type}
                position="heat_hub"
                consultationType={type}
                href={`/services/automation?consultationType=${type}#consult-form`}
                className="justify-start px-0 text-left text-sky-900 underline underline-offset-4"
              >
                {label}
              </AutomationConsultCta>
            ))}
          </nav>
        </details>
      </section>

      <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-1 border-t border-slate-200 pt-5">
        <UsageNotesLink className="text-sky-900" />
        <Link href="/about/data-sources" className={textLink}>
          データの出典
        </Link>
      </footer>
    </PageContainer>
  );
}
