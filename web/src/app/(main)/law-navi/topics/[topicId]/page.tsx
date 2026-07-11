import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronLeft, FileText } from "lucide-react";
import { JsonLd, breadcrumbSchema } from "@/components/json-ld";
import { LawHubNav } from "@/components/law-hub-nav";
import { LAW_NAVI_TOPICS, findLawNaviTopic } from "@/data/law-navi/topics";
import { getFreshPlainArticle } from "@/data/plain";
import { findEntryByShort } from "@/lib/law-navi/permalink";
import { mhlwNotices } from "@/data/mhlw-notices";
import { ogImageUrl } from "@/lib/og-url";

const SITE_BASE = "https://www.anzen-ai-portal.jp";

/** 生成集合＝解決集合（幽霊URL 0）。未知 id は 404。 */
export const dynamicParams = false;

export function generateStaticParams() {
  return LAW_NAVI_TOPICS.map((t) => ({ topicId: t.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topicId: string }>;
}): Promise<Metadata> {
  const { topicId } = await params;
  const topic = findLawNaviTopic(topicId);
  if (!topic) return {};
  const title = `${topic.name}の法令（${topic.fieldGroup}）｜法令ナビ`;
  return {
    title,
    description: topic.description,
    alternates: { canonical: `/law-navi/topics/${topicId}` },
    openGraph: {
      title,
      description: topic.description,
      images: [{ url: ogImageUrl(title, topic.description), width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [ogImageUrl(title)] },
  };
}

/** 法→令→則→その他の体系順ラベル。 */
const LAW_TIER_ORDER = ["安衛法", "安衛令", "安衛則"] as const;
const TIER_LABEL: Record<string, string> = {
  安衛法: "法律（労働安全衛生法）",
  安衛令: "政令（労働安全衛生法施行令）",
  安衛則: "省令（労働安全衛生規則）",
};

export default async function LawNaviTopicPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  const topic = findLawNaviTopic(topicId);
  if (!topic) notFound();

  // 体系順（法→令→則→その他）にグループ化。参照解決は permalink 生成集合を正本にする。
  const groups = new Map<string, { ref: (typeof topic.articles)[number]; entry: ReturnType<typeof findEntryByShort> }[]>();
  for (const ref of topic.articles) {
    const list = groups.get(ref.lawShort) ?? [];
    list.push({ ref, entry: findEntryByShort(ref.lawShort, ref.articleNum) });
    groups.set(ref.lawShort, list);
  }
  const orderedShorts = [
    ...LAW_TIER_ORDER.filter((s) => groups.has(s)),
    ...[...groups.keys()].filter((s) => !(LAW_TIER_ORDER as readonly string[]).includes(s)),
  ];

  const circulars = topic.circularIds
    .map((id) => mhlwNotices.find((n) => n.id === id))
    .filter((n): n is NonNullable<typeof n> => Boolean(n));

  return (
    <>
      <JsonLd
        schema={breadcrumbSchema([
          { name: "ホーム", url: `${SITE_BASE}/` },
          { name: "法令ナビ", url: `${SITE_BASE}/law-navi` },
          { name: topic.name, url: `${SITE_BASE}/law-navi/topics/${topic.id}` },
        ])}
      />
      <LawHubNav current="law-navi" />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav aria-label="パンくず" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-slate-500">
          <Link href="/law-navi" className="inline-flex min-h-[44px] items-center gap-1 hover:text-emerald-700">
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            法令ナビ
          </Link>
          <span aria-hidden>›</span>
          <span className="font-semibold text-slate-700">{topic.name}</span>
        </nav>

        <header className="mb-6">
          <p className="text-xs font-bold text-emerald-700">{topic.fieldGroup}</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{topic.name}の法令を体系順に</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{topic.description}</p>
          <p className="mt-2 text-xs text-slate-500">
            こんな呼び方でも探せます: {topic.aliases.filter((al) => al !== topic.name).slice(0, 8).join("、")}
          </p>
        </header>

        <div className="space-y-6">
          {orderedShorts.map((lawShort) => {
            const rows = groups.get(lawShort)!;
            return (
              <section key={lawShort} aria-label={TIER_LABEL[lawShort] ?? lawShort}>
                <h2 className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-white">
                  {TIER_LABEL[lawShort] ?? lawShort}
                </h2>
                <div className="space-y-2">
                  {rows.map(({ ref, entry }) => {
                    const a = entry?.article;
                    // 現場ことば版（検証済み・fresh のみ）。分野ページでは1文目をスニペット表示
                    const plain = entry && a ? getFreshPlainArticle(entry.egovLawId, a) : undefined;
                    const plainSnippet = plain ? `${plain.plainText.split("。")[0]}。` : null;
                    return (
                      <article
                        key={`${ref.lawShort}-${ref.articleNum}`}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900">
                            {ref.articleNum}
                            <span className="ml-2 font-semibold text-emerald-700">{ref.role}</span>
                          </p>
                          {entry && (
                            <Link
                              href={entry.path}
                              className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                            >
                              原文・AI解説
                              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </Link>
                          )}
                        </div>
                        {plainSnippet && (
                          <p className="mt-2 rounded-lg bg-amber-50/70 px-3 py-2 text-xs leading-5 text-amber-900">
                            <span className="font-bold">現場ことば: </span>
                            {plainSnippet}
                          </p>
                        )}
                        {a && (
                          <details className="group mt-2">
                            <summary className="flex min-h-[44px] cursor-pointer list-none items-center text-xs text-slate-500 hover:text-emerald-700">
                              <span className="line-clamp-2 flex-1 leading-5">{a.text.slice(0, 90)}…</span>
                              <span className="ml-2 shrink-0 text-emerald-600 group-open:hidden">原文をひらく</span>
                              <span className="ml-2 hidden shrink-0 text-emerald-600 group-open:inline">とじる</span>
                            </summary>
                            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-700">
                              {a.text}
                            </p>
                          </details>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {circulars.length > 0 && (
            <section aria-label="関連通達・告示・指針">
              <h2 className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white">
                通達・告示・指針
              </h2>
              <div className="space-y-1.5">
                {circulars.map((n) => (
                  <Link
                    key={n.id}
                    href={`/circulars/${n.id}`}
                    className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="mr-1.5 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                        {n.docType}
                      </span>
                      <span className="line-clamp-1">{n.title}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
