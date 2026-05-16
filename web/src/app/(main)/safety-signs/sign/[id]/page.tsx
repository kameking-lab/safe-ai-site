import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ChevronLeft, ScrollText, MapPin, Building2 } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import {
  SAFETY_SIGNS,
  getCategoryDescriptor,
  getSignById,
} from "@/data/safety-signs";
import {
  INDUSTRIES,
  REQUIREMENT_BADGE,
  REQUIREMENT_LABEL,
  getIndustryDescriptor,
} from "@/data/safety-signs/industry-usage";
import { SafetySignSvg } from "@/components/safety-sign-svg";

export const dynamicParams = false;

export function generateStaticParams() {
  return SAFETY_SIGNS.map((s) => ({ id: s.id }));
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { id } = await params;
  const sign = getSignById(id);
  if (!sign) return {};
  const category = getCategoryDescriptor(sign.category);
  const title = `${sign.name}｜${category.label}・JIS Z 9101`;
  const description = `${sign.meaning} ${sign.usageGuide}`;
  return {
    title,
    description,
    alternates: { canonical: `/safety-signs/sign/${sign.id}` },
    openGraph: {
      title,
      description,
      type: "article",
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

const HEADER_ACCENT: Record<string, "emerald" | "amber" | "blue" | "red"> = {
  red: "red",
  amber: "amber",
  blue: "blue",
  emerald: "emerald",
};

export default async function SignDetailPage({ params }: RouteParams) {
  const { id } = await params;
  const sign = getSignById(id);
  if (!sign) notFound();
  const category = getCategoryDescriptor(sign.category);

  return (
    <PageContainer width="prose">
      <PageJsonLd
        name={`${sign.name}｜${category.label}`}
        description={sign.meaning}
        path={`/safety-signs/sign/${sign.id}`}
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          { name: "安全衛生標識", url: "https://www.anzen-ai-portal.jp/safety-signs" },
          {
            name: category.label,
            url: `https://www.anzen-ai-portal.jp/safety-signs/category/${category.id}`,
          },
          { name: sign.name, url: `https://www.anzen-ai-portal.jp/safety-signs/sign/${sign.id}` },
        ]}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "DefinedTerm",
          name: sign.name,
          alternateName: sign.nameEn,
          description: sign.meaning,
          inDefinedTermSet: {
            "@type": "DefinedTermSet",
            name: "JIS Z 9101 安全標識",
          },
          identifier: sign.id,
          url: `https://www.anzen-ai-portal.jp/safety-signs/sign/${sign.id}`,
        }}
      />
      <PageHeader
        title={sign.name}
        description={`${category.label}・${sign.nameEn}`}
        icon={ShieldCheck}
        iconColor={HEADER_ACCENT[category.accent]}
      />

      <Link
        href={`/safety-signs/category/${category.id}`}
        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
      >
        <ChevronLeft className="h-3 w-3" aria-hidden="true" />
        {category.label}に戻る
      </Link>

      <section className="mt-6 flex flex-col items-start gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row">
        <SafetySignSvg sign={sign} size={144} className="shrink-0" title={sign.name} />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-slate-900">意味</h2>
          <p className="mt-1 text-sm leading-7 text-slate-700">{sign.meaning}</p>
          <h3 className="mt-4 text-base font-bold text-slate-900">使用場面</h3>
          <p className="mt-1 text-sm leading-7 text-slate-700">{sign.usageGuide}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600">
            <div>
              <dt className="font-semibold text-slate-500">形状</dt>
              <dd>{category.shapeNote}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">主色</dt>
              <dd>{labelForColor(sign.primaryColor)}（JIS Z 9103）</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">図記号色</dt>
              <dd>{labelForColor(sign.contrastColor)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">分類</dt>
              <dd>{category.label}（{category.labelEn}）</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <MapPin className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          設置位置ガイド
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          推奨高さ：床上 {sign.placement.heightMm.min.toLocaleString()}〜
          {sign.placement.heightMm.max.toLocaleString()} mm
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-800">
          {sign.placement.locations.map((loc) => (
            <li key={loc}>{loc}</li>
          ))}
        </ul>
        {sign.placement.notes ? (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-700">
            {sign.placement.notes}
          </p>
        ) : null}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <ScrollText className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          関連法令・規則
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-800">
          {sign.relatedLaws.map((law) => (
            <li
              key={`${law.statute}-${law.article ?? ""}`}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <p className="font-semibold text-slate-900">
                {law.statute}
                {law.article ? <span className="ml-1 text-slate-600">{law.article}</span> : null}
              </p>
              <p className="mt-1 text-xs leading-6 text-slate-700">{law.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Building2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          業種別の使用例
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          各業種で必須・推奨される標識かを整理しています。「必須」は法令または JIS で明示的に要求される運用、「推奨」は事故防止のための標準実務、「状況対応」はリスク有無に応じて判断する位置付けです。
        </p>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-800">
          {sign.industryUsage.map((u) => {
            const ind = getIndustryDescriptor(u.industry);
            return (
              <li
                key={u.industry}
                className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-2 sm:min-w-[160px]">
                  <span aria-hidden="true">{ind.icon}</span>
                  <Link
                    href={`/safety-signs/industry/${u.industry}`}
                    className="font-semibold text-slate-900 hover:text-emerald-800 hover:underline"
                  >
                    {ind.label}
                  </Link>
                </div>
                <span
                  className={`inline-block w-fit rounded-full border px-2 py-0.5 text-[10px] font-bold ${REQUIREMENT_BADGE[u.requirement]}`}
                >
                  {REQUIREMENT_LABEL[u.requirement]}
                </span>
                <p className="text-xs leading-6 text-slate-700">{u.examples.join("、")}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-base font-bold text-slate-900">参考規格</h2>
        <ul className="mt-3 space-y-1 text-sm leading-6 text-slate-700">
          {sign.references.map((r) => (
            <li key={`${r.standard}-${r.code ?? ""}`}>
              <span className="font-semibold text-slate-900">{r.standard}</span>
              {r.code ? <span className="ml-1 text-slate-600">（{r.code}）</span> : null}
              {r.note ? <span className="ml-1 text-slate-600">— {r.note}</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-bold text-slate-900">業種別ガイドへ</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {INDUSTRIES.map((ind) => (
            <Link
              key={ind.id}
              href={`/safety-signs/industry/${ind.id}`}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50/40"
            >
              <span className="mr-1" aria-hidden="true">
                {ind.icon}
              </span>
              {ind.label}
            </Link>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}

function labelForColor(c: string): string {
  switch (c) {
    case "red":
      return "赤 7.5R 4/15";
    case "yellow":
      return "黄 2.5Y 8/14";
    case "blue":
      return "青 2.5PB 3.5/10";
    case "green":
      return "緑 10G 4/10";
    case "white":
      return "白 N9.5";
    case "black":
      return "黒 N1";
    default:
      return c;
  }
}
