import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "5分ツアー | 機能紹介 | ANZEN AI",
  description:
    "ANZEN AIの主要機能を7ステップ・5分で巡る入門ツアー。実機画面のスクショつきで、すぐに試せます。",
};

type Step = {
  step: number;
  slug: string;
  title: string;
  body: string;
  href: string;
  hrefLabel: string;
};

const STEPS: Step[] = [
  {
    step: 1,
    slug: "home",
    title: "ポータルトップで現場の今を一望",
    body: "天候リスク、最新通達、事故事例、KY状況を1画面で俯瞰します。事務所のメインダッシュボード／サイネージとして使えます。",
    href: "/",
    hrefLabel: "ポータルを開く",
  },
  {
    step: 2,
    slug: "ky",
    title: "KY用紙を5分で完成",
    body: "業種別プリセットで作業内容を選び、AIにリスクをサジェストさせ、署名つきPDFで保存。新人でも質の高いKYが回せます。",
    href: "/ky",
    hrefLabel: "KY用紙を試す",
  },
  {
    step: 3,
    slug: "chatbot",
    title: "安衛法の疑問をAIに即質問",
    body: "労働安全衛生法・施行令・通達を学習したAIに、現場の疑問を自然言語で質問。根拠条文つきで回答します。",
    href: "/chatbot",
    hrefLabel: "チャットを開く",
  },
  {
    step: 4,
    slug: "chemical-ra",
    title: "化学物質RAを改正安衛法対応で",
    body: "SDS取込からGHS分類、ばく露見積もり、対策レベル判定までを一気通貫。記録は監査・労基対応にそのまま提出できます。",
    href: "/chemical-ra",
    hrefLabel: "化学物質RAを開く",
  },
  {
    step: 5,
    slug: "accidents",
    title: "事故DBで類似災害を検索",
    body: "厚労省公表データを構造化し、業種・起因物・原因で横断検索。朝礼共有資料・KY参考資料として使えます。",
    href: "/accidents",
    hrefLabel: "事故DBを開く",
  },
  {
    step: 6,
    slug: "education",
    title: "特別教育・Eラーニングを配信",
    body: "フルハーネス・玉掛けなど安衛法の特別教育を業種別カリキュラムで実施。LMSで全社の進捗を一元管理できます。",
    href: "/education",
    hrefLabel: "特別教育を見る",
  },
  {
    step: 7,
    slug: "wizard",
    title: "コンプラ診断で必須対応を可視化",
    body: "10問程度の質問に答えるだけで、安衛法上の必須対応・未着手項目を自動判定。助成金シミュレーターと組み合わせて投資計画も立てられます。",
    href: "/wizard",
    hrefLabel: "診断を始める",
  },
];

export default function QuickTourPage() {
  return (
    <div className="px-4 py-6 sm:py-10">
      {/* パンくず */}
      <nav aria-label="パンくず" className="mx-auto max-w-5xl text-xs text-slate-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/features" className="hover:text-slate-800 hover:underline">
              機能紹介
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li className="font-semibold text-slate-700">5分ツアー</li>
        </ol>
      </nav>

      {/* Hero */}
      <header className="mx-auto mt-4 max-w-4xl text-center">
        <p className="text-xs font-bold tracking-widest text-emerald-700">QUICK TOUR</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl md:text-4xl">
          5分でわかる ANZEN AI
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          7ステップで主要機能を巡るツアー。各ステップから直接試せます。
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
            ⏱ 所要時間：約5分
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700">
            📱 スマホ・PC両対応
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-semibold text-blue-700">
            登録不要で試せる機能あり
          </span>
        </div>
      </header>

      {/* 進行マップ（jump links） */}
      <nav aria-label="ステップへジャンプ" className="mx-auto mt-6 max-w-3xl">
        <ol className="flex flex-wrap justify-center gap-1.5">
          {STEPS.map((s) => (
            <li key={s.step}>
              <a
                href={`#step-${s.step}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                aria-label={`ステップ${s.step}: ${s.title}`}
              >
                {s.step}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* ステップ */}
      <section className="mx-auto mt-10 max-w-4xl space-y-12">
        {STEPS.map((s, idx) => (
          <article
            key={s.step}
            id={`step-${s.step}`}
            className="scroll-mt-24"
          >
            <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 md:items-center ${idx % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""}`}>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="relative aspect-[16/10] w-full bg-slate-100">
                  <Image
                    src={`/screenshots/${s.slug}-desktop.svg`}
                    alt={`${s.title}のスクリーンショット`}
                    width={640}
                    height={400}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                    {s.step}
                  </span>
                  <p className="text-[11px] font-bold tracking-widest text-emerald-700">
                    STEP {s.step} / {STEPS.length}
                  </p>
                </div>
                <h2 className="mt-2 text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
                  {s.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">{s.body}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={s.href}
                    className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    {s.hrefLabel} →
                  </Link>
                  {idx < STEPS.length - 1 && (
                    <a
                      href={`#step-${s.step + 1}`}
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      次のステップへ ↓
                    </a>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* CTA */}
      <section className="mx-auto mt-12 max-w-4xl rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 text-center sm:p-8">
        <h2 className="text-xl font-bold text-emerald-900 sm:text-2xl">ツアーお疲れ様でした</h2>
        <p className="mt-2 text-sm text-emerald-800">
          気になった機能から、実際に触って確かめてみてください。
        </p>
        <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link
            href="/features"
            className="inline-flex items-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-700"
          >
            機能一覧で詳しく見る →
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-lg border border-emerald-300 bg-white px-5 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
          >
            導入相談を申し込む
          </Link>
        </div>
      </section>
    </div>
  );
}
