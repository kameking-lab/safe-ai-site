import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Download, FileText, Headphones, Presentation } from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { PageContainer } from "@/components/layout";
import { SafetySeminarPlayer } from "@/components/training/safety-seminar-player";
import { SeminarQuiz } from "@/components/training/seminar-quiz";
import claimsJson from "@/data/safety-seminars/safety-management-basics-osh-law-claims.json";
import quizJson from "@/data/safety-seminars/safety-management-basics-osh-law-quiz.json";
import sourcesJson from "@/data/safety-seminars/safety-management-basics-osh-law-source-registry.json";
import trainingJson from "@/data/safety-seminars/safety-management-basics-osh-law.json";
import type { TrainingClaim, TrainingCourse, TrainingQuiz, TrainingSource } from "@/data/safety-seminars/types";
import { SITE_URL, withSiteAlternates, withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

const PATH = "/training/safety-seminars/safety-management-basics-osh-law";
const TITLE = "安全管理の基本と安衛法｜無料・音声付き安全研修";
const DESCRIPTION =
  "安衛法の目的、役割分担、OSHMS、リスクアセスメント、対策の優先順位、変更時の停止判断を12枚で学ぶ無料の音声付き安全研修。";
const training = trainingJson as TrainingCourse;
const claims = claimsJson as TrainingClaim[];
const sources = sourcesJson as TrainingSource[];
const quiz = quizJson as TrainingQuiz;
const DOWNLOAD_BASE = `${PATH}/downloads`;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const hasQuery = Object.keys(await searchParams).length > 0;
  const image = `${SITE_URL}${PATH}/safe-site-hero.webp`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: withSiteAlternates(PATH),
    robots: hasQuery ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: withSiteOpenGraph(PATH, {
      title: TITLE,
      description: DESCRIPTION,
      images: [{ url: image, alt: "安全管理の基本を案内するチワワの先生" }],
    }),
    twitter: withSiteTwitter({ images: [image] }),
  };
}

