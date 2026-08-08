import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  ClipboardList,
  ExternalLink,
  Presentation,
  ShieldAlert,
  Sun,
  ThermometerSun,
} from "lucide-react";
import { HomeHeatRiskStatus } from "@/components/heat-illness/home-heat-risk-status";
import { MascotGuide } from "@/components/mascot-guide";
import type { HeatCampaignPresentation } from "@/lib/heat-illness/campaign-season";

function formatTodayJst(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatYearJst(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
  }).format(date);
}

const actions = [
  {
    href: "/heat-illness-prevention",
    label: "今日の熱中症リスクを見る",
    icon: ThermometerSun,
    primary: true,
  },
  {
    href: "/ky/paper?topic=heat-illness",
    label: "熱中症KYを作る",
    icon: ClipboardList,
    primary: false,
  },
  {
    href: "/heat-illness-prevention/elearning",
    label: "5分で学ぶ",
    icon: BookOpenCheck,
    primary: false,
  },
  {
    href: "/heat-illness-prevention/slides",
    label: "教育スライドを見る",
    icon: Presentation,
    primary: false,
  },
] as const;

export function HeatSafetySpecial({
  presentation = "seasonal-large",
  todayJstLabel = formatTodayJst(new Date()),
  campaignYearLabel = formatYearJst(new Date()),
}: {
  presentation?: HeatCampaignPresentation;
  todayJstLabel?: string;
  campaignYearLabel?: string;
}) {
  const isSeasonalLarge = presentation === "seasonal-large";
  return (
    <section
      aria-labelledby="heat-safety-special-title"
      aria-label={
        isSeasonalLarge
          ? "夏の重点対策｜今日の熱中症リスクを確認"
          : "季節の重点対策｜熱中症予防を確認"
      }
      data-heat-campaign-presentation={presentation}
      className={`relative overflow-hidden border-orange-300 bg-slate-950 text-white shadow-[0_30px_90px_-45px_rgba(15,23,42,.85)] forced-colors:border-2 forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] dark:border-orange-700 ${
        isSeasonalLarge
          ? "rounded-b-[2rem] border-b-2 border-t-2 p-4 sm:rounded-[2rem] sm:border-2 sm:p-6 lg:p-8"
          : "rounded-2xl border-2 p-5 sm:p-6"
      }`}
    >
      <div className={isSeasonalLarge ? "mx-auto max-w-7xl" : ""}>
        <header
          className={
            isSeasonalLarge
              ? "grid min-w-0 gap-5 lg:grid-cols-[minmax(0,.88fr)_minmax(420px,1.12fr)] lg:items-stretch"
              : "max-w-5xl"
          }
        >
          <div className="relative z-10 flex min-w-0 flex-col justify-center py-2 lg:py-6">
            <div className="flex flex-wrap gap-2 text-xs font-black">
              <span className="portal-light-ink inline-flex min-h-7 items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-slate-950 forced-colors:border">
                <Sun className="h-4 w-4" aria-hidden="true" />
                {isSeasonalLarge ? "夏の重点対策" : "季節の重点対策"}
              </span>
              {isSeasonalLarge ? (
                <>
                  <span className="inline-flex min-h-7 items-center rounded-full border border-orange-300 bg-orange-950/70 px-3 py-1 text-orange-100 forced-colors:border">
                    重点実施中
                  </span>
                  <span className="inline-flex min-h-7 items-center rounded-full border border-white/50 bg-slate-950/70 px-3 py-1 text-white forced-colors:border">
                    {campaignYearLabel} 夏季
                  </span>
                </>
              ) : (
                <span className="inline-flex min-h-7 items-center rounded-full border border-white/50 bg-slate-950/70 px-3 py-1 text-white forced-colors:border">
                  通常表示
                </span>
              )}
            </div>
            <h1
              id="heat-safety-special-title"
              aria-label={
                isSeasonalLarge
                  ? "夏の重点対策｜今日の熱中症リスクを確認"
                  : "季節の重点対策｜熱中症予防を確認"
              }
              className={`mt-4 font-black leading-[1.05] tracking-tight text-white forced-colors:text-[CanvasText] ${
                isSeasonalLarge
                  ? "text-4xl sm:text-6xl"
                  : "text-2xl sm:text-3xl"
              }`}
            >
              {isSeasonalLarge ? (
                <>
                  今日の熱中症リスクを
                  <span className="block text-orange-400 forced-colors:text-[CanvasText]">
                    見て、動く。
                  </span>
                </>
              ) : (
                "季節の重点対策｜熱中症予防を確認"
              )}
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-200 forced-colors:text-[CanvasText] sm:text-base">
              WBGT・警報・休憩・水分を確認し、朝礼の行動へつなげます。
            </p>
            {isSeasonalLarge ? (
              <MascotGuide
                variant="heat"
                title="まずWBGTと警報を確認"
                className="mt-4 max-w-md"
              />
            ) : null}
          </div>
          {isSeasonalLarge ? (
            <div className="relative min-h-[250px] overflow-hidden rounded-[1.75rem] border-2 border-cyan-300/50 shadow-2xl lg:min-h-[390px]">
              <picture className="contents">
                <source
                  media="(max-width: 639px)"
                  srcSet="/visual-refresh/heat-field-briefing-hero-480.webp"
                />
                <img
                  src="/visual-refresh/heat-field-briefing-hero-768.webp"
                  srcSet="/visual-refresh/heat-field-briefing-hero-768.webp 768w, /visual-refresh/heat-field-briefing-hero-1200.webp 1200w"
                  alt="日陰でWBGT、水分、作業計画を確認する現場チームのイラスト"
                  width={1200}
                  height={675}
                  sizes="(max-width: 1024px) 100vw, 720px"
                  loading="eager"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                  fetchPriority="high"
                />
              </picture>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 grid grid-cols-3 gap-2 p-3 text-center text-[10px] font-black sm:p-4 sm:text-xs">
                {["測る", "変える", "声をかける"].map((label, index) => (
                  <span
                    key={label}
                    className="rounded-xl border border-white/30 bg-slate-950/75 px-2 py-2 backdrop-blur-sm"
                  >
                    <span className="mr-1 text-orange-300">0{index + 1}</span>
                    {label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </header>

        {isSeasonalLarge ? (
          <div className="mt-6 grid gap-4 [content-visibility:auto] [contain-intrinsic-size:auto_720px] xl:grid-cols-[minmax(310px,0.65fr)_minmax(0,1.35fr)]">
            <nav
              aria-label="熱中症対策の主要操作"
              className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1"
            >
              {actions.map(({ href, label, icon: Icon, primary }) => (
                <Link
                  key={href}
                  href={href}
                  prefetch={false}
                  data-primary-action={primary ? "" : undefined}
                  className={`group flex min-h-14 min-w-0 items-center justify-between gap-2 rounded-xl border-2 px-3 py-3 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300 sm:px-4 sm:text-base ${
                    primary
                      ? "portal-light-ink border-orange-400 bg-orange-500 text-slate-950 shadow-lg hover:bg-orange-400 forced-colors:border-[CanvasText]"
                      : "border-cyan-700 bg-slate-900 text-white hover:border-cyan-300 hover:bg-slate-800"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 [overflow-wrap:anywhere]">
                      {label}
                    </span>
                  </span>
                  <ArrowRight
                    className="h-5 w-5 shrink-0 motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </nav>
            <HomeHeatRiskStatus todayJstLabel={todayJstLabel} />
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/heat-illness-prevention"
              prefetch={false}
              className="portal-light-ink inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-black text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300"
            >
              熱中症対策を確認する
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/ky/paper?topic=heat-illness"
              prefetch={false}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-orange-300 bg-slate-900 px-5 py-3 font-black text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300"
            >
              熱中症KYを作る
            </Link>
          </div>
        )}

        <div
          role="note"
          className="mt-4 flex items-start gap-2 rounded-xl border-2 border-amber-400 bg-amber-950/70 p-3 text-sm text-amber-100 forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]"
        >
          <ShieldAlert
            className="mt-0.5 h-5 w-5 shrink-0"
            aria-hidden="true"
          />
          <p>
            <strong>重要：</strong>
            症状があれば作業を止め、一人にしないでください。反応がないなど緊急時は119番を優先。本特集は未監修・外部確認待ちのため、公的資料と専門家の判断を正本とします。
          </p>
        </div>

        <details className="mt-4 rounded-xl border border-slate-600 bg-slate-900/80 p-3 text-slate-100 forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]">
          <summary className="min-h-11 cursor-pointer py-2 font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300">
            根拠・詳しい説明
          </summary>
          <div className="space-y-3 pt-2 text-sm leading-6 text-slate-200 forced-colors:text-[CanvasText]">
            <p>
              気温予報はWBGTの実測値・推定値ではありません。対象地点と時刻を合わせ、必要な現場実測、作業内容、服装、体調を人が確認してください。
              取得不能または更新時刻不明なら、「安全」「警報なし」と扱いません。
            </p>
            <nav
              aria-label="熱中症の公式一次資料"
              className="flex flex-wrap gap-2"
            >
              <a
                href="https://www.wbgt.env.go.jp/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 font-bold text-sky-200 underline focus-visible:ring-4 focus-visible:ring-orange-300 forced-colors:text-[LinkText]"
              >
                WBGTを確認する
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="https://www.jma.go.jp/jma/kishou/know/bosai/heat_alert.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 font-bold text-sky-200 underline focus-visible:ring-4 focus-visible:ring-orange-300 forced-colors:text-[LinkText]"
              >
                気象庁の熱中症警戒アラート
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="https://neccyusho.mhlw.go.jp/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 font-bold text-sky-200 underline focus-visible:ring-4 focus-visible:ring-orange-300 forced-colors:text-[LinkText]"
              >
                厚生労働省の職場向け情報
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </nav>
          </div>
        </details>
      </div>
    </section>
  );
}
