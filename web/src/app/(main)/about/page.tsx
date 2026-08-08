import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpenCheck,
  CircleAlert,
  ExternalLink,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";

const DESCRIPTION =
  "安全AIポータルの目的、一次資料の扱い、AIの限界、公開基準、修正報告先を説明します。";

export const metadata: Metadata = {
  title: "安全AIポータルについて",
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
};

const OFFICIAL_DESTINATIONS = [
  {
    title: "厚生労働省",
    href: "https://www.mhlw.go.jp/",
    note: "制度、通達、統計、職場の安全衛生に関する一次情報",
  },
  {
    title: "e-Gov法令検索",
    href: "https://elaws.e-gov.go.jp/",
    note: "現行法令の正本確認",
  },
  {
    title: "気象庁",
    href: "https://www.jma.go.jp/bosai/",
    note: "防災気象情報・警報の公式確認",
  },
] as const;

export default function AboutPage() {
  return (
    <PageContainer width="wide">
      <PageJsonLd
        name="安全AIポータルについて"
        description={DESCRIPTION}
        path="/about"
      />

      <header className="max-w-4xl">
        <p className="text-sm font-bold tracking-wide text-emerald-800">
          ABOUT &amp; LIMITS
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
          安全AIポータルについて
        </h1>
        <p className="mt-4 text-base leading-8 text-slate-700 dark:text-slate-200">
          公的機関の一次情報を置き換えるサイトではありません。現場の言葉から必要な情報へ到達し、
          今日の安全行動、KY、法令、事故、化学物質、気象を一連の作業として扱いやすくするための補助ポータルです。
        </p>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <BookOpenCheck
            className="h-7 w-7 text-emerald-700"
            aria-hidden="true"
          />
          <h2 className="mt-3 text-lg font-bold text-slate-950 dark:text-white">
            一次資料を正本とする
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
            法令、警報、事故、公的指針は発行主体の公開資料を優先します。リンク先、対象時点、取得日、確認状態を可能な範囲で表示します。
          </p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <SearchCheck
            className="h-7 w-7 text-sky-700"
            aria-hidden="true"
          />
          <h2 className="mt-3 text-lg font-bold text-slate-950 dark:text-white">
            現場語から探す
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
            正式名称だけでなく、略語・現場語・表記揺れから検索できます。検索結果は一次資料、サイト解説、事故、ツールなどに分類します。
          </p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <ShieldCheck
            className="h-7 w-7 text-violet-700"
            aria-hidden="true"
          />
          <h2 className="mt-3 text-lg font-bold text-slate-950 dark:text-white">
            AIを補助に限定する
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
            AI回答やAI候補は確定情報ではありません。根拠不足では保留し、公式資料と人による確認へつなぎます。
          </p>
        </section>
      </div>

      <section
        role="note"
        aria-labelledby="about-boundary-title"
        className="mt-8 rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 text-amber-950 dark:border-amber-500 dark:bg-amber-950/30 dark:text-amber-100"
      >
        <h2
          id="about-boundary-title"
          className="flex items-center gap-2 text-lg font-bold"
        >
          <CircleAlert className="h-5 w-5" aria-hidden="true" />
          公開停止と判定保留
        </h2>
        <p className="mt-2 leading-7">
          一次資料、数値、法的位置付け、実在性、監修状態を再確認できない機能は、検索・ナビゲーション・サイトマップから除外します。
          データ取得に失敗した場合も、安全、警報なし、資格不要、使用可とは判定しません。
        </p>
        <Link
          href="/about/quality"
          className="mt-3 inline-flex min-h-11 items-center font-bold underline underline-offset-4"
        >
          公開基準・更新状態・既知の制約を確認する
        </Link>
      </section>

      <section aria-labelledby="official-destinations-title" className="mt-10">
        <h2
          id="official-destinations-title"
          className="text-xl font-bold text-slate-950 dark:text-white"
        >
          正本を確認する
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {OFFICIAL_DESTINATIONS.map((destination) => (
            <a
              key={destination.href}
              href={destination.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-slate-200 bg-white p-4 text-slate-950 hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <span className="flex min-h-11 items-center gap-2 font-bold">
                {destination.title}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">
                {destination.note}
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-sky-300 bg-sky-50 p-5 text-sky-950 dark:border-sky-700 dark:bg-sky-950/30 dark:text-sky-100">
        <h2 className="text-xl font-bold">誤り・不足を報告する</h2>
        <p className="mt-2 text-sm leading-6">
          出典切れ、古い情報、アクセシビリティ上の問題を報告できます。相談フォームへ健康情報、個人情報、現場機密を入力しないでください。
        </p>
        <Link
          href="/contact?category=data-correction"
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-sky-900 px-5 font-bold text-white"
        >
          修正・不具合を報告する
        </Link>
      </section>
    </PageContainer>
  );
}
