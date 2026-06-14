import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ChevronLeft } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
import {
  SIGN_CATEGORIES,
  getCategoryDescriptor,
  getSignsByCategory,
} from "@/data/safety-signs";
import { SafetySignSvg } from "@/components/safety-sign-svg";
import type { SignCategory } from "@/types/safety-sign";

export const dynamicParams = false;

export function generateStaticParams() {
  return SIGN_CATEGORIES.map((c) => ({ category: c.id }));
}

interface RouteParams {
  params: Promise<{ category: string }>;
}

function asCategory(value: string): SignCategory | null {
  return SIGN_CATEGORIES.some((c) => c.id === value)
    ? (value as SignCategory)
    : null;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { category } = await params;
  const id = asCategory(category);
  if (!id) return {};
  const descriptor = getCategoryDescriptor(id);
  const count = getSignsByCategory(id).length;
  const title = `${descriptor.label}（${count}件）｜安全衛生標識データベース`;
  const description = `${descriptor.description} 設置位置・関連法令・業種別の使用ガイドを ${count} 件まとめて掲載。${descriptor.reference}に基づく整理です。`;
  return {
    title,
    description,
    alternates: { canonical: `/safety-signs/category/${id}` },
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

const ACCENT_HEADER: Record<string, "emerald" | "amber" | "blue" | "red"> = {
  red: "red",
  amber: "amber",
  blue: "blue",
  emerald: "emerald",
};

export default async function CategoryPage({ params }: RouteParams) {
  const { category } = await params;
  const id = asCategory(category);
  if (!id) notFound();
  const descriptor = getCategoryDescriptor(id);
  const signs = getSignsByCategory(id);
  const title = `${descriptor.label}（${signs.length}件）`;

  return (
    <PageContainer width="prose">
      <PageJsonLd
        name={`${descriptor.label}｜安全衛生標識データベース`}
        description={descriptor.description}
        path={`/safety-signs/category/${id}`}
        breadcrumbs={[
          { name: "ホーム", url: "https://www.anzen-ai-portal.jp" },
          { name: "安全衛生標識", url: "https://www.anzen-ai-portal.jp/safety-signs" },
          { name: descriptor.label, url: `https://www.anzen-ai-portal.jp/safety-signs/category/${id}` },
        ]}
      />
      <PageHeader
        title={title}
        description={`${descriptor.shapeNote}・${descriptor.reference}`}
        icon={ShieldCheck}
        iconColor={ACCENT_HEADER[descriptor.accent]}
      />

      <p className="mt-4 text-sm leading-6 text-slate-700">{descriptor.description}</p>

      <Link
        href="/safety-signs"
        className="mt-4 inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
      >
        <ChevronLeft className="h-3 w-3" aria-hidden="true" />
        標識データベースに戻る
      </Link>

      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {signs.map((sign) => (
          <Link
            key={sign.id}
            href={`/safety-signs/sign/${sign.id}`}
            className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/30"
          >
            <SafetySignSvg sign={sign} size={64} className="shrink-0" title={sign.name} />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-slate-900 group-hover:text-emerald-800">
                {sign.name}
              </h2>
              <p className="mt-0.5 text-[10px] text-slate-500">{sign.nameEn}</p>
              <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-600">{sign.meaning}</p>
            </div>
          </Link>
        ))}
      </section>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-base font-bold text-slate-900">運用のヒント</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-800">
          <li>{descriptor.shapeNote}は遠目でもカテゴリを判別する手がかりです。複数の標識を一列に並べる場合は同一形状でまとめると視認性が上がります。</li>
          <li>表示寸法は JIS Z 9104 の視認距離係数（A4 ≒ 5m、A3 ≒ 10m、B2 ≒ 25m）を目安に選定してください。</li>
          <li>屋外掲示では反射材または内照式とし、照度が確保できない場所では蓄光式併用が望まれます。</li>
        </ul>
      </section>
    </PageContainer>
  );
}