export default function SafetyManagementBasicsOshLawPage() {
  const estimatedMinutes = Math.round(
    (training.standardMinutes.audioMin + training.standardMinutes.audioMax) / 2,
  );

  return (
    <PageContainer width="full" className="pb-20">
      <JsonLd
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "ホーム", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "安全研修ライブラリ", item: `${SITE_URL}/training/safety-seminars` },
              { "@type": "ListItem", position: 3, name: training.title, item: `${SITE_URL}${PATH}` },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "LearningResource",
            name: training.title,
            description: training.subtitle,
            url: `${SITE_URL}${PATH}`,
            inLanguage: "ja",
            learningResourceType: "社内安全研修",
            educationalUse: ["社内安全研修", "朝礼", "新規入場者教育", "職長教育の補助"],
            timeRequired: "PT15M",
            isAccessibleForFree: true,
            dateModified: training.asOf,
            provider: { "@type": "Organization", name: "安全AIポータル", url: SITE_URL },
            numberOfItems: training.slideCount,
          },
        ]}
      />

      <nav aria-label="パンくず" className="mb-5 text-sm text-slate-600 dark:text-slate-300">
        <Link href="/" className="underline underline-offset-4">ホーム</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/training/safety-seminars" className="underline underline-offset-4">安全研修ライブラリ</Link>
        <span aria-hidden="true"> / </span>
        <span>安全管理の基本と安衛法</span>
      </nav>

      <header className="grid overflow-hidden rounded-[2rem] bg-emerald-950 text-white shadow-2xl lg:grid-cols-2">
        <div className="px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
          <p className="text-sm font-black tracking-[0.16em] text-emerald-200">第1章・公開中・無料教材</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-6xl">
            安全管理の基本と
            <span className="block text-amber-200">安衛法</span>
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-emerald-50 sm:text-lg">{training.subtitle}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold sm:text-sm">
            <span className="rounded-full bg-white/10 px-3 py-2"><Headphones className="mr-1 inline h-4 w-4" aria-hidden="true" />音声 約{estimatedMinutes}分</span>
            <span className="rounded-full bg-white/10 px-3 py-2"><Presentation className="mr-1 inline h-4 w-4" aria-hidden="true" />12枚</span>
            <span className="rounded-full bg-white/10 px-3 py-2">基準日 {training.asOf}</span>
          </div>
          <p className="mt-5 rounded-xl border border-amber-200 bg-black/20 p-3 font-bold leading-6 text-amber-50">{training.boundary}</p>
          <a href="#seminar-player" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-200 px-5 py-3 font-black text-emerald-950 hover:bg-emerald-100">
            今すぐ再生 <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </a>
        </div>
        <div className="relative bg-emerald-50" style={{ minHeight: 320 }}>
          <Image
            src={`${PATH}/safe-site-hero.webp`}
            alt="安全管理の基本を案内するチワワの先生"
            fill
            priority
            sizes="(min-width: 1024px) 38vw, 100vw"
            className="object-cover"
          />
        </div>
      </header>

      <section id="seminar-player" className="mt-8 scroll-mt-24" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 900px" }}>
        <SafetySeminarPlayer
          slides={training.slides}
          claims={claims}
          sources={sources}
          audioBasePath={`${PATH}/audio`}
          playerLabel="安全管理の基本と安衛法の音声付き研修"
          transcriptId="safety-management-basics-transcript"
        />
      </section>

      <noscript>
        <section className="mt-8 rounded-2xl border-2 border-amber-500 bg-amber-50 p-5 text-amber-950">
          <h2 className="text-xl font-black">JavaScriptを使わずに読む</h2>
          <ol className="mt-4 space-y-5">
            {training.slides.map((slide) => (
              <li key={slide.id}>
                <h3 className="font-black">{slide.number}. {slide.title}</h3>
                <p className="mt-1">{slide.message}</p>
                <p className="mt-2 text-sm leading-6">{slide.narration}</p>
              </li>
            ))}
          </ol>
        </section>
      </noscript>

      <section aria-labelledby="downloads-title" className="mt-12">
        <p className="text-sm font-black text-teal-800 dark:text-teal-300">無料ダウンロード</p>
        <h2 id="downloads-title" className="mt-1 text-3xl font-black text-slate-950 dark:text-white">研修で使う2形式</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ["編集可能PowerPoint", "safety-management-basics-osh-law-training.pptx", Presentation],
            ["投影・印刷用PDF", "safety-management-basics-osh-law-training.pdf", FileText],
          ].map(([label, file, Icon]) => (
            <a key={String(file)} href={`${DOWNLOAD_BASE}/${file}`} download className="group flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-slate-300 bg-white p-4 font-black text-slate-950 shadow-sm hover:border-teal-600 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-teal-950/40">
              <span className="inline-flex items-center gap-3"><Icon className="h-5 w-5 text-teal-700 dark:text-teal-300" aria-hidden="true" />{String(label)}</span>
              <Download className="h-5 w-5 text-slate-500 group-hover:text-teal-700" aria-hidden="true" />
            </a>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
          社内安全研修、朝礼、協力会社教育で無料利用できます。根拠脚注は残してください。詳細は
          <Link href="/training/safety-seminars/terms" className="font-bold text-teal-800 underline underline-offset-4 dark:text-teal-300">利用条件・注意事項</Link>
          を確認してください。
        </p>
      </section>

      <section aria-labelledby="outline-title" className="mt-12" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 1500px" }}>
        <h2 id="outline-title" className="text-3xl font-black text-slate-950 dark:text-white">12枚の構成と音声原稿</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">この章では、災害を起こさない安全管理と現行法を扱います。</p>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {training.slides.map((slide) => (
            <details key={slide.id} className="rounded-2xl border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <summary className="min-h-11 cursor-pointer py-2 font-black text-slate-950 dark:text-white">{slide.number}. {slide.title}</summary>
              <p className="mt-2 leading-7 text-slate-700 dark:text-slate-200">{slide.message}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{slide.narration}</p>
              <p className="mt-3 text-xs font-bold text-teal-800 dark:text-teal-300">Claim: {slide.claimIds.join(" / ")}</p>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="quiz-title" className="mt-12">
        <h2 id="quiz-title" className="text-3xl font-black text-slate-950 dark:text-white">5問の確認クイズ</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          選択すると、4つの選択肢それぞれの理由と確認済みの根拠を表示します。進捗はこの端末にだけ保存します。
        </p>
        <SeminarQuiz courseId={training.id} quiz={quiz} sources={sources} />
        <noscript>
          <ol className="mt-5 space-y-4">
            {quizJson.questions.map((question, index) => (
              <li key={question.id} className="rounded-2xl border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="font-black text-slate-950 dark:text-white">Q{index + 1}. {question.question}</h3>
                <ol className="mt-2 list-[upper-alpha] space-y-1 pl-6 text-sm leading-6">
                  {question.choices.map((choice) => <li key={choice}>{choice}</li>)}
                </ol>
              </li>
            ))}
          </ol>
        </noscript>
      </section>

      <section aria-labelledby="sources-title" className="mt-12">
        <h2 id="sources-title" className="text-3xl font-black text-slate-950 dark:text-white">出典と確認状態</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">法令は2026年9月20日現在の施行状態を確認し、2027年施行予定の内容と分けています。</p>
        <ol className="mt-4 space-y-3">
          {sources.map((source) => (
            <li key={source.sourceId} className="rounded-2xl border border-slate-300 bg-white p-4 text-sm leading-6 dark:border-slate-700 dark:bg-slate-900">
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-black text-teal-800 underline underline-offset-4 dark:text-teal-300">{source.title}</a>
              <span className="block text-slate-600 dark:text-slate-300">{source.publisher} / {source.finalOrPreliminary} / {source.locator}</span>
            </li>
          ))}
        </ol>
      </section>
    </PageContainer>
  );
}
