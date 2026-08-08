import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const args = new Map(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith("--"))
    .map((arg) => {
      const [key, ...rest] = arg.slice(2).split("=");
      return [key, rest.join("=") || "true"];
    }),
);

const BASE_URL = (args.get("base") || "https://www.anzen-ai-portal.jp").replace(/\/$/, "");
const OUT_DIR = path.resolve(
  process.cwd(),
  args.get("out") ||
    "../docs/audits/evidence/brand-ux-feature-restructure-2026-07-30/before",
);
const PHASE = args.get("phase") || "before";

const ROUTES = [
  ["home", "/"],
  ["safety-ai", "/safety-ai"],
  ["risk", "/risk"],
  ["heat-hub", "/heat-illness-prevention"],
  ["heat-slides", "/heat-illness-prevention/slides"],
  ["heat-elearning", "/heat-illness-prevention/elearning"],
  ["chatbot", "/chatbot"],
  ["chemical-ra", "/chemical-ra"],
  ["whats-new", "/whats-new"],
  ["laws", "/laws"],
  ["law-search", "/law-search"],
  ["accident-news", "/accident-news"],
  ["accidents", "/accidents"],
  ["ky-paper", "/ky/paper"],
  ["safety-diary", "/safety-diary"],
  ["visual-ky", "/training/visual-ky"],
  ["education", "/education"],
  ["qualifications", "/education-certification"],
  ["qualification-finder", "/education-certification/finder"],
  ["elearning", "/e-learning"],
  ["signage", "/signage"],
  ["automation", "/services/automation"],
  ["automation-examples", "/automation-examples"],
  ["about", "/about"],
  ["project-story", "/about/project-story"],
  ["quality", "/about/quality"],
  ["data-sources", "/about/data-sources"],
  ["features", "/features"],
  ["role-entries", "/features/use-cases"],
  ["search", "/search"],
  ["not-found", "/brand-ux-not-found-probe"],
];

const VIEWPORTS = [
  { name: "320x844", width: 320, height: 844, screenshot: true },
  { name: "360x800", width: 360, height: 800, screenshot: false },
  { name: "390x844", width: 390, height: 844, screenshot: true },
  { name: "768x1024", width: 768, height: 1024, screenshot: true },
  { name: "1024x768", width: 1024, height: 768, screenshot: false },
  { name: "1440x900", width: 1440, height: 900, screenshot: true },
];

const BLOCKED_HOSTS = [
  "googletagmanager.com",
  "google-analytics.com",
  "googlesyndication.com",
  "doubleclick.net",
];

async function prepareContext(browser, options = {}) {
  const context = await browser.newContext({
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    colorScheme: options.colorScheme || "light",
    reducedMotion: options.reducedMotion || "no-preference",
    forcedColors: options.forcedColors || "none",
    javaScriptEnabled: options.javaScriptEnabled ?? true,
    viewport: options.viewport || { width: 390, height: 844 },
    deviceScaleFactor: 1,
    extraHTTPHeaders: {
      DNT: "1",
      "Sec-GPC": "1",
    },
  });

  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (BLOCKED_HOSTS.some((host) => url.hostname.endsWith(host))) {
      await route.abort();
      return;
    }
    await route.continue();
  });

  if (options.javaScriptEnabled !== false) {
    await context.addInitScript(() => {
      try {
        localStorage.setItem(
          "safe-ai:optional-tracking-consent:v1",
          JSON.stringify({ value: "denied", updatedAt: "2026-07-30T00:00:00.000Z" }),
        );
      } catch {
        // Storage denial is an acceptable fail-closed state.
      }
    });
  }
  return context;
}

async function waitForStablePage(page) {
  await page
    .evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    })
    .catch(() => {});
  await page.waitForTimeout(450);
}

