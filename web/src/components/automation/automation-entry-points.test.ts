import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomeLP } from "@/components/home/home-lp";

const REQUIRED_ENTRY_FILES = [
  "src/components/app-shell-navigation.tsx",
  "src/components/app-shell.tsx",
  "src/components/footer.tsx",
  "src/app/(main)/features/page.tsx",
  "src/app/(main)/safety-ai/page.tsx",
  "src/components/ky-paper/ky-paper-view.tsx",
  "src/app/(main)/safety-diary/page.tsx",
  "src/app/signage/page.tsx",
  "src/app/(main)/strategy/plan-generator/page.tsx",
  "src/app/(main)/education/page.tsx",
  "src/app/(main)/heat-illness-prevention/page.tsx",
  "src/app/(main)/heat-illness-prevention/slides/page.tsx",
  "src/app/(main)/heat-illness-prevention/elearning/page.tsx",
] as const;

const REQUIRED_HEAT_PREFILLS = [
  "heat-illness-training",
  "safety-education-materials",
  "wbgt-weather-notifications",
  "heat-signage",
  "ky-document-automation",
] as const;

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("業務自動化相談のクロール可能な入口", () => {
  it("ホームでは道具の入口→原点→自動化相談→最新情報をSSRで届ける", () => {
    const markup = renderToStaticMarkup(createElement(HomeLP, {
      availability: {
        status: "paused", accepting: false, webFormEnabled: false,
        contactMode: null, intakeMode: null, retentionDays: null,
        label: "受付停止中", message: "停止中",
      },
      latestNews: {
        status: "unavailable", checkedAt: "2026-10-08T00:00:00Z", items: [],
        sourceLabel: "公開RSS", sourceUrl: "https://news.google.com/", message: "未取得",
      },
    }));
    const document = new DOMParser().parseFromString(markup, "text/html");
    const sections = [...document.querySelectorAll("[data-home-lp] > section")];
    expect(sections.map((section) => section.getAttribute("aria-labelledby"))).toEqual([
      "home-lp-title", "home-tools-heading", "home-origin-heading",
      "home-consult-heading", "home-news-heading",
    ]);
    expect(document.querySelector('a[href="#tools"]')).not.toBeNull();
    expect(document.querySelector('a[href="#consult"]')).not.toBeNull();
    expect(document.querySelector('#consult a')?.getAttribute("href")).toBe("/services/automation");
  });

  it.each(REQUIRED_ENTRY_FILES)(
    "%s から専用ページへの明示的な導線を持つ",
    (relativePath) => {
      const text = source(relativePath);
      expect(
        /\/services\/automation|AutomationServicePromo|AutomationConsultCta/.test(
          text,
        ),
      ).toBe(true);
    },
  );

  it("化学物質RAの主作業直後へ自動化相談やKEEP MOVINGを差し込まない", () => {
    const chemicalRa = source("src/app/(main)/chemical-ra/page.tsx");
    expect(chemicalRa).not.toContain("AutomationServicePromo");
    expect(chemicalRa).not.toContain("ContextualNextActions");
    expect(chemicalRa).not.toContain("KEEP MOVING");
  });

  it("共通CTAはJavaScriptだけの遷移ではなくNext Linkを出力する", () => {
    const cta = source("src/components/automation/automation-consult-cta.tsx");
    expect(cta).toContain('import Link from "next/link"');
    expect(cta).toContain("<Link");
    expect(cta).not.toMatch(/window\.location|router\.push/);
  });

  it("熱中症の初期選択URLに自由記述やPIIを含めない", () => {
    const heatSources = REQUIRED_ENTRY_FILES.filter((file) =>
      file.includes("heat-illness-prevention"),
    )
      .map(source)
      .join("\n");

    const queryLinks =
      heatSources.match(
        /\/services\/automation\?consultationType=[a-z-]+(?:#consult-form)?/g,
      ) ?? [];
    expect(queryLinks.length).toBeGreaterThanOrEqual(2);
    expect(heatSources).toContain(
      "href={`/services/automation?consultationType=${type}#consult-form`}",
    );
    expect(heatSources).toContain('position="heat_hub"');
    expect(heatSources).toContain("getAutomationConsultAvailability()");
    for (const consultationType of REQUIRED_HEAT_PREFILLS) {
      expect(heatSources).toContain(`"${consultationType}"`);
    }
    for (const link of queryLinks) {
      expect(link).not.toMatch(
        /(?:name|email|organization|company|message|problem|health|site)=/i,
      );
    }
  });
});
