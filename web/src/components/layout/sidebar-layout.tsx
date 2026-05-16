import type { ReactNode } from "react";

type SidebarWidth = "narrow" | "default" | "wide";
type SidebarBreakpoint = "md" | "lg";

interface SidebarLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
  sidebarPlacement?: "left" | "right";
  sidebarWidth?: SidebarWidth;
  /** Viewport at which the sidebar appears side-by-side. Below this, stack. */
  breakpoint?: SidebarBreakpoint;
  className?: string;
}

// Tailwind v4 cannot parse arbitrary values containing nested commas
// (e.g. minmax(0,1fr)). Use simple `1fr` for the flex column — the
// child uses min-w-0 to prevent grid blowout.
const GRID_CLASS: Record<SidebarBreakpoint, Record<SidebarWidth, Record<"left" | "right", string>>> = {
  lg: {
    narrow: {
      left: "lg:grid lg:grid-cols-[14rem_1fr] lg:gap-6",
      right: "lg:grid lg:grid-cols-[1fr_14rem] lg:gap-6",
    },
    default: {
      left: "lg:grid lg:grid-cols-[16rem_1fr] lg:gap-6",
      right: "lg:grid lg:grid-cols-[1fr_16rem] lg:gap-6",
    },
    wide: {
      left: "lg:grid lg:grid-cols-[20rem_1fr] lg:gap-6",
      right: "lg:grid lg:grid-cols-[1fr_20rem] lg:gap-6",
    },
  },
  md: {
    narrow: {
      left: "md:grid md:grid-cols-[14rem_1fr] md:gap-5",
      right: "md:grid md:grid-cols-[1fr_14rem] md:gap-5",
    },
    default: {
      left: "md:grid md:grid-cols-[16rem_1fr] md:gap-5",
      right: "md:grid md:grid-cols-[1fr_16rem] md:gap-5",
    },
    wide: {
      left: "md:grid md:grid-cols-[20rem_1fr] md:gap-5",
      right: "md:grid md:grid-cols-[1fr_20rem] md:gap-5",
    },
  },
};

/**
 * Sidebar + main layout that stacks on small viewports.
 *
 * At the breakpoint and above, renders a 2-column grid. Below it, both panes
 * stack vertically with `space-y-6`. iPad portrait (1024) lands on lg by
 * default; pass breakpoint="md" to keep the sidebar visible from 768px up
 * (e.g. iPad mini portrait).
 */
export function SidebarLayout({
  sidebar,
  children,
  sidebarPlacement = "left",
  sidebarWidth = "default",
  breakpoint = "lg",
  className = "",
}: SidebarLayoutProps) {
  const gridClass = GRID_CLASS[breakpoint][sidebarWidth][sidebarPlacement];
  const stackGapClass = breakpoint === "lg" ? "space-y-6 lg:space-y-0" : "space-y-6 md:space-y-0";
  return (
    <div className={`w-full ${stackGapClass} ${gridClass} ${className}`.trim()}>
      {sidebarPlacement === "left" ? (
        <>
          <aside className="min-w-0">{sidebar}</aside>
          <div className="min-w-0">{children}</div>
        </>
      ) : (
        <>
          <div className="min-w-0">{children}</div>
          <aside className="min-w-0">{sidebar}</aside>
        </>
      )}
    </div>
  );
}
