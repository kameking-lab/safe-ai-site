import type { Metadata } from "next";
import { StrategyGate } from "@/components/strategy-gate";
import { monetizationStrategyV2 } from "@/data/strategy/monetization-v2-2026-04-26";

export const metadata: Metadata = {
  title: "月商100万円戦略 V2 | ANZEN AI 内部文書",
  description: "ANZEN AI の収益化戦略 V2（オーナー方針確定後の再議論ログ・社内限定）",
  robots: { index: false, follow: false },
};

const STRATEGY_PASSWORD = "kaneda2026";

export default function StrategyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <StrategyGate password={STRATEGY_PASSWORD} content={monetizationStrategyV2} />
      </div>
    </div>
  );
}
