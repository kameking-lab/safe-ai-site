"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Boxes,
  FileClock,
  FlaskConical,
  Images,
  Newspaper,
  PawPrint,
  Presentation,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Workflow,
} from "lucide-react";
import { HomeDirectChatClient } from "@/components/home-safety-cockpit/home-chat-quick-ask";
import { HomeDirectChemicalClient } from "@/components/home-safety-cockpit/home-chemical-quick-search";
import { SAFETY_MANAGEMENT_BASICS_OSH_LAW_SEMINAR_PATH } from "@/data/safety-seminars/themes";

// 旧「5つの機能をすぐ使う」パネルの操作は、対応する主機能カードの下段へ統合した。
// カード本体のリンク（li > a）と下段の操作は兄弟要素にし、操作をリンク内へ入れ子にしない。
type ServiceTool = "chat" | "chemical" | "slides";
const SERVICE_TOOLS: Partial<Record<string, { id: string; tool: ServiceTool }>> = {
  "/chatbot": { id: "mascot-chat", tool: "chat" },
  "/chemical-ra": { id: "mascot-chemical", tool: "chemical" },
  "/training/safety-seminars": { id: "mascot-slides", tool: "slides" },
};
const RECOMMENDED_SEMINAR_HREF = `${SAFETY_MANAGEMENT_BASICS_OSH_LAW_SEMINAR_PATH}#seminar-player`;

function ServiceToolPanel({ tool }: { tool: ServiceTool }) {
  if (tool === "chat") return <HomeDirectChatClient />;
  if (tool === "chemical") return <HomeDirectChemicalClient />;
  return (
    <Link href={RECOMMENDED_SEMINAR_HREF} prefetch={false} className="hs-tool-link">
      <Presentation aria-hidden="true" />
      <span>
        <span className="hs-tool-kicker">おすすめ・全12枚</span>
        安全管理の基本と安衛法のスライドを見る
      </span>
      <ArrowRight className="hs-arrow" aria-hidden="true" />
    </Link>
  );
}
const MAIN_SERVICES = [
  {
    href: "/chatbot",
    title: "安衛法AI",
    description:
      "現場の言葉で質問し、条文・通達・適用条件を一次資料つきで確認。",
    action: "AIに聞く",
    icon: Bot,
    mascot: "/mascot/mascot-law-reading.webp",
    mascotAlt: "法令集を開いて相談に答えるチワワ",
    role: "現場を知る法令相談役",
    surface: "#dcefe9",
    accent: "#176b57",
    softAccent: "#b9ddd2",
  },
  {
    href: "/chemical-ra",
    title: "化学物質RA",
    description: "物質名・CAS・SDSから、確認事項と公式RAへの道筋を整理。",
    action: "RAを始める",
    icon: FlaskConical,
    mascot: "/mascot/mascot-chemical-lab.webp",
    mascotAlt: "試験器具を使って化学物質を確認するチワワ",
    role: "化学物質の健康相談係",
    surface: "#f6ebcf",
    accent: "#a85d17",
    softAccent: "#ebc983",
  },
  {
    href: "/accident-news",
    title: "国内の死亡事故速報",
    description: "日本国内で報じられた労働中の死亡事故を確認する。",
    action: "死亡事故を確認",
    icon: Newspaper,
    mascot: "/mascot/mascot-news-read.webp",
    mascotAlt: "新聞を開いて国内の死亡事故速報を伝えるチワワ",
    role: "現場速報アナウンサー",
    surface: "#f3dfe0",
    accent: "#9a3f49",
    softAccent: "#e5aeb3",
  },
  {
    href: "/laws",
    title: "法改正速報",
    description: "施行日、対象、現場で先に変えることを短く把握。",
    action: "改正を確認",
    icon: FileClock,
    mascot: "/mascot/mascot-calendar-plan.webp",
    mascotAlt: "カレンダーで法改正の施行日を確認するチワワ",
    role: "法改正を追う取材記者",
    surface: "#e8e2f2",
    accent: "#65508d",
    softAccent: "#c8b9df",
  },
  {
    href: "/contact/automation-email",
    title: "自動化相談",
    description: "帳票、集計、研修資料、通知などの定型業務を見本つきで相談。",
    action: "メールで相談",
    icon: Workflow,
    mascot: "/mascot/mascot-tablet-dx.webp",
    mascotAlt: "タブレットを使って仕事の自動化を考えるチワワ",
    role: "業務改善エンジニア",
    surface: "#e6e1ee",
    accent: "#704e7b",
    softAccent: "#cdbbd3",
  },
  {
    href: "/goods",
    title: "安全グッズ",
    description:
      "作業条件から保護具・測定器・区画用品を絞り、そのまま購入検索へ。",
    action: "選び方を見る",
    icon: ShoppingBag,
    mascot: "/mascot/mascot-ppe-check.webp",
    mascotAlt: "保護具を点検して安全用品選びを手伝うチワワ",
    role: "頼れる安全用品店長",
    surface: "#dfeadd",
    accent: "#407044",
    softAccent: "#bcd4b8",
  },
  {
    href: "/training/safety-seminars",
    title: "自由に使えるスライド",
    description: "安全20テーマ・AI20テーマを軸に、音声・PPTX・PDFで展開。",
    action: "公開資料を見る",
    icon: Presentation,
    mascot: "/mascot/mascot-teacher.webp",
    mascotAlt: "黒板の前で安全教育をする先生役のチワワ",
    role: "安全を伝える先生",
    surface: "#dce9ef",
    accent: "#356b82",
    softAccent: "#b5d1dd",
  },
  {
    href: "/materials/safety-images",
    title: "自由に使える画像集",
    description: "立入禁止と着用・表示を中心に、最初の5+5案を公開。",
    action: "画像を確認",
    icon: Images,
    mascot: "/mascot/mascot-pointing.webp",
    mascotAlt: "安全画像を指し示して案内するチワワ",
    role: "素材づくりの案内役",
    surface: "#d9ece7",
    accent: "#2b7569",
    softAccent: "#acd7cd",
  },
  {
    href: "/accidents-analytics",
    title: "事故分析ダッシュボード",
    description:
      "厚労省データと収録事例を分け、業種・型・地域・年齢など多軸で分析。",
    action: "傾向を分析",
    icon: BarChart3,
    mascot: "/mascot/mascot-detective.webp",
    mascotAlt: "虫眼鏡で事故統計を調べる探偵役のチワワ",
    role: "事故データ研究員",
    surface: "#eee5d7",
    accent: "#8a6235",
    softAccent: "#dac29e",
  },
] as const;

