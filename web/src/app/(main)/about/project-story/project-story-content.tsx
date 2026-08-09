"use client";

import Link from "next/link";
import { ArrowRight, HardHat, HeartHandshake, Route, Wrench } from "lucide-react";
import { Mascot } from "@/components/mascot";

const STORY_LINKS = [
  ["安全AIポータルを使う", "/"],
  ["できることを見る", "/safety-ai"],
  ["品質と出典を見る", "/about/quality"],
  ["自社向けの相談内容を整理する", "/contact/automation-email"],
] as const;

/**
 * 静的な本文をpropsなしのClient Component境界に置き、初回HTMLは維持しつつ
 * App RouterのRSC payloadへ同じ長文・class群を重複収録しない。
 */
export function ProjectStoryContent() {
  return (
    <article
      data-project-story=""
      className="overflow-hidden bg-[#f8f5ed] text-slate-950 dark:bg-slate-950 dark:text-white"
    >
      <header className="relative isolate border-b-2 border-slate-900 px-4 py-10 sm:px-6 sm:py-14 dark:border-slate-600">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-40 -z-10 h-[30rem] w-[30rem] rounded-full bg-emerald-300/35 blur-3xl forced-colors:hidden" />
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-[minmax(0,1fr)_7rem] sm:items-center">
          <div>
            <nav aria-label="パンくず" className="text-sm font-bold text-slate-600 dark:text-slate-300">
              <Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-4">ホーム</Link>
              <span aria-hidden="true" className="mx-2">/</span>
              <span aria-current="page">つくった理由</span>
            </nav>
            <p className="mt-5 text-sm font-black tracking-[.14em] text-emerald-800 dark:text-emerald-300">PROJECT STORY</p>
            <h1 className="mt-3 text-[clamp(2.4rem,6vw,4.4rem)] font-black leading-[1.02] tracking-[-.05em]">
              現場の時間を、安全と本質的な仕事へ。
            </h1>
            <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-slate-700 dark:text-slate-200">
              なぜ個人で安全AIポータルをつくり、無償で公開しているのか。その原点と、開発で大切にしていることだけを記します。
            </p>
          </div>
          <div className="mx-auto rounded-2xl border-2 border-slate-900 bg-white p-2 shadow-[5px_5px_0_#f59e0b] dark:bg-slate-900">
            <Mascot variant="tablet-dx" size="lg" eager sizes="96px" alt="現場の改善を考えるチワワ" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <section data-story-block="origin" aria-labelledby="story-origin" className="grid gap-4 border-b border-slate-300 pb-8 sm:grid-cols-[3rem_minmax(0,1fr)] dark:border-slate-700">
          <HeartHandshake className="h-8 w-8 text-emerald-800 dark:text-emerald-300" aria-hidden="true" />
          <div>
            <h2 id="story-origin" className="text-2xl font-black">1. 原点</h2>
            <p className="mt-3 text-base leading-8 text-slate-700 dark:text-slate-200">
              学生時代、工事現場で死亡事故を目の当たりにしました。その経験が、労働安全に向き合う原点です。事故の詳細や関係者を語るのではなく、同じことを繰り返さないために自分が何をできるかを考え続けてきました。
              安全を、誰か任せにしないためです。
            </p>
          </div>
        </section>

        <section data-story-block="field" aria-labelledby="story-field" className="grid gap-4 border-b border-slate-300 py-8 sm:grid-cols-[3rem_minmax(0,1fr)] dark:border-slate-700">
          <Route className="h-8 w-8 text-sky-800 dark:text-sky-300" aria-hidden="true" />
          <div>
            <h2 id="story-field" className="text-2xl font-black">2. 文系から現場へ</h2>
            <p className="mt-3 text-base leading-8 text-slate-700 dark:text-slate-200">
              文系から土木施工管理の道へ進み、建設・土木分野で約10年、現場と安全衛生の実務に携わってきました。計画どおりに進まない状況で、作業する人の声、施工条件、法令、品質を同時に確かめることの重さを学びました。
            </p>
            <p className="mt-3 inline-flex flex-wrap gap-x-3 gap-y-1 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
              <span>実務経験：約10年</span>
              <span aria-hidden="true">・</span>
              <span>一級土木施工管理技士</span>
              <span aria-hidden="true">・</span>
              <span>労働安全コンサルタント</span>
            </p>
          </div>
        </section>

        <section data-story-block="essential-work" aria-labelledby="story-essential" className="grid gap-4 border-b border-slate-300 py-8 sm:grid-cols-[3rem_minmax(0,1fr)] dark:border-slate-700">
          <Wrench className="h-8 w-8 text-amber-800 dark:text-amber-300" aria-hidden="true" />
          <div>
            <h2 id="story-essential" className="text-2xl font-black">3. 雑務を減らし、本質的な仕事へ</h2>
            <p className="mt-3 text-base leading-8 text-slate-700 dark:text-slate-200">
              現場では、同じ転記、集計、書類の整形に多くの時間が使われます。その時間を減らし、安全、施工計画、品質向上、人との対話へ振り向けたいと考えています。
            </p>
            <p className="mt-3 text-base leading-8 text-slate-700 dark:text-slate-200">
              当時は形にできなかった改善を実装するため、AIとコーディングを学びました。安全AIポータルは、以前なら案で終わっていた工夫を、実際に触って検証できる形へ変える試みです。
            </p>
          </div>
        </section>

        <section data-story-block="listen" aria-labelledby="story-listen" className="grid gap-4 border-b border-slate-300 py-8 sm:grid-cols-[3rem_minmax(0,1fr)] dark:border-slate-700">
          <HardHat className="h-8 w-8 text-orange-800 dark:text-orange-300" aria-hidden="true" />
          <div>
            <h2 id="story-listen" className="text-2xl font-black">4. 現場へ押し付けない開発</h2>
            <p className="mt-3 text-base leading-8 text-slate-700 dark:text-slate-200">
              便利そうに見えるツールでも、帳票、承認、端末、通信、役割が違えば使われません。まず話を聞き、困っている一つの作業を理解し、小さく試し、使う人の意見で直します。
            </p>
            <p className="mt-3 text-base leading-8 text-slate-700 dark:text-slate-200">
              AIの出力をそのまま正解にせず、人が確認できる根拠と停止線を残します。公式一次資料と現場の判断を置き換えないことが、開発の前提です。
            </p>
          </div>
        </section>

        <section data-story-block="independent" aria-labelledby="story-independent" className="pt-8">
          <h2 id="story-independent" className="text-2xl font-black">5. 個人開発として続ける</h2>
          <p className="mt-3 text-base leading-8 text-slate-700 dark:text-slate-200">
            安全AIポータルは、個人が開発・運営し、無償公開しているプロジェクトです。サーバー費などの運営費も個人で負担しています。広告や相談サービスは、無償公開を続けるための選択肢です。
          </p>
          <p className="mt-3 rounded-xl border-2 border-amber-600 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-950">
            現在および過去の勤務先、取引先、その他の組織が運営、監修、推奨するものではありません。法的判断や作業の最終判断は、公式情報、専門家、各組織の手順に従ってください。
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {STORY_LINKS.map(([label, href], index) => (
              <Link
                key={href}
                href={href}
                prefetch={false}
                className={`inline-flex min-h-12 items-center justify-between gap-3 rounded-xl border-2 px-5 py-3 font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/30 ${index === 0 ? "border-emerald-800 bg-emerald-800 text-white" : "border-slate-800 bg-white text-slate-950"}`}
              >
                {label}
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}
