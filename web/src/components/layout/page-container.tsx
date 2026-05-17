import type { ReactNode, ElementType } from "react";

type Width = "narrow" | "prose" | "wide" | "full";
type Padding = "default" | "tight" | "none";

const WIDTH_CLASS: Record<Width, string> = {
  narrow: "max-w-2xl",
  prose: "max-w-4xl",
  wide: "max-w-6xl",
  full: "max-w-7xl",
};

const PADDING_X_CLASS: Record<Padding, string> = {
  default: "px-4 sm:px-6 lg:px-8",
  tight: "px-3 sm:px-4",
  none: "",
};

const PADDING_Y_CLASS: Record<Padding, string> = {
  default: "py-6 sm:py-8",
  tight: "py-3 sm:py-4",
  none: "",
};

interface PageContainerProps {
  children: ReactNode;
  width?: Width;
  paddingX?: Padding;
  paddingY?: Padding;
  as?: ElementType;
  className?: string;
}

/**
 * Page-level horizontal container.
 *
 * Width tokens map current usage:
 *  - narrow (max-w-2xl): forms, signin, prefs
 *  - prose  (max-w-4xl): articles, long-form text, single-column tools
 *  - wide   (max-w-6xl): editor/admin pages
 *  - full   (max-w-7xl): default for dashboards and panel pages
 *
 * Padding scales by viewport. iPad portrait (768/1024) lands on sm/lg
 * with non-cramped horizontal padding so columns are not flush to edges.
 */
export function PageContainer({
  children,
  width = "full",
  paddingX = "default",
  paddingY = "default",
  as: Tag = "div",
  className = "",
}: PageContainerProps) {
  const classes = [
    "mx-auto w-full",
    WIDTH_CLASS[width],
    PADDING_X_CLASS[paddingX],
    PADDING_Y_CLASS[paddingY],
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <Tag className={classes}>{children}</Tag>;
}
