import Link from "next/link";
import { ArrowRight, BookOpen, ExternalLink, ListChecks, Sparkles } from "lucide-react";
import { PageContainer, Section, Stack, Cluster } from "@/components/layout";
import { Breadcrumb } from "@/components/breadcrumb";
import type { KeywordLanding } from "@/data/seo/keyword-landing";

/**
 * Shared template for SEO-001 keyword landing pages under /guides/<slug>.
 *
 * Each guide is an *information-intent* hub for one of the four target
 * keywords identified by audit SEO-001. The page funnels readers into the
 * matching tool page (chatbot / accidents-reports / plan-generator /
 * chemical-ra) while loading the H1, H2, FAQ, HowTo content with
 * keyword-matched copy and long-tail variations.
 *
 * Markup-only — content is provided by data/seo/keyword-landing.ts.
 */
export function KeywordLandingView({ data }: { data: KeywordLanding }) {
  return (
    <PageContainer width="prose" className="py-8 md:py-10">
      <Breadcrumb
        items={[
          { name: "ガイド", href: "/guides" },
          { name: data.primaryKeyword },
        ]}
      />

      <header className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
          検索意図ガイド
        </p>
        <h1 className="mt-2 text-2xl font-bold leading-snug text-slate-900 sm:text-3xl">
          {data.h1}
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-base">{data.lead}</p>
        <Cluster gap="sm" className="mt-5">
          <Link
            href={data.toolHref}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {data.toolCta}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            運営者プロフィール（労働安全コンサルタント）
          </Link>
        </Cluster>
        <p className="mt-4 text-[11px] leading-5 text-slate-500">
          公開日 {data.datePublished}　最終更新 {data.dateModified}　・
          監修：労働安全衛生コンサルタント（登録番号260022）が個人で運営する研究プロジェクト
        </p>
      </header>

      <Section
        title={
          <span className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            使い方ステップ
          </span>
        }
        description="検索で辿り着いた読者がそのまま機能を試せるよう、最小ステップで案内します。"
        spacing="default"
        className="mt-8"
      >
        <ol className="space-y-3">
          {data.steps.map((step, i) => (
            <li
              key={step.name}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 sm:text-base">{step.name}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{step.text}</p>
                  {step.url ? (
                    <Link
                      href={step.url}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      関連ページ：{step.url}
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        title={
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-sky-700" aria-hidden="true" />
            よくある質問（ロングテール）
          </span>
        }
        description="関連する周辺キーワードを Q&A 形式で解説します。各回答は条文・通達など一次資料の参照前提です。"
        spacing="default"
        className="mt-10"
      >
        <Stack gap="md">
          {data.longTail.map((qa) => (
            <article
              key={qa.query}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-base font-bold leading-snug text-slate-900 sm:text-lg">
                {qa.query}
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-700">{qa.answer}</p>
            </article>
          ))}
        </Stack>
      </Section>

      <Section
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" aria-hidden="true" />
            参照している一次資料
          </span>
        }
        description="検索意図に対する回答は、可能な限り厚労省・e-Gov・JISHA等の一次資料に紐づけて作成しています。"
        spacing="default"
        className="mt-10"
      >
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.sources.map((src) => (
            <li
              key={src.url}
              className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
            >
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-slate-800 hover:text-emerald-700"
              >
                {src.label}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
              {src.note ? (
                <p className="mt-1 text-[11px] leading-5 text-slate-500">{src.note}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="関連ページ・関連機能"
        description="本テーマを深掘りするための内部リンク（hub & spoke）"
        spacing="default"
        className="mt-10"
      >
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.related.map((rel) => (
            <li key={rel.href}>
              <Link
                href={rel.href}
                className="block rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 transition hover:border-emerald-400 hover:shadow-sm"
              >
                <p className="text-sm font-bold text-slate-900">{rel.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-700">{rel.description}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  ページを開く
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <section className="mt-10 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
          このページについて
        </p>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          本ガイドは、労働安全衛生コンサルタント（登録番号260022）が個人で運営する研究プロジェクト
          <Link href="/about" className="underline hover:text-emerald-700">
            「安全AIポータル」
          </Link>
          が、検索者の質問に最短で答えることを目的に作成した解説ページです。AIによる回答や本ガイドの記述は最新法令や個別事案の判断を保証するものではありません。具体的な判断は必ず原典（e-Gov・厚労省・所轄労働基準監督署・専門家）でご確認ください。
        </p>
        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          フィードバックは
          <Link href="/contact" className="underline hover:text-emerald-700">
            お問い合わせフォーム
          </Link>
          までお願いします。指摘事項はコミット履歴で公開PDCAの対象として反映します。
        </p>
      </section>
    </PageContainer>
  );
}
