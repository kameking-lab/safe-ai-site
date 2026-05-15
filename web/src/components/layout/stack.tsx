import type { ReactNode, ElementType } from "react";

type Gap = "xs" | "sm" | "md" | "lg";
type Align = "start" | "center" | "end" | "stretch";

const VERTICAL_GAP: Record<Gap, string> = {
  xs: "space-y-1",
  sm: "space-y-2",
  md: "space-y-4",
  lg: "space-y-6",
};

const HORIZONTAL_GAP: Record<Gap, string> = {
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
};

const ALIGN_CLASS: Record<Align, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

interface StackProps {
  children: ReactNode;
  gap?: Gap;
  className?: string;
  as?: ElementType;
}

/** Vertical stack with consistent gap. */
export function Stack({ children, gap = "md", className = "", as: Tag = "div" }: StackProps) {
  return <Tag className={`${VERTICAL_GAP[gap]} ${className}`.trim()}>{children}</Tag>;
}

interface ClusterProps extends StackProps {
  align?: Align;
  wrap?: boolean;
  justify?: "start" | "center" | "end" | "between";
}

const JUSTIFY_CLASS = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
} as const;

/** Horizontal cluster with wrap. Good for toolbars and tag rows. */
export function Cluster({
  children,
  gap = "sm",
  align = "center",
  justify = "start",
  wrap = true,
  className = "",
  as: Tag = "div",
}: ClusterProps) {
  return (
    <Tag
      className={[
        "flex",
        wrap ? "flex-wrap" : "flex-nowrap",
        ALIGN_CLASS[align],
        JUSTIFY_CLASS[justify],
        HORIZONTAL_GAP[gap],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Tag>
  );
}
