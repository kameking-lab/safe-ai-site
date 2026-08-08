import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import {
  MascotGuide,
  type MascotGuideVariant,
} from "@/components/mascot-guide";
import { FocusTargetAnchor } from "@/components/focus-target-anchor";

type Action = { href: string; label: string; external?: boolean };
type Jump = { href: `#${string}`; label: string };
export type TaskPageVisual =
  | "heat"
  | "field"
  | "paper"
  | "chemical"
  | "law"
  | "data"
  | "chat"
  | "signage"
  | "ai"
  | "learning";

const VISUAL_THEMES: Record<
  TaskPageVisual,
  {
    label: string;
    section: string;
    iconBox: string;
    mascot: MascotGuideVariant;
    guideTitle: string;
  }
> = {
  heat: {
    label: "SUMMER SAFETY",
    section: "border-t-semantic-caution",
    iconBox: "text-semantic-caution",
    mascot: "heat",
    guideTitle: "暑さの状況から確認しよう",
  },
  field: {
    label: "FIELD OPERATIONS",
    section: "border-t-brand-primary",
    iconBox: "text-brand-primary-solid",
    mascot: "default",
    guideTitle: "地域と今日の作業を選ぼう",
  },
  paper: {
    label: "FIELD WORKSHEET",
    section: "border-t-brand-primary",
    iconBox: "text-brand-primary-solid",
    mascot: "caution",
    guideTitle: "未確認の項目から入力しよう",
  },
  chemical: {
    label: "CHEMICAL SAFETY",
    section: "border-t-semantic-caution",
    iconBox: "text-semantic-caution",
    mascot: "caution",
    guideTitle: "CAS・SDSから確認しよう",
  },
  law: {
    label: "LEGAL NAVIGATION",
    section: "border-t-semantic-official",
    iconBox: "text-semantic-official",
    mascot: "search",
    guideTitle: "言葉や条番号で調べよう",
  },
  data: {
    label: "ACCIDENT INTELLIGENCE",
    section: "border-t-semantic-official",
    iconBox: "text-semantic-official",
    mascot: "search",
    guideTitle: "出典と対象期間を見よう",
  },
  chat: {
    label: "SOURCE-FIRST CHAT",
    section: "border-t-semantic-ai",
    iconBox: "text-semantic-ai-solid",
    mascot: "search",
    guideTitle: "作業条件を具体的に質問しよう",
  },
  signage: {
    label: "MORNING SIGNAGE",
    section: "border-t-semantic-info",
    iconBox: "text-semantic-info",
    mascot: "default",
    guideTitle: "朝礼表示を確認しよう",
  },
  ai: {
    label: "HUMAN-IN-THE-LOOP",
    section: "border-t-semantic-ai",
    iconBox: "text-semantic-ai-solid",
    mascot: "automation",
    guideTitle: "人が確定できる流れにしよう",
  },
  learning: {
    label: "LEARNING COACH",
    section: "border-t-semantic-success",
    iconBox: "text-semantic-success",
    mascot: "learning",
    guideTitle: "対象と所要時間から選ぼう",
  },
};

