import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calculator,
  ChevronLeft,
  ExternalLink,
  MessageSquare,
  Search,
} from "lucide-react";
import { JsonLd, legalDocumentSchema, breadcrumbSchema } from "@/components/json-ld";
import { LawHubNav } from "@/components/law-hub-nav";
import { ArticleAiExplain } from "@/components/law-navi/article-ai-explain";
import { ArticleRefText } from "@/components/law-navi/article-ref-text";
import { PlainLanguageSection } from "@/components/law-navi/plain-language-section";
import { getFreshPlainArticle } from "@/data/plain";
import { CopyCitationButton } from "@/components/favorites/copy-citation-button";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { formatArticleCitation } from "@/lib/favorites";
import {
  LAW_NAVI_ENTRIES,
  adjacentEntries,
  egovUrlForEntry,
  resolveLawNaviEntry,
  type LawNaviEntry,
} from "@/lib/law-navi/permalink";
import {
  adjacentReadingOrder,
  getAllFulltextNaviEntries,
  resolveFulltextNaviEntry,
  type ReadingOrderLink,
} from "@/lib/law-navi/fulltext-navi";
import { matchGlossaryTerms } from "@/lib/law-navi/glossary-match";
import { isIndexableLawNaviEntry } from "@/lib/law-navi/seo-gate";
import { topicsForArticle } from "@/data/law-navi/topics";
import { relatedCalculatorsForArticle } from "@/lib/construction-calc/related-articles";
import { getLawMetadata } from "@/data/laws";
import { ogImageUrl } from "@/lib/og-url";

const SITE_BASE = "https://www.anzen-ai-portal.jp";

/** 生成集合＝解決集合（幽霊URL 0）。未知 slug は 404。 */
export const dynamicParams = false;

/**
 * 生成集合 = curated（LAW_NAVI_ENTRIES）∪ 全文由来ギャップ（fulltext）。
 * 既存 curated の 717 URL は不変（追加のみ・§5-2「既存712 URL は不変」）。全文由来は
 * curated に無い条だけを埋める。全文 JSON は loader の dynamic import 経由でビルド時のみ
 * 読む（クライアントバンドル非搭載＝FT-D1 の不可侵を維持）。
 */
export async function generateStaticParams() {
  const curated = LAW_NAVI_ENTRIES.map((e) => ({ lawId: e.egovLawId, artSlug: e.artSlug }));
  const fulltext = (await getAllFulltextNaviEntries()).map((e) => ({
    lawId: e.egovLawId,
    artSlug: e.artSlug,
  }));
  return [...curated, ...fulltext];
}

/** 表示の正本解決順: curated 優先 → 全文ギャップ。curated 条は表示本文・plain 等が不変。 */
async function resolveEntry(
  lawId: string,
  artSlug: string,
): Promise<
  | { entry: LawNaviEntry; origin: "curated" | "fulltext"; isDeleted: boolean; revisionId?: string }
  | null
> {
  const curated = resolveLawNaviEntry(lawId, artSlug);
  if (curated) return { entry: curated, origin: "curated", isDeleted: false };
  const ft = await resolveFulltextNaviEntry(lawId, artSlug);
  if (ft) {
    return { entry: ft, origin: "fulltext", isDeleted: ft.isDeleted, revisionId: ft.revisionId };
  }
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lawId: string; artSlug: string }>;
}): Promise<Metadata> {
  const { lawId, artSlug } = await params;
  const resolved = await resolveEntry(lawId, artSlug);
  if (!resolved) return {};
  const { entry } = resolved;
  const a = entry.article;
  const title = `${a.lawShort} ${a.articleNum}${a.articleTitle ? `（${a.articleTitle}）` : ""}｜法令ナビ`;
  // 現場ことば版がある条は、条文引用よりも検索スニペットとして伝わる言い換えを説明文に使う
  const plain = getFreshPlainArticle(entry.egovLawId, a);
  const description = plain
    ? `${a.law} ${a.articleNum}の原文と現場ことば版。${plain.plainText.slice(0, 80)}…（正式には原文参照）`
    : `${a.law} ${a.articleNum}の原文と現場向けAI解説。${a.text.slice(0, 70)}…`;
  // FT-D3 SEO ゲート（設計書 §5-3）: 付加価値条件を満たさない条（全文取込の生ミラー等）は
  // noindex,follow。ページ生成・内部導線・前後ナビは維持しつつ検索インデックスからのみ外す。
  // 条件を満たした時点（plain 執筆・topics 追加等）で seo-gate が自動的に index へ昇格する。
  const indexable = isIndexableLawNaviEntry(entry);
  return {
    title,
    description,
    alternates: { canonical: entry.path },
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl(`${a.lawShort} ${a.articleNum}`, a.articleTitle || a.law), width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [ogImageUrl(`${a.lawShort} ${a.articleNum}`)] },
  };
}

