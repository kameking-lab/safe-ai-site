import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const signageSource = readFileSync(
  resolve(process.cwd(), "src/app/signage/page.tsx"),
  "utf8",
);
const weatherRiskCardSource = readFileSync(
  resolve(process.cwd(), "src/components/weather-risk-card.tsx"),
  "utf8",
);
const globalsSource = readFileSync(
  resolve(process.cwd(), "src/app/globals.css"),
  "utf8",
);
const footerSource = readFileSync(
  resolve(process.cwd(), "src/components/footer.tsx"),
  "utf8",
);
const whatsNewSource = readFileSync(
  resolve(process.cwd(), "src/app/(main)/whats-new/whats-new-client.tsx"),
  "utf8",
);
const lawsSource = readFileSync(
  resolve(process.cwd(), "src/components/law-revision-list.tsx"),
  "utf8",
);
const heatSlidesSource = readFileSync(
  resolve(
    process.cwd(),
    "src/app/(main)/heat-illness-prevention/slides/heat-illness-slides.tsx",
  ),
  "utf8",
);
const safetyAiSource = readFileSync(
  resolve(process.cwd(), "src/app/(main)/safety-ai/page.tsx"),
  "utf8",
);
const heatSafetySpecialSource = readFileSync(
  resolve(process.cwd(), "src/components/heat-illness/heat-safety-special.tsx"),
  "utf8",
);
const visualKySource = readFileSync(
  resolve(process.cwd(), "src/app/(main)/training/visual-ky/page.tsx"),
  "utf8",
);

function relativeLuminance(hex: string): number {
  const channels = hex
    .replace("#", "")
    .match(/.{2}/g)!
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4,
    );
  return (
    0.2126 * channels[0] +
    0.7152 * channels[1] +
    0.0722 * channels[2]
  );
}

function contrast(first: string, second: string): number {
  const luminances = [relativeLuminance(first), relativeLuminance(second)].sort(
    (left, right) => right - left,
  );
  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

describe("post-launch contrast regressions", () => {
  it("uses the verified dark sky treatment for the signage primary action", () => {
    expect(signageSource).toContain(
      "bg-sky-800 px-5 py-3 text-sm font-black text-white hover:bg-sky-700",
    );
    expect(signageSource).not.toContain(
      "bg-sky-600 px-5 py-3 text-sm font-black text-white",
    );
  });

  it("uses the verified dark emerald treatment for the low-risk badge", () => {
    expect(weatherRiskCardSource).toContain(
      'badge: "bg-emerald-800 text-white"',
    );
    expect(weatherRiskCardSource).not.toContain(
      'badge: "bg-emerald-600 text-white"',
    );
  });

  it("keeps solid semantic fills and muted text at WCAG AA contrast", () => {
    expect(contrast("#ffffff", "#087a55")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#ffffff", "#a84f08")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#526173", "#f7f8f6")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#a5f3fc", "#203755")).toBeGreaterThanOrEqual(4.5);
    expect(globalsSource).toContain("--success-solid: #087a55");
    expect(globalsSource).toContain("--caution-solid: #a84f08");
    expect(globalsSource).toContain("--accent-cool-on-dark: #a5f3fc");
  });

  it("uses the accessible brand tokens in the audited shared surfaces", () => {
    expect(footerSource).toContain("text-brand-accent-cool-on-dark");
    expect(whatsNewSource).toContain("bg-semantic-success-solid");
    expect(whatsNewSource).not.toContain("bg-emerald-600 text-white");
    expect(lawsSource).toContain("bg-semantic-caution-solid");
    expect(lawsSource).toContain("bg-semantic-success-solid");
    expect(lawsSource).not.toMatch(
      /bg-(?:teal|emerald|amber)-600 text-white/,
    );
    expect(heatSlidesSource).toContain('accent: "bg-orange-700 text-white"');
  });

  it("keeps legacy dark surfaces and intentional light fills distinguishable", () => {
    expect(contrast("#cbd5e1", "#0e1c2e")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#020617", "#ff6900")).toBeGreaterThanOrEqual(4.5);
    expect(globalsSource).toContain(
      "@media screen and (forced-colors: none)",
    );
    expect(globalsSource).toContain("html.dark .portal-light-ink");
    expect(globalsSource).toContain(
      "html.dark :where(.bg-white):not([class*=\"dark:bg-\"])",
    );
    expect(safetyAiSource).toContain(
      "border-2 border-sky-800 bg-sky-50 text-sky-950",
    );
    expect(heatSafetySpecialSource).toContain(
      "portal-light-ink border-orange-400 bg-orange-500",
    );
    expect(visualKySource).toContain(
      "portal-light-ink absolute left-3 top-3",
    );
  });
});
