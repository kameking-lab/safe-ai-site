"use client";

/**
 * P0-005 (usability-audit-2026-05-24): 業種別事故レポートに
 * 「直近7日 / 直近30日 / 全期間」タブを追加するクライアントコンポーネント。
 *
 * 設計判断:
 * - デフォルトタブは「全期間」(社長指示通り)。職長想定で「直近7日」も
 *   ボタン横にラベル明示で選びやすくする。
 * - 該当期間に curated データが無い場合は「該当期間の事例はありません」を
 *   表示し、別タブへ誘導する。curated は厚労省死亡災害DB抜粋中心で
 *   日単位の連続性が弱いため、空表示は誠実な現状開示として残す。
 * - SSR で 3 群すべて受け取る前提なので、クライアントの再フェッチや
 *   recharts のような重いライブラリ依存は無い。
 */

import { useState } from "react";
import Link from "next/link";
import { Calendar, AlertTriangle } from "lucide-react";
import type { AccidentCase } from "@/lib/types/domain";
import { Section } from "@/components/layout/section";
import { Stack, Cluster } from "@/components/layout/stack";
import { CardGrid } from "@/components/layout/card-grid";

const SEVERITY_TONE: Record<AccidentCase["severity"], string> = {
  軽傷: "bg-emerald-100 text-emerald-800 border-emerald-200",
  中等傷: "bg-amber-100 text-amber-800 border-amber-200",
  重傷: "bg-orange-100 text-orange-900 border-orange-300",
  死亡: "bg-rose-100 text-rose-900 border-rose-300",
};

type TabKey = "all" | "d30" | "d7";

const TAB_DEFS: { key: TabKey; label: string; shortLabel: string }[] = [
  // 監査の社長指示: デフォルトは「全期間」、職長向けに「直近7日」もボタン横に。
  { key: "all", label: "全期間", shortLabel: "全期間" },
  { key: "d30", label: "直近30日", shortLabel: "30日" },
  { key: "d7", label: "直近7日", shortLabel: "7日" },
];

function TopCaseCard({ accident }: { accident: AccidentCase }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <Cluster gap="xs" className="text-xs">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 ${SEVERITY_TONE[accident.severity]}`}
        >
          {accident.severity}
        </span>
        <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <Calendar className="h-3 w-3" aria-hidden="true" />
          {accident.occurredOn || "日付不明"}
        </span>
        <span className="text-slate-500 dark:text-slate-400">・{accident.type}</span>
      </Cluster>
      <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-slate-100">
        <Link
          href={`/accidents/${accident.id}`}
          className="hover:text-emerald-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {accident.title}
        </Link>
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {accident.summary}
      </p>
      {accident.mainCauses.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">主な原因</p>
          <ul className="mt-1 ml-4 list-disc text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            {accident.mainCauses.slice(0, 3).map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

export type TopCasesTabsProps = {
  textColorClass: string;
  allTimeCases: AccidentCase[];
  recent30Cases: AccidentCase[];
  recent7Cases: AccidentCase[];
};

export function TopCasesTabs({
  textColorClass,
  allTimeCases,
  recent30Cases,
  recent7Cases,
}: TopCasesTabsProps) {
  const [tab, setTab] = useState<TabKey>("all");

  const groups: Record<TabKey, AccidentCase[]> = {
    all: allTimeCases,
    d30: recent30Cases,
    d7: recent7Cases,
  };

  const counts: Record<TabKey, number> = {
    all: allTimeCases.length,
    d30: recent30Cases.length,
    d7: recent7Cases.length,
  };

  const active = groups[tab];
  const activeDef = TAB_DEFS.find((t) => t.key === tab) ?? TAB_DEFS[0];

  return (
    <Section
      title={
        <Cluster gap="xs">
          <AlertTriangle className={`h-4 w-4 ${textColorClass}`} aria-hidden="true" />
          <span>重大事故 — {activeDef.label}（{active.length}件）</span>
        </Cluster>
      }
      description="重傷・死亡を中心に curated 事例から代表的なケースを抽出。タブで対象期間を切り替えできます。詳細ページで再発防止策・関連法令を確認できます。"
      spacing="default"
      className="mt-8"
    >
      <Stack gap="md">
        <div
          role="tablist"
          aria-label="重大事故の表示期間"
          className="flex flex-wrap gap-2 print:hidden"
        >
          {TAB_DEFS.map((def) => {
            const isActive = def.key === tab;
            return (
              <button
                key={def.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(def.key)}
                className={
                  isActive
                    ? "rounded-full border border-emerald-600 bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm"
                    : "rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                }
              >
                {def.label}
                <span
                  className={
                    isActive
                      ? "ml-2 inline-flex min-w-[1.5rem] justify-center rounded-full bg-white/20 px-1.5 text-[11px] font-semibold"
                      : "ml-2 inline-flex min-w-[1.5rem] justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }
                >
                  {counts[def.key]}
                </span>
              </button>
            );
          })}
        </div>

        {active.length > 0 ? (
          <CardGrid cols={2} gap="md">
            {active.map((c) => (
              <TopCaseCard key={c.id} accident={c} />
            ))}
          </CardGrid>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
            <p className="font-semibold">
              {activeDef.label}に該当する重大事故事例はありません
            </p>
            <p className="mt-1 text-xs leading-5">
              本サイトの curated 事例は厚労省 死亡災害DB 抜粋を中心に整備しており、{" "}
              {activeDef.label}に発生・公表された事例が登録されていない場合があります。
              「全期間」タブで業種全体の代表例をご確認ください。
            </p>
          </div>
        )}

        {/* 印刷時は全期間のみ出す。タブUIが消えるので必ず全期間表示にフォールバック */}
        <div className="hidden print:block">
          {allTimeCases.length > 0 && (
            <>
              <p className="mb-2 text-sm font-semibold">重大事故 Top {allTimeCases.length}（印刷版・全期間）</p>
              <CardGrid cols={2} gap="md">
                {allTimeCases.map((c) => (
                  <TopCaseCard key={c.id} accident={c} />
                ))}
              </CardGrid>
            </>
          )}
        </div>
      </Stack>
    </Section>
  );
}
