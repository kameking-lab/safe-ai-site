import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  Headphones,
  Presentation,
} from "lucide-react";
import { PageContainer } from "@/components/layout";
import { JsonLd } from "@/components/json-ld";
import { SafetySeminarPlayer } from "@/components/training/safety-seminar-player";
import fallPreventionJson from "@/data/safety-seminars/fall-prevention.json";
import claimsJson from "@/data/safety-seminars/claims.json";
import quizJson from "@/data/safety-seminars/quiz.json";
import sourcesJson from "@/data/safety-seminars/source-registry.json";
import type {
  FallPreventionTraining,
  TrainingClaim,
  TrainingSource,
} from "@/data/safety-seminars/types";
import {
  SITE_URL,
  withSiteAlternates,
  withSiteOpenGraph,
  withSiteTwitter,
} from "@/lib/seo-metadata";

const PATH = "/training/safety-seminars/fall-prevention";
const TITLE = "墜落・転落防止とフルハーネスの実務｜無料安全研修";
const DESCRIPTION =
  "2025年全国確定統計、現行法令、政府資料、査読研究から、作業床・手すり、フルハーネス、取付点、落下距離、点検、救助を20枚で学ぶ社内安全研修。";
const training = fallPreventionJson as FallPreventionTraining;
const claims = claimsJson as TrainingClaim[];
const sources = sourcesJson as TrainingSource[];
const DOWNLOAD_BASE = "/training/safety-seminars/fall-prevention/downloads";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const query = await searchParams;
  const hasQuery = Object.keys(query).length > 0;
  const image = `${SITE_URL}/safety-images/library/originals/fall-restraint-required.png`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: withSiteAlternates(PATH),
    robots: hasQuery ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: withSiteOpenGraph(PATH, {
      title: TITLE,
      description: DESCRIPTION,
      images: [{ url: image, alt: "フルハーネスを正しく使用する作業者の教材用イラスト" }],
    }),
    twitter: withSiteTwitter({ images: [image] }),
  };
}