const SERVICE_STYLES = `
.hs-section{background:#091f1a;padding:1.75rem 1rem}
.home-render-skip-section{content-visibility:auto}.home-skip-updates{contain-intrinsic-block-size:auto 50rem}.home-skip-labs{contain-intrinsic-block-size:auto 28.75rem}.home-skip-directory{contain-intrinsic-block-size:auto 158.5rem}.home-skip-consult{contain-intrinsic-block-size:auto 32.8rem}
.hs-wrap{max-width:80rem;margin-inline:auto}.hs-heading{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:1rem}
.hs-kicker{display:inline-flex;align-items:center;gap:.5rem;color:#6ee7b7;font-size:.75rem;font-weight:900;letter-spacing:.14em}.hs-kicker svg,.hs-arrow{width:1rem;height:1rem}
.hs-title{margin-top:.5rem;font-size:1.875rem;font-weight:900;letter-spacing:-.03em}.hs-lead{max-width:48rem;margin-top:.5rem;color:#cbd5e1;font-size:.875rem;font-weight:600;line-height:1.5rem}
.hs-all{display:inline-flex;min-height:2.75rem;align-items:center;gap:.5rem;border-radius:.5rem;padding-inline:.5rem;color:#a7f3d0;font-size:.875rem;font-weight:900;text-decoration:underline;text-underline-offset:4px}
.hs-quick{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.5rem;margin-top:1rem}.hs-quick-link{display:flex;min-height:4.25rem;flex-direction:column;align-items:center;justify-content:center;gap:.35rem;border:1px solid rgb(255 255 255/.16);border-radius:1rem;background:rgb(255 255 255/.08);padding:.5rem;color:#f8fafc;text-align:center;font-size:.68rem;font-weight:900;line-height:1rem}.hs-quick-link svg{width:1.2rem;height:1.2rem;color:#6ee7b7}.hs-quick-link:focus-visible{outline:3px solid #6ee7b7;outline-offset:2px}
.hs-grid{display:grid;gap:.75rem;margin-top:1.25rem}.hs-item{position:relative;display:flex;min-width:0;min-height:13rem;flex-direction:column;border:1px solid rgb(255 255 255/.15);border-radius:1.5rem;background:#fffdf8;color:#0f172a;box-shadow:0 22px 55px -34px rgb(0 0 0/.95);transition:border-color .2s,box-shadow .2s}.hs-item:not(.hs-item-tool){content-visibility:auto;contain-intrinsic-block-size:auto 13rem}.hs-item-tool{scroll-margin-top:6rem}
.hs-card{position:relative;display:flex;flex:1 0 auto;flex-direction:column;overflow:hidden;border-radius:1.5rem;color:inherit}.hs-item-tool .hs-card{flex-grow:0;border-bottom-left-radius:0;border-bottom-right-radius:0}
.hs-item:hover{border-color:rgb(255 255 255/.4);box-shadow:0 26px 65px -32px rgb(0 0 0/.9)}.hs-card:focus-visible,.hs-all:focus-visible{outline:0;box-shadow:0 0 0 4px #6ee7b7,0 0 0 8px #071b17}
.hs-visual{position:relative;height:6rem;overflow:hidden;background:var(--surface)}.hs-orb{position:absolute;left:-2rem;top:-2.5rem;width:7rem;height:7rem;border-radius:999px;background:var(--soft);opacity:.55}.hs-role{position:absolute;z-index:10;left:.75rem;top:.75rem;display:inline-flex;max-width:62%;align-items:center;gap:.35rem;border:1px solid rgb(255 255 255/.7);border-radius:999px;background:rgb(255 255 255/.84);padding:.25rem .55rem;color:#334155;font-size:.625rem;font-weight:900;letter-spacing:.02em;box-shadow:0 1px 2px rgb(0 0 0/.05);backdrop-filter:blur(4px)}
.hs-role svg{width:1rem;height:1rem;flex:none;color:var(--accent)}.hs-index{position:absolute;z-index:10;right:1rem;top:1rem;color:rgb(51 65 85/.45);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.75rem;font-weight:900}.hs-paw{position:absolute;z-index:10;bottom:.5rem;left:1.25rem;color:rgb(51 65 85/.2);transform:rotate(-9deg)}.hs-paw svg{width:2.25rem;height:2.25rem}
.hs-mascot{position:absolute;right:0;bottom:-1rem;width:8rem;height:7.5rem;object-fit:contain;object-position:bottom;filter:drop-shadow(0 12px 14px rgb(25 45 38/.2));transition:transform .3s}.hs-card:hover .hs-mascot{transform:translateY(-.25rem) rotate(1deg) scale(1.04)}.hs-badge{position:absolute;z-index:10;right:.55rem;bottom:.45rem;display:flex;width:2rem;height:2rem;align-items:center;justify-content:center;border:2px solid #fff;border-radius:999px;background:var(--accent);color:#fff;box-shadow:0 4px 6px -1px rgb(0 0 0/.1)}.hs-badge svg{width:1rem;height:1rem}
.hs-body{display:flex;flex:1 0 auto;min-height:7rem;flex-direction:column;padding:.7rem 1rem}.hs-name{color:#020617;font-size:1rem;font-weight:900;letter-spacing:-.02em}.hs-copy{display:-webkit-box;flex:1;overflow:hidden;margin-top:.25rem;color:#475569;font-size:.75rem;font-weight:600;line-height:1rem;-webkit-box-orient:vertical;-webkit-line-clamp:2}.hs-action{display:inline-flex;min-height:1.75rem;width:max-content;align-items:center;gap:.35rem;margin-top:.35rem;border-radius:999px;background:var(--accent);padding:.25rem .75rem;color:#fff;font-size:.75rem;font-weight:900;box-shadow:0 1px 2px rgb(0 0 0/.05)}.hs-action svg{transition:transform .2s}.hs-card:hover .hs-action svg{transform:translateX(.25rem)}
.hs-tool{display:flex;min-width:0;flex:1 0 auto;flex-direction:column;justify-content:flex-end;border-top:1px dashed var(--soft);padding:.75rem 1rem 1rem}.hs-tool-link{display:flex;min-height:3rem;align-items:center;gap:.6rem;border-radius:1rem;background:var(--accent);padding:.6rem 1rem;color:#fff;font-size:.875rem;font-weight:900;line-height:1.35}.hs-tool-link>svg:first-child{width:1.25rem;height:1.25rem;flex:none}.hs-tool-link>span{min-width:0;flex:1}.hs-tool-kicker{display:block;font-size:.6875rem;opacity:.9}.hs-tool-link:hover{filter:brightness(1.1)}.hs-tool-link:focus-visible{outline:3px solid #0f172a;outline-offset:3px}
@media(min-width:640px){.hs-section{padding:3.5rem 1.5rem}.hs-title{font-size:2.25rem}.hs-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;margin-top:1.75rem}.hs-item{min-height:21rem;border-radius:1.8rem}.hs-item:not(.hs-item-tool){contain-intrinsic-block-size:auto 21rem}.hs-card{border-radius:1.8rem}.hs-tool{padding:1rem 1.25rem 1.25rem}.hs-visual{height:9rem}.hs-role{left:1rem;top:1rem;max-width:58%;gap:.5rem;padding:.375rem .75rem;font-size:.6875rem;letter-spacing:.04em}.hs-mascot{bottom:-1.5rem;width:12rem;height:11rem}.hs-badge{right:.75rem;bottom:.75rem;width:2.5rem;height:2.5rem}.hs-badge svg{width:1.25rem;height:1.25rem}.hs-body{min-height:12rem;padding:1.25rem}.hs-name{font-size:1.25rem}.hs-copy{display:block;overflow:visible;margin-top:.5rem;font-size:.875rem;line-height:1.5rem}.hs-action{min-height:2.5rem;gap:.5rem;margin-top:1rem;padding:.5rem 1rem;font-size:.875rem}.hs-quick{display:none}}
@media(min-width:640px){.home-skip-updates{contain-intrinsic-block-size:auto 52.5rem}.home-skip-labs{contain-intrinsic-block-size:auto 25.625rem}.home-skip-directory{contain-intrinsic-block-size:auto 89rem}.home-skip-consult{contain-intrinsic-block-size:auto 24rem}}
@media(min-width:1280px){.hs-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(min-width:1280px){.home-skip-updates{contain-intrinsic-block-size:auto 38rem}.home-skip-labs{contain-intrinsic-block-size:auto 15.625rem}.home-skip-directory{contain-intrinsic-block-size:auto 52.5rem}.home-skip-consult{contain-intrinsic-block-size:auto 18.5rem}}
@media(max-width:480px){.hs-quick-link{min-height:5rem}.hs-quick-link,.hs-copy,.hs-kicker,.hs-role,.hs-index{font-size:.875rem;line-height:1.45}}
@media(prefers-reduced-motion:reduce){.hs-item,.hs-mascot,.hs-action svg{transition:none}.hs-card:hover .hs-mascot,.hs-card:hover .hs-action svg{transform:none}}
@media print{.hs-item,.home-render-skip-section{content-visibility:visible;contain-intrinsic-size:none}}
`;