async function collectMetrics(page, routePath, response, consoleErrors, pageErrors) {
  const viewport = page.viewportSize();
  const dom = await page.evaluate(({ routePath, viewport }) => {
    const isVisible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const closedDetails = element.closest("details:not([open])");
      if (
        closedDetails &&
        !element.matches("summary") &&
        !element.closest("summary")
      ) {
        return false;
      }
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || 1) > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const inFirstView = (element) => {
      if (!isVisible(element)) return false;
      const rect = element.getBoundingClientRect();
      return (
        rect.bottom > 0 &&
        rect.top < viewport.height &&
        rect.right > 0 &&
        rect.left < viewport.width
      );
    };
    const text = (value) =>
      String(value || "")
        .replace(/\s+/g, " ")
        .trim();
    const visibleElements = [...document.querySelectorAll("body *")].filter(isVisible);
    const colorCounts = new Map();
    const gradientCounts = new Map();
    const shadowCounts = new Map();
    const radiusCounts = new Map();
    const cardSignatures = new Map();
    const increment = (map, value) => {
      if (!value || value === "none" || value === "rgba(0, 0, 0, 0)") return;
      map.set(value, (map.get(value) || 0) + 1);
    };

    for (const element of visibleElements) {
      const style = getComputedStyle(element);
      increment(colorCounts, style.color);
      increment(colorCounts, style.backgroundColor);
      increment(colorCounts, style.borderTopColor);
      if (style.backgroundImage.includes("gradient")) {
        increment(gradientCounts, style.backgroundImage);
      }
      increment(shadowCounts, style.boxShadow);
      increment(radiusCounts, style.borderRadius);
      if (
        element.matches("article, [class*='card'], [class*='rounded-2xl'], [class*='rounded-3xl']")
      ) {
        const signature = [
          style.backgroundColor,
          style.borderTopColor,
          style.borderRadius,
          style.boxShadow,
        ].join("|");
        increment(cardSignatures, signature);
      }
    }

    const isPageContent = (element) => !element.closest("[data-mobile-nav]");
    const firstViewTextNodes = [...document.querySelectorAll(
      "main h1, main h2, main h3, main p, main li, main label, main summary, main [data-content-density-text]",
    )]
      .filter((element) => isPageContent(element) && inFirstView(element))
      .map((element) => text(element.textContent))
      .filter(Boolean);
    const firstViewText = [...new Set(firstViewTextNodes)].join(" ");
    const firstViewParagraphs = [...document.querySelectorAll("main p")].filter(
      (element) => isPageContent(element) && inFirstView(element),
    );
    const firstViewCtas = [
      ...document.querySelectorAll(
        "main a[href], main button:not([disabled]), main input[type='submit']",
      ),
    ]
      .filter((element) => isPageContent(element) && inFirstView(element))
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        label: text(
          element.getAttribute("aria-label") ||
            element.textContent ||
            element.getAttribute("value"),
        ).slice(0, 100),
        href: element.getAttribute("href") || "",
      }));
    const firstMainSection = document.querySelector("main section, main article, main > div");
    const firstMainRect = firstMainSection?.getBoundingClientRect();
    const mascotImages = [...document.querySelectorAll("img")]
      .filter((image) => (image.currentSrc || image.src).includes("/mascot/"))
      .map((image) => {
        const rect = image.getBoundingClientRect();
        return {
          src: (image.currentSrc || image.src).replace(location.origin, ""),
          alt: image.alt,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          firstView: rect.bottom > 0 && rect.top < viewport.height,
          visible: isVisible(image),
          complete: image.complete,
          naturalWidth: image.naturalWidth,
        };
      });
    const visualImages = [...document.querySelectorAll("main img")]
      .filter(isVisible)
      .map((image) => ({
        src: (image.currentSrc || image.src).replace(location.origin, ""),
        alt: image.alt,
        loading: image.loading,
        width: image.width,
        height: image.height,
      }))
      .slice(0, 40);
    const headings = [...document.querySelectorAll("main h1, main h2, main h3")]
      .filter(isVisible)
      .map((heading) => {
        const style = getComputedStyle(heading);
        return {
          level: heading.tagName.toLowerCase(),
          text: text(heading.textContent).slice(0, 160),
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          color: style.color,
        };
      })
      .slice(0, 60);
    const allHrefs = [...document.querySelectorAll("nav a[href]")]
      .filter(isVisible)
      .map((link) => link.getAttribute("href"))
      .filter(Boolean);
    const duplicateNavHrefs = Object.entries(
      allHrefs.reduce((acc, href) => {
        acc[href] = (acc[href] || 0) + 1;
        return acc;
      }, {}),
    )
      .filter(([, count]) => count > 1)
      .map(([href, count]) => ({ href, count }));
    const rootStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);
    const cssTokens = {};
    for (const token of [
      "--background",
      "--foreground",
      "--surface-card",
      "--surface-muted",
      "--border-subtle",
      "--color-brand-primary",
      "--color-brand-accent",
      "--color-brand-danger",
    ]) {
      cssTokens[token] = rootStyle.getPropertyValue(token).trim();
    }
    const smallTargets = [
      ...document.querySelectorAll("a[href], button:not([disabled]), input, select, textarea, summary"),
    ]
      .filter(isVisible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label: text(
            element.getAttribute("aria-label") || element.textContent || element.getAttribute("name"),
          ).slice(0, 80),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter(({ width, height }) => width < 44 || height < 44)
      .slice(0, 40);

    return {
      routePath,
      documentTitle: document.title,
      lang: document.documentElement.lang,
      h1Count: document.querySelectorAll("main h1").length,
      h1: [...document.querySelectorAll("main h1")].map((node) => text(node.textContent)),
      mainCount: document.querySelectorAll("main").length,
      canonical: document.querySelector("link[rel='canonical']")?.href || "",
      robots: document.querySelector("meta[name='robots']")?.content || "",
      description: document.querySelector("meta[name='description']")?.content || "",
      bodyFontSize: bodyStyle.fontSize,
      bodyLineHeight: bodyStyle.lineHeight,
      bodyBackground: bodyStyle.backgroundColor,
      firstViewCharacters: [...firstViewText].length,
      firstViewText: firstViewText.slice(0, 1200),
      firstViewParagraphCount: firstViewParagraphs.length,
      firstViewParagraphs: firstViewParagraphs.map((node) => text(node.textContent).slice(0, 240)),
      firstViewCtaCount: firstViewCtas.length,
      firstViewCtas: firstViewCtas.slice(0, 30),
      firstMainTop: firstMainRect ? Math.round(firstMainRect.top) : null,
      pageScrollHeight: document.documentElement.scrollHeight,
      viewportHeight: viewport.height,
      viewportWidth: viewport.width,
      scrollScreens: Number(
        (document.documentElement.scrollHeight / Math.max(1, viewport.height)).toFixed(2),
      ),
      horizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      colorCount: colorCounts.size,
      colors: [...colorCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 80)
        .map(([value, count]) => ({ value, count })),
      gradientCount: gradientCounts.size,
      gradients: [...gradientCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([value, count]) => ({ value, count })),
      shadowCount: shadowCounts.size,
      shadows: [...shadowCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([value, count]) => ({ value, count })),
      radiusCount: radiusCounts.size,
      radii: [...radiusCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([value, count]) => ({ value, count })),
      cardTypeCount: cardSignatures.size,
      cardTypes: [...cardSignatures.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([value, count]) => ({ value, count })),
      headings,
      mascotCount: mascotImages.filter((item) => item.visible).length,
      mascotImages,
      visualImages,
      missingAltCount: [...document.querySelectorAll("main img")]
        .filter(isVisible)
        .filter((image) => !image.hasAttribute("alt")).length,
      brokenImageCount: [...document.querySelectorAll("img")]
        .filter(isVisible)
        .filter((image) => image.complete && image.naturalWidth === 0).length,
      primaryNavItemCount: document.querySelectorAll(
        "[data-primary-navigation] a[href]",
      ).length,
      mobileNavItemCount: document.querySelectorAll(
        "[data-mobile-nav='bottom'] a[href]",
      ).length,
      duplicateNavHrefs,
      cssTokens,
      smallTargetCount: smallTargets.length,
      smallTargets,
      forcedColorsSupported: CSS.supports("forced-color-adjust", "auto"),
      reducedMotionActive: matchMedia("(prefers-reduced-motion: reduce)").matches,
      forcedColorsActive: matchMedia("(forced-colors: active)").matches,
    };
  }, { routePath, viewport });

  return {
    ...dom,
    url: page.url(),
    status: response?.status() ?? null,
    consoleErrors,
    pageErrors,
  };
}

