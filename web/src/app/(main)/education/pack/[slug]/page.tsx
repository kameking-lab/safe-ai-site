import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { PageJsonLd } from "@/components/page-json-ld";
import { EduSlideDeck } from "@/components/education-pack/edu-slide-deck";
import { EDUCATION_DECKS, getDeck } from "@/data/education-decks";
import { getCurriculum, LICENSE_SUMMARY_3 } from "@/data/education-curriculum";
import { getHazardTypeSummary, type HazardTypeSummary } from "@/lib/hazard-slides/build-summary";
import { routeByKeywords } from "@/lib/construction-calc/ai-router";
import { ogImageUrl } from "@/lib/og-url";
import { withSiteOpenGraph, withSiteTwitter } from "@/lib/seo-metadata";

/**
 * 無償教材パックの1デッキ（投影/印刷両対応・網羅ゲート緑）。
 * 統計スライドは build-summary（型別サマリ）追従＝データJSONのコミット→再デプロイで自動更新。
 */

const SITE = "https://www.anzen-ai-portal.jp";

export function generateStaticParams() {
  return EDUCATION_DECKS.map((d) => ({ slug: d.slug }));
}

export const revalidate = 2592000;
export const dynamicParams = false;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const deck = getDeck(slug);
  if (!deck) return {};
  const title = `${deck.title}｜無償・編集可の法定教育スライド`;
  const description = `${deck.title}の無償教材（申請不要・編集可）。${deck.basisDisplay}。法定科目の網羅をCIで機械検証（対応表つき）。投影（16:9）・A4横印刷対応。教材の提供は教育の実施ではありません。`;
  return {
    title,
    description,
    alternates: { canonical: `/education/pack/${slug}` },
    openGraph: withSiteOpenGraph(`/education/pack/${slug}`, {
      title,
      description,
      images: [{ url: ogImageUrl(title, deck.basisDisplay), width: 1200, height: 630 }],
    }),
    twitter: withSiteTwitter({ title, description, images: [ogImageUrl(title, deck.basisDisplay)] }),
  };
}

export default async function EduPackDeckPage({ params }: { params: Params }) {
  const { slug } = await params;
  const deck = getDeck(slug);
  if (!deck) notFound();
  const curriculum = getCurriculum(deck.curriculumId);
  if (!curriculum) notFound();

  const stats: HazardTypeSummary[] = deck.hazardSlugs
    .map((h) => getHazardTypeSummary(h))
    .filter((s): s is HazardTypeSummary => Boolean(s));

  const contactHref = `/contact?tab=business&course=${deck.slug}&topic=edu-pack`;
  const pageUrl = `${SITE}/education/pack/${deck.slug}`;

  return (
    <>
      <PageJsonLd
        name={`${deck.title}（無償教材）`}
        description={`${deck.basisDisplay}。無償・申請不要・編集可の法定教育スライド。`}
        path={`/education/pack/${deck.slug}`}
      />
      <div className="no-print">
        <Breadcrumb
          items={[
            { name: "教育", href: "/education" },
            { name: "無償教材パック", href: "/education/pack" },
            { name: deck.title },
          ]}
        />
        <header className="mb-3">
          <h1 className="text-2xl font-bold text-slate-900">{deck.title}</h1>
          <p className="mt-1 text-sm text-slate-600">{deck.audience}</p>
        </header>
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-bold text-emerald-900">ご自由にお使いください（無償・申請不要・編集可）</p>
          <ul className="mt-1.5 space-y-1">
            {LICENSE_SUMMARY_3.map((t) => (
              <li key={t} className="flex items-start gap-1.5 text-xs text-emerald-900">
                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-600" />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-emerald-800">
            <Link href="/education/pack/terms" className="underline">教材利用規約の全文 →</Link>
          </p>
        </div>
      </div>

      <EduSlideDeck
        deck={deck}
        stats={stats}
        meta={{
          educationClass: curriculum.educationClass,
          kokuji: curriculum.basis.kokuji,
          sourceUrl: curriculum.basis.sourceUrl,
          retrievedOn: curriculum.basis.retrievedOn,
        }}
        contactHref={contactHref}
        pageUrl={pageUrl}
      />

      {(() => {
        // 教育パックの主題に効く建設計算（法令根拠つき）へ誘導する。判定は registry 駆動の
        // routeByKeywords（各計算機 keywords マッチ）＝部隊の新機も自動で候補に入る。
        // 2文字以上のキーワードが当たった確度（score>=2）のみ提示＝弱い一致で誤誘導しない。
        const calc = routeByKeywords(deck.title)[0];
        if (!calc || calc.score < 2) return null;
        return (
          <div className="no-print mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-900">この教育に関連する建設計算</p>
            <p className="mt-1 text-xs text-emerald-800">
              現場でそのまま使える法令根拠つきの計算機です（計算は検証済みの計算式が実行）。
            </p>
            <Link
              href={`/construction-calc/${calc.slug}`}
              className="mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700"
            >
              🧮 {calc.title}を開く
            </Link>
          </div>
        );
      })()}

      <div className="no-print mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-bold text-amber-900">貴社向けカスタマイズ・出張講習</p>
        <p className="mt-1 text-xs text-amber-800">
          現場・機械・自社事例に合わせた教材のカスタマイズ、労働安全コンサルタント（登録番号260022）による出張講習・講師派遣を承ります。
        </p>
        <Link
          href={contactHref}
          className="mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-amber-600 px-4 text-sm font-bold text-white hover:bg-amber-700"
        >
          カスタマイズ・出張講習を相談する
        </Link>
      </div>
    </>
  );
}
