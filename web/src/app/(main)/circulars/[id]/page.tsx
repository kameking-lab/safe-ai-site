import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, FileText, Share2 } from "lucide-react";
import { JsonLd, legalDocumentSchema, breadcrumbSchema } from "@/components/json-ld";
import { RelatedContent, type RelatedContentGroup } from "@/components/RelatedContent";
import { ContextualPpePicks } from "@/components/ContextualPpePicks";
import { mhlwNotices, type MhlwNotice } from "@/data/mhlw-notices";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import { safetyGoodsItems, safetyGoodsCategories } from "@/data/mock/safety-goods";
import { relatedFromNotice } from "@/lib/related-content";
import { ogImageUrl } from "@/lib/og-url";
import type { AccidentCase } from "@/lib/types/domain";

const SITE_BASE = "https://safe-ai-site.vercel.app";
const TODAY_ISO = new Date().toISOString().slice(0, 10);

function findNotice(id: string): MhlwNotice | undefined {
  return mhlwNotices.find((n) => n.id === id);
}

export function generateStaticParams() {
  return mhlwNotices.map((n) => ({ id: n.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const notice = findNotice(id);
  if (!notice) return {};
  const title = `${notice.title}｜厚労省通達`;
  const description = `${notice.noticeNumber ?? ""} ${notice.issuer ?? ""} ${
    notice.issuedDateRaw ?? notice.issuedDate ?? ""
  }。本通達の概要、関連事故事例、推奨保護具をまとめて確認できます。`.trim();
  return {
    title,
    description,
    alternates: { canonical: `/circulars/${id}` },
    openGraph: {
      title: `${title}｜ANZEN AI`,
      description,
      images: [{ url: ogImageUrl(notice.title, notice.noticeNumber ?? "厚労省通達"), width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [ogImageUrl(notice.title)] },
  };
}

const BINDING_BADGE: Record<MhlwNotice["bindingLevel"], { label: string; color: string }> = {
  binding: { label: "拘束力あり（命令的通達）", color: "bg-rose-100 text-rose-800 border-rose-200" },
  indirect: { label: "間接的拘束（行政運用基準）", color: "bg-amber-100 text-amber-800 border-amber-200" },
  reference: { label: "参考資料（指針・通知）", color: "bg-slate-100 text-slate-700 border-slate-200" },
};

function pickRelatedAccidents(notice: MhlwNotice, all: AccidentCase[]): AccidentCase[] {
  const keyword = notice.category;
  const titleTokens = notice.title.match(/[一-龥]{2,}/g) ?? [];
  const matches = all.filter((c) => {
    const haystack = `${c.title} ${c.summary} ${c.workCategory} ${c.type}`;
    if (haystack.includes(keyword)) return true;
    return titleTokens.some((t) => haystack.includes(t));
  });
  return matches.slice(0, 3);
}

function pickRelatedEquipment(notice: MhlwNotice) {
  const titleTokens = notice.title.match(/[一-龥ぁ-んァ-ヶ]{2,}/g) ?? [];
  const scored = safetyGoodsItems.map((g) => {
    const haystack = `${g.name} ${g.description} ${g.tags.join(" ")}`;
    const score = titleTokens.reduce(
      (acc, t) => acc + (haystack.includes(t) ? 1 : 0),
      0
    );
    return { item: g, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored
    .filter((s) => s.score > 0)
    .slice(0, 3)
    .map((s) => s.item);
}

export default async function CircularDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const notice = findNotice(id);
  if (!notice) notFound();

  const badge = BINDING_BADGE[notice.bindingLevel];
  const relatedAccidents = pickRelatedAccidents(notice, getAccidentCasesDataset());
  const relatedEquipment = pickRelatedEquipment(notice);
  const url = `${SITE_BASE}/circulars/${notice.id}`;

  // 通達カテゴリから推奨保護具のフォールバックを決める（高所→fall, 化学→respiratory, 熱→heat-cold）
  const ppeFallbacks: string[] = [];
  if (/(墜落|足場|高所|ハーネス)/.test(notice.title)) ppeFallbacks.push("fall-protection");
  if (notice.category === "heat-stroke") ppeFallbacks.push("heat-cold");
  if (/(化学|有機|特化|粉じん|粉塵|石綿)/.test(notice.title) || notice.category.includes("chemical")) {
    ppeFallbacks.push("respiratory");
  }
  if (/(感電|電気)/.test(notice.title)) ppeFallbacks.push("hand-foot");
  if (ppeFallbacks.length === 0) ppeFallbacks.push("head-protection");

  const ppeContext = `${notice.title} ${notice.category} ${notice.lawRef ?? ""} ${notice.docType}`;

  // 共通スコアリング: 関連通達・追加事故・追加保護具を内部リンク強化として表示
  const linked = relatedFromNotice(notice, { limit: 6 });
  const relatedGroups: RelatedContentGroup[] = [
    {
      heading: "📜 関連する他の通達・告示",
      description: "同カテゴリ・同キーワードで命令的拘束力の参考になる通達群",
      accent: "sky",
      moreHref: "/circulars",
      moreLabel: "通達一覧",
      items: linked.notices,
    },
    {
      heading: "⚠️ 関連する事故事例（追加）",
      accent: "amber",
      moreHref: "/accidents",
      moreLabel: "事故DB",
      items: linked.accidents,
    },
    {
      heading: "🛡 推奨保護具（自動マッチ）",
      accent: "emerald",
      moreHref: "/equipment-finder",
      moreLabel: "保護具AI",
      items: linked.equipment,
    },
  ];

  const description = `${notice.docType}「${notice.title}」（${notice.noticeNumber ?? ""}）。${
    notice.issuer ?? ""
  }が${notice.issuedDateRaw ?? notice.issuedDate ?? ""}付で発出した文書です。`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <JsonLd
        schema={[
          legalDocumentSchema({
            url,
            title: notice.title,
            noticeNumber: notice.noticeNumber,
            issuer: notice.issuer,
            issuedDate: notice.issuedDate,
            description,
            legislationApplies: "労働安全衛生法",
          }),
          breadcrumbSchema([
            { name: "ホーム", url: SITE_BASE },
            { name: "通達一覧", url: `${SITE_BASE}/circulars` },
            { name: notice.title, url },
          ]),
        ]}
      />

      <nav className="mb-5 flex items-center gap-1.5 text-xs text-slate-500">
        <Link
          href="/circulars"
          className="flex items-center gap-1 hover:text-emerald-600 transition-colors"
        >
          <ChevronLeft className="h-3 w-3" />
          通達一覧
        </Link>
        <span>/</span>
        <span className="text-slate-700 line-clamp-1">{notice.title}</span>
      </nav>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${badge.color}`}
            title="法的拘束力の目安"
          >
            {badge.label}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-700">
            {notice.docType}
          </span>
          {notice.noticeNumber ? (
            <span className="text-[11px] text-slate-500">{notice.noticeNumber}</span>
          ) : null}
        </div>
        <h1 className="mt-3 text-xl font-bold leading-snug text-slate-900 sm:text-2xl">
          {notice.title}
        </h1>
        <dl className="mt-3 grid grid-cols-1 gap-1 text-xs text-slate-600 sm:grid-cols-2">
          {notice.issuer ? (
            <div>
              <dt className="inline font-bold text-slate-700">発出者: </dt>
              <dd className="inline">{notice.issuer}</dd>
            </div>
          ) : null}
          {notice.issuedDateRaw || notice.issuedDate ? (
            <div>
              <dt className="inline font-bold text-slate-700">発出日: </dt>
              <dd className="inline">{notice.issuedDateRaw ?? notice.issuedDate}</dd>
            </div>
          ) : null}
          <div>
            <dt className="inline font-bold text-slate-700">最終確認日: </dt>
            <dd className="inline">{TODAY_ISO}</dd>
          </div>
          <div>
            <dt className="inline font-bold text-slate-700">カテゴリ: </dt>
            <dd className="inline">{notice.category}</dd>
          </div>
        </dl>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">📄 本通達の概要</h2>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          {description}
          詳細な本文は出典元のPDFまたは厚労省サイトでご確認ください。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={notice.detailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <FileText className="h-3.5 w-3.5" /> 本文（出典）を開く
            <ExternalLink className="h-3 w-3" />
          </a>
          {notice.pdfUrl ? (
            <a
              href={notice.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              PDF
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
          <a
            href={notice.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            通達一覧（出典）
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </section>

      {/* シェア */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Share2 className="h-4 w-4" /> このページをシェア
        </h2>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
              notice.title
            )}&url=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"
          >
            X (Twitter) で共有
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"
          >
            Facebookで共有
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent(notice.title)}&body=${encodeURIComponent(url)}`}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100"
          >
            メールで送る
          </a>
        </div>
      </section>

      {/* 関連事故事例 */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">⚠️ 関連する事故事例</h2>
        {relatedAccidents.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">該当事例は見つかりませんでした。</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {relatedAccidents.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-slate-100 bg-slate-50 p-3"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    {c.workCategory}
                  </span>
                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                    {c.severity}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-900">{c.title}</p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-600">
                  {c.summary}
                </p>
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

      {/* 関連保護具 */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">🛡 推奨保護具</h2>
        {relatedEquipment.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">
            自動マッチで該当が無いため、
            <Link href="/equipment-finder" className="font-semibold text-emerald-700 underline">
              保護具AIファインダー
            </Link>
            で業種・危険源から探してください。
          </p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {relatedEquipment.map((g) => {
              const cat = safetyGoodsCategories.find((c) => c.id === g.categoryId);
              return (
                <li
                  key={g.id}
                  className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                >
                  <p className="text-[10px] font-bold text-slate-500">
                    {cat?.icon} {cat?.name}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-900">{g.name}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-600">
                    {g.description}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <Link
          href="/equipment-finder"
          className="mt-3 inline-block text-xs font-bold text-emerald-700 hover:underline"
        >
          保護具AIで条件を絞り込む →
        </Link>
      </section>

      <ContextualPpePicks
        context={ppeContext}
        fallbackCategoryIds={ppeFallbacks}
      />

      <RelatedContent
        title="さらに深掘り — 通達・事故・保護具"
        groups={relatedGroups}
      />

      <footer className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[11px] leading-5 text-slate-600">
        <p>
          ※ 本ページは厚生労働省・労働基準局通達等の公開情報をもとに、ANZEN AI
          が一覧化したものです。法的判断・実務適用は必ず本文（出典元）と所管省庁の最新公表内容をご確認ください。
        </p>
        <p className="mt-1">
          最終確認日: <strong>{TODAY_ISO}</strong>
        </p>
      </footer>
    </main>
  );
}
