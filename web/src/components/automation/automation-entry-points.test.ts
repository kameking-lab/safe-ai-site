import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

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
  it("ホームは新しい主機能ランチャーだけを描画し、旧熱中症キャンペーンを外す", () => {
    const home = source("src/app/(main)/page.tsx");
    const removedHomeSections = [
      "HomeHeatSection",
      "HomeDirectChatSection",
      "HomeSafetyUpdates",
      "HomeDirectChemicalSection",
      "HomeLearningOverview",
      "HomeCoreFeatures",
      "HomeAutomationSamples",
      "HomeAutomationService",
      "loadHomeHeatInitialData",
      "loadHomeLatestAccidentNews",
      "/heat-illness-prevention",
    ];
    expect(home).toContain(
      'import { HomeRelaunch } from "@/components/home/home-relaunch"',
    );
    expect(home).toContain("<HomeRelaunch />");
    for (const removedSection of removedHomeSections) {
      expect(home).not.toContain(removedSection);
    }

    const relaunch = source("src/components/home/home-relaunch.tsx");
    expect(relaunch).toContain("/mascot/mascot-chat-talk-v4.webp");
    expect(relaunch).toContain('fetchPriority="high"');
    expect(relaunch).toContain('decoding="sync"');
    expect(relaunch).toContain("aspect-[2/1]");
    expect(relaunch).toContain("仕事から選ぶ、9つの主機能");
    expect(relaunch).toContain('href: "/education/hazard-slides"');
    expect(relaunch).toContain('href: "/training/visual-ky"');
    expect(relaunch).toContain('href="/resources/mlit"');
    expect(relaunch).not.toMatch(
      /\/training\/safety-seminars|\/materials\/safety-images|\/resources\/netis-safety/u,
    );
    expect(relaunch).not.toContain("/heat-illness-prevention");
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
