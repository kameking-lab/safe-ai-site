"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  ClipboardCheck,
  HardHat,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Mascot } from "@/components/mascot";

const STORY_LINKS = [
  ["安全AIポータルを使う", "/"],
  ["できることを見る", "/safety-ai"],
  ["品質と出典を見る", "/about/quality"],
  ["業務改善・資料制作の相談範囲を見る", "/about#work-support"],
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
              <span aria-current="page">プロジェクトについて</span>
            </nav>
            <p className="mt-5 text-sm font-black tracking-[.14em] text-emerald-800 dark:text-emerald-300">PROJECT POLICY</p>
            <h1 className="mt-3 text-[clamp(2.4rem,6vw,4.4rem)] font-black leading-[1.02] tracking-[-.05em]">
              労働安全と生成AIを、根拠を確認できる形へ。
            </h1>
            <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-slate-700 dark:text-slate-200">
              安全AIポータルは、労働安全の一次資料と現場で使う道具を、探しやすく確認しやすい形へ整える公開Webプロジェクトです。目的、編集体制、品質の境界をここで説明します。
            </p>
          </div>
          <div className="mx-auto rounded-2xl border-2 border-slate-900 bg-white p-2 shadow-[5px_5px_0_#f59e0b] dark:bg-slate-900">
            <Mascot variant="tablet-dx" size="lg" eager sizes="96px" alt="現場の改善を考えるチワワ" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <section data-story-block="origin" aria-labelledby="story-origin" className="grid gap-4 border-b border-slate-300 pb-8 sm:grid-cols-[3rem_minmax(0,1fr)] dark:border-slate-700">
          <HardHat className="h-8 w-8 text-emerald-800 dark:text-emerald-300" aria-hidden="true" />
          <div>
            <h2 id="story-origin" className="text-2xl font-black">1. 目的</h2>
            <p className="mt-3 text-base leading-8 text-slate-700 dark:text-slate-200">
              法令、通達、事故事例、化学物質、気象、安全教育など、確認先が分かれやすい情報を一つの入口からたどれるようにします。AIは検索や整理を補助しますが、公式情報、現場責任者、専門家による判断を置き換えません。
            </p>
          </div>
        </section>

        <section data-story-block="field" aria-labelledby="story-field" className="grid gap-4 border-b border-slate-300 py-8 sm:grid-cols-[3rem_minmax(0,1fr)] dark:border-slate-700">
          <BookOpenCheck className="h-8 w-8 text-sky-800 dark:text-sky-300" aria-hidden="true" />
          <div>
            <h2 id="story-field" className="text-2xl font-black">2. 公開するもの</h2>
            <p className="mt-3 text-base leading-8 text-slate-700 dark:text-slate-200">
              根拠付き法令検索、KY支援、建設計算、事故事例・法改正・通達の整理、現場帳票、安全教育などを提供します。各ページでは、出典、更新日、確認状態、利用上の限界をできる限り明示します。
            </p>
          </div>
        </section>

        <section data-story-block="essential-work" aria-labelledby="story-essential" className="grid gap-4 border-b border-slate-300 py-8 sm:grid-cols-[3rem_minmax(0,1fr)] dark:border-slate-700">
          <UsersRound className="h-8 w-8 text-amber-800 dark:text-amber-300" aria-hidden="true" />
          <div>
            <h2 id="story-essential" className="text-2xl font-black">3. 編集・監修体制</h2>
            <p className="mt-3 text-base leading-8 text-slate-700 dark:text-slate-200">
              制作・更新・訂正の窓口は「安全AIポータル編集部」に統一しています。プロジェクトは労働安全コンサルタント監修のもとで運用し、個別コンテンツの確認状況は各ページの表示を優先します。
            </p>
            <p className="mt-3 text-base leading-8 text-slate-700 dark:text-slate-200">
              監修資格は品質管理の一要素であり、法令適合、行政受理、現場承認、安全な結果を保証する表示ではありません。重要な判断では必ず一次資料と事業場の手順を確認してください。
            </p>
          </div>
        </section>

        <section data-story-block="listen" aria-labelledby="story-listen" className="grid gap-4 border-b border-slate-300 py-8 sm:grid-cols-[3rem_minmax(0,1fr)] dark:border-slate-700">
          <ShieldCheck className="h-8 w-8 text-orange-800 dark:text-orange-300" aria-hidden="true" />
          <div>
            <h2 id="story-listen" className="text-2xl font-black">4. プライバシーと公開境界</h2>
            <p className="mt-3 text-base leading-8 text-slate-700 dark:text-slate-200">
              公開ページには、監修者の氏名、資格番号、所属に関する情報、連絡先、住所など、本人特定につながる情報を掲載しません。問い合わせにも、健康情報、現場機密、第三者の個人情報を入力しないよう案内します。
            </p>
            <p className="mt-3 text-base leading-8 text-slate-700 dark:text-slate-200">
              構造化データ、配布資料、画像メタデータを含めて公開前に検査し、不要な識別情報を残さない運用を行います。
            </p>
          </div>
        </section>

        <section data-story-block="independent" aria-labelledby="story-independent" className="pt-8">
          <ClipboardCheck className="h-8 w-8 text-violet-800 dark:text-violet-300" aria-hidden="true" />
          <h2 id="story-independent" className="mt-3 text-2xl font-black">5. 品質確認と改善</h2>
          <p className="mt-3 text-base leading-8 text-slate-700 dark:text-slate-200">
            出典照合、自動テスト、リンク確認、モバイル表示、アクセシビリティ、プライバシー検査を継続します。誤りや不足が判明した場合は修正し、確認できない情報を確定事項として表示しません。
          </p>
          <p className="mt-3 rounded-xl border-2 border-amber-600 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-950">
            AI回答、計算結果、教材、帳票例は最終判断を代替しません。法的判断や作業の実施可否は、公式情報、現場責任者、専門家、各組織の手順に従ってください。
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
