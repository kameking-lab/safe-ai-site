import type { ReactNode } from "react";

type Cols = 2 | 3 | 4 | "auto";
type Gap = "sm" | "md" | "lg";

const GAP_CLASS: Record<Gap, string> = {
  sm: "gap-2 sm:gap-3",
  md: "gap-3 sm:gap-4",
  lg: "gap-4 sm:gap-6",
};

/**
 * Column ramps. iPhone SE (375px) always shows 1 column; sm (640) introduces
 * 2 columns where requested; lg (1024 / iPad portrait) increases density.
 *
 * cols={2}    → 1 → 2 from sm
 * cols={3}    → 1 → 2 from sm → 3 from lg
 * cols={4}    → 1 → 2 from sm → 3 from lg → 4 from xl
 * cols="auto" → minmax(16rem, 1fr) auto-fit; lets the browser decide column count
 */
const COLS_CLASS: Record<Exclude<Cols, "auto">, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
};

interface CardGridProps {
  children: ReactNode;
  cols?: Cols;
  gap?: Gap;
  className?: string;
  /** Minimum column width when cols="auto". Default 16rem. */
  minColRem?: number;
}

export function CardGrid({
  children,
  cols = 3,
  gap = "md",
  className = "",
  minColRem = 16,
}: CardGridProps) {
  if (cols === "auto") {
    return (
      <div
        className={`grid ${GAP_CLASS[gap]} ${className}`.trim()}
        style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(${minColRem}rem, 100%), 1fr))` }}
      >
        {children}
      </div>
    );
  }
  return (
    <div className={`grid ${COLS_CLASS[cols]} ${GAP_CLASS[gap]} ${className}`.trim()}>
      {children}
    </div>
  );
}
