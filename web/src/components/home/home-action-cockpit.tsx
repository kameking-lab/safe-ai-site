import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  FlaskConical,
  Presentation,
} from "lucide-react";
import { HomeDirectChatClient } from "@/components/home-safety-cockpit/home-chat-quick-ask";
import { HomeDirectChemicalClient } from "@/components/home-safety-cockpit/home-chemical-quick-search";
import { SAFETY_MANAGEMENT_BASICS_OSH_LAW_SEMINAR_PATH } from "@/data/safety-seminars/themes";

const SEMINAR_PATH = SAFETY_MANAGEMENT_BASICS_OSH_LAW_SEMINAR_PATH;

export function HomeActionCockpit() {
  return (
    <section
      id="mascot-tools"
      aria-labelledby="home-action-cockpit-title"
      className="scroll-mt-24 rounded-[2rem] border-2 border-emerald-200 bg-[#f7f4ec] px-4 py-7 text-slate-950 shadow-2xl sm:px-6 sm:py-10"
      data-home-section="action-cockpit"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image src="/mascot/mascot-chat-talk-v4.webp" alt="" width={88} height={88} className="h-20 w-20 rounded-2xl bg-emerald-100 object-contain" />
            <div>
            <p className="text-xs font-black tracking-[.16em] text-emerald-800">
              チワワと、ここで試せます
            </p>
            <h2
              id="home-action-cockpit-title"
              className="mt-1 text-2xl font-black tracking-tight sm:text-3xl"
            >
              5つの機能をすぐ使う
            </h2>
            </div>
          </div>
          <p className="max-w-xl text-sm font-semibold leading-6 text-slate-600">
            質問と化学物質の検索はこの下で入力できます。速報・スライド・法改正は1回押すと開きます。
          </p>
        </div>

        <nav aria-label="チワワと試す5機能" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <a href="#mascot-chat" className="flex min-h-12 items-center justify-center rounded-xl bg-sky-900 px-2 text-center text-sm font-black text-white">安衛法AI</a>
          <a href="#mascot-chemical" className="flex min-h-12 items-center justify-center rounded-xl bg-amber-800 px-2 text-center text-sm font-black text-white">化学物質RA</a>
          <Link href="/accident-news" className="flex min-h-12 items-center justify-center rounded-xl bg-rose-800 px-2 text-center text-sm font-black text-white">死亡事故速報</Link>
          <a href="#mascot-slides" className="flex min-h-12 items-center justify-center rounded-xl bg-emerald-800 px-2 text-center text-sm font-black text-white">安全スライド</a>
          <Link href="/laws" className="col-span-2 flex min-h-12 items-center justify-center rounded-xl bg-violet-800 px-2 text-center text-sm font-black text-white sm:col-span-1">法改正</Link>
        </nav>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <article id="mascot-chat" className="scroll-mt-24 rounded-3xl border-2 border-sky-900 bg-[#e9f5f7] p-4 shadow-[5px_5px_0_#0c4a6e] sm:p-5">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-900 text-white">
                <Bot className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-xl font-black">労働安全衛生法AI</h3>
                <p className="mt-1 text-sm font-semibold leading-5 text-slate-700">
                  現場の言葉で質問し、関係する条文・通達・一次資料を確認します。
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-white p-3 sm:p-4">
              <HomeDirectChatClient />
            </div>
          </article>

          <article id="mascot-chemical" className="scroll-mt-24 rounded-3xl border-2 border-amber-900 bg-[#fff3d8] p-4 shadow-[5px_5px_0_#92400e] sm:p-5">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-900 text-white">
                <FlaskConical className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-xl font-black">化学物質リスクアセスメント</h3>
                <p className="mt-1 text-sm font-semibold leading-5 text-slate-700">
                  物質名またはCAS番号から、SDS確認と公式RAへの入口を作ります。
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-white p-3 sm:p-4">
              <HomeDirectChemicalClient />
            </div>
          </article>
        </div>

        <article id="mascot-slides" className="mt-4 scroll-mt-24 overflow-hidden rounded-3xl border-2 border-slate-900 bg-white shadow-[5px_5px_0_#0f766e]">
          <div className="grid lg:grid-cols-[18rem_minmax(0,1fr)]">
            <div className="relative hidden min-h-48 overflow-hidden bg-emerald-100 lg:block">
              <Image
                src={`${SEMINAR_PATH}/safe-site-hero.webp`}
                alt="安全管理の基本と労働安全衛生法を学ぶ安全教育スライド"
                fill
                priority
                sizes="(max-width: 1023px) 100vw, 18rem"
                className="object-cover"
              />
              <span className="absolute left-3 top-3 rounded-full bg-emerald-900 px-3 py-1 text-xs font-black text-white">
                おすすめ・全12枚
              </span>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-xs font-black tracking-[.14em] text-emerald-800">
                SAFETY TRAINING
              </p>
              <h3 className="mt-1 text-2xl font-black leading-tight">
                安全管理の基本と安衛法
              </h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                安衛法の要点をスライドで確認できます。配布資料は教材ページから使えます。
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`${SEMINAR_PATH}#seminar-player`}
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700"
                >
                  <Presentation className="h-5 w-5" aria-hidden="true" />
                  スライドを見る
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
