import type { Metadata } from "next";
import { StrategyGate } from "@/components/strategy-gate";
import { monetizationStrategyV3 } from "@/data/strategy/monetization-v3-2026-04-26";
import { SimpleMarkdown } from "@/components/simple-markdown";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";

export const metadata: Metadata = {
  alternates: { canonical: "/strategy" },
  title: "月商100万円戦略 V3 内部文書",
  description: "安全AIポータル の収益化戦略 V3（兼業NG・全自動化前提の作戦変更議論ログ・社内限定）",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ key?: string }>;
}

export default async function StrategyPage({ searchParams }: Props) {
  const { key } = await searchParams;
  const expected = process.env.STRATEGY_AUTH_PASSWORD;
  // Deny access if env var is not configured or key doesn't match
  const authenticated = Boolean(expected && key === expected);

  return (
    <div className="min-h-screen bg-slate-50">
      <PageJsonLd name="月商100万円戦略 V3" description="安全AIポータル の収益化戦略 V3（兼業NG・全自動化前提の作戦変更議論ログ・社内限定）" path="/strategy" />
      <PageContainer width="narrow" className="py-8 md:py-12">
        {authenticated ? (
          <article className="prose prose-slate max-w-none">
            <SimpleMarkdown content={monetizationStrategyV3} className="text-slate-800" />
            <div className="mt-12 border-t border-slate-200 pt-6">
              <a
                href="/strategy"
                className="text-xs text-slate-500 underline hover:text-slate-700"
              >
                ロックする
              </a>
            </div>
          </article>
        ) : (
          <StrategyGate hasKeyAttempt={Boolean(key)} />
        )}
      </PageContainer>
    </div>
  );
}
