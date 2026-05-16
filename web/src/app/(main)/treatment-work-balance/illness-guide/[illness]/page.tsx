import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Stethoscope, BookOpen, ScrollText, Users } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import {
  ILLNESS_CATEGORIES,
  getCategoryMeta,
  getConditionsByCategory,
} from "@/data/illness-considerations";
import type { IllnessCategory } from "@/types/illness-consideration";

export function generateStaticParams() {
  return ILLNESS_CATEGORIES.map((c) => ({ illness: c.id }));
}

export const dynamicParams = false;

type Params = Promise<{ illness: string }>;

export async function generateMetadata(
  { params }: { params: Params },
): Promise<Metadata> {
  const { illness } = await params;
  const meta = getCategoryMeta(illness as IllnessCategory);
  if (!meta) return {};

  const title = `${meta.label}と仕事の両立支援｜病態別の労務配慮ガイド`;
  const description = `${meta.label}の典型病態における労務配慮（作業内容・勤務時間・作業環境・コミュニケーション）を整理。${meta.summary}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/treatment-work-balance/illness-guide/${meta.id}`,
    },
    openGraph: {
      title,
      description,
      type: "article",
    },
  };
}

export default async function IllnessGuidePage({
  params,
}: {
  params: Params;
}) {
  const { illness } = await params;
  const meta = getCategoryMeta(illness as IllnessCategory);
  if (!meta) notFound();

  const conditions = getConditionsByCategory(meta.id);

  return (
    <PageContainer width="prose">
      <PageJsonLd
        name={`${meta.label} 両立支援ガイド`}
        description={meta.summary}
        path={`/treatment-work-balance/illness-guide/${meta.id}`}
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          {
            name: "治療と仕事の両立支援",
            url: "https://www.anzen-ai-portal.jp/treatment-work-balance",
          },
          {
            name: `${meta.label} 両立支援ガイド`,
            url: `https://www.anzen-ai-portal.jp/treatment-work-balance/illness-guide/${meta.id}`,
          },
        ]}
      />

      <PageHeader
        title={`${meta.label}と仕事の両立支援`}
        description={meta.summary}
        icon={Stethoscope}
        iconColor="emerald"
      />

      <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm leading-6 text-emerald-900">
        <p className="font-semibold">本ページの位置付け</p>
        <p className="mt-1">
          {meta.label}
          に関する一般的な労務配慮を、典型病態ごとに整理した労務管理ガイドです。
          診断・治療内容・就業可否の最終判断は主治医および産業医にご相談ください。
          本ガイドは医学的助言を行いません。
        </p>
      </section>

      {/* 重点リスク */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <BookOpen className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          重点的に確認したいリスク
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-sm leading-6 text-slate-800">
          {meta.riskHighlights.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      {/* 病態別 */}
      <section className="mt-10 space-y-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Stethoscope className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          典型病態別の労務配慮
        </h2>

        {conditions.map((c) => (
          <article
            key={c.id}
            id={c.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="text-base font-bold text-slate-900">{c.name}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-700">{c.overview}</p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ConsiderationBlock
                label="治療パターンの目安"
                items={c.treatmentPatterns}
                accent="slate"
              />
              <ConsiderationBlock
                label="作業内容の配慮"
                items={c.workConsiderations}
                accent="emerald"
              />
              <ConsiderationBlock
                label="勤務時間・休暇の配慮"
                items={c.timeConsiderations}
                accent="sky"
              />
              <ConsiderationBlock
                label="作業環境の配慮"
                items={c.environmentConsiderations}
                accent="amber"
              />
              <div className="sm:col-span-2">
                <ConsiderationBlock
                  label="本人・主治医・産業医とのコミュニケーション"
                  items={c.communicationPoints}
                  accent="violet"
                />
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* 関連法令 */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <ScrollText className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          関連法令・指針
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-sm leading-6 text-slate-800">
          {meta.relatedLaws.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </section>

      {/* 他カテゴリへの動線 */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Users className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          他カテゴリのガイド
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ILLNESS_CATEGORIES.filter((c) => c.id !== meta.id).map((c) => (
            <Link
              key={c.id}
              href={`/treatment-work-balance/illness-guide/${c.id}`}
              className="rounded-lg border border-slate-200 bg-white p-3 text-sm hover:border-emerald-300 hover:bg-emerald-50/40"
            >
              <span className="font-semibold text-slate-900">{c.label}</span>
              <span className="ml-1 text-xs text-slate-500">— {c.shortLabel}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-2xl border border-emerald-300 bg-emerald-600/95 p-5 text-white">
        <h2 className="text-base font-bold">この内容で両立支援プランを作成</h2>
        <p className="mt-1 text-sm leading-6 text-emerald-50">
          病態・職務・症状の重さを指定するだけで、配慮事項・段階的復職プラン・主治医意見書テンプレートを生成できます。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/treatment-work-balance/plan-builder"
            className="inline-flex items-center gap-1 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            プランビルダーを開く →
          </Link>
          <Link
            href="/treatment-work-balance"
            className="inline-flex items-center gap-1 rounded-lg border border-white px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            両立支援ハブに戻る
          </Link>
        </div>
      </section>

      <p className="mt-8 text-center text-xs leading-6 text-slate-500">
        最終更新：2026年5月。本ページは厚労省「事業場における治療と仕事の両立支援のためのガイドライン」（令和5年改訂）等を踏まえた労務管理上のガイドです。
        <strong className="text-slate-600">
          疾病の診断・治療・就業可否の判断は医師の専管事項です。
        </strong>
      </p>
    </PageContainer>
  );
}

type AccentName = "slate" | "emerald" | "sky" | "amber" | "violet";

const ACCENT_CLASS: Record<AccentName, string> = {
  slate: "border-slate-200 bg-slate-50",
  emerald: "border-emerald-200 bg-emerald-50/60",
  sky: "border-sky-200 bg-sky-50/60",
  amber: "border-amber-200 bg-amber-50/60",
  violet: "border-violet-200 bg-violet-50/60",
};

const ACCENT_TEXT: Record<AccentName, string> = {
  slate: "text-slate-700",
  emerald: "text-emerald-800",
  sky: "text-sky-800",
  amber: "text-amber-800",
  violet: "text-violet-800",
};

function ConsiderationBlock({
  label,
  items,
  accent,
}: {
  label: string;
  items: string[];
  accent: AccentName;
}) {
  return (
    <div className={`rounded-lg border p-3 ${ACCENT_CLASS[accent]}`}>
      <h4 className={`text-xs font-bold ${ACCENT_TEXT[accent]}`}>{label}</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-800">
        {items.map((it, idx) => (
          <li key={`${label}-${idx}`}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
