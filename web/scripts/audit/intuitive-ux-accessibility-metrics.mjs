export const FOCUS_PAINT_FRAMES = 2;
export const WCAG_TARGET_SIZE_PX = 24;
export const PREFERRED_TARGET_SIZE_PX = 44;

/**
 * Measure the actual clickable area rather than only the native input glyph.
 * Associated labels activate checkboxes/radios, while inline text links and
 * focus-revealed skip links are target-size exceptions under WCAG 2.5.8.
 */
export function assessInteractiveTarget(candidate) {
  const labelWidth = Number(candidate.labelWidth ?? 0);
  const labelHeight = Number(candidate.labelHeight ?? 0);
  const width = Math.max(Number(candidate.width ?? 0), labelWidth);
  const height = Math.max(Number(candidate.height ?? 0), labelHeight);
  const exception = candidate.focusReveal
    ? "focus-revealed"
    : candidate.tag === "a" && candidate.display === "inline"
      ? "inline-text"
      : null;

  return {
    tag: candidate.tag,
    name: candidate.name,
    width: Math.round(width),
    height: Math.round(height),
    rawWidth: Math.round(Number(candidate.width ?? 0)),
    rawHeight: Math.round(Number(candidate.height ?? 0)),
    hitAreaSource:
      labelWidth > Number(candidate.width ?? 0) ||
      labelHeight > Number(candidate.height ?? 0)
        ? "associated-label"
        : "element",
    exception,
    belowWcagMinimum:
      exception === null &&
      (width < WCAG_TARGET_SIZE_PX || height < WCAG_TARGET_SIZE_PX),
    belowPreferred44:
      exception === null &&
      (width < PREFERRED_TARGET_SIZE_PX ||
        height < PREFERRED_TARGET_SIZE_PX),
  };
}

function isTransparentColor(color) {
  return (
    color === "transparent" ||
    /^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(color) ||
    /\/\s*0(?:\.0+)?\s*\)$/i.test(color)
  );
}

/**
 * Ambient card shadows do not count as a keyboard focus indicator. Accept a
 * rendered outline or a Tailwind-style zero-offset focus ring with >=2px
 * spread, and only while :focus-visible matches.
 */
export function hasRenderedFocusIndicator(sample) {
  if (!sample.focusVisible) return false;
  if (
    sample.outlineStyle !== "none" &&
    Number.parseFloat(sample.outlineWidth) > 0 &&
    !isTransparentColor(sample.outlineColor)
  ) {
    return true;
  }

  const ringPattern =
    /((?:rgba?|oklab|lab)\([^)]+\)|[a-z]+)\s+0px\s+0px\s+0px\s+(\d+(?:\.\d+)?)px/gi;
  for (const match of sample.boxShadow.matchAll(ringPattern)) {
    if (
      Number.parseFloat(match[2]) >= 2 &&
      !isTransparentColor(match[1])
    ) {
      return true;
    }
  }
  return false;
}