export default function FallPreventionSeminarPage() {
  const audioSeconds = training.slides.reduce(
    (total, slide) => total + slide.estimatedSeconds,
    0,
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
              {
                "@type": "ListItem",
                position: 2,
                name: "安全研修ライブラリ",
                item: `${SITE_URL}/training/safety-seminars`,
              },
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
            educationalUse: ["社内安全研修", "朝礼", "協力会社教育", "現場教育"],
            timeRequired: "PT60M",
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
        <span>墜落・転落防止</span>
      </nav>

      <header className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-8 text-white shadow-2xl sm:px-8 lg:px-12 lg:py-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            background:
              "radial-gradient(circle at 10% 10%, #0f766e 0, transparent 34%), radial-gradient(circle at 90% 80%, #f97316 0, transparent 28%)",
          }}
        />
        <div className="relative max-w-4xl">
          <p className="text-sm font-black tracking-[0.16em] text-teal-300">公開中・無料教材</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-6xl">
            墜落・転落防止と
            <span className="block text-orange-300">フルハーネスの実務</span>
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200 sm:text-lg">
            {training.subtitle}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold sm:text-sm">
            <span className="rounded-full bg-white/10 px-3 py-2"><Headphones className="mr-1 inline h-4 w-4" aria-hidden="true" />音声 約37分</span>
            <span className="rounded-full bg-white/10 px-3 py-2"><Presentation className="mr-1 inline h-4 w-4" aria-hidden="true" />20枚</span>
            <span className="rounded-full bg-white/10 px-3 py-2">演習込み 約60分</span>
            <span className="rounded-full bg-white/10 px-3 py-2">基準日 2026-08-27</span>
          </div>
          <p className="mt-5 rounded-xl border border-amber-300 bg-amber-200/10 p-3 font-bold leading-6 text-amber-100">
            {training.boundary}
          </p>
          <a href="#seminar-player" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-300 px-5 py-3 font-black text-slate-950 hover:bg-teal-200 dark:text-slate-950">
            教材を再生する <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </a>
        </div>
      </header>

      <section
        id="seminar-player"
        className="mt-8 scroll-mt-24"
        style={{ contentVisibility: "auto", containIntrinsicSize: "auto 900px" }}
      >
        <SafetySeminarPlayer slides={training.slides} claims={claims} sources={sources} />
      </section>

      <noscript>
        <section className="mt-8 rounded-2xl border-2 border-amber-500 bg-amber-50 p-5 text-amber-950">
          <h2 className="text-xl font-black">JavaScriptを使わずに読む</h2>
          <p className="mt-2 leading-7">音声操作は利用できません。以下の全スライド本文・原稿とPDFをご利用ください。</p>
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

      <section
        aria-labelledby="downloads-title"
        className="mt-12"
        style={{ contentVisibility: "auto", containIntrinsicSize: "auto 420px" }}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black text-teal-800 dark:text-teal-300">無料ダウンロード</p>
            <h2 id="downloads-title" className="mt-1 text-3xl font-black text-slate-950 dark:text-white">研修で使う一式</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">PPTXは編集可能・PDFは印刷用</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["編集可能PowerPoint", "fall-prevention-training.pptx", Presentation],
            ["投影・印刷用PDF", "fall-prevention-training.pdf", FileText],
            ["講師用台本", "fall-prevention-instructor-script.pdf", FileText],
            ["参加者配布用1枚資料", "fall-prevention-handout.pdf", FileCheck2],
            ["現場確認チェックリスト", "fall-prevention-field-checklist.pdf", CheckCircle2],
            ["5問クイズ・解答解説", "fall-prevention-quiz-and-answers.pdf", FileCheck2],
            ["出典一覧", "fall-prevention-sources.pdf", FileText],
          ].map(([label, file, Icon]) => (
            <a
              key={String(file)}
              href={`${DOWNLOAD_BASE}/${file}`}
              download
              className="group flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-slate-300 bg-white p-4 font-black text-slate-950 shadow-sm hover:border-teal-600 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-teal-950/40"
            >
              <span className="inline-flex items-center gap-3">
                <Icon className="h-5 w-5 text-teal-700 dark:text-teal-300" aria-hidden="true" />
                {String(label)}
              </span>
              <Download className="h-5 w-5 text-slate-500 group-hover:text-teal-700" aria-hidden="true" />
            </a>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
          社内安全研修、朝礼、協力会社教育、現場教育、自社資料への組込みに無料で利用・編集・社内配布できます。根拠脚注は原則として残してください。詳細は
          <Link href="/training/safety-seminars/terms" className="font-bold text-teal-800 underline underline-offset-4 dark:text-teal-300">利用条件・注意事項</Link>
          を確認してください。
        </p>
      </section>

      <section
        aria-labelledby="customize-title"
        className="mt-12 rounded-[2rem] border border-teal-300 bg-teal-50 p-5 sm:p-8 dark:border-teal-800 dark:bg-teal-950/30"
        style={{ contentVisibility: "auto", containIntrinsicSize: "auto 360px" }}
      >
        <h2 id="customize-title" className="text-3xl font-black text-slate-950 dark:text-white">御社の現場に合わせて作り直します</h2>
        <p className="mt-3 max-w-4xl leading-7 text-slate-700 dark:text-slate-200">
          会社ルール・帳票、現場写真・事故事例を反映し、60・90・120分、多言語、オンライン・出張講師、安全パトロール、写真付き報告書、施工計画書・作業手順書の安全チェックへ調整します。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ConsultLink href="/services/automation?consultationType=training-materials#consult-form">自社向け教材を相談</ConsultLink>
          <ConsultLink href="/services/automation?consultationType=training#consult-form">出張講習・安全パトロール</ConsultLink>
          <ConsultLink href="/services/automation?consultationType=manuals#consult-form">施工計画書・手順書を相談</ConsultLink>
        </div>
      </section>

      <section
        aria-labelledby="outline-title"
        className="mt-12"
        style={{ contentVisibility: "auto", containIntrinsicSize: "auto 2200px" }}
      >
        <h2 id="outline-title" className="text-3xl font-black text-slate-950 dark:text-white">20枚の構成と音声原稿</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">音声原稿合計 {Math.round(audioSeconds / 60)}分目安。各スライドの主張はclaim IDから一次資料へ追跡できます。</p>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {training.slides.map((slide) => (
            <details key={slide.id} className="rounded-2xl border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <summary className="min-h-11 cursor-pointer py-2 font-black text-slate-950 dark:text-white">
                {slide.number}. {slide.title}
              </summary>
              <p className="mt-2 leading-7 text-slate-700 dark:text-slate-200">{slide.message}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{slide.narration}</p>
              <p className="mt-3 text-xs font-bold text-teal-800 dark:text-teal-300">Claim: {slide.claimIds.join(" / ") || "サイト位置付け"}</p>
            </details>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="quiz-title"
        className="mt-12"
        style={{ contentVisibility: "auto", containIntrinsicSize: "auto 700px" }}
      >
        <h2 id="quiz-title" className="text-3xl font-black text-slate-950 dark:text-white">5問の確認クイズ</h2>
        <div className="mt-5 space-y-3">
          {quizJson.questions.map((question, index) => (
            <details key={question.id} className="rounded-2xl border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <summary className="min-h-11 cursor-pointer py-2 font-black text-slate-950 dark:text-white">Q{index + 1}. {question.question}</summary>
              <ol className="mt-2 list-[upper-alpha] space-y-1 pl-6 text-sm leading-6">
                {question.choices.map((choice) => <li key={choice}>{choice}</li>)}
              </ol>
              <p className="mt-3 rounded-xl bg-teal-50 p-3 text-sm font-bold leading-6 text-teal-950 dark:bg-teal-950/50 dark:text-teal-100">
                正解: {String.fromCharCode(65 + question.correctIndex)}。{question.explanation}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="sources-title"
        className="mt-12"
        style={{ contentVisibility: "auto", containIntrinsicSize: "auto 900px" }}
      >
        <h2 id="sources-title" className="text-3xl font-black text-slate-950 dark:text-white">出典と確認状態</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          法令はe-Govの2026年8月27日時点、統計は2025年全国確定値を正本としています。2026年速報は通年確定値と分離しています。
        </p>
        <details className="mt-4 rounded-2xl border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <summary className="min-h-11 cursor-pointer py-2 font-black text-slate-950 dark:text-white">{sources.length}件のsource registryを開く</summary>
          <ol className="mt-3 space-y-4 text-sm leading-6">
            {sources.map((source) => (
              <li key={source.sourceId} className="border-t border-slate-200 pt-3 first:border-0 first:pt-0 dark:border-slate-700">
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-black text-teal-800 underline underline-offset-4 dark:text-teal-300">{source.title}</a>
                <span className="block text-slate-600 dark:text-slate-300">{source.publisher} / {source.finalOrPreliminary} / {source.locator}</span>
                <code className="mt-1 block break-all text-xs text-slate-500">{source.sourceId} · {source.checksum}</code>
              </li>
            ))}
          </ol>
        </details>
      </section>
    </PageContainer>
  );
}

function ConsultLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} prefetch={false} className="inline-flex min-h-11 items-center rounded-xl bg-teal-800 px-4 py-3 text-sm font-black text-white hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-300">
      {children}
    </Link>
  );
}
