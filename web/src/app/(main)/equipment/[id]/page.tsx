import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { JsonLd, breadcrumbSchema } from "@/components/json-ld";
import { AffiliateLink } from "@/components/affiliate-link";
import { mhlwNotices, type MhlwNotice } from "@/data/mhlw-notices";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import {
  getAllEquipment,
  getEquipmentById,
  relatedInCategory,
  type EquipmentItem,
} from "@/lib/equipment-recommendation";
import { ogImageUrl } from "@/lib/og-url";
import type { AccidentCase } from "@/lib/types/domain";

const SITE_BASE = "https://safe-ai-site.vercel.app";
const TODAY_ISO = new Date().toISOString().slice(0, 10);

export function generateStaticParams() {
  return getAllEquipment().map((it) => ({ id: it.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = getEquipmentById(id);
  if (!item) return {};
  const title = `${item.name}｜保護具AIファインダー`;
  const description = `${item.categoryName}・${item.spec}。${item.recommendReason ?? ""} 価格帯 ${item.priceLabel}。関連通達・事故事例・購入リンクをまとめて確認。`;
  return {
    title,
    description,
    alternates: { canonical: `/equipment/${id}` },
    openGraph: {
      title: `${item.name}｜ANZEN AI`,
      description,
      images: [
        {
          url: ogImageUrl(item.name, item.categoryName),
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: { card: "summary_large_image", images: [ogImageUrl(item.name)] },
  };
}

function tokenizeJa(text: string): string[] {
  return (text.match(/[一-龥ぁ-んァ-ヶa-zA-Z0-9]{2,}/g) ?? []).filter((t) => t.length >= 2);
}

function pickRelatedNotices(item: EquipmentItem): MhlwNotice[] {
  const tokens = new Set<string>([
    ...tokenizeJa(item.name),
    ...tokenizeJa(item.spec),
    ...(item.regulations ?? []).flatMap((r) => tokenizeJa(r)),
    ...item.hazards,
  ]);
  const scored = mhlwNotices.map((n) => {
    const haystack = `${n.title} ${n.category} ${n.lawRef ?? ""}`;
    let score = 0;
    tokens.forEach((t) => {
      if (haystack.includes(t)) score += 1;
    });
    // ハザード×カテゴリの重み付け
    if (item.hazards.includes("heat") && n.category === "heat-stroke") score += 3;
    if (item.hazards.includes("chemical") && (n.title.includes("化学") || n.title.includes("特化") || n.title.includes("有機"))) score += 2;
    if (item.hazards.includes("fall") && (n.title.includes("墜落") || n.title.includes("足場") || n.title.includes("ハーネス"))) score += 3;
    return { n, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored
    .filter((s) => s.score > 0)
    .slice(0, 3)
    .map((s) => s.n);
}

function pickRelatedAccidents(item: EquipmentItem, all: AccidentCase[]): AccidentCase[] {
  const tokens = new Set<string>([
    ...tokenizeJa(item.name),
    ...tokenizeJa(item.spec),
    ...item.hazards,
  ]);
  const scored = all.map((c) => {
    const haystack = `${c.title} ${c.summary} ${c.workCategory} ${c.type} ${(c.mainCauses ?? []).join(" ")}`;
    let score = 0;
    tokens.forEach((t) => {
      if (haystack.includes(t)) score += 1;
    });
    if (item.hazards.includes("fall") && (c.type === "墜落" || haystack.includes("墜落"))) score += 3;
    if (item.hazards.includes("heat") && haystack.includes("熱中症")) score += 3;
    if (item.hazards.includes("chemical") && (haystack.includes("化学") || haystack.includes("中毒"))) score += 2;
    if (item.hazards.includes("noise") && haystack.includes("騒音")) score += 2;
    return { c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored
    .filter((s) => s.score > 0)
    .slice(0, 3)
    .map((s) => s.c);
}

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = getEquipmentById(id);
  if (!item) notFound();

  const related = relatedInCategory(item.id, 3);
  const relatedNotices = pickRelatedNotices(item);
  const relatedAccidents = pickRelatedAccidents(item, getAccidentCasesDataset());
  const url = `${SITE_BASE}/equipment/${item.id}`;
  const avgPrice = Math.round((item.priceMin + item.priceMax) / 2);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.name,
    description: `${item.categoryName} / ${item.spec}. ${item.recommendReason ?? ""}`,
    category: item.categoryName,
    ...(item.maker ? { brand: { "@type": "Brand", name: item.maker } } : {}),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "JPY",
      lowPrice: item.priceMin,
      highPrice: item.priceMax,
      offerCount: 2,
      availability: "https://schema.org/InStock",
    },
    ...(typeof item.rating === "number"
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: item.rating,
            reviewCount: item.reviewCount ?? 1,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <JsonLd
        schema={[
          productSchema,
          breadcrumbSchema([
            { name: "ホーム", url: SITE_BASE },
            { name: "保護具AIファインダー", url: `${SITE_BASE}/equipment-finder` },
            { name: item.name, url },
          ]),
        ]}
      />

      <nav className="mb-5 flex items-center gap-1.5 text-xs text-slate-500">
        <Link
          href="/equipment-finder"
          className="flex items-center gap-1 hover:text-emerald-600 transition-colors"
        >
          <ChevronLeft className="h-3 w-3" />
          保護具AIファインダー
        </Link>
        <span>/</span>
        <span className="text-slate-700 line-clamp-1">{item.name}</span>
      </nav>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xl" aria-hidden="true">
            {item.categoryIcon}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-700">
            {item.categoryName}
          </span>
          {item.maker ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
              {item.maker}
            </span>
          ) : null}
        </div>
        <h1 className="mt-3 text-xl font-bold leading-snug text-slate-900 sm:text-2xl">
          {item.name}
        </h1>
        <dl className="mt-3 grid grid-cols-1 gap-1 text-xs text-slate-600 sm:grid-cols-2">
          <div>
            <dt className="inline font-bold text-slate-700">仕様: </dt>
            <dd className="inline">{item.spec}</dd>
          </div>
          <div>
            <dt className="inline font-bold text-slate-700">価格帯: </dt>
            <dd className="inline">{item.priceLabel}</dd>
          </div>
          {typeof item.rating === "number" ? (
            <div>
              <dt className="inline font-bold text-slate-700">評価: </dt>
              <dd className="inline">
                ★ {item.rating.toFixed(1)}（参考値・{item.reviewCount?.toLocaleString() ?? "—"}件）
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="inline font-bold text-slate-700">最終確認日: </dt>
            <dd className="inline">{TODAY_ISO}</dd>
          </div>
        </dl>
      </header>

      {item.recommendReason ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
          <h2 className="text-sm font-bold text-emerald-900">💡 推奨理由</h2>
          <p className="mt-2 text-sm leading-7 text-slate-800">{item.recommendReason}</p>
        </section>
      ) : null}

      {/* 購入リンク */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">🛒 購入リンク</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          ※ もしもアフィリエイト経由のプレースホルダーリンクです。発生報酬は研究プロジェクト運営費に充てます。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <AffiliateLink
            href={item.affiliate.amazonUrl}
            productId={item.id}
            productName={item.name}
            network="amazon"
            page={`/equipment/${item.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600"
          >
            Amazonで見る
            <ExternalLink className="h-3 w-3" />
          </AffiliateLink>
          <AffiliateLink
            href={item.affiliate.rakutenUrl}
            productId={item.id}
            productName={item.name}
            network="rakuten"
            page={`/equipment/${item.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-4 py-2 text-xs font-bold text-white hover:bg-rose-600"
          >
            楽天で見る
            <ExternalLink className="h-3 w-3" />
          </AffiliateLink>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">
          参考平均価格 ¥{avgPrice.toLocaleString()}（メーカー希望小売・市場実勢の中央値ベース）
        </p>
      </section>

      {/* 関連通達 */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">📜 関連する厚労省通達・告示</h2>
        {item.regulations && item.regulations.length > 0 ? (
          <ul className="mt-2 list-disc pl-4 text-[12px] leading-6 text-slate-700">
            {item.regulations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        ) : null}
        {relatedNotices.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">関連通達は見つかりませんでした。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {relatedNotices.map((n) => (
              <li key={n.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <Link href={`/circulars/${n.id}`} className="text-xs font-semibold text-emerald-800 hover:underline">
                  {n.title}
                </Link>
                <p className="mt-1 text-[11px] text-slate-600">
                  {n.noticeNumber ?? ""} ／ {n.issuer ?? ""} ／ {n.issuedDateRaw ?? n.issuedDate ?? ""}
                </p>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/circulars"
          className="mt-3 inline-block text-xs font-bold text-emerald-700 hover:underline"
        >
          通達一覧を開く →
        </Link>
      </section>

      {/* 関連事故事例 */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">⚠️ 関連する事故事例</h2>
        {relatedAccidents.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">関連事例は見つかりませんでした。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {relatedAccidents.map((c) => (
              <li key={c.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    {c.workCategory}
                  </span>
                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                    {c.severity}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-900">{c.title}</p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-600">{c.summary}</p>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/accidents"
          className="mt-3 inline-block text-xs font-bold text-emerald-700 hover:underline"
        >
          事故DBを開く →
        </Link>
      </section>

      {/* 同カテゴリ他商品 */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">🛡 同カテゴリの他商品</h2>
        {related.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">他の商品は見つかりませんでした。</p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {related.map((g) => (
              <li key={g.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-[10px] font-bold text-slate-500">
                  {g.categoryIcon} {g.categoryName}
                </p>
                <Link href={`/equipment/${g.id}`} className="mt-1 block text-xs font-semibold text-slate-900 hover:underline">
                  {g.name}
                </Link>
                <p className="mt-1 text-[11px] text-emerald-700">{g.priceLabel}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[11px] leading-5 text-slate-600">
        <p>
          ※ 本ページの商品情報はテンプレートベースのデモデータです。実際の購入・選定にあたっては、必ず最新のメーカー仕様書・JIS規格・国家検定品リストを確認してください。
        </p>
        <p className="mt-1">
          最終確認日: <strong>{TODAY_ISO}</strong>
        </p>
      </footer>
    </main>
  );
}