function TaskVisualPanel({
  visual,
  steps,
}: {
  visual: TaskPageVisual;
  steps: string[];
}) {
  const theme = VISUAL_THEMES[visual];
  const visualThings =
    steps.length > 0 ? steps.slice(0, 5) : ["確認", "実行", "人が確定"];
  return (
    <div
      aria-hidden="true"
      className="relative min-h-0 overflow-hidden rounded-[var(--radius-lg)] border border-portal-border bg-brand-secondary-solid p-4 text-white shadow-[var(--shadow-md)] sm:min-h-56 sm:p-5"
    >
      <span
        className="absolute -right-5 -top-12 hidden text-[10rem] font-black leading-none text-white/10 sm:block"
      >
        01
      </span>
      <MascotGuide
        variant={theme.mascot}
        title={theme.guideTitle}
        message={theme.label}
        compact
        className="relative z-10"
      />
      <ol className="relative z-10 mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-1">
        {visualThings.map((thing, index) => (
          <li
            key={thing}
            className="flex min-w-0 flex-col items-start gap-2 rounded-xl border border-white/20 bg-white/10 px-2 py-2 backdrop-blur-sm sm:flex-row sm:items-center sm:gap-3 sm:px-3"
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-black sm:h-8 sm:w-8 sm:text-xs ${theme.iconBox}`}>
              {index + 1}
            </span>
            <span className="text-xs font-black leading-tight [overflow-wrap:anywhere] sm:text-sm">{thing}</span>
          </li>
        ))}
      </ol>
      <div className="absolute bottom-0 left-0 h-2 w-full bg-[linear-gradient(90deg,var(--primary-solid)_0_45%,var(--accent)_45%_72%,var(--accent-cool)_72%)] forced-colors:hidden" />
    </div>
  );
}

function ActionLink({
  action,
  primary = false,
}: {
  action: Action;
  primary?: boolean;
}) {
  const className = `text-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25 ${
    primary
      ? "portal-button-primary forced-colors:border"
      : "portal-button-secondary"
  }`;
  const content = (
    <>
      {action.label}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </>
  );
  if (action.external) {
    return (
      <a
        href={action.href}
        target="_blank"
        rel="noopener noreferrer"
        data-primary-action={primary ? "" : undefined}
        className={className}
      >
        {content}
      </a>
    );
  }
  if (primary && action.href.startsWith("#")) {
    return (
      <FocusTargetAnchor
        href={action.href as `#${string}`}
        data-primary-action=""
        className={className}
      >
        {content}
      </FocusTargetAnchor>
    );
  }
  return (
    <Link
      href={action.href}
      prefetch={false}
      data-primary-action={primary ? "" : undefined}
      className={className}
    >
      {content}
    </Link>
  );
}

export function TaskPageIntro({
  eyebrow,
  title,
  summary,
  primaryAction,
  secondaryActions = [],
  status,
  things = [],
  jumps = [],
  importantNote,
  compactOnMobile = false,
  visual,
  visualSteps,
}: {
  eyebrow?: string;
  title: string;
  summary: string;
  primaryAction: Action;
  secondaryActions?: Action[];
  status?: string;
  things?: string[];
  jumps?: Jump[];
  importantNote?: string;
  /** 狭幅では主操作と重要注意を優先し、補助操作は下部導線へ委ねる。 */
  compactOnMobile?: boolean;
  /** ページ固有の色と図解を付け、同じ入口カードの反復を避ける。 */
  visual?: TaskPageVisual;
  /** 図解だけを5段階まで拡張する。本文の「できること」は3件以内を維持。 */
  visualSteps?: string[];
}) {
  const visualTheme = visual ? VISUAL_THEMES[visual] : null;
  return (
    <section
      aria-labelledby="task-page-title"
      data-task-visual={visual}
      className={`portal-surface relative overflow-hidden border-t-4 p-4 sm:p-6 ${
        visualTheme
          ? visualTheme.section
          : "border-t-brand-primary"
      }`}
    >
      <div
        className={
          visual
            ? "grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.22fr)_minmax(260px,.78fr)] lg:items-stretch"
            : ""
        }
      >
        <div className="min-w-0">
          <div className="max-w-4xl">
            {eyebrow ? (
              <span className="portal-section-kicker block">
                {eyebrow}
              </span>
            ) : null}
            <div className="mt-2 flex flex-wrap items-start gap-2">
              <h1
                id="task-page-title"
                className="text-3xl font-black leading-[1.08] tracking-tight text-brand-secondary dark:text-white sm:text-4xl"
              >
                {title}
              </h1>
              {status ? (
                <span className="portal-status">
                  {status}
                </span>
              ) : null}
            </div>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-portal-muted sm:text-base">
              {summary}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <ActionLink action={primaryAction} primary />
            <div className={compactOnMobile ? "hidden sm:contents" : "contents"}>
              {secondaryActions.slice(0, 2).map((action) => (
                <ActionLink key={`${action.href}-${action.label}`} action={action} />
              ))}
            </div>
          </div>

          {things.length > 0 ? (
            <ul
              aria-label="このページでできること"
              className={
                compactOnMobile
                  ? "sr-only"
                  : "mt-4 grid grid-cols-1 gap-2 text-xs min-[480px]:grid-cols-3 sm:text-sm"
              }
            >
              {things.slice(0, 3).map((thing, index) => (
                <li
                  key={thing}
                  className="flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-portal-border bg-portal-surface-emphasis px-3 py-2 font-bold text-brand-secondary dark:text-white"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-primary-solid text-[10px] font-black text-white forced-colors:border">
                    {index + 1}
                  </span>
                  {thing}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {visual ? (
          <div className={compactOnMobile ? "hidden sm:block" : ""}>
            <TaskVisualPanel visual={visual} steps={visualSteps ?? things} />
          </div>
        ) : null}
      </div>

      {importantNote ? (
        <div
          role="note"
          className="portal-callout-caution mt-4 flex items-start gap-2 p-3 text-sm"
        >
          <ShieldAlert
            className="mt-0.5 h-5 w-5 shrink-0"
            aria-hidden="true"
          />
          <div>
            <strong>重要な注意：</strong>
            {importantNote}
          </div>
        </div>
      ) : null}

      {jumps.length > 0 ? (
        <nav
          aria-label="ページ内メニュー"
          className={`mt-4 border-t border-portal-border pt-3 ${
            compactOnMobile ? "hidden sm:block" : ""
          }`}
        >
          <p className="text-xs font-black text-portal-muted">
            ページ内メニュー
          </p>
          <ul className="mt-1 flex flex-wrap gap-1">
            {jumps.slice(0, 7).map((jump) => (
              <li key={jump.href}>
                <a
                  href={jump.href}
                  className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold text-brand-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25"
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  {jump.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </section>
  );
}
