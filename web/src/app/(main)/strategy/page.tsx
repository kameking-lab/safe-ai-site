import type { Metadata } from "next";
import { StrategyGate } from "@/components/strategy-gate";
import { monetizationStrategyV3 } from "@/data/strategy/monetization-v3-2026-04-26";

import { PageJsonLd } from "@/components/page-json-ld";
export const metadata: Metadata = {
  title: "月商100万円戦略 V3 | ANZEN AI 内部文書",
  description: "ANZEN AI の収益化戦略 V3（兼業NG・全自動化前提の作戦変更議論ログ・社内限定）",
  robots: { index: false, follow: false },
};

const STRATEGY_PASSWORD = "anzenai2026";

export default function StrategyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name="月商100万円戦略 V3" description="ANZEN AI の収益化戦略 V3（兼業NG・全自動化前提の作戦変更議論ログ・社内限定）" path="/strategy" />
      <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <StrategyGate password={STRATEGY_PASSWORD} content={monetizationStrategyV3} />
      </div>
    </div>
  );
}