async function runViewportAudit(browser, viewport) {
  const context = await prepareContext(browser, {
    viewport: { width: viewport.width, height: viewport.height },
  });
  const page = await context.newPage();
  const results = [];
  try {
    for (const [slug, routePath] of ROUTES) {
      const consoleErrors = [];
      const pageErrors = [];
      const onConsole = (message) => {
        if (message.type() === "error") consoleErrors.push(message.text().slice(0, 500));
      };
      const onPageError = (error) => pageErrors.push(String(error).slice(0, 500));
      page.on("console", onConsole);
      page.on("pageerror", onPageError);
      let response = null;
      try {
        response = await page.goto(`${BASE_URL}${routePath}`, {
          waitUntil: "domcontentloaded",
          timeout: 45_000,
        });
        await waitForStablePage(page);
        const metrics = await collectMetrics(
          page,
          routePath,
          response,
          consoleErrors,
          pageErrors,
        );
        results.push({ slug, viewport: viewport.name, ok: true, ...metrics });
        if (viewport.screenshot) {
          await page.screenshot({
            path: path.join(OUT_DIR, "screenshots", `${slug}-${viewport.name}.png`),
            fullPage: false,
            animations: "disabled",
          });
        }
      } catch (error) {
        results.push({
          slug,
          routePath,
          viewport: viewport.name,
          ok: false,
          status: response?.status() ?? null,
          error: String(error),
          consoleErrors,
          pageErrors,
        });
      } finally {
        page.off("console", onConsole);
        page.off("pageerror", onPageError);
      }
    }
  } finally {
    await context.close();
  }
  return results;
}

