import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ChevronLeft, Printer } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import {
  INDUSTRIES,
  REQUIREMENT_BADGE,
  REQUIREMENT_LABEL,
  getIndustryDescriptor,
  getIndustrySigns,
} from "@/data/safety-signs/industry-usage";
import { SIGN_CATEGORIES, getSignById } from "@/data/safety-signs";
import { SafetySignSvg } from "@/components/safety-sign-svg";
import type { IndustryId, SignCategory } from "@/types/safety-sign";

export const dynamicParams = false;

export function generateStaticParams() {
  return INDUSTRIES.map((i) => ({ industry: i.id }));
}

interface RouteParams {
  params: Promise<{ industry: string }>;
}

function asIndustry(value: string): IndustryId | null {
  return INDUSTRIES.some((i) => i.id === value) ? (value as IndustryId) : null;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { industry } = await params;
  const id = asIndustry(industry);
  if (!id) return {};
  const descriptor = getIndustryDescriptor(id);
  const entries = getIndustrySigns(id);
  const required = entries.filter((e) => e.requirement === "required").length;
  const title = `${descriptor.label}の安全衛生標識セット｜必須${required}件・全${entries.length}件`;
  const description = `${descriptor.intro} 必須・推奨・状況対応に区分した使用ガイドと、根拠法令、設置場所例を一覧化。`;
  return {
    title,
    description,
    alternates: { canonical: `/safety-signs/industry/${id}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: ogImageUrl(title, description), width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl(title, description)],
    },
  };
}

export default async function IndustryGuidePage({ params }: RouteParams) {
  const { industry } = await params;
  const id = asIndustry(industry);
  if (!id) notFound();
  const descriptor = getIndustryDescriptor(id);
  const entries = getIndustrySigns(id);

  const grouped = SIGN_CATEGORIES.map((c) => ({
    category: c,
    entries: entries.filter((e) => e.category === c.id),
  })).filter((g) => g.entries.length > 0);

  const requiredCount = entries.filter((e) => e.requirement === "required").length;
  const recommendedCount = entries.filter((e) => e.requirement === "recommended").length;
  const situationalCount = entries.filter((e) => e.requirement === "situational").length;

  return (
    <PageContainer width="prose">
      <PageJsonLd
        name={`${descriptor.label}の安全衛生標識セット`}
        description={descriptor.intro}
        path={`/safety-signs/industry/${id}`}
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          { name: "安全衛生標識", url: "https://www.anzen-ai-portal.jp/safety-signs" },
          {
            name: `業種別ガイド：${descriptor.label}`,
            url: `https://www.anzen-ai-portal.jp/safety-signs/industry/${id}`,
          },
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: `${descriptor.label}の安全衛生標識セット整備手順`,
          description: descriptor.intro,
          step: grouped.map((g, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: `${g.category.label}（${g.entries.length}件）の整備`,
            text: `${g.category.label}を${g.entries.length}件確認し、必須・推奨・状況対応の区分に応じて掲示する。`,
          })),
        }}
      />
      <PageHeader
        title={`${descriptor.icon} ${descriptor.label}の標識セット`}
        description={`必須 ${requiredCount}件・推奨 ${recommendedCount}件・状況対応 ${situationalCount}件（合計 ${entries.length}件）`}
        icon={ShieldCheck}
        iconColor="emerald"
      />

      <Link
        href="/safety-signs"
        className="mt-4 inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
      >
        <ChevronLeft className="h-3 w-3" aria-hidden="true" />
        標識データベースに戻る
      </Link>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">業種の概要</h2>
        <p className="mt-2 text-sm leading-7 text-slate-700">{descriptor.intro}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs leading-6 text-slate-700 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="font-semibold text-slate-500">運用テーマ</dt>
            <dd className="mt-0.5">{descriptor.themes.join("、")}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="font-semibold text-slate-500">主な法令</dt>
            <dd className="mt-0.5">{descriptor.statutes.join("、")}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="font-semibold text-slate-500">英語名</dt>
            <dd className="mt-0.5">{descriptor.labelEn}</dd>
          </div>
        </dl>
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <Printer className="h-3 w-3" aria-hidden="true" />
          ブラウザの印刷機能で、現場掲示用チェックリストとして印刷できます。
        </div>
      </section>

      {grouped.map((g) => (
        <section key={g.category.id} className="mt-8">
          <h2 className="text-base font-bold text-slate-900">
            {g.category.label}
            <span className="ml-2 text-xs font-semibold text-slate-500">{g.entries.length}件</span>
          </h2>
          <p className="mt-1 text-xs text-slate-500">{g.category.shapeNote}</p>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {g.entries.map((e) => {
              const sign = getSignById(e.signId);
              if (!sign) return null;
              return (
                <li
                  key={e.signId}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <SafetySignSvg sign={sign} size={56} className="shrink-0" title={sign.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/safety-signs/sign/${sign.id}`}
                        className="inline-flex min-h-[44px] items-center text-sm font-bold text-slate-900 hover:text-emerald-800 hover:underline"
                      >
                        {sign.name}
                      </Link>
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${REQUIREMENT_BADGE[e.requirement]}`}
                      >
                        {REQUIREMENT_LABEL[e.requirement]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{e.examples.join("、")}</p>
                  </div>
                  <label className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 print:flex">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-emerald-600"
                      aria-label={`${sign.name} 掲示済みチェック`}
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-base font-bold text-slate-900">他の業種ガイド</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {INDUSTRIES.filter((i) => i.id !== id).map((i) => (
            <Link
              key={i.id}
              href={`/safety-signs/industry/${i.id}`}
              className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50/40"
            >
              <span className="mr-1" aria-hidden="true">
                {i.icon}
              </span>
              {i.label}
            </Link>
          ))}
        </div>
      </section>

      <p className="mt-6 text-xs leading-6 text-slate-500">
        本リストは JIS Z 9101 / 9103 / 9104 と関係法令を踏まえた標準的な目安です。
        現場の特殊条件（夜間・防爆・粉じん環境など）に応じて、発注者が最終仕様を確認してください。
      </p>

      <p className="sr-only" aria-hidden="true">
        収録カテゴリ: {grouped.map((g) => g.category.label).join(", ")}; 規格: JIS Z 9101 / 9103 / 9104。
        Industry signature: {
          // included for parity with category enum
          (function (categories: SignCategory[]) {
            return categories.join(",");
          })(grouped.map((g) => g.category.id))
        }
      </p>
    </PageContainer>
  );
}
