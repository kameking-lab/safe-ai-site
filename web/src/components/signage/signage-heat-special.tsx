import Link from "next/link";
import {
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  ThermometerSun,
} from "lucide-react";
import {
  SIGNAGE_HEAT_SPECIAL_STATES,
  type SignageHeatSpecialState,
} from "@/lib/signage/heat-special-state";

export { SIGNAGE_HEAT_SPECIAL_STATES };
export type { SignageHeatSpecialState };

type StatePresentation = {
  label: string;
  description: string;
  className: string;
};

const STATE_PRESENTATION: Record<
  SignageHeatSpecialState,
  StatePresentation
> = {
  checking: {
    label: "取得確認中",
    description: "取得中です。",
    className: "border-slate-400 bg-slate-900 text-slate-100",
  },
  normal: {
    label: "通常表示",
    description: "暑熱リスクは現場の実測値で確認してください。",
    className: "border-sky-500 bg-sky-950/60 text-sky-100",
  },
  stale: {
    label: "データが古い",
    description: "情報が古い。公式情報を確認してください。",
    className: "border-amber-400 bg-amber-950/70 text-amber-100",
  },
  offline: {
    label: "オフライン",
    description: "取得できません。公式情報を確認してください。",
    className: "border-rose-500 bg-rose-950/70 text-rose-100",
  },
  "partial-failure": {
    label: "一部取得失敗",
    description: "一部を確認できません。公式情報を確認してください。",
    className: "border-amber-400 bg-amber-950/70 text-amber-100",
  },
  emergency: {
    label: "緊急対応中",
    description: "作業中止、救急要請、責任者への連絡を優先してください。",
    className: "border-red-400 bg-red-950/80 text-red-50",
  },
  maintenance: {
    label: "保守中",
    description: "保守中です。公式情報を確認してください。",
    className: "border-slate-400 bg-slate-900 text-slate-100",
  },
  drill: {
    label: "訓練モード",
    description: "訓練表示です。実際の異常時は緊急手順を優先してください。",
    className: "border-violet-400 bg-violet-950/70 text-violet-100",
  },
};

type SignageHeatSpecialProps = {
  /**
   * Must be supplied by the host signage state machine. There is deliberately
   * no default because an absent state must never become an implicit normal
   * or safe status.
   */
  state: SignageHeatSpecialState;
  emphasis?: "seasonal" | "standard";
  className?: string;
};

/**
 * Static summer-focus card for signage.
 *
 * It performs no fetch, accepts no weather values, and cannot calculate WBGT.
 * `state` describes the surrounding display operation only; the copy prevents
 * that state from being mistaken for a heat-risk conclusion.
 */
export function SignageHeatSpecial({
  state,
  emphasis = "seasonal",
  className = "",
}: SignageHeatSpecialProps) {
  const presentation = STATE_PRESENTATION[state];
  const isEmergency = state === "emergency";

  return (
    <section
      role={isEmergency ? "alert" : "note"}
      aria-live={isEmergency ? "assertive" : undefined}
      aria-labelledby="signage-heat-special-title"
      data-signage-heat-state={state}
      data-signage-heat-emphasis={emphasis}
      data-testid="signage-heat-special"
      className={`rounded-2xl border-2 p-3 shadow-sm ${presentation.className} ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <ThermometerSun className="h-5 w-5" aria-hidden="true" />
            {emphasis === "seasonal" ? "夏季重点" : "季節の安全確認"}
          </p>
          <h2
            id="signage-heat-special-title"
            className="mt-1 text-lg font-black sm:text-xl xl:text-3xl"
          >
            熱中症対策
          </h2>
        </div>
        <p className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-current px-3 py-2 text-sm font-black">
          {isEmergency ? (
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          )}
          表示状態：{presentation.label}
        </p>
      </div>

      <p className="mt-3 text-sm font-semibold leading-6 xl:text-xl">
        {presentation.description}
      </p>

      <details className="mt-3 rounded-xl border border-white/40 px-3">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-black">
          公式情報・確認手順
        </summary>
        <nav
          aria-label="熱中症に関する公式確認先"
          className="grid gap-1 border-t border-white/30 pb-2 pt-1 sm:grid-cols-3"
        >
        <a
          href="https://www.jma.go.jp/jma/kishou/know/bosai/heat_alert.html"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[44px] items-center justify-between gap-2 rounded-lg border border-white/50 bg-black/20 px-3 py-2 text-sm font-bold text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
        >
          気象庁の発表
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
        </a>
        <a
          href="https://www.wbgt.env.go.jp/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[44px] items-center justify-between gap-2 rounded-lg border border-white/50 bg-black/20 px-3 py-2 text-sm font-bold text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
        >
          環境省の暑さ指数
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
        </a>
        <Link
          href="/heat-illness-prevention"
          className="flex min-h-[44px] items-center justify-between gap-2 rounded-lg border border-white/50 bg-black/20 px-3 py-2 text-sm font-bold text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
        >
          現場の確認手順
          <span aria-hidden="true">→</span>
        </Link>
        </nav>
      </details>
    </section>
  );
}
