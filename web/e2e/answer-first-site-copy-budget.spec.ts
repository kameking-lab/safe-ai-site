import { expect, test, type Page } from "@playwright/test";
import {
  PUBLIC_VISUAL_KY_SCENARIOS,
  getVisualKyCategory,
} from "../src/data/visual-ky";

const baseUrl =
  process.env.SERVICE_FIRST_BASE_URL ??
  `http://localhost:${process.env.PLAYWRIGHT_PORT ?? "3310"}`;

const TARGET_ROUTES = [
  "/",
  "/risk",
  "/chemical-ra",
  "/ky/paper",
  "/accidents",
  "/accident-news",
  "/laws",
  "/training/visual-ky",
  "/services/automation",
  "/safety-ai",
] as const;

const DUPLICATE_NOTICE_PHRASES = [
  "個人情報は入力しない",
  "健康情報は入力しない",
  "法的助言ではありません",
  "一次資料で確認",
  "正本を確認",
] as const;

const INTERNAL_TERMS = [
  "RAG",
  "hash",
  "machine scoring",
  "synthetic",
  "corpus",
  "provenance",
  "retrieval",
  "Recall@",
  "MRR",
  "nDCG",
  "自作評価",
  "第三者検証",
  "収録範囲",
  "正本確認",
  "機械検証",
  "人手確認",
] as const;

type SiteCopySnapshot = {
  route: string;
  h1Count: number;
  primaryFound: boolean;
  charactersBeforePrimary: number;
  emptyPrimaryMarkerCount: number;
  candidateCount: number;
  nonCandidateActionCount: number;
  nonCandidateActionLabels: string[];
  warningCount: number;
  conditionalWarningCount: number;
  heatStatus: string | null;
  visibleKyActionCount: number;
  duplicateNotices: string[];
  forbiddenTerms: string[];
};

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    if (
      /google-analytics|googletagmanager|doubleclick|vercel-insights|\/api\/rum(?:\/|\?|$)/i.test(
        route.request().url(),
      )
    ) {
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
});

