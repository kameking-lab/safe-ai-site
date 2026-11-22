import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { WorkplaceShare } from "@/components/workplace-share";
import { PUBLIC_VISUAL_KY_SCENARIOS } from "@/data/visual-ky";
import { getVisualKyCanonicalPath } from "@/lib/visual-ky/share";
import { workplaceShareUrl } from "@/lib/workplace-share";

const PATH = "/morning-briefing";
const TITLE = "朝礼ネタ";
const DESCRIPTION = "作業前の安全朝礼で使える問いかけと確認ポイント。テーマごとに関連する一次資料を確認できます。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
};

export default function MorningBriefingPage() {
  return (
    <PageContainer width="prose" className="pb-12">
      <PageJsonLd name={TITLE} description={DESCRIPTION} path={PATH} />
      <header className="mb-6">
        <h1 className="text-3xl font-black tracking-tight">{TITLE}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{DESCRIPTION}</p>
      </header>
      <div className="space-y-4">
        {PUBLIC_VISUAL_KY_SCENARIOS.map((scenario) => {
          const { openingQuestion, summary } = scenario.facilitator;
          const sources = scenario.officialSources;
          return (
            <article
              key={scenario.id}
              id={scenario.slug}
              className="scroll-mt-24 rounded-2xl border border-border bg-card p-4 target:border-emerald-600 sm:p-6"
            >
              <h2 className="text-xl font-bold">{scenario.shortTitle}</h2>
              <p className="mt-3 text-sm font-bold leading-6">{openingQuestion}</p>
              <p className="mt-2 text-sm leading-6">{summary}</p>
              <ul aria-label="出典" className="mt-3 space-y-1">
                {sources.map((source) => (
                  <li key={source.id}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center text-sm text-brand-primary underline underline-offset-4"
                    >
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-3 border-t border-border pt-3">
                <WorkplaceShare
                  kind="morning"
                  title={`朝礼ネタ：${scenario.shortTitle}`}
                  summary={[openingQuestion, summary, ...sources.map((source) => `出典（${source.organization}）：${source.url}`)].join("\n")}
                  url={workplaceShareUrl(PATH, scenario.slug)}
                />
                <Link
                  href={getVisualKyCanonicalPath(scenario)}
                  className="inline-flex min-h-11 items-center text-sm text-brand-primary underline underline-offset-4"
                >
                  このテーマのKYTを見る
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </PageContainer>
  );
}
