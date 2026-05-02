import type { Metadata } from "next";
import Link from "next/link";
import { ogImageUrl } from "@/lib/og-url";
import { ServicesContent } from "./ServicesContent";
import { PAID_MODE } from "@/lib/paid-mode";
import { SITE_STATS } from "@/data/site-stats";

import { PageJsonLd } from "@/components/page-json-ld";
const TITLE = "受託業務｜KYデジタル化・安全管理自動化・法改正通知・Claude Code 開発";
const DESCRIPTION =
  "労働安全コンサルタント監修の受託業務。KYデジタル化¥500k〜、安全管理自動化¥300k〜、法改正通知¥200k〜、教育コンテンツ¥500k〜、化学物質管理¥500k〜、特別教育¥150k〜、Claude Code自動化¥200k〜。無料相談30分実施中。";

const RESEARCH_TITLE = "研究プロジェクトの取り組み";
const RESEARCH_DESC =
  "ANZEN AI が現在取り組んでいる労働安全衛生 × AI・DX の研究テーマ・実証実験の紹介。個人運営の無料公開プロジェクト。";

export const metadata: Metadata = PAID_MODE
  ? {
      title: TITLE,
      description: DESCRIPTION,
      alternates: { canonical: "/services" },
      openGraph: {
        title: `${TITLE}｜ANZEN AI`,
        description: DESCRIPTION,
        images: [{ url: ogImageUrl(TITLE, DESCRIPTION), width: 1200, height: 630 }],
      },
      twitter: {
        card: "summary_large_image",
        images: [ogImageUrl(TITLE, DESCRIPTION)],
      },
    }
  : {
      title: RESEARCH_TITLE,
      description: RESEARCH_DESC,
      alternates: { canonical: "/services" },
      openGraph: {
        title: `${RESEARCH_TITLE}｜ANZEN AI`,
        description: RESEARCH_DESC,
      },
    };

const RESEARCH_THEMES = [
  {
    title: "通達・事故DBの一次ソース化",
    desc: `厚労省の死亡災害DB（${SITE_STATS.mhlwDeathsCount}件）と全件検索DB（${SITE_STATS.accidentDbCount}件）を構造化し、業種別ランキング・原因別分析を一次出典付きで公開。`,
  },
  {
    title: "化学物質情報の検索可能化",
    desc: "厚労省 職場のあんぜんサイトの化学物質情報を取込み、SDS・濃度限度値・発がん性区分から横断検索できる形に整備。",
  },
  {
    title: "RAG型 安衛法チャットボット",
    desc: "労働安全衛生関連33法令を埋め込みベクトル化し、条文根拠を提示しながら回答する研究的 LLM 実装。",
  },
  {
    title: "KY用紙のデジタル化検証",
    desc: "現場で実際に書かれている KY 用紙のデジタル化（音声入力・PDF出力・業種別プリセット）を、現場フィードバックで反復検証。",
  },
  {
    title: "外国人労働者向けやさしい日本語",
    desc: "技能実習生・特定技能の労働者にも届く安全情報ポータルとして、ふりがな・やさしい日本語・多言語化を試行。",
  },
  {
    title: "サイネージ常時表示の実証",
    desc: "現場の休憩所・詰所のサイネージで気象リスク・通達・事故事例を循環表示する常時稼働モードの開発・運用。",
  },
];

export default function ServicesPage() {
  if (!PAID_MODE) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name={TITLE} description={DESCRIPTION} path="/services" />
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            研究・実証プロジェクト
          </p>
          <h1 className="mt-2 text-2xl font-bold leading-snug text-slate-900 sm:text-3xl">
            研究プロジェクトの取り組み
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            ANZEN AI は労働安全衛生分野の AI・DX 活用を、個人運営で研究・実証しています。
            以下のテーマで通達・事故事例・化学物質情報・教育教材を一次ソース付きで無料公開し、
            現場・行政・研究者からのフィードバックを取り込みながら反復改善を続けています。
          </p>
        </div>

        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {RESEARCH_THEMES.map((theme, i) => (
            <article
              key={theme.title}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  {i + 1}
                </span>
                <h2 className="text-sm font-bold text-slate-900">{theme.title}</h2>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">{theme.desc}</p>
            </article>
          ))}
        </section>

        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <p className="font-semibold">フィードバック歓迎</p>
          <p className="mt-1 text-xs">
            データの誤り・追加してほしいテーマ・現場での使いにくさなど、お気軽にお寄せください。
          </p>
          <Link
            href="/contact"
            className="mt-3 inline-flex rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
          >
            ご意見・改善提案を送る →
          </Link>
        </div>
      </main>
    );
  }
  return <ServicesContent />;
}