async function gotoRoute(page: Page, route: string): Promise<void> {
  const response = await page.goto(new URL(route, baseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  expect(response?.status() ?? 599, `${route} status`).toBeLessThan(400);
  await expect(page.locator("main").first(), `${route} main`).toBeVisible();
  await page.waitForTimeout(350);
}

async function snapshotPage(
  page: Page,
  route: string,
): Promise<SiteCopySnapshot> {
  return page.evaluate(
    ({ currentRoute, duplicatePhrases, internalTerms }) => {
      const main = document.querySelector("main") as HTMLElement | null;
      if (!main) throw new Error("main missing");

      const visible = (element: Element): element is HTMLElement => {
        const node = element as HTMLElement;
        let ancestor = node.parentElement;
        while (ancestor) {
          if (
            ancestor.tagName === "DETAILS" &&
            !(ancestor as HTMLDetailsElement).open
          ) {
            const ownSummary =
              node.tagName === "SUMMARY" && node.parentElement === ancestor;
            if (!ownSummary) return false;
          }
          ancestor = ancestor.parentElement;
        }
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0
        );
      };
      const visibleElements = (selector: string) =>
        [...main.querySelectorAll(selector)].filter(visible);
      const firstVisible = (selector: string) =>
        visibleElements(selector)[0] ?? null;
      const primary =
        firstVisible('[data-primary-result="true"]') ??
        firstVisible("[data-primary-focus]") ??
        firstVisible('[data-primary-action="true"]') ??
        firstVisible(
          'form textarea,form input:not([type="hidden"]),form select,form button[type="submit"]',
        );
      const taskScope =
        firstVisible("[data-primary-task]") ??
        (primary?.matches('[data-primary-result="true"]') ? primary : main);
      const visibleTaskElements = (selector: string) =>
        [...taskScope.querySelectorAll(selector)].filter(visible);

      let beforePrimary = "";
      if (primary) {
        const primaryTop = primary.getBoundingClientRect().top;
        const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
        let textNode = walker.nextNode();
        while (textNode) {
          const relation = textNode.compareDocumentPosition(primary);
          if ((relation & Node.DOCUMENT_POSITION_FOLLOWING) !== 0) {
            const parent = textNode.parentElement;
            const range = document.createRange();
            range.selectNodeContents(textNode);
            if (
              parent &&
              visible(parent) &&
              [...range.getClientRects()].some(
                (rect) =>
                  rect.bottom > 0 &&
                  rect.top < window.innerHeight &&
                  rect.top < primaryTop,
              )
            ) {
              beforePrimary += textNode.textContent ?? "";
            }
          }
          textNode = walker.nextNode();
        }
      }

      const viewportActions = visibleTaskElements(
        'a[href],button,input[type="submit"],summary',
      ).filter((element) => {
        const rect = element.getBoundingClientRect();
        const excludedChrome =
          element.closest('[data-mobile-nav="bottom"]') ||
          element.closest("[data-app-shell-header]") ||
          element.closest('nav[aria-label^="パンくず"]') ||
          element.closest(
            '[data-cookie-settings], [aria-label="任意Cookieの設定"]',
          );
        const excludedAccessory = element.matches(
          '[data-compact-text="true"],:disabled,[aria-disabled="true"],[aria-hidden="true"]',
        );
        return (
          rect.top >= 0 &&
          rect.top < window.innerHeight &&
          !excludedChrome &&
          !excludedAccessory
        );
      });
      const candidates = viewportActions.filter((element) =>
        element.matches(
          '[data-service-candidate-chip],[data-chatbot-question-chip],[data-chemical-quick-substance="true"]',
        ),
      );
      const candidateSet = new Set(candidates);

      const conditionalWarnings = visibleElements(
        "[data-warning-card][data-warning-trigger]",
      );
      const warnings = visibleElements(
        '[data-warning-card],[data-operational-warning="true"],[data-warning-state="true"],[data-tone="warning"],[data-status-tone="warning"],[role="alert"]',
      ).filter(
        (element) =>
          !element.hasAttribute("data-warning-trigger") &&
          !element.closest("[data-warning-trigger]"),
      );

      const mainText = main.innerText || main.textContent || "";
      const auxiliaryText = visibleElements(
        "input,textarea,select,button,a[href]",
      )
        .flatMap((element) => [
          element.getAttribute("placeholder") ?? "",
          element.getAttribute("aria-label") ?? "",
          element.getAttribute("aria-description") ?? "",
          element.getAttribute("title") ?? "",
        ])
        .join("\n");
      const copyCorpus = `${mainText}\n${auxiliaryText}`;
      const duplicateNotices = duplicatePhrases.filter(
        (phrase) => copyCorpus.split(phrase).length - 1 > 1,
      );
      const forbiddenTerms = internalTerms.filter((term) => {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`(^|[^A-Za-z])${escaped}([^A-Za-z]|$)`, "i").test(
          mainText,
        );
      });
      const heatStatus = firstVisible("[data-heat-status]");

      return {
        route: currentRoute,
        h1Count: visibleElements("h1").length,
        primaryFound: Boolean(primary),
        charactersBeforePrimary: beforePrimary.replace(/\s+/gu, "").length,
        emptyPrimaryMarkerCount: main.querySelectorAll(
          '[data-primary-action=""]',
        ).length,
        candidateCount: candidates.length,
        nonCandidateActionCount: viewportActions.filter(
          (element) => !candidateSet.has(element),
        ).length,
        nonCandidateActionLabels: viewportActions
          .filter((element) => !candidateSet.has(element))
          .map((element) =>
            `${element.textContent ?? element.getAttribute("aria-label") ?? ""}`
              .replace(/\s+/gu, " ")
              .trim(),
          ),
        warningCount: new Set(warnings).size,
        conditionalWarningCount: new Set(conditionalWarnings).size,
        heatStatus: heatStatus?.getAttribute("data-heat-status") ?? null,
        visibleKyActionCount: visibleElements('a[href^="/ky/paper?"]').length,
        duplicateNotices,
        forbiddenTerms,
      };
    },
    {
      currentRoute: route,
      duplicatePhrases: [...DUPLICATE_NOTICE_PHRASES],
      internalTerms: [...INTERNAL_TERMS],
    },
  );
}

