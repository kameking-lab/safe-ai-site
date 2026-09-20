import type { ReactNode } from "react";
import { Mascot, type MascotVariant } from "@/components/mascot";

type CompanionTone = "green" | "amber" | "rose" | "violet" | "sky" | "cream";

const TONE_STYLES: Record<CompanionTone, string> = {
  green: "border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-50",
  amber: "border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-50",
  rose: "border-rose-200 bg-rose-50/80 text-rose-950 dark:border-rose-800 dark:bg-rose-950/35 dark:text-rose-50",
  violet: "border-violet-200 bg-violet-50/80 text-violet-950 dark:border-violet-800 dark:bg-violet-950/35 dark:text-violet-50",
  sky: "border-sky-200 bg-sky-50/80 text-sky-950 dark:border-sky-800 dark:bg-sky-950/35 dark:text-sky-50",
  cream: "border-stone-200 bg-[#fffaf0] text-stone-950 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50",
};

export type FeatureMascotCompanionProps = {
  variant: MascotVariant;
  eyebrow: string;
  title: ReactNode;
  message?: ReactNode;
  tone?: CompanionTone;
  className?: string;
  compact?: boolean;
};

/**
 * 主機能ページで、同じチワワを「次に何を見るか」を伝える小さな案内役として使う。
 * 画像は装飾扱いにし、意味は常にテキストでも伝える。
 */
export function FeatureMascotCompanion({
  variant,
  eyebrow,
  title,
  message,
  tone = "green",
  className = "",
  compact = false,
}: FeatureMascotCompanionProps) {
  return (
    <aside
      className={`relative overflow-hidden rounded-[1.75rem] border ${TONE_STYLES[tone]} ${
        compact ? "p-3" : "p-4 sm:p-5"
      } ${className}`}
      aria-label={`${eyebrow}からの案内`}
      data-feature-mascot-companion={variant}
    >
      <div className={`grid items-center ${compact ? "grid-cols-[3.5rem_minmax(0,1fr)] gap-3" : "grid-cols-[4.5rem_minmax(0,1fr)] gap-4 sm:grid-cols-[5.5rem_minmax(0,1fr)]"}`}>
        <div className="flex aspect-square items-center justify-center rounded-2xl bg-white/75 p-1.5 shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
          <Mascot
            variant={variant}
            size={compact ? "md" : "lg"}
            alt=""
            sizes={compact ? "48px" : "96px"}
            className="drop-shadow-sm"
          />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-black tracking-[.14em] opacity-70">{eyebrow}</p>
          <p className={`${compact ? "mt-0.5 text-sm" : "mt-1 text-base sm:text-lg"} font-black leading-6`}>
            {title}
          </p>
          {message ? (
            <div className="mt-1 text-sm font-medium leading-6 opacity-80">{message}</div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
