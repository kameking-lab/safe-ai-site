import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import {
  countDisclaimerCharacters,
  evaluateServiceCopyBudget,
  findForbiddenServiceTerms,
  findPersistentWarningPhrases,
  type ServiceCopyBudgetIssue,
  type ServiceCopyBudgetSnapshot,
} from "../src/lib/audit/service-copy-budget";

const baseUrl =
  process.env.SERVICE_FIRST_BASE_URL ??
  `http://localhost:${process.env.PLAYWRIGHT_PORT ?? "3310"}`;
const phase = process.env.SERVICE_FIRST_AUDIT_PHASE === "before" ? "before" : "after";
const enforce = process.env.SERVICE_FIRST_AUDIT_ENFORCE !== "0";
const evidence: Array<Record<string, unknown>> = [];
const evidenceOutputRoot = process.env.BEST_IN_CLASS_EVIDENCE_ROOT
  ? resolve(process.env.BEST_IN_CLASS_EVIDENCE_ROOT)
  : resolve(
      process.cwd(),
      "../docs/audits/evidence/answer-first-chatbot-2026-08-03/browser",
    );

type BrowserCopyBudgetSnapshot = ServiceCopyBudgetSnapshot & {
  conditionalWarningCardCount: number;
};

const COPY_ROUTES = [
  "/",
  "/chatbot",
  "/law-search",
  "/chemical-ra",
  "/risk",
  "/ky/paper",
  "/accidents",
  "/accident-news",
  "/laws",
  "/training/visual-ky",
  "/education-certification",
  "/signage",
  "/services/automation",
  "/safety-ai",
  "/guides/anzeneho-ai-chatbot",
  "/about/usage-notes",
] as const;

const RESPONSIVE_ROUTES = [
  "/",
  "/chatbot",
  "/law-search",
  "/chemical-ra",
  "/risk",
  "/ky/paper",
  "/signage",
  "/services/automation",
  "/safety-ai",
  "/about/usage-notes",
] as const;

const VIEWPORTS = [320, 390, 768, 1024, 1440] as const;

