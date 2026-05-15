import type { ReactNode } from "react";

type Spacing = "tight" | "default" | "loose";

const SPACING_CLASS: Record<Spacing, string> = {
  tight: "space-y-3 sm:space-y-4",
  default: "space-y-4 sm:space-y-6",
  loose: "space-y-6 sm:space-y-8",
};

interface SectionProps {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  spacing?: Spacing;
  className?: string;
  /** aria-label for the section landmark when title is not text. */
  ariaLabel?: string;
  headingLevel?: 2 | 3;
}

/**
 * Section landmark with consistent vertical rhythm.
 * Use inside PageContainer to compose pages without ad-hoc spacing.
 */
export function Section({
  children,
  title,
  description,
  spacing = "default",
  className = "",
  ariaLabel,
  headingLevel = 2,
}: SectionProps) {
  const HeadingTag = headingLevel === 3 ? "h3" : "h2";
  return (
    <section
      className={`${SPACING_CLASS[spacing]} ${className}`.trim()}
      aria-label={typeof title === "string" ? undefined : ariaLabel}
    >
      {(title || description) && (
        <header className="space-y-1">
          {title && (
            <HeadingTag className="text-base font-bold text-slate-900 sm:text-lg dark:text-slate-100">
              {title}
            </HeadingTag>
          )}
          {description && (
            <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">{description}</p>
          )}
        </header>
      )}
      {children}
    </section>
  );
}
