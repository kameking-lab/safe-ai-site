import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Download,
  FlaskConical,
  Headphones,
  Presentation,
} from "lucide-react";
import { HomeDirectChatClient } from "@/components/home-safety-cockpit/home-chat-quick-ask";
import { HomeDirectChemicalClient } from "@/components/home-safety-cockpit/home-chemical-quick-search";
import { SAFETY_MANAGEMENT_BASICS_OSH_LAW_SEMINAR_PATH } from "@/data/safety-seminars/themes";

const SEMINAR_PATH = SAFETY_MANAGEMENT_BASICS_OSH_LAW_SEMINAR_PATH;
const DOWNLOAD_PATH = `${SEMINAR_PATH}/downloads`;

export function HomeActionCockpit() {
  return (
    <section
      aria-labelledby="home-action-cockpit-title"
      className="border-b border-slate-200 bg-[#f7f4ec] px-4 py-7 text-slate-950 sm:px-6 sm:py-10"
      data-home-section="action-cockpit"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-[.16em] text-emerald-800">
              ここから、そのまま使えます
            </p>
            <h2
              id="home-action-cockpit-title"
              className="mt-1 text-2xl font-black tracking-tight sm:text-3xl"
            >
              質問・検索・安全教育をワンクリックで
            </h2>
          </div>
          <p className="max-w-xl text-sm font-semibold leading-6 text-slate-600">
            入力内容は次の画面へ引き継ぎます。公開中の教材は、一覧を探さず直接再生できます。
          </p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <article className="rounded-3xl border-2 border-sky-900 bg-[#e9f5f7] p-4 shadow-[5px_5px_0_#0c4a6e] sm:p-5">
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

          <article className="rounded-3xl border-2 border-amber-900 bg-[#fff3d8] p-4 shadow-[5px_5px_0_#92400e] sm:p-5">
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

        <article className="mt-4 overflow-hidden rounded-3xl border-2 border-slate-900 bg-white shadow-[5px_5px_0_#0f766e]">
          <div className="grid lg:grid-cols-[18rem_minmax(0,1fr)]">
            <div className="relative min-h-48 overflow-hidden bg-emerald-100">
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
                音声付きスライドをすぐ再生。朝礼投影、編集用PowerPoint、配布用PDFも選べます。
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
                <Link
                  href={`${SEMINAR_PATH}#seminar-player`}
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-slate-300 px-4 py-3 text-sm font-black text-slate-800"
                >
                  <Headphones className="h-5 w-5" aria-hidden="true" />
                  音声で再生
                </Link>
                <a
                  href={`${DOWNLOAD_PATH}/safety-management-basics-osh-law-training.pptx`}
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-slate-300 px-4 py-3 text-sm font-black text-slate-800"
                >
                  <Download className="h-5 w-5" aria-hidden="true" />
                  PPTX
                </a>
                <a
                  href={`${DOWNLOAD_PATH}/safety-management-basics-osh-law-training.pdf`}
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-slate-300 px-4 py-3 text-sm font-black text-slate-800"
                >
                  <Download className="h-5 w-5" aria-hidden="true" />
                  PDF
                </a>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
