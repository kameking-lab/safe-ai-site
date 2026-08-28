"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  FlaskConical,
  LayoutGrid,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import {
  FEATURE_PORTFOLIO,
  FEATURE_SEARCH_GROUP_LABELS,
  FEATURE_STATUS_LABELS,
  FEATURE_TIER_LABELS,
  type FeatureTier,
} from "@/config/feature-portfolio";
import { Mascot } from "@/components/mascot";

type VisibleTier = 1 | 2 | 3;
type TierFilter = "all" | VisibleTier;

const TIER_SUMMARY: Record<
  VisibleTier,
  { title: string; description: string; icon: typeof ShieldCheck }
> = {
  1: {
    title: "主力機能",
    description: "情報収集・公式データ・教育を中心に、日常利用する入口です。",
    icon: ShieldCheck,
  },
  2: {
    title: "実務支援",
    description: "主力機能から使う、帳票・印刷・検索などの補助ツールです。",
    icon: Wrench,
  },
  3: {
    title: "自動化サンプル",
    description: "本番サービスと区別した、業務改善の試作・モデルケースです。",
    icon: FlaskConical,
  },
};

const VISIBLE_FEATURES = FEATURE_PORTFOLIO.filter(
  (feature) => feature.tier !== 4 && feature.searchable,
);

export function FeaturesIndexClient() {
  const [activeTier, setActiveTier] = useState<TierFilter>("all");
  const filtered = useMemo(
    () =>
      activeTier === "all"
        ? VISIBLE_FEATURES
        : VISIBLE_FEATURES.filter((feature) => feature.tier === activeTier),
    [activeTier],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      <header className="portal-surface-emphasis grid gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_13rem] lg:items-center">
        <div>
          <p className="portal-section-kicker">FEATURE PORTFOLIO</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-brand-secondary sm:text-4xl dark:text-white">
            目的と運用状態から機能を選ぶ
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-portal-muted sm:text-base">
            主力、実務支援、自動化サンプルを分けて表示します。出典・対象時点・確認状態を見てから利用してください。
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/search" className="portal-button-primary">
              <Search className="h-4 w-4" aria-hidden="true" />
              横断検索する
            </Link>
            <Link href="/automation-examples" className="portal-button-secondary">
              Safety Labsを見る
            </Link>
          </div>
          <nav
            aria-label="研修・実務ツール"
            className="mt-2 flex flex-wrap gap-x-4"
          >
            <Link
              href="/training/safety-seminars"
              className="inline-flex min-h-11 items-center text-sm font-black text-brand-primary underline underline-offset-4"
            >
              安全研修
            </Link>
            <Link
              href="/training/ai-seminars"
              className="inline-flex min-h-11 items-center text-sm font-black text-brand-primary underline underline-offset-4"
            >
              AI実務研修
            </Link>
            <Link
              href="/tools/construction-calculators"
              className="inline-flex min-h-11 items-center text-sm font-black text-brand-primary underline underline-offset-4"
            >
              建設計算ツール
            </Link>
            <Link
              href="/materials/safety-images"
              className="inline-flex min-h-11 items-center text-sm font-black text-brand-primary underline underline-offset-4"
            >
              現場安全看板
            </Link>
          </nav>
        </div>
        <div className="flex items-end justify-center">
          <Mascot
            variant="pointing"
            size="xl"
            alt="機能の選び方を案内するチワワ"
          />
        </div>
      </header>

      <section aria-labelledby="tier-guide-heading" className="mt-7">
        <h2 id="tier-guide-heading" className="sr-only">
          機能区分
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {([1, 2, 3] as const).map((tier) => {
            const summary = TIER_SUMMARY[tier];
            const Icon = summary.icon;
            const count = VISIBLE_FEATURES.filter(
              (feature) => feature.tier === tier,
            ).length;
            return (
              <button
                key={tier}
                type="button"
                onClick={() => setActiveTier(tier)}
                aria-pressed={activeTier === tier}
                className="portal-surface min-h-28 p-4 text-left aria-pressed:border-brand-primary aria-pressed:bg-portal-surface-emphasis"
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-brand-primary" aria-hidden="true" />
                  <strong className="text-brand-secondary dark:text-white">
                    Tier {tier}：{summary.title}
                  </strong>
                  <span className="portal-status ml-auto">{count}件</span>
                </span>
                <span className="mt-2 block text-sm leading-6 text-portal-muted">
                  {summary.description}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTier("all")}
            aria-pressed={activeTier === "all"}
            className="portal-button-secondary min-h-11 items-center aria-pressed:border-brand-primary aria-pressed:bg-portal-surface-emphasis"
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            すべて（{VISIBLE_FEATURES.length}）
          </button>
          {([1, 2, 3] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setActiveTier(tier)}
              aria-pressed={activeTier === tier}
              className="portal-button-secondary min-h-11 items-center aria-pressed:border-brand-primary aria-pressed:bg-portal-surface-emphasis"
            >
              Tier {tier}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="feature-list-heading" className="mt-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="portal-section-kicker">
              {activeTier === "all"
                ? "ALL AVAILABLE"
                : FEATURE_TIER_LABELS[activeTier as FeatureTier]}
            </p>
            <h2
              id="feature-list-heading"
              className="mt-1 text-2xl font-black text-brand-secondary dark:text-white"
            >
              利用できる入口
            </h2>
          </div>
          <p role="status" className="text-sm font-bold text-portal-muted">
            {filtered.length}件を表示
          </p>
        </div>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((feature) => (
            <li
              key={feature.id}
              data-feature-tier={feature.tier}
              data-feature-role={feature.role}
              className="portal-feature-tile flex min-w-0 flex-col"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="portal-status">Tier {feature.tier}</span>
                <span className="portal-status">
                  {FEATURE_SEARCH_GROUP_LABELS[feature.searchGroup]}
                </span>
                {feature.tier === 3 ? (
                  <span className="portal-status border-semantic-ai text-semantic-ai">
                    サンプル
                  </span>
                ) : null}
              </div>
              <h3 className="mt-3 text-lg font-black text-brand-secondary dark:text-white">
                {feature.label}
              </h3>
              <p className="mt-1 flex-1 text-sm leading-6 text-portal-muted">
                {feature.userValue}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-portal-muted">
                <span>{FEATURE_STATUS_LABELS[feature.operationalStatus]}</span>
                <span>{feature.indexability === "index" ? "公開ページ" : "制限あり"}</span>
              </div>
              <Link
                href={feature.route}
                className="mt-4 inline-flex min-h-11 items-center gap-2 font-black text-brand-primary underline decoration-2 underline-offset-4"
              >
                {feature.tier === 3 ? "サンプルを確認" : "機能を開く"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <details className="portal-surface mt-8 p-4">
        <summary className="min-h-11 cursor-pointer py-2 font-black text-brand-secondary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25 dark:text-white">
          統合・非表示中の機能について
        </summary>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-portal-muted">
          重複、未完成、再検証中の機能はTier 4として主力導線から外しています。既存URLは被リンクやブックマークを考慮し、統合・noindex・隔離・リダイレクトを個別に選びます。
        </p>
      </details>
    </div>
  );
}
