import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, Search, Table2 } from "lucide-react";
import { JsonLd, breadcrumbSchema } from "@/components/json-ld";
import { PageJsonLd } from "@/components/page-json-ld";
import { LawHubNav } from "@/components/law-hub-nav";
import { RelatedPageCards } from "@/components/related-page-cards";
import { LAW_NAVI_TOPICS } from "@/data/law-navi/topics";
import { BEPPYO_ENTRIES } from "@/data/law-navi/beppyo";
import { LAW_NAVI_ENTRIES } from "@/lib/law-navi/permalink";
import { ogImageUrl } from "@/lib/og-url";
import { Mascot } from "@/components/mascot";

const SITE_BASE = "https://www.anzen-ai-portal.jp";

const _title = "法令ナビ — 現場の言葉から安衛法の原文へ";
const _desc =
  `安衛法体系（法律→政令→省令→通達）を分野別・現場の言葉で引ける条文ナビ。「フォークリフト」でも「35条」でも「別表第3」でも、該当条文の原文に最短で着地。条文ページではAI解説と用語解説が読解を補助します（収録${LAW_NAVI_ENTRIES.length}条）。`;

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/law-navi" },
  openGraph: {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: [ogImageUrl(_title)] },
};

export default function LawNaviHubPage() {
  // 分野をグループ（荷役運搬機械等…）ごとにまとめる
  const groups = new Map<string, typeof LAW_NAVI_TOPICS>();
  for (const t of LAW_NAVI_TOPICS) {
    groups.set(t.fieldGroup, [...(groups.get(t.fieldGroup) ?? []), t]);
  }

  return (
    <>
      <PageJsonLd
        name="法令ナビ"
        description="安衛法体系を分野別・現場語で引ける条文ナビゲーション。"
        path="/law-navi"
      />
      <JsonLd
        schema={breadcrumbSchema([
          { name: "ホーム", url: `${SITE_BASE}/` },
          { name: "法令ナビ", url: `${SITE_BASE}/law-navi` },
        ])}
      />
      <LawHubNav current="law-navi" />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-slate-900">
              <Compass className="h-6 w-6 text-emerald-600" aria-hidden="true" />
              法令ナビ
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              安衛法の体系（法律→政令→省令→通達）を、<strong>分野</strong>からも<strong>現場の言葉</strong>からも
              <strong>条番号</strong>からも引けるナビです。どの入口からでも原文に最短で着地し、読みづらければ
              AI解説・用語解説が補助します（原文が正・解説は補助）。
            </p>
          </div>
          <Mascot variant="law-reading" size="lg" alt="" className="hidden shrink-0 sm:block" />
        </header>

        {/* 検索窓（JS不要のGETフォーム＝横断検索へ合流。「爪のやつ」「三十五条」「別表第3」なんでも） */}
        <form action="/search" method="get" className="mb-8" role="search" aria-label="法令を検索">
          <div className="flex gap-2">
            <input
              type="search"
              name="q"
              required
              placeholder="例: フォークリフト ／ 爪のやつ ／ 35条 ／ 別表第3"
              className="min-h-[48px] w-full rounded-xl border border-slate-300 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <button
              type="submit"
              className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              検索
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            俗称（爪のやつ）・漢数字（三十五条）・枝番（151条の67）・別表の意味（特化物の表）いずれでも探せます。
          </p>
        </form>

        {/* 分野インデックス */}
        <section aria-label="分野から引く" className="mb-8">
          <h2 className="mb-3 text-lg font-bold text-slate-900">分野から引く</h2>
          {[...groups.entries()].map(([groupName, topics]) => (
            <div key={groupName} className="mb-4">
              <p className="mb-2 text-xs font-bold text-slate-500">{groupName}</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {topics.map((t) => (
                  <Link
                    key={t.id}
                    href={`/law-navi/topics/${t.id}`}
                    className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow"
                  >
                    <p className="flex items-center justify-between text-base font-bold text-slate-900">
                      {t.name}
                      <ArrowRight
                        className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-500"
                        aria-hidden="true"
                      />
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      条文{t.articles.length}件・通達{t.circularIds.length}件を体系順に
                    </p>
                    <p className="mt-2 line-clamp-1 text-[11px] text-slate-400">
                      {t.aliases.filter((al) => al !== t.name).slice(0, 5).join("・")} でもOK
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <p className="text-[11px] text-slate-500">
            分野は順次拡充中です。見つからないときは上の検索窓か
            <Link href="/law-search" className="mx-0.5 text-emerald-700 underline underline-offset-2">
              条文検索
            </Link>
            をご利用ください。
          </p>
        </section>

        {/* 別表インデックス */}
        <section aria-label="別表を意味から引く" className="mb-8">
          <h2 className="mb-3 text-lg font-bold text-slate-900">別表を「何の表か」で引く</h2>
          <Link
            href="/law-navi/beppyo"
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow"
          >
            <span>
              <span className="inline-flex items-center gap-1.5 text-base font-bold text-slate-900">
                <Table2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                別表インデックス（{BEPPYO_ENTRIES.length}表）
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                別表第3=特定化学物質、別表第6の2=有機溶剤… 通し番号ではなく中身から逆引き。
              </span>
            </span>
            <ArrowRight
              className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-500"
              aria-hidden="true"
            />
          </Link>
        </section>
      </div>

      <RelatedPageCards
        heading="合わせて使う"
        pages={[
          {
            href: "/law-search",
            label: "条文検索",
            description: "収録全条文をキーワード・条番号で全文検索（分野を横断するとき）。",
            color: "emerald",
            cta: "全文検索へ",
          },
          {
            href: "/law-hierarchy",
            label: "法令体系マップ",
            description: "法律→政令→省令→告示・通達の階層を俯瞰する体系図。",
            color: "blue",
            cta: "体系を見る",
          },
          {
            href: "/chatbot",
            label: "安衛法AIチャット",
            description: "自然文の質問に条文番号と出典付きで回答。条文ページから文脈を引き継げます。",
            color: "purple",
            cta: "AIに質問",
          },
        ]}
      />
    </>
  );
}