/** 前後条リンク（curated=収録順・fulltext=実条連続、どちらも同じ見た目）。 */
function AdjacentLink({
  href,
  articleNum,
  articleTitle,
  dir,
}: {
  href: string;
  articleNum: string;
  articleTitle: string;
  dir: "prev" | "next";
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-[44px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm transition hover:border-emerald-300 hover:bg-emerald-50 ${
        dir === "next" ? "justify-end text-right" : ""
      }`}
    >
      {dir === "prev" && <ArrowLeft className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />}
      <span>
        <span className="block text-[11px] text-slate-500">{dir === "prev" ? "前の条文" : "次の条文"}</span>
        <span className="font-semibold text-slate-800">
          {articleNum}
          {articleTitle ? ` ${articleTitle}` : ""}
        </span>
      </span>
      {dir === "next" && <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />}
    </Link>
  );
}

export default async function LawNaviArticlePage({
  params,
}: {
  params: Promise<{ lawId: string; artSlug: string }>;
}) {
  const { lawId, artSlug } = await params;
  const resolved = await resolveEntry(lawId, artSlug);
  if (!resolved) notFound();

  const { entry, origin, isDeleted, revisionId } = resolved;
  const a = entry.article;
  const egovUrl = egovUrlForEntry(entry);
  const meta = getLawMetadata(a.lawShort);
  const topics = topicsForArticle(a.lawShort, a.articleNum);
  const relatedCalcs = relatedCalculatorsForArticle(a.lawShort, a.articleNum);
  const glossaryHits = matchGlossaryTerms(a.text);
  const chatQuery = `${a.lawShort}${a.articleNum}${a.articleTitle ? `（${a.articleTitle}）` : ""}について、現場でのポイントを教えてください`;
  const itemMap = a.itemNumberMap ? Object.entries(a.itemNumberMap) : [];

  // 前後条ナビ: curated ページは従来どおり収録順（既存挙動を後退させない）。
  // 全文ギャップページは実条連続（curated / 全文どちらのページへも着地）。
  let prev: { href: string; articleNum: string; articleTitle: string } | undefined;
  let next: { href: string; articleNum: string; articleTitle: string } | undefined;
  if (origin === "curated") {
    const adj = adjacentEntries(entry);
    if (adj.prev) prev = { href: adj.prev.path, articleNum: adj.prev.article.articleNum, articleTitle: adj.prev.article.articleTitle };
    if (adj.next) next = { href: adj.next.path, articleNum: adj.next.article.articleNum, articleTitle: adj.next.article.articleTitle };
  } else {
    const adj = await adjacentReadingOrder(entry.egovLawId, a.articleNum);
    const toLink = (l: ReadingOrderLink) => ({ href: l.path, articleNum: l.articleNum, articleTitle: l.articleTitle });
    if (adj.prev) prev = toLink(adj.prev);
    if (adj.next) next = toLink(adj.next);
  }

  return (
    <>
      <JsonLd
        schema={[
          legalDocumentSchema({
            url: `${SITE_BASE}${entry.path}`,
            title: `${a.law} ${a.articleNum}${a.articleTitle ? `（${a.articleTitle}）` : ""}`,
            noticeNumber: null,
            issuer: "厚生労働省",
            issuedDate: null,
            description: a.text.slice(0, 120),
          }),
          breadcrumbSchema([
            { name: "ホーム", url: `${SITE_BASE}/` },
            { name: "法令ナビ", url: `${SITE_BASE}/law-navi` },
            { name: a.law, url: `${SITE_BASE}/law-navi` },
            { name: a.articleNum, url: `${SITE_BASE}${entry.path}` },
          ]),
        ]}
      />
      <LawHubNav current="law-navi" />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav aria-label="パンくず" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-slate-500">
          <Link href="/law-navi" className="inline-flex min-h-[44px] items-center gap-1 hover:text-emerald-700">
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            法令ナビ
          </Link>
          <span aria-hidden>›</span>
          <span>{a.law}</span>
          <span aria-hidden>›</span>
          <span className="font-semibold text-slate-700">{a.articleNum}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ── 主役: 原文 ── */}
          <main className="min-w-0 space-y-4">
            <header>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  {a.lawShort}
                </span>
                {origin === "curated" ? (
                  <span
                    className="inline-flex items-center gap-0.5 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800"
                    title={`本サイトのキュレーション条文。現行版（e-Gov準拠）の条番号・条文を採録しています。${meta ? `最終突合 ${meta.auditedAt}` : ""}`}
                  >
                    <span aria-hidden>●</span> 現行（e-Gov準拠）
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-0.5 rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800"
                    title={`e-Gov 法令API の全文収載条（機械取込）。${revisionId ? `収録リビジョン ${revisionId}` : ""}`}
                  >
                    <span aria-hidden>●</span> 全文収載（e-Gov準拠）
                  </span>
                )}
                {isDeleted && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    削除条
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">
                {a.articleNum}
                {a.articleTitle && <span className="ml-2 text-xl">{a.articleTitle}</span>}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{a.law}</p>
            </header>

            {/* 原文（条間参照はO18リンカでタップ可能） */}
            <section
              aria-label="条文原文"
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              {isDeleted ? (
                <p className="text-slate-600">
                  本条は<span className="font-semibold">削除</span>されています（欠番ではなく削除条として収載）。
                </p>
              ) : (
                <ArticleRefText text={a.text} lawFullName={a.law} />
              )}
              {itemMap.length > 0 && (
                <div className="mt-4 overflow-x-auto rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-bold text-slate-600">号の対応（収録データより）</p>
                  <table className="w-full text-left text-xs text-slate-700">
                    <tbody>
                      {itemMap.map(([go, subject]) => (
                        <tr key={go} className="border-t border-slate-100 first:border-t-0">
                          <td className="w-16 py-1.5 pr-3 font-semibold whitespace-nowrap">第{go}号</td>
                          <td className="py-1.5">{subject}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <a
                  href={egovUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  e-Govで原文を確認（正本）
                </a>
                <CopyCitationButton
                  text={formatArticleCitation({
                    text: a.text,
                    lawShort: a.lawShort,
                    lawFull: a.law,
                    articleNum: a.articleNum,
                    egovUrl,
                  })}
                />
                <FavoriteButton
                  kind="article"
                  id={`${a.law}|${a.articleNum}`}
                  title={a.articleTitle ?? a.articleNum}
                  subtitle={`${a.lawShort} ${a.articleNum}`}
                  href={entry.path}
                />
              </div>
              {origin === "curated" ? (
                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                  本ページは現場で引きやすいよう主要条文を採録したものです。改正の反映・正式な条文は e-Gov 法令検索が正本です
                  {meta?.latestRevision ? `（収録ベース: ${meta.latestRevision}）` : ""}。
                </p>
              ) : (
                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                  本ページは e-Gov 法令検索の全文収載（機械取込）に基づく現行条文です
                  {revisionId ? `（収録リビジョン: ${revisionId}）` : ""}。改正の反映・正式な条文は e-Gov 法令検索が正本です。
                </p>
              )}
            </section>

            {/* 現場ことば版（原文の直下・検証済みのみ表示。未生成/staleは区画ごと非表示） */}
            <PlainLanguageSection egovLawId={entry.egovLawId} article={a} />

            {/* AI解説（原文の下・オンデマンド生成） */}
            <ArticleAiExplain law={a.law} articleNum={a.articleNum} text={a.text} />

            {/* チャット引き継ぎ */}
            <Link
              href={`/chatbot?q=${encodeURIComponent(chatQuery)}`}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800 transition hover:bg-sky-100"
            >
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              この条文についてAIチャットで質問する
            </Link>

            {/* 前後条 */}
            {(prev || next) && (
              <nav aria-label="前後の条文" className="flex flex-col gap-2 sm:flex-row">
                {prev && <AdjacentLink href={prev.href} articleNum={prev.articleNum} articleTitle={prev.articleTitle} dir="prev" />}
                {next && <AdjacentLink href={next.href} articleNum={next.articleNum} articleTitle={next.articleTitle} dir="next" />}
              </nav>
            )}
          </main>

          {/* ── 補助: 用語・分野・導線 ── */}
          <aside className="min-w-0 space-y-4">
            {glossaryHits.length > 0 && (
              <section aria-label="この条文の用語" className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-800">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  この条文の用語
                </p>
                <ul className="space-y-1.5">
                  {glossaryHits.map(({ term }) => (
                    <li key={term.term}>
                      <details className="group rounded-lg border border-indigo-100 bg-white">
                        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-semibold text-slate-800">
                          {term.term}
                          <span className="text-indigo-400 transition group-open:rotate-90" aria-hidden>
                            ›
                          </span>
                        </summary>
                        <p className="px-3 pb-3 text-xs leading-5 text-slate-600">
                          {term.definition}
                          <Link href="/glossary" className="ml-1 text-indigo-600 underline underline-offset-2">
                            用語集へ
                          </Link>
                        </p>
                      </details>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {topics.length > 0 && (
              <section aria-label="この条文が属する分野" className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <p className="mb-2 text-xs font-bold text-emerald-800">この条文が属する分野</p>
                <ul className="space-y-1.5">
                  {topics.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/law-navi/topics/${t.id}`}
                        className="flex min-h-[44px] items-center justify-between rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                      >
                        {t.name}（{t.fieldGroup}）
                        <ArrowRight className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {relatedCalcs.length > 0 && (
              <section aria-label="この条文に関連する建設計算" className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
                  この条文に関連する建設計算
                </p>
                <ul className="space-y-1.5">
                  {relatedCalcs.map((calc) => (
                    <li key={calc.slug}>
                      <Link
                        href={`/construction-calc/${calc.slug}`}
                        className="flex min-h-[44px] items-center justify-between rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                      >
                        <span>
                          {calc.shortTitle}
                          <span className="ml-1 font-normal text-amber-600/80">で計算する</span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-label="他のツールで開く" className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-2 text-xs font-bold text-slate-600">他のツールで開く</p>
              <div className="space-y-1.5">
                <Link
                  href={`/law-search?law=${encodeURIComponent(a.law)}&art=${encodeURIComponent(a.articleNum)}`}
                  className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                >
                  <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  条文検索で開く（全文検索）
                </Link>
                <Link
                  href={`/search?q=${encodeURIComponent(`${a.lawShort} ${a.articleNum}`)}`}
                  className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                >
                  <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  この条文を横断検索（通達・判例・事故）
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
