import type { Metadata } from "next";
import Link from "next/link";
import { KyHandoffLink } from "@/components/ky-handoff-link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Presentation,
  Printer,
} from "lucide-react";
import { AutomationServicePromo } from "@/components/automation/automation-service-promo";
import { JsonLd } from "@/components/json-ld";
import { PageJsonLd } from "@/components/page-json-ld";
import { VisualKyPlayer } from "@/components/visual-ky/visual-ky-player";
import { VisualKyStaticReference } from "@/components/visual-ky/visual-ky-static-reference";
import {
  PUBLIC_VISUAL_KY_SCENARIOS,
  getVisualKyCategory,
  getVisualKyScenarioBySlug,
} from "@/data/visual-ky";
import { getAutomationConsultAvailability } from "@/lib/automation-consult/availability";
import { getNextVisualKyScenario, selectDailyVisualKy } from "@/lib/visual-ky/daily";
import {
  SITE_URL,
  withSiteOpenGraph,
  withSiteTwitter,
} from "@/lib/seo-metadata";
import { UsageNotesLink } from "@/components/usage-notes-link";

const HUB_PATH = "/training/visual-ky";

export function generateStaticParams() {
  return PUBLIC_VISUAL_KY_SCENARIOS.map((scenario) => ({
    slug: scenario.slug,
  }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const scenario = getVisualKyScenarioBySlug(slug);
  if (!scenario) return {};
  const path = `${HUB_PATH}/${scenario.slug}`;
  const title = `${scenario.shortTitle}｜KYTイラスト・危険予知問題`;
  const description = `${scenario.title}。現場イラストから危険箇所を探し、事故につながる理由、対策の優先順位、作業中止条件を${scenario.estimatedMinutes}分で学びます。`;
  const hasQuery = Object.keys(query).length > 0;
  const indexable =
    scenario.reviewStatus === "reviewed" &&
    scenario.indexability === "index" &&
    scenario.rightsStatus !== undefined &&
    !hasQuery;
  const image = `${SITE_URL}${scenario.image.src}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index: indexable, follow: true },
    openGraph: withSiteOpenGraph(path, {
      title,
      description,
      images: [
        {
          url: image,
          width: scenario.image.width,
          height: scenario.image.height,
          alt: scenario.image.alt,
        },
      ],
    }),
    twitter: withSiteTwitter({ images: [image] }),
  };
}

export default async function VisualKyScenarioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const scenario = getVisualKyScenarioBySlug(slug);
  if (!scenario || !PUBLIC_VISUAL_KY_SCENARIOS.some((item) => item.id === scenario.id)) {
    notFound();
  }
  const category = getVisualKyCategory(scenario.category);
  const next = getNextVisualKyScenario(scenario.id);
  const daily = selectDailyVisualKy();
  const isToday = daily.scenario.id === scenario.id;
  const path = `${HUB_PATH}/${scenario.slug}`;
  const availability = getAutomationConsultAvailability();
  const description = `${scenario.title}。画像と同等のテキスト教材、一次資料、KY・事故・法令・資格への導線を備えた5分KYTです。`;

  return (
    <>
      <PageJsonLd
        name={scenario.shortTitle}
        description={description}
        path={path}
        breadcrumbs={[
          { name: "ホーム", url: SITE_URL },
          { name: "ビジュアルKYT", url: `${SITE_URL}${HUB_PATH}` },
          { name: scenario.shortTitle, url: `${SITE_URL}${path}` },
        ]}
        keywords={[
          "KYT",
          category.label,
          "危険予知訓練",
          "KYT イラスト",
          "KY 問題",
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "LearningResource",
          name: scenario.title,
          description,
          url: `${SITE_URL}${path}`,
          image: `${SITE_URL}${scenario.image.src}`,
          inLanguage: "ja",
          learningResourceType: "危険予知訓練",
          educationalLevel: scenario.difficulty,
          timeRequired: `PT${scenario.estimatedMinutes}M`,
          isAccessibleForFree: true,
          dateCreated: scenario.reviewedDate,
          dateModified: scenario.updatedDate,
          teaches: scenario.hazards.map((hazard) => hazard.title),
          provider: {
            "@type": "Organization",
            name: "安全AIポータル",
            url: SITE_URL,
          },
        }}
      />

      <div className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6 lg:px-8">
        <header className="mb-4">
          <div>
            <Link
              href={HUB_PATH}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-teal-800 underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 dark:text-teal-300"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              ビジュアルKYT一覧
            </Link>
            <p className="mt-3 text-xs font-black tracking-[0.15em] text-teal-800 uppercase dark:text-teal-300">
              {isToday ? "今日の5分KYT · " : ""}
              {scenario.id} · {category.label}
            </p>
            <h1 className="mt-2 max-w-4xl text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              {scenario.shortTitle}
            </h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-700 dark:text-slate-200">イラストを見て、危険箇所と対策を選びます。</p>
          </div>
        </header>

        <noscript>
          <div className="mb-5 rounded-xl border-2 border-teal-800 bg-teal-50 p-4 font-bold text-teal-950">
            JavaScriptが無効でも、このページ下部の「場面説明・危険・対策のテキスト版」で全内容を学べます。
          </div>
        </noscript>

        <VisualKyPlayer
          scenario={scenario}
          nextHref={`${HUB_PATH}/${next.slug}`}
          progressCatalog={PUBLIC_VISUAL_KY_SCENARIOS.map((item) => ({
            id: item.id,
            categoryTags: item.categoryTags,
          }))}
          priority
        />
        <nav aria-label="この問題の関連操作" className="mt-4 grid gap-2 sm:grid-cols-3">
          <KyHandoffLink
            handoff={{
              source: "visual-kyt",
              scenarioId: scenario.id,
              workDraft: scenario.shortTitle,
            }}
            data-primary-action="true"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 py-3 text-sm font-black text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300"
          >
            <FileText className="h-5 w-5" aria-hidden="true" />
            この問題でKYを作る
          </KyHandoffLink>
          <Link
            href={`${path}/facilitator`}
            data-secondary-action="true"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-teal-800 bg-white px-4 py-3 text-sm font-black text-teal-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 dark:bg-slate-950 dark:text-teal-100"
          >
            <Presentation className="h-5 w-5" aria-hidden="true" />
            講師モード
          </Link>
          <Link
            href={`${path}/print`}
            data-secondary-action="true"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <Printer className="h-5 w-5" aria-hidden="true" />
            印刷
          </Link>
        </nav>
        <VisualKyStaticReference scenario={scenario} />

        <AutomationServicePromo
          position="education"
          availability={availability}
          title="自社現場向けKYT教材・社内講習の対応範囲を確認"
          description="オリジナルKYT問題、安全教育スライド、講師用進行台本、KY帳票連携について、現在の受付状態と対応範囲を確認できます。"
          cta="教材・講習を相談する"
        />

        <UsageNotesLink className="mt-4 text-brand-primary" />
      </div>
    </>
  );
}
