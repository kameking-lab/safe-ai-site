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
  ShieldCheck,
} from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import { PageContainer } from "@/components/layout";
import { AiPracticeExercises } from "@/components/training/ai-practice-exercises";
import { SafetySeminarPlayer } from "@/components/training/safety-seminar-player";
import { TrainingLibrarySwitcher } from "@/components/training/training-library-switcher";
import courseJson from "@/data/ai-seminars/ai-chat-work.json";
import claimsJson from "@/data/ai-seminars/claims.json";
import promptTemplateJson from "@/data/ai-seminars/prompt-template.json";
import sourcesJson from "@/data/ai-seminars/source-registry.json";
import type {
  AiChatWorkTraining,
  AiPromptTemplate,
  TrainingClaim,
  TrainingSource,
} from "@/data/ai-seminars/types";
import { SITE_URL, withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

const PATH = "/training/ai-seminars/ai-chat-work";
const TITLE = "AIチャット仕事術｜無料のAI実務研修";
const DESCRIPTION =
  "質問、調査、文書作成、検証、個人情報・著作権、人による確認を20枚で実践する60分の社内AI研修。音声、PowerPoint、PDF、依頼テンプレート付き。";
const DOWNLOAD_BASE = `${PATH}/downloads`;
const AUDIO_BASE = `${PATH}/audio`;
const course = courseJson as AiChatWorkTraining;
const claims = claimsJson as TrainingClaim[];
const sources = sourcesJson as TrainingSource[];
const promptTemplate = promptTemplateJson as AiPromptTemplate;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const query = await searchParams;
  const hasQuery = Object.keys(query).length > 0;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: PATH },
    robots: hasQuery ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: withSiteOpenGraph(PATH, { title: TITLE, description: DESCRIPTION }),
    twitter: withSiteTwitter({ title: TITLE, description: DESCRIPTION }),
  };
}
export default function AiChatWorkSeminarPage() {
  const audioSeconds = course.slides.reduce((total, slide) => total + slide.estimatedSeconds, 0);
  const audioMinutes = Math.round(audioSeconds / 60);

  return (
    <PageContainer width="full" className="pb-20">
      <JsonLd
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "ホーム", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "AI実務研修", item: `${SITE_URL}/training/ai-seminars` },
              { "@type": "ListItem", position: 3, name: course.title, item: `${SITE_URL}${PATH}` },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "LearningResource",
            name: course.title,
            description: course.subtitle,
            url: `${SITE_URL}${PATH}`,
            inLanguage: "ja",
            learningResourceType: "社内AI研修",
            educationalUse: ["社内AI研修", "部署内勉強会", "管理職研修", "新入社員研修"],
            timeRequired: "PT60M",
            isAccessibleForFree: true,
            dateModified: course.asOf,
            provider: { "@type": "Organization", name: "安全AIポータル", url: SITE_URL },
            numberOfItems: course.slideCount,
          },
        ]}
      />

      <nav aria-label="パンくず" className="mb-5 text-sm text-slate-600 dark:text-slate-300">
        <Link href="/" className="underline underline-offset-4">ホーム</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/training/ai-seminars" className="underline underline-offset-4">AI実務研修</Link>
        <span aria-hidden="true"> / </span>
        <span>AIチャット仕事術</span>
      </nav>

      <TrainingLibrarySwitcher current="ai" />

      <header className="relative mt-6 overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-8 text-white shadow-2xl sm:px-8 lg:px-12 lg:py-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 15% 15%, #0369a1 0, transparent 34%), radial-gradient(circle at 88% 82%, #7c3aed 0, transparent 30%)",
          }}
        />
        <div className="relative max-w-4xl">
          <p className="text-sm font-black tracking-[.16em] text-sky-300">公開中・無料教材</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">AIチャット仕事術</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200 sm:text-lg">{course.subtitle}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold sm:text-sm">
            <span className="rounded-full bg-white/10 px-3 py-2"><Headphones className="mr-1 inline h-4 w-4" aria-hidden="true" />音声 約{audioMinutes}分</span>
            <span className="rounded-full bg-white/10 px-3 py-2"><Presentation className="mr-1 inline h-4 w-4" aria-hidden="true" />{course.slideCount}枚</span>
            <span className="rounded-full bg-white/10 px-3 py-2">演習込み 約60分</span>
            <span className="rounded-full bg-white/10 px-3 py-2">基準日 {course.asOf}</span>
          </div>
          <p className="mt-5 rounded-xl border border-amber-300 bg-amber-200/10 p-3 font-bold leading-6 text-amber-100">{course.boundary}</p>
          <a href="#ai-seminar-player" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-300 px-5 py-3 font-black text-slate-950 hover:bg-sky-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white">
            教材を再生する <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </a>
        </div>
      </header>

      <section aria-labelledby="audience-title" className="mt-8 rounded-2xl border-2 border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 id="audience-title" className="text-2xl font-black">対象</h2>
        <ul className="mt-3 grid gap-2 text-sm font-bold leading-6 sm:grid-cols-2">
          {course.audience.map((audience) => <li key={audience} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden="true" />{audience}</li>)}
        </ul>
      </section>

      <section id="ai-seminar-player" className="mt-8 scroll-mt-24" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 900px" }}>
        <SafetySeminarPlayer
          slides={course.slides}
          claims={claims}
          sources={sources}
          audioBasePath={AUDIO_BASE}
          playerLabel="音声付きAI実務研修スライド"
          transcriptId="ai-chat-work-transcript"
        />
      </section>

      <noscript>
        <section className="mt-8 rounded-2xl border-2 border-amber-500 bg-amber-50 p-5 text-amber-950">
          <h2 className="text-xl font-black">JavaScriptを使わずに読む</h2>
          <p className="mt-2 leading-7">音声操作と演習の解説表示は利用できません。以下の全スライド本文・原稿とPDFをご利用ください。</p>
          <ol className="mt-4 space-y-5">
            {course.slides.map((slide) => (
              <li key={slide.id}>
                <h3 className="font-black">{slide.number}. {slide.title}</h3>
                <p className="mt-1">{slide.message}</p>
                <p className="mt-2 text-sm leading-6">{slide.narration}</p>
              </li>
            ))}
          </ol>
          <a href={`${DOWNLOAD_BASE}/ai-chat-work-training.pdf`} className="mt-5 inline-flex min-h-11 items-center font-black underline underline-offset-4">研修PDFを開く</a>
        </section>
      </noscript>

      <section aria-labelledby="exercise-title" className="mt-12" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 720px" }}>
        <p className="text-sm font-black text-sky-800 dark:text-sky-300">PRACTICE</p>
        <h2 id="exercise-title" className="mt-1 text-3xl font-black">回答してから解説を見る3問</h2>
        <p className="mt-3 max-w-4xl leading-7 text-slate-700 dark:text-slate-200">曖昧な依頼、一次資料確認、機密情報の3場面を、実在情報を使わずに書き換えます。入力内容はこの画面内だけで扱います。</p>
        <div className="mt-5"><AiPracticeExercises exercises={course.exercises} /></div>
      </section>

      <section aria-labelledby="template-title" className="mt-12 rounded-[2rem] border-2 border-violet-300 bg-violet-50 p-5 dark:border-violet-800 dark:bg-violet-950/30 sm:p-8">
        <p className="text-sm font-black text-violet-800 dark:text-violet-300">PROMPT TEMPLATE</p>
        <h2 id="template-title" className="mt-1 text-3xl font-black">仕事で使えるAI依頼テンプレート</h2>
        <p className="mt-3 max-w-4xl leading-7 text-slate-700 dark:text-slate-200">{promptTemplate.description}</p>
        <pre className="mt-5 max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-slate-100">{promptTemplate.copyTemplate}</pre>
        <p className="mt-3 text-sm font-bold leading-6 text-slate-700 dark:text-slate-200">テンプレートは正しさや適法性を保証しません。会社ルール、承認済み環境、原資料確認を残してください。</p>
      </section>

      <section aria-labelledby="downloads-title" className="mt-12" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 500px" }}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black text-sky-800 dark:text-sky-300">無料ダウンロード</p>
            <h2 id="downloads-title" className="mt-1 text-3xl font-black">研修で使う一式</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">PPTXは編集可能・PDFは印刷用</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["編集可能PowerPoint", "ai-chat-work-training.pptx", Presentation],
            ["投影・印刷用PDF", "ai-chat-work-training.pdf", FileText],
            ["講師用台本", "ai-chat-work-instructor-script.pdf", FileText],
            ["参加者配布用1枚資料", "ai-chat-work-handout.pdf", FileCheck2],
            ["AI依頼テンプレート", "ai-chat-work-prompt-template.pdf", ShieldCheck],
            ["5問クイズ・解答解説", "ai-chat-work-quiz-and-answers.pdf", FileCheck2],
            ["出典一覧", "ai-chat-work-sources.pdf", FileText],
          ].map(([label, file, Icon]) => (
            <a key={String(file)} href={`${DOWNLOAD_BASE}/${file}`} download className="group flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-slate-300 bg-white p-4 font-black shadow-sm hover:border-sky-600 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-sky-950/40">
              <span className="inline-flex items-center gap-3"><Icon className="h-5 w-5 text-sky-700 dark:text-sky-300" aria-hidden="true" />{String(label)}</span>
              <Download className="h-5 w-5 text-slate-500 group-hover:text-sky-700" aria-hidden="true" />
            </a>
          ))}
        </div>
        <details className="mt-5 rounded-2xl border-2 border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <summary className="min-h-11 cursor-pointer font-black">無料利用条件</summary>
          <div className="mt-3 grid gap-4 text-sm leading-6 md:grid-cols-2">
            <div><h3 className="font-black">利用・編集・社内配布できます</h3><p>社内AI研修、部署内勉強会、管理職研修、新入社員研修、自社資料への組込み。</p></div>
            <div><h3 className="font-black">禁止または条件付き</h3><p>教材そのものの販売、教材集としての再配布、公式認定教材との表示、出典削除後の第三者制作物としての配布。</p></div>
          </div>
          <p className="mt-3 text-sm font-bold">編集時も根拠脚注を原則として残してください。</p>
        </details>
      </section>

      <section aria-labelledby="sources-web-title" className="mt-12 rounded-2xl border-2 border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:p-7">
        <h2 id="sources-web-title" className="text-2xl font-black">主要な一次資料・研究</h2>
        <ul className="mt-4 grid gap-3 text-sm leading-6 lg:grid-cols-2">
          {sources.map((source) => (
            <li key={source.sourceId} className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
              <a href={source.url} target="_blank" rel="noreferrer" className="font-black text-sky-800 underline underline-offset-4 dark:text-sky-300">{source.title}</a>
              <span className="mt-1 block text-xs text-slate-600 dark:text-slate-300">{source.publisher}／確認日 {source.checkedAt}／{source.locator}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ai-customize-title" className="mt-12 rounded-[2rem] border-2 border-sky-300 bg-sky-50 p-5 dark:border-sky-800 dark:bg-sky-950/30 sm:p-8">
        <h2 id="ai-customize-title" className="text-3xl font-black">御社の業務に合わせてAI研修を作り直します</h2>
        <p className="mt-3 max-w-4xl leading-7 text-slate-700 dark:text-slate-200">使用中のAIサービス、業務例、社内ルールを反映し、60・90・120分、オンライン・出張講習、バイブコーディング、AI利用規程、業務自動化、社内ツール試作へ調整します。</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {[
            ["AI研修をカスタマイズ", "training-materials"],
            ["出張・オンライン講習", "training"],
            ["AI業務自動化を相談", "ai-utilization"],
          ].map(([label, type]) => (
            <Link key={label} href={`/services/automation?consultationType=${type}#consult-form`} prefetch={false} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-black text-white hover:bg-slate-800 dark:bg-sky-300 dark:text-slate-950">
              {label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}