test("site-wide primary task copy stays short and operational", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of TARGET_ROUTES) {
    await gotoRoute(page, route);
    const snapshot = await snapshotPage(page, route);

    expect.soft(snapshot.h1Count, `${route}: visible h1`).toBe(1);
    expect
      .soft(snapshot.primaryFound, `${route}: primary task/result`)
      .toBe(true);
    expect
      .soft(snapshot.charactersBeforePrimary, `${route}: copy before primary`)
      .toBeLessThanOrEqual(120);
    expect
      .soft(snapshot.emptyPrimaryMarkerCount, `${route}: empty primary markers`)
      .toBe(0);
    expect
      .soft(snapshot.candidateCount, `${route}: candidate chips`)
      .toBeLessThanOrEqual(3);
    expect
      .soft(
        snapshot.nonCandidateActionCount,
        `${route}: first-view task actions (${snapshot.nonCandidateActionLabels.join(" / ")})`,
      )
      .toBeLessThanOrEqual(3);
    expect
      .soft(snapshot.warningCount, `${route}: normal warning cards`)
      .toBe(0);
    expect
      .soft(snapshot.duplicateNotices, `${route}: duplicated notices`)
      .toEqual([]);
    expect
      .soft(snapshot.forbiddenTerms, `${route}: internal terms`)
      .toEqual([]);

    if (route === "/" && snapshot.conditionalWarningCount > 0) {
      expect
        .soft(
          ["degraded", "unavailable"],
          "/: upstream warning must match degraded heat state",
        )
        .toContain(snapshot.heatStatus);
      expect
        .soft(
          snapshot.visibleKyActionCount,
          "/: KY must stay hidden on unusable heat data",
        )
        .toBe(0);
    }
  }
});

test("chatbot initial explanation stays within 80 characters without interrupting prompts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.setItem("anzen-usage-score-v1", "99");
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
    });
    Object.defineProperty(window.navigator, "platform", {
      configurable: true,
      value: "iPhone",
    });
    Object.defineProperty(window.navigator, "maxTouchPoints", {
      configurable: true,
      value: 5,
    });
  });

  await gotoRoute(page, "/chatbot");
  await expect(
    page.locator('[data-chatbot-panel-state="empty"]'),
  ).toBeVisible();

  const initialExplanationCharacters = await page.evaluate(() => {
    const header = document.querySelector(
      "[data-chatbot-page] header",
    ) as HTMLElement | null;
    const emptyConversation = document.querySelector(
      '[data-chatbot-panel-state="empty"] [data-chatbot-history]',
    ) as HTMLElement | null;
    return `${header?.innerText ?? ""}${emptyConversation?.innerText ?? ""}`
      .replace(/\s+/gu, "")
      .length;
  });

  expect(initialExplanationCharacters).toBeLessThanOrEqual(80);
  await expect(page.locator("main [data-warning-card], main [role='alert']")).toHaveCount(
    0,
  );
  await expect(page.locator("[data-chatbot-question-chip]")).toHaveCount(3);
  await expect(
    page.getByRole("dialog", { name: "ホーム画面に追加" }),
  ).toHaveCount(0);
});

test("visual KY copy budget remains valid for every daily scenario", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoRoute(page, "/training/visual-ky");
  const snapshot = await snapshotPage(page, "/training/visual-ky");
  const meta = page.locator("[data-visual-ky-daily-meta]").first();
  const currentId = await meta.getAttribute("data-scenario-id");
  const current = PUBLIC_VISUAL_KY_SCENARIOS.find(
    (scenario) => scenario.id === currentId,
  );
  expect(current, "current daily Visual KY scenario").toBeDefined();

  const dynamicLength = (
    scenario: (typeof PUBLIC_VISUAL_KY_SCENARIOS)[number],
  ) =>
    [
      scenario.shortTitle,
      scenario.facilitator.openingQuestion,
      getVisualKyCategory(scenario.category).label,
      String(scenario.estimatedMinutes),
    ].reduce((total, value) => total + value.replace(/\s+/gu, "").length, 0);
  const currentDynamicLength = dynamicLength(current!);
  const maximumDynamicLength = Math.max(
    ...PUBLIC_VISUAL_KY_SCENARIOS.map(dynamicLength),
  );

  expect(
    snapshot.charactersBeforePrimary +
      maximumDynamicLength -
      currentDynamicLength,
    "Visual KY worst-case copy before primary",
  ).toBeLessThanOrEqual(120);
});

test("notice audit includes placeholder and accessible-name copy", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setContent(`
    <main>
      <h1>入力</h1>
      <label for="question">質問</label>
      <textarea id="question" placeholder="例：質問（個人情報は入力しない）"></textarea>
      <button type="submit" data-primary-action="true" aria-label="送信。個人情報は入力しない">送信</button>
    </main>
  `);
  const snapshot = await snapshotPage(page, "/");
  expect(snapshot.duplicateNotices).toContain("個人情報は入力しない");
});