export function HomeRelaunch({
  mascotContent,
  priorityContent,
}: {
  mascotContent?: ReactNode;
  priorityContent?: ReactNode;
} = {}) {
  const focusRing =
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#071b17]";

  return (
    <div className="overflow-hidden bg-[#071b17] text-white">
      <style>{SERVICE_STYLES}</style>
      <section
        aria-labelledby="home-relaunch-title"
        className="relative border-b border-white/10 px-4 py-8 sm:px-6 sm:py-12 lg:py-16"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(circle at 10% 20%, rgba(52,211,153,.22), transparent 32%), radial-gradient(circle at 78% 18%, rgba(14,165,233,.18), transparent 34%), linear-gradient(145deg,#071b17 0%,#0b2720 50%,#07141e 100%)",
          }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-7 min-[1360px]:grid-cols-[minmax(0,1.25fr)_minmax(20rem,.75fr)] min-[1360px]:items-center">
          <div>
            <div className="flex items-start justify-between gap-3">
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-xs font-black tracking-[.14em] text-emerald-200">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                現場の声を聴く、小さな安全相棒
              </p>
              <Image
                src="/mascot/mascot-chat-talk-v4.webp"
                alt=""
                width={112}
                height={112}
                priority
                className="-mt-3 h-28 w-28 shrink-0 object-contain drop-shadow-xl sm:hidden"
              />
            </div>
            <h1
              id="home-relaunch-title"
              className="mt-5 max-w-5xl text-[clamp(1.9rem,7vw,4rem)] font-black leading-[1.08] tracking-[-.045em] sm:leading-[1.05]"
            >
              <span className="block whitespace-nowrap">小さな気づきが、</span>
              <span className="block whitespace-nowrap bg-gradient-to-r from-emerald-300 via-cyan-200 to-sky-300 bg-clip-text text-transparent forced-colors:bg-none forced-colors:text-[CanvasText]">
                大きな事故を防ぐ。
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base font-bold leading-8 text-slate-200 sm:text-lg">
              大きな耳で現場の声を聴き、わずかな違和感を見逃さない。
              チワワは、安全を上から指導するのではなく、そばで確認を手伝う小さな相棒です。
            </p>

            <nav
              aria-label="すぐに使う主要機能"
              className="mt-6 grid gap-2 sm:grid-cols-3"
            >
              <Link
                href="/chatbot"
                prefetch={false}
                className={`group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-4 text-sm font-black text-slate-950 shadow-[0_14px_36px_-16px_rgba(52,211,153,.9)] hover:bg-emerald-200 motion-safe:transition motion-safe:hover:-translate-y-0.5 ${focusRing}`}
              >
                <Bot className="h-5 w-5" aria-hidden="true" />
                安衛法AIを開く
                <ArrowRight
                  className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/chemical-ra"
                prefetch={false}
                className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-black text-white hover:bg-white/15 motion-safe:transition-colors ${focusRing}`}
              >
                <FlaskConical
                  className="h-5 w-5 text-amber-200"
                  aria-hidden="true"
                />
                化学物質RAを開く
              </Link>
              <Link
                href="/resources/netis-safety"
                prefetch={false}
                className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-black text-white hover:bg-white/15 motion-safe:transition-colors ${focusRing}`}
              >
                <Boxes className="h-5 w-5 text-sky-200" aria-hidden="true" />
                安全技術を探す
              </Link>
            </nav>

            <ul
              aria-label="サービスの特徴"
              className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-slate-300"
            >
              <li className="inline-flex items-center gap-1.5">
                <ShieldCheck
                  className="h-4 w-4 text-emerald-300"
                  aria-hidden="true"
                />
                一次資料へのリンク表示
              </li>
              <li className="inline-flex items-center gap-1.5">
                <ShieldCheck
                  className="h-4 w-4 text-emerald-300"
                  aria-hidden="true"
                />
                主要機能は登録なしで利用可
              </li>
              <li className="inline-flex items-center gap-1.5">
                <ShieldCheck
                  className="h-4 w-4 text-emerald-300"
                  aria-hidden="true"
                />
                労働安全衛生コンサルタント監修
              </li>
            </ul>
          </div>

          <div className="relative mx-auto hidden w-full sm:block sm:max-w-[18rem] lg:max-w-[20rem] min-[1360px]:max-w-none">
            <div
              className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-emerald-300/20 via-cyan-300/5 to-transparent blur-2xl"
              aria-hidden="true"
            />
            <div className="relative overflow-hidden rounded-[2.2rem] border border-white/20 bg-[#102b24] p-2 shadow-2xl shadow-black/40">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.8rem] bg-[#d9efe6]">
                <Image
                  src="/mascot/mascot-chat-talk-v4.webp"
                  alt="吹き出しと一緒に相談を案内する安全AIポータルのチワワ"
                  fill
                  priority
                  sizes="(max-width: 1023px) 18rem, (max-width: 1359px) 20rem, 34vw"
                  className="object-contain p-2 sm:p-4"
                />
                <div className="absolute inset-x-3 bottom-3 hidden rounded-2xl border border-white/60 bg-white/92 p-4 text-slate-950 shadow-lg backdrop-blur sm:block">
                  <p className="text-xs font-black tracking-[.12em] text-emerald-800">
                    YOUR SAFETY PARTNER
                  </p>
                  <p className="mt-1 text-xl font-black">
                    気になること、聞いてみる？
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-600">
                    法令確認から保護具選びまで、必要な仕事へ案内します。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {mascotContent ? (
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-5 sm:px-6" data-mascot-toolbox>
          {mascotContent}
        </div>
      ) : null}

      {priorityContent}

      <section aria-labelledby="main-services-title" className="hs-section">
        <div className="hs-wrap">
          <div className="hs-heading">
            <div>
              <p className="hs-kicker">
                <PawPrint aria-hidden="true" />
                いつもの仕事を、相棒と
              </p>
              <h2 id="main-services-title" className="hs-title">
                仕事から選ぶ、9つの主機能
              </h2>
              <p className="hs-lead">
                入口を厳選しました。その他の機能はページ下部の一覧から探せます。
              </p>
            </div>
            <Link href="/features" prefetch={false} className="hs-all">
              すべての機能
              <ArrowRight className="hs-arrow" aria-hidden="true" />
            </Link>
          </div>

          <nav aria-label="9つの主機能へすぐ移動" className="hs-quick">
            {MAIN_SERVICES.map((service) => {
              const Icon = service.icon;
              return (
                <Link
                  key={`quick-${service.href}`}
                  href={service.href}
                  prefetch={false}
                  className="hs-quick-link"
                >
                  <Icon aria-hidden="true" />
                  <span>{service.title}</span>
                </Link>
              );
            })}
          </nav>

          <ul className="hs-grid">
            {MAIN_SERVICES.map((service, index) => {
              const Icon = service.icon;
              const palette = {
                "--surface": service.surface,
                "--accent": service.accent,
                "--soft": service.softAccent,
              } as CSSProperties;
              const content = (
                <>
                  <div className="hs-visual">
                    <span className="hs-orb" aria-hidden="true" />
                    <span className="hs-role">
                      <Icon aria-hidden="true" />
                      {service.role}
                    </span>
                    <span className="hs-index">0{index + 1}</span>
                    <span className="hs-paw" aria-hidden="true">
                      <PawPrint />
                    </span>
                    <Image
                      src={service.mascot}
                      alt={service.mascotAlt}
                      width={192}
                      height={176}
                      loading="lazy"
                      unoptimized
                      className="hs-mascot"
                    />
                    <span className="hs-badge" aria-hidden="true">
                      <Icon />
                    </span>
                  </div>
                  <div className="hs-body">
                    <h3 className="hs-name">{service.title}</h3>
                    <p className="hs-copy">{service.description}</p>
                    <span className="hs-action">
                      {service.action}
                      <ArrowRight className="hs-arrow" aria-hidden="true" />
                    </span>
                  </div>
                </>
              );
              const tool = SERVICE_TOOLS[service.href];
              return (
                <li
                  key={service.title}
                  id={tool?.id}
                  className={tool ? "hs-item hs-item-tool" : "hs-item"}
                  style={palette}
                >
                  <Link
                    href={service.href}
                    prefetch={false}
                    className="hs-card"
                  >
                    {content}
                  </Link>
                  {tool ? (
                    <div className="hs-tool" data-hs-tool={tool.tool}>
                      <ServiceToolPanel tool={tool.tool} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}
