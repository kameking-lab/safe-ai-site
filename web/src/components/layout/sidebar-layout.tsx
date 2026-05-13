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

// Tailwind needs full classnames present at build time. Map each combination
// explicitly rather than templating, so the JIT compiler picks them up.
const GRID_CLASS: Record<SidebarBreakpoint, Record<SidebarWidth, Record<"left" | "right", string>>> = {
  lg: {
    narrow: {
      left: "lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-6",
      right: "lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-6",
    },
    default: {
      left: "lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-6",
      right: "lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-6",
    },
    wide: {
      left: "lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-6",
      right: "lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6",
    },
  },
  md: {
    narrow: {
      left: "md:grid md:grid-cols-[14rem_minmax(0,1fr)] md:gap-5",
      right: "md:grid md:grid-cols-[minmax(0,1fr)_14rem] md:gap-5",
    },
    default: {
      left: "md:grid md:grid-cols-[16rem_minmax(0,1fr)] md:gap-5",
      right: "md:grid md:grid-cols-[minmax(0,1fr)_16rem] md:gap-5",
    },
    wide: {
      left: "md:grid md:grid-cols-[20rem_minmax(0,1fr)] md:gap-5",
      right: "md:grid md:grid-cols-[minmax(0,1fr)_20rem] md:gap-5",
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