async function runModeAudits(browser) {
  const results = [];

  for (const [name, options] of [
    [
      "landscape",
      {
        viewport: { width: 844, height: 390 },
        routes: [
          ["home", "/"],
          ["risk", "/risk"],
          ["chatbot", "/chatbot"],
          ["chemical-ra", "/chemical-ra"],
          ["project-story", "/about/project-story"],
        ],
      },
    ],
    [
      "reduced-motion",
      {
        viewport: { width: 390, height: 844 },
        reducedMotion: "reduce",
        routes: [
          ["home", "/"],
          ["visual-ky", "/training/visual-ky"],
          ["project-story", "/about/project-story"],
        ],
      },
    ],
    [
      "forced-colors",
      {
        viewport: { width: 390, height: 844 },
        forcedColors: "active",
        routes: [
          ["home", "/"],
          ["chatbot", "/chatbot"],
          ["chemical-ra", "/chemical-ra"],
          ["project-story", "/about/project-story"],
        ],
      },
    ],
  ]) {
    const context = await prepareContext(browser, options);
    const page = await context.newPage();
    try {
      for (const [slug, routePath] of options.routes) {
        const response = await page.goto(`${BASE_URL}${routePath}`, {
          waitUntil: "domcontentloaded",
          timeout: 45_000,
        });
        await waitForStablePage(page);
        const metrics = await collectMetrics(page, routePath, response, [], []);
        results.push({ name, slug, ...metrics });
        await page.screenshot({
          path: path.join(OUT_DIR, "modes", `${name}-${slug}.png`),
          fullPage: false,
          animations: "disabled",
        });
      }
    } finally {
      await context.close();
    }
  }

  for (const scale of [2, 4]) {
    // WCAG reflow checks browser zoom at a 1280 CSS-pixel reference width.
    // Chromium headless does not expose stable browser UI zoom, so the
    // equivalent layout viewport (1280 / zoom) is used instead of mutating
    // the root font-size, which is text-only zoom and produces false positives.
    const context = await prepareContext(browser, {
      viewport: { width: Math.round(1280 / scale), height: 844 },
    });
    const page = await context.newPage();
    try {
      for (const [slug, routePath] of [
        ["home", "/"],
        ["chatbot", "/chatbot"],
        ["chemical-ra", "/chemical-ra"],
        ["features", "/features"],
        ["project-story", "/about/project-story"],
      ]) {
        const response = await page.goto(`${BASE_URL}${routePath}`, {
          waitUntil: "domcontentloaded",
          timeout: 45_000,
        });
        await waitForStablePage(page);
        const metrics = await collectMetrics(page, routePath, response, [], []);
        results.push({
          name: `${scale * 100}-percent`,
          method: "1280px-browser-zoom-reflow-equivalent",
          zoomPercent: scale * 100,
          slug,
          ...metrics,
        });
        await page.screenshot({
          path: path.join(OUT_DIR, "modes", `${scale * 100}-percent-${slug}.png`),
          fullPage: false,
          animations: "disabled",
        });
      }
    } finally {
      await context.close();
    }
  }

  const keyboardContext = await prepareContext(browser, {
    viewport: { width: 1440, height: 900 },
  });
  const keyboardPage = await keyboardContext.newPage();
  try {
    for (const [slug, routePath] of [
      ["home", "/"],
      ["safety-ai", "/safety-ai"],
      ["chatbot", "/chatbot"],
      ["chemical-ra", "/chemical-ra"],
      ["project-story", "/about/project-story"],
    ]) {
      await keyboardPage.goto(`${BASE_URL}${routePath}`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      await waitForStablePage(keyboardPage);
      const focusSequence = [];
      for (let index = 0; index < 16; index += 1) {
        await keyboardPage.keyboard.press("Tab");
        focusSequence.push(
          await keyboardPage.evaluate(() => {
            const active = document.activeElement;
            if (!active) return null;
            const rect = active.getBoundingClientRect();
            return {
              tag: active.tagName.toLowerCase(),
              label: (
                active.getAttribute("aria-label") ||
                active.textContent ||
                active.getAttribute("name") ||
                ""
              )
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 120),
              href: active.getAttribute("href") || "",
              visible:
                rect.width > 0 &&
                rect.height > 0 &&
                getComputedStyle(active).visibility !== "hidden",
              outline: getComputedStyle(active).outline,
              boxShadow: getComputedStyle(active).boxShadow,
            };
          }),
        );
      }
      results.push({ name: "keyboard", slug, routePath, focusSequence });
    }
  } finally {
    await keyboardContext.close();
  }

  const noJsContext = await prepareContext(browser, {
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
  });
  const noJsPage = await noJsContext.newPage();
  try {
    for (const [slug, routePath] of [
      ["home", "/"],
      ["safety-ai", "/safety-ai"],
      ["chatbot", "/chatbot"],
      ["chemical-ra", "/chemical-ra"],
      ["laws", "/laws"],
      ["accidents", "/accidents"],
      ["automation", "/services/automation"],
      ["features", "/features"],
      ["project-story", "/about/project-story"],
    ]) {
      const response = await noJsPage.goto(`${BASE_URL}${routePath}`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      const snapshot = await noJsPage.evaluate(() => ({
        h1: [...document.querySelectorAll("main h1")].map((node) =>
          (node.textContent || "").replace(/\s+/g, " ").trim(),
        ),
        mainCharacters: (document.querySelector("main")?.innerText || "")
          .replace(/\s+/g, " ")
          .trim().length,
        linkCount: document.querySelectorAll("main a[href]").length,
        horizontalOverflow:
          document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }));
      results.push({
        name: "javascript-disabled",
        slug,
        routePath,
        status: response?.status() ?? null,
        ...snapshot,
      });
    }
  } finally {
    await noJsContext.close();
  }

  return results;
}

async function main() {
  await mkdir(path.join(OUT_DIR, "screenshots"), { recursive: true });
  await mkdir(path.join(OUT_DIR, "modes"), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const startedAt = new Date().toISOString();
  try {
    const viewportResults = [];
    for (const viewport of VIEWPORTS) {
      viewportResults.push(...(await runViewportAudit(browser, viewport)));
    }
    const modeResults = await runModeAudits(browser);
    const result = {
      schemaVersion: 1,
      phase: PHASE,
      baseUrl: BASE_URL,
      startedAt,
      completedAt: new Date().toISOString(),
      routes: ROUTES.map(([slug, routePath]) => ({ slug, routePath })),
      viewports: VIEWPORTS,
      viewportResults,
      modeResults,
    };
    await writeFile(
      path.join(OUT_DIR, "browser-audit.json"),
      `${JSON.stringify(result, null, 2)}\n`,
      "utf8",
    );
    process.stdout.write(
      `${JSON.stringify({
        phase: PHASE,
        baseUrl: BASE_URL,
        routeCount: ROUTES.length,
        viewportChecks: viewportResults.length,
        viewportFailures: viewportResults.filter((item) => !item.ok).length,
        modeChecks: modeResults.length,
        output: path.join(OUT_DIR, "browser-audit.json"),
      })}\n`,
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