test.beforeEach(async ({ page }) => {
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (
      /google-analytics|googletagmanager|doubleclick|vercel-insights|\/api\/rum(?:\/|\?|$)/i.test(
        url,
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
  // Let App Router streaming replace loading boundaries before measuring copy.
  await page.waitForTimeout(250);
}

async function snapshotPage(
  page: Page,
  route: string,
): Promise<BrowserCopyBudgetSnapshot> {
  const snapshot = await page.evaluate((currentRoute) => {
    const main = document.querySelector("main") as HTMLElement | null;
    if (!main) throw new Error("main missing");
    const visible = (element: Element): element is HTMLElement => {
      const node = element as HTMLElement;
      let ancestor = node.parentElement;
      while (ancestor) {
        if (ancestor.tagName === "DETAILS" && !(ancestor as HTMLDetailsElement).open) {
          const isOwnSummary =
            node.tagName === "SUMMARY" && node.parentElement === ancestor;
          if (!isOwnSummary) return false;
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
    const primary =
      visibleElements('[data-primary-result="true"]')[0] ??
      visibleElements("[data-primary-focus]")[0] ??
      visibleElements('[data-primary-action="true"]')[0] ??
      visibleElements(
        'form textarea, form input:not([type="hidden"]), form select, form button[type="submit"], form input[type="submit"]',
      )[0] ??
      null;
    const taskScope =
      visibleElements("[data-primary-task]")[0] ??
      (primary?.matches('[data-primary-result="true"]') ? primary : main);
    const visibleTaskElements = (selector: string) =>
      [...taskScope.querySelectorAll(selector)].filter(visible);
    let beforePrimary = "";
    if (primary && main.contains(primary)) {
      const primaryTop = primary.getBoundingClientRect().top;
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
      let textNode = walker.nextNode();
      while (textNode) {
        const relation = textNode.compareDocumentPosition(primary);
        if ((relation & Node.DOCUMENT_POSITION_FOLLOWING) !== 0) {
          const parent = textNode.parentElement;
          const textRange = document.createRange();
          textRange.selectNodeContents(textNode);
          const textRects = [...textRange.getClientRects()];
          if (
            parent &&
            visible(parent) &&
            textRects.some(
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
    const normalize = (value: string) => value.replace(/\s+/g, "").trim();
    const mainText = main.innerText || main.textContent || "";
    const auxiliaryNoticeText = visibleElements(
      "input,textarea,select,button,a[href]",
    )
      .flatMap((element) => [
        element.getAttribute("placeholder") ?? "",
        element.getAttribute("aria-label") ?? "",
        element.getAttribute("aria-description") ?? "",
        element.getAttribute("title") ?? "",
      ])
      .join("\n");
    const noticeCorpus = `${mainText}\n${auxiliaryNoticeText}`;
    const notices = (noticeCorpus.match(/[^。！？\n]+[。！？]?/g) ?? [])
      .map(normalize)
      .filter((text) =>
        /(?:法的助言|公式見解|個人情報.{0,16}入力しない|健康情報.{0,16}入力しない|正本.{0,12}確認|最終判断は)/.test(
          text,
        ),
      );
    const noticeCounts = new Map<string, number>();
    for (const notice of notices) {
      noticeCounts.set(notice, (noticeCounts.get(notice) ?? 0) + 1);
    }
    const semanticNoticeRepeats = [
      "個人情報は入力しない",
      "健康情報は入力しない",
      "法的助言ではありません",
      "一次資料で確認",
      "正本を確認",
    ].filter((phrase) => noticeCorpus.split(phrase).length - 1 > 1);
    const outsideDetails = main.cloneNode(true) as HTMLElement;
    outsideDetails
      .querySelectorAll("details,script,style,noscript")
      .forEach((element) => element.remove());
    const viewportActions = visibleTaskElements(
      'a[href],button,input[type="submit"],summary',
    ).filter((element) => {
      const rect = element.getBoundingClientRect();
      const excludedChrome =
        element.closest('[data-mobile-nav="bottom"],nav[aria-label^="パンくず"]') ||
        element.closest("[data-app-shell-header]") ||
        element.closest("header")?.querySelector('[aria-label^="サイト内検索"]');
      const elementLabel = `${element.textContent ?? ""} ${element.getAttribute("aria-label") ?? ""}`;
      const standaloneHomeCrumb =
        element.matches('a[href="/"]') &&
        /ホーム/.test(elementLabel) &&
        rect.top < 180;
      const inputAccessory = element.matches('[data-compact-text="true"]');
      const unavailable =
        element.matches(":disabled,[aria-disabled='true']") ||
        element.classList.contains("sr-only");
      return (
        rect.top >= 0 &&
        rect.top < window.innerHeight &&
        !excludedChrome &&
        !standaloneHomeCrumb &&
        !inputAccessory &&
        !unavailable
      );
    });
    const candidateChips = viewportActions.filter((element) => {
      if (
        element.matches(
          '[data-service-candidate-chip],[data-chatbot-question-chip],[data-chemical-quick-substance="true"]',
        )
      ) {
        return true;
      }
      if (
        currentRoute === "/law-search" &&
        element.closest('nav[aria-label="検索例"]')
      ) {
        return true;
      }
      if (
        currentRoute === "/accidents" &&
        element.matches('a[href*="acc_type="]')
      ) {
        return true;
      }
      return (
        currentRoute === "/education-certification" &&
        Boolean(element.closest("#certification-types"))
      );
    });
    const chatbotInitialBoxActions = visibleElements(
      '[data-chatbot-question-chip],[data-chatbot-composer] button,[data-chatbot-initial-box-action="true"]',
    ).filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.top >= 0 && rect.top < window.innerHeight;
    });
    const warningVocabulary =
      /機械(?:検証|評価)|人手(?:確認|レビュー)|確認記録待ち|(?:検証|確認)待ち|未検証|生成AI回答は停止中|判断保留/;
    const conditionalWarningCards = visibleElements("[data-warning-trigger]");
    const semanticWarningCards = visibleElements(
      '[data-warning-card],[data-operational-warning="true"],[data-warning-state="true"],[data-tone="warning"],[data-status-tone="warning"],[role="alert"]',
    ).filter((element) => !element.hasAttribute("data-warning-trigger"));
    const toneWarningCards = visibleElements(
      'div[class*="bg-amber-"],section[class*="bg-amber-"],div[class*="bg-yellow-"],section[class*="bg-yellow-"]',
    ).filter((element) => warningVocabulary.test(element.innerText));
    const warningCards = [...new Set([...semanticWarningCards, ...toneWarningCards])];
    const description =
      visibleElements("[data-page-description]")[0] ??
      ([...main.querySelectorAll("h1")][0]?.nextElementSibling as HTMLElement | null);
    const answerActionCounts = visibleElements(
      "[data-chatbot-answer-actions]",
    ).map(
      (container) =>
        [...container.querySelectorAll("a[href],button,summary")].filter(visible)
          .length,
    );
    return {
      route: currentRoute,
      h1Count: visibleElements("h1").length,
      introDescriptionLength: description
        ? normalize(description.innerText || description.textContent || "").length
        : null,
      statusBadgeCount: visibleElements("[data-status-badge]").length,
      mascotCount: visibleElements(
        'img[alt*="チワワ"],svg[aria-label*="チワワ"],[data-mascot]',
      ).length,
      visibleCharactersBeforePrimaryAction: normalize(beforePrimary).length,
      primaryActionCount: primary ? 1 : 0,
      secondaryActionCount: visibleElements(
        '[data-secondary-action="true"]',
      ).length,
      warningCardCount: warningCards.length,
      conditionalWarningCardCount: conditionalWarningCards.length,
      firstViewportActionCount: viewportActions.length,
      firstViewportCandidateChipCount: candidateChips.length,
      chatbotInitialBoxActionCount: chatbotInitialBoxActions.length,
      repeatedNoticeTexts: [
        ...new Set([
          ...[...noticeCounts.entries()]
            .filter(([, count]) => count > 1)
            .map(([text]) => text),
          ...semanticNoticeRepeats,
        ]),
      ],
      visibleMainText: mainText,
      detailsCharacters: normalize(
        [...main.querySelectorAll("details")]
          .map((element) => element.textContent ?? "")
          .join(" "),
      ).length,
      textOutsideDetails: outsideDetails.textContent ?? "",
      answerActionCounts,
      chatbotBoxCount: visibleElements("[data-ui-box]").length,
      chatbotQuestionChipCount: visibleElements(
        "[data-chatbot-question-chip]",
      ).length,
      confirmationRequiredCount: (mainText.match(/確認が必要/g) ?? []).length,
    };
  }, route);
  return {
    ...snapshot,
    persistentWarningPhrases: findPersistentWarningPhrases(
      snapshot.visibleMainText,
    ),
  };
}

function recordSnapshot(
  snapshot: ServiceCopyBudgetSnapshot,
  issues: readonly ServiceCopyBudgetIssue[],
  viewport: number,
): void {
  evidence.push({
    kind: "copy-budget",
    phase,
    baseUrl,
    route: snapshot.route,
    viewport,
    h1Count: snapshot.h1Count,
    introDescriptionLength: snapshot.introDescriptionLength,
    visibleCharactersBeforePrimaryAction:
      snapshot.visibleCharactersBeforePrimaryAction,
    primaryActionCount: snapshot.primaryActionCount,
    secondaryActionCount: snapshot.secondaryActionCount,
    warningCardCount: snapshot.warningCardCount,
    conditionalWarningCardCount:
      "conditionalWarningCardCount" in snapshot
        ? snapshot.conditionalWarningCardCount
        : 0,
    firstViewportActionCount: snapshot.firstViewportActionCount,
    firstViewportCandidateChipCount:
      snapshot.firstViewportCandidateChipCount,
    persistentWarningPhrases: snapshot.persistentWarningPhrases,
    chatbotInitialBoxActionCount: snapshot.chatbotInitialBoxActionCount,
    answerActionMax: Math.max(0, ...snapshot.answerActionCounts),
    chatbotBoxCount: snapshot.chatbotBoxCount,
    chatbotQuestionChipCount: snapshot.chatbotQuestionChipCount,
    disclaimerCharactersOutsideDetails: countDisclaimerCharacters(
      snapshot.textOutsideDetails,
    ),
    confirmationRequiredCount: snapshot.confirmationRequiredCount,
    visibleMainCharacters: snapshot.visibleMainText.replace(/\s/g, "").length,
    detailsCharacters: snapshot.detailsCharacters,
    forbiddenTerms: findForbiddenServiceTerms(snapshot.visibleMainText),
    issues: issues.map(({ code }) => code),
  });
}

test.afterAll(() => {
  const copyBudgetEvidence = evidence.filter(
    (item) => item.kind === "copy-budget",
  );
  // Focused semantic/accessibility runs must not erase the last complete copy audit.
  if (copyBudgetEvidence.length === 0) return;
  const output = resolve(
    evidenceOutputRoot,
    "service-first-browser-audit.json",
  );
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(
    output,
    JSON.stringify({ generatedAt: new Date().toISOString(), phase, baseUrl, evidence }, null, 2) +
      "\n",
    "utf8",
  );

  const csvPath = resolve(
    evidenceOutputRoot,
    "service-first-browser-audit.csv",
  );
  const header = [
    "phase",
    "base_url",
    "route",
    "viewport",
    "visible_main_characters",
    "details_characters",
    "characters_before_primary",
    "warning_cards",
    "primary_cta",
    "secondary_cta",
    "first_view_actions",
    "question_chips",
    "max_answer_actions",
    "chatbot_boxes",
    "outside_details_disclaimer_characters",
    "confirmation_required_count",
    "forbidden_term_count",
    "issue_codes",
    "chatbot_initial_box_actions",
    "first_view_candidate_chips",
    "persistent_warning_phrase_count",
  ];
  const prior = (() => {
    try {
      const [existingHeader = "", ...existingRows] = readFileSync(csvPath, "utf8")
        .trim()
        .split(/\r?\n/);
      const existingColumnCount = (() => {
        let count = 1;
        let quoted = false;
        for (let index = 0; index < existingHeader.length; index += 1) {
          const character = existingHeader[index];
          if (character === '"') {
            if (quoted && existingHeader[index + 1] === '"') index += 1;
            else quoted = !quoted;
          } else if (character === "," && !quoted) count += 1;
        }
        return count;
      })();
      return existingRows
        .filter((line) => !line.startsWith(`${phase},`))
        .map(
          (line) =>
            `${line}${",".repeat(Math.max(0, header.length - existingColumnCount))}`,
        );
    } catch {
      return [];
    }
  })();
  const csvRows = copyBudgetEvidence
    .map((item) =>
      [
        item.phase,
        item.baseUrl,
        item.route,
        item.viewport,
        item.visibleMainCharacters,
        item.detailsCharacters,
        item.visibleCharactersBeforePrimaryAction,
        item.warningCardCount,
        item.primaryActionCount,
        item.secondaryActionCount,
        item.firstViewportActionCount,
        item.chatbotQuestionChipCount,
        item.answerActionMax,
        item.chatbotBoxCount,
        item.disclaimerCharactersOutsideDetails,
        item.confirmationRequiredCount,
        (item.forbiddenTerms as string[]).length,
        (item.issues as string[]).join("|"),
        item.chatbotInitialBoxActionCount,
        item.firstViewportCandidateChipCount,
        (item.persistentWarningPhrases as string[]).length,
      ]
        .map((value) => {
          const text = String(value ?? "");
          return /[",\r\n]/.test(text)
            ? `"${text.replaceAll('"', '""')}"`
            : text;
        })
        .join(","),
    );
  mkdirSync(dirname(csvPath), { recursive: true });
  writeFileSync(csvPath, [header.join(","), ...prior, ...csvRows].join("\n") + "\n");
});

test("copy budget: answers, inputs and next actions precede explanations", async ({
  page,
}) => {
  // This audit intentionally visits 16 routes in sequence.  Keep its per-test
  // budget aligned with the dedicated audit config while retaining the normal
  // per-navigation timeout for genuine route hangs.
  test.setTimeout(180_000);
  const routeIssues: Array<{ route: string; issues: ServiceCopyBudgetIssue[] }> = [];
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of COPY_ROUTES) {
    // The centralized notes route did not exist in the frozen production baseline.
    if (phase === "before" && route === "/about/usage-notes") continue;
    await gotoRoute(page, route);
    const snapshot = await snapshotPage(page, route);
    const issues = evaluateServiceCopyBudget(snapshot);
    recordSnapshot(snapshot, issues, 390);
    if (issues.length > 0) routeIssues.push({ route, issues });
  }
  if (enforce) expect(routeIssues).toEqual([]);
});

test("audit semantics: navigation and input accessories are excluded while candidates and warning states are enforced", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setContent(`
    <main>
      <header data-app-shell-header><button type="button">共通メニュー</button></header>
      <details>
        <summary data-compact-text="true">closed details</summary>
        <button data-chemical-quick-substance="true">hidden candidate</button>
        <a href="#hidden">hidden action</a>
        <details>
          <summary>nested hidden summary</summary>
          <button data-chemical-quick-substance="true">nested hidden candidate</button>
        </details>
      </details>
      <nav aria-label="パンくずリスト"><a href="/">ホーム</a></nav>
      <nav data-mobile-nav="bottom"><a href="/">下部ナビ</a></nav>
      <button type="button" data-compact-text="true">音声</button>
      <button type="submit" data-primary-action="true">進む</button>
      <a href="#one" data-secondary-action="true">補助1</a>
      <a href="#two" data-secondary-action="true">補助2</a>
      <button data-chemical-quick-substance="true">候補1</button>
      <button data-chemical-quick-substance="true">候補2</button>
      <button data-chemical-quick-substance="true">候補3</button>
      <button data-chemical-quick-substance="true">候補4</button>
      <section data-warning-state="true">通常時には出さない警告</section>
      <section data-warning-card data-warning-trigger="upstream-unavailable">取得失敗時だけ表示</section>
      <div class="rounded border border-amber-300 bg-amber-50">機械検証済み・人手確認待ち</div>
    </main>
  `);
  const snapshot = await snapshotPage(page, "/chemical-ra");
  expect(snapshot.firstViewportActionCount).toBe(7);
  expect(snapshot.firstViewportCandidateChipCount).toBe(4);
  expect(snapshot.warningCardCount).toBe(2);
  expect(snapshot.conditionalWarningCardCount).toBe(1);
  expect(snapshot.persistentWarningPhrases).toEqual(
    expect.arrayContaining(["機械検証済み", "人手確認待ち"]),
  );
  expect(evaluateServiceCopyBudget(snapshot)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "warning-cards" }),
      expect.objectContaining({ code: "persistent-warning-copy" }),
    ]),
  );
});

test("responsive: 320–1440 and 200%/400% equivalent reflow have no horizontal loss", async ({
  page,
}) => {
  test.setTimeout(240_000);
  for (const width of VIEWPORTS) {
    await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
    for (const route of RESPONSIVE_ROUTES) {
      await gotoRoute(page, route);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      evidence.push({ kind: "responsive", phase, route, width, overflow });
      if (enforce) expect(overflow, `${route} at ${width}px`).toBeLessThanOrEqual(2);
    }
  }

  for (const scale of [2, 4] as const) {
    const equivalentWidth = Math.round(1280 / scale);
    await page.setViewportSize({ width: equivalentWidth, height: 900 });
    for (const route of ["/chatbot", "/chemical-ra", "/risk"] as const) {
      await gotoRoute(page, route);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      evidence.push({
        kind: "zoom-reflow",
        phase,
        route,
        zoom: `${scale * 100}%`,
        equivalentWidth,
        overflow,
      });
      if (enforce) expect(overflow, `${route} at ${scale * 100}%`).toBeLessThanOrEqual(2);
    }
  }
});

test("chatbot: composer, question chips, quick reply and source details remain operable", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoRoute(page, "/chatbot");
  const composer = page.locator("[data-chatbot-composer]");
  await expect(composer).toBeVisible();
  const composerBox = await composer.boundingBox();
  expect(composerBox).not.toBeNull();
  if (enforce) {
    expect(composerBox!.y).toBeGreaterThanOrEqual(0);
    expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(844);
  }
  const chips = page.locator("[data-chatbot-question-chip]");
  expect(await chips.count()).toBeLessThanOrEqual(3);

  const input = composer.locator("textarea");
  await input.focus();
  await expect(input).toBeFocused();
  const composerPosition = await composer.evaluate(
    (element) => getComputedStyle(element).position,
  );
  if (enforce) expect(composerPosition).toBe("sticky");
  await input.fill("1行目");
  await input.press("Shift+Enter");
  await input.type("2行目");
  await expect(input).toHaveValue("1行目\n2行目");
  await page.setViewportSize({ width: 390, height: 500 });
  const keyboardViewportBox = await composer.boundingBox();
  expect(keyboardViewportBox).not.toBeNull();
  if (enforce) expect(keyboardViewportBox!.y + keyboardViewportBox!.height).toBeLessThanOrEqual(502);
  await page.setViewportSize({ width: 390, height: 844 });
  await input.fill("労働安全衛生法第61条を示してください");
  await input.press("Enter");
  await expect(chips).toHaveCount(0);
  const sources = page.locator("[data-chatbot-source-details]").first();
  await expect(sources).toBeVisible({ timeout: 20_000 });
  expect(await sources.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(false);
  const summary = sources.locator("summary");
  await summary.focus();
  await summary.press("Enter");
  expect(await sources.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(true);
  const actionCounts = await page
    .locator("[data-chatbot-answer-actions]")
    .evaluateAll((containers) =>
      containers.map(
        (container) =>
          container.querySelectorAll("a[href],button,summary").length,
      ),
    );
  expect(Math.max(0, ...actionCounts)).toBeLessThanOrEqual(3);

  await page.reload({ waitUntil: "domcontentloaded" });
  const clarifyInput = page.locator("[data-chatbot-composer] textarea");
  await clarifyInput.fill("手すりの高さは？");
  await clarifyInput.press("Enter");
  const quickReplies = page.locator("[data-chatbot-quick-reply]");
  await expect(quickReplies.first()).toBeVisible({ timeout: 20_000 });
  expect(await quickReplies.count()).toBeLessThanOrEqual(3);
  await quickReplies.first().focus();
  await expect(quickReplies.first()).toBeFocused();
  await quickReplies.first().press("Enter");
  await expect(quickReplies).toHaveCount(0, { timeout: 20_000 });

  const overlap = await page.evaluate(() => {
    const composerElement = document.querySelector(
      "[data-chatbot-composer]",
    ) as HTMLElement | null;
    const bottomNav = document.querySelector(
      '[data-mobile-nav="bottom"]',
    ) as HTMLElement | null;
    if (!composerElement || !bottomNav) return null;
    const composerRect = composerElement.getBoundingClientRect();
    const navRect = bottomNav.getBoundingClientRect();
    return Math.max(
      0,
      Math.min(composerRect.bottom, navRect.bottom) -
        Math.max(composerRect.top, navRect.top),
    );
  });
  evidence.push({
    kind: "chatbot-operability",
    phase,
    overlap,
    actionCounts,
    composerPosition,
  });
  expect(overlap).not.toBeNull();
  if (enforce) expect(overlap).toBe(0);
  await expect(page.locator('[aria-label="任意Cookieの設定"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cookie設定" })).toHaveCount(0);
});

test("accessibility media: forced colors and reduced motion preserve focus and controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await gotoRoute(page, "/chatbot");
  const input = page.locator("[data-chatbot-composer] textarea");
  await input.focus();
  await expect(input).toBeFocused();
  const media = await page.evaluate(() => ({
    forcedColors: matchMedia("(forced-colors: active)").matches,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  }));
  evidence.push({ kind: "media", phase, ...media });
  expect(media).toEqual({ forcedColors: true, reducedMotion: true });
});

test("JavaScript disabled keeps core answers or inputs and document structure", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  await auditWithoutJavaScript(browser);
});

async function auditWithoutJavaScript(browser: Browser): Promise<void> {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    serviceWorkers: "block",
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    for (const route of [
      "/",
      "/chatbot",
      "/law-search",
      "/chemical-ra",
      "/risk",
      "/ky/paper",
      "/accidents",
      "/accident-news",
      "/signage",
      "/services/automation",
      "/safety-ai",
      "/about/usage-notes",
    ] as const) {
      const response = await page.goto(new URL(route, baseUrl).toString(), {
        waitUntil: "domcontentloaded",
      });
      const h1 = await page.locator("h1").count();
      const main = await page.locator("main").count();
      const inputs = await page.locator("main input,main textarea").count();
      evidence.push({
        kind: "no-js",
        phase,
        route,
        status: response?.status() ?? null,
        h1,
        main,
        inputs,
      });
      expect(response?.status() ?? 599).toBeLessThan(400);
      expect(main).toBeGreaterThan(0);
      expect(h1).toBeGreaterThan(0);
      const displaySettings = page.locator("[data-display-settings]");
      for (let index = 0; index < (await displaySettings.count()); index += 1) {
        await expect(displaySettings.nth(index)).toBeHidden();
      }
      await expect(
        page.locator(
          'button[data-display-preference]:visible:not([disabled])',
        ),
      ).toHaveCount(0);
      if (enforce && route === "/chatbot") expect(inputs).toBeGreaterThan(0);
      if (enforce && route === "/law-search") {
        await expect(page.locator("[data-law-search-nojs] form")).toHaveCount(1);
      }
      if (enforce && route === "/chemical-ra") {
        await expect(page.locator("[data-chemical-ra-nojs]")).toHaveCount(1);
        await expect(page.locator("#chemical-ra-js")).toBeHidden();
      }
      if (enforce && route === "/accidents") {
        await expect(page.locator("[data-accidents-noscript-result]")).toHaveCount(1);
        const clientOnlyRegions = page.locator("[data-accidents-client-only]");
        expect(await clientOnlyRegions.count()).toBeGreaterThan(0);
        for (let index = 0; index < (await clientOnlyRegions.count()); index += 1) {
          await expect(clientOnlyRegions.nth(index)).toBeHidden();
        }
      }
      if (enforce && route === "/accident-news") {
        await expect(page.locator("form").first()).toBeVisible();
        expect(
          Number(await page.locator("[data-accident-news-results]").getAttribute("data-result-count")),
        ).toBeGreaterThan(0);
      }
      if (enforce && route === "/signage") {
        await expect(page.locator("[data-signage-live]")).toBeHidden();
        const noScriptStatus = page.locator('noscript [role="status"]').first();
        await expect(noScriptStatus).toBeVisible();
        await expect(noScriptStatus).toHaveText(/最新情報を取得できません/);
      }
    }
  } finally {
    await context.close();
  }
}

test("normal states avoid warning walls and unavailable WBGT never implies safety", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoRoute(page, "/");
  expect(
    await page.locator("[data-warning-card]:not([data-warning-trigger])").count(),
  ).toBe(0);
  const conditionalWarnings = page.locator("[data-warning-trigger]");
  for (let index = 0; index < (await conditionalWarnings.count()); index += 1) {
    const text = await conditionalWarnings.nth(index).innerText();
    expect(text).toMatch(/取得できません|情報が古い/);
    expect(text).not.toMatch(/安全|警報なし/);
  }
  const wbgt = page.locator("[data-wbgt-kind]").first();
  if ((await wbgt.count()) > 0) {
    const kind = await wbgt.getAttribute("data-wbgt-kind");
    const text = await wbgt.innerText();
    if (kind === "unavailable" || /取得できません|情報が古い/.test(text)) {
      expect(text).not.toMatch(/安全|警報なし/);
    }
  }

  await gotoRoute(page, "/chemical-ra");
  await expect(page.locator("main input").first()).toBeVisible();
  expect(await page.locator("[data-warning-card]").count()).toBe(0);
  const mainText = await page.locator("main").innerText();
  if (enforce) {
    expect(mainText).not.toContain("曖昧な物質は自動確定しません");
    expect(mainText).not.toContain("最終判断は化学物質管理者等が");
  }
});
