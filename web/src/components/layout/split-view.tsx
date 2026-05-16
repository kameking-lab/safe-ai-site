import type { ReactNode } from "react";

type ListWidth = "narrow" | "default" | "wide";
type Breakpoint = "md" | "lg";

interface SplitViewProps {
  list: ReactNode;
  detail: ReactNode;
  /** When provided, list is hidden in single-pane (stacked) mode. */
  detailOpen?: boolean;
  listWidth?: ListWidth;
  breakpoint?: Breakpoint;
  className?: string;
}

// Tailwind v4 cannot parse arbitrary values with nested commas; use 1fr.
// Children use min-w-0 to prevent grid blowout from long content.
const GRID_CLASS: Record<Breakpoint, Record<ListWidth, string>> = {
  md: {
    narrow: "md:grid md:grid-cols-[16rem_1fr] md:gap-4",
    default: "md:grid md:grid-cols-[20rem_1fr] md:gap-5",
    wide: "md:grid md:grid-cols-[24rem_1fr] md:gap-5",
  },
  lg: {
    narrow: "lg:grid lg:grid-cols-[18rem_1fr] lg:gap-5",
    default: "lg:grid lg:grid-cols-[22rem_1fr] lg:gap-6",
    wide: "lg:grid lg:grid-cols-[26rem_1fr] lg:gap-6",
  },
};

/**
 * Master-detail (list + detail) split view.
 *
 * iPad landscape (1366×1024) and PC: shows both panes side-by-side at the
 * configured breakpoint.
 * Smartphones and iPad portrait/split-view (<768): stacks. If `detailOpen`
 * is true in stacked mode, the list pane is hidden so the detail can use
 * the full viewport width.
 */
export function SplitView({
  list,
  detail,
  detailOpen = false,
  listWidth = "default",
  breakpoint = "md",
  className = "",
}: SplitViewProps) {
  const gridClass = GRID_CLASS[breakpoint][listWidth];
  const stackHideListMobile = detailOpen
    ? breakpoint === "lg"
      ? "hidden lg:block"
      : "hidden md:block"
    : "";
  const stackHideDetailMobile = !detailOpen
    ? breakpoint === "lg"
      ? "hidden lg:block"
      : "hidden md:block"
    : "";
  const stackGap = breakpoint === "lg" ? "space-y-4 lg:space-y-0" : "space-y-4 md:space-y-0";

  return (
    <div className={`w-full ${stackGap} ${gridClass} ${className}`.trim()}>
      <div className={`min-w-0 ${stackHideListMobile}`.trim()}>{list}</div>
      <div className={`min-w-0 ${stackHideDetailMobile}`.trim()}>{detail}</div>
    </div>
  );
}
