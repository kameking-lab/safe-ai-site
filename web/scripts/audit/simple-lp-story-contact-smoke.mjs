#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

function argument(name, fallback = undefined) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const baseUrl = argument("base-url", "http://127.0.0.1:3320").replace(/\/$/u, "");
const outputPath = argument("output");
const screenshotDirectory = argument("screenshot-dir");
const previewMode = process.argv.includes("--preview");
const previewBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
const protectedHeaders = previewBypass
  ? { "x-vercel-protection-bypass": previewBypass }
  : {};
const protectedOrigin = new URL(baseUrl).origin;
const expectedRecipients = [
  ...new Set(
    (process.env.AUTOMATION_CONSULT_RECIPIENTS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ),
];
const expectedTo = expectedRecipients.find((value) =>
  value.toLowerCase().endsWith("@gmail.com"),
);
const expectedBcc = expectedRecipients.find((value) =>
  value.toLowerCase().endsWith("@outlook.com"),
);
const removedTerms = [
  "受付準備中",
  "オンライン相談受付は準備中",
  "相談フォーム準備中",
  "日商簿記2級",
  "簿記",
  "現場別気象警報・熱中症通知システム",
  "安全eラーニングシステム",
  "全社の年間表彰",
  "全社表彰",
  "年間表彰",
  "現在の職場",
];
const expectedSubject = "安全AIポータル｜業務自動化・講習の相談";

function normalizeText(value) {
  return value.replace(/\s+/gu, "");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function exposeRemovedTerms(value) {
  return removedTerms.filter((term) => value.includes(term));
}

function emailCount(value) {
  return (value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu) ?? []).length;
}

function defaultRobotsGroup(value) {
  return (
    value
      .split(/\r?\n\s*\r?\n/gu)
      .find((group) => /^User-Agent:\s*\*\s*$/imu.test(group)) ?? ""
  );
}

async function fetchText(route, options = undefined) {
  const response = await fetch(`${baseUrl}${route}`, {
    ...options,
    headers: { ...protectedHeaders, ...(options?.headers ?? {}) },
    signal: AbortSignal.timeout(30_000),
  });
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text(),
  };
}

const browser = await chromium.launch();
const consoleErrors = [];
const pageErrors = [];
const failedAssets = [];
const previewPlatformDiagnostics = [];

function isPreviewPlatformDiagnostic(text) {
  return (
    previewMode &&
    (text.includes("vercel.live/_next-live/feedback/feedback.js") ||
      text.includes(
        "upgrade-insecure-requests' is ignored when delivered in a report-only policy",
      ))
  );
}

async function attachPreviewProtection(page) {
  if (!previewBypass) return;
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (new URL(request.url()).origin !== protectedOrigin) {
      await route.continue();
      return;
    }
    await route.continue({
      headers: { ...request.headers(), ...protectedHeaders },
    });
  });
}

async function inspectPage(route, selector = "body") {
  const context = await browser.newContext({
    viewport: { width: 390, height: 900 },
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  await attachPreviewProtection(page);
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text().slice(0, 300);
    if (isPreviewPlatformDiagnostic(text)) {
      previewPlatformDiagnostics.push({ route, type: "console" });
      return;
    }
    consoleErrors.push({ route, text });
  });
  page.on("pageerror", (error) => pageErrors.push({ route, name: error.name }));
  page.on("requestfailed", (request) => {
    const resourceType = request.resourceType();
    if (["document", "script", "stylesheet", "image", "font"].includes(resourceType)) {
      const path = new URL(request.url()).pathname;
      if (previewMode && path === "/_next-live/feedback/feedback.js") {
        previewPlatformDiagnostics.push({ route, type: "vercel-toolbar" });
        return;
      }
      failedAssets.push({ route, resourceType, path });
    }
  });
  const response = await page.goto(`${baseUrl}${route}`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  const responseHeaders = response?.headers() ?? {};
  await page.waitForTimeout(150);
  const result = await page.evaluate((contentSelector) => {
    const selected = document.querySelector(contentSelector);
    const text = selected?.textContent ?? "";
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((node) => node.textContent ?? "")
      .join("\n");
    return {
      title: document.title,
      description:
        document.querySelector('meta[name="description"]')?.getAttribute("content") ?? null,
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
      robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null,
      h1: [...document.querySelectorAll("h1")].map((node) => node.textContent?.trim() ?? ""),
      normalizedText: text.replace(/\s+/gu, ""),
      bodyText: document.body.textContent ?? "",
      html: document.documentElement.outerHTML,
      jsonLd,
      sectionCount: document.querySelectorAll("[data-lp-section]").length,
      ctaCount: document.querySelectorAll("[data-lp-cta]").length,
      primaryHeroCount: document.querySelectorAll("[data-hero-primary]").length,
      secondaryHeroCount: document.querySelectorAll("[data-hero-secondary]").length,
      storyBlockCount: document.querySelectorAll("[data-story-block]").length,
      modelCaseTopLevelDetails:
        document.querySelectorAll('#model-cases div[aria-label="18件のモデルケース"] > details').length,
      hasRemainingTwelve: (document.body.textContent ?? "").includes("残り12件のモデルケースを見る"),
      hasMailState: (document.body.textContent ?? "").includes("メール相談受付中"),
      hasWebFormState: (document.body.textContent ?? "").includes("Webフォーム受付中"),
      hasCopyTemplate:
        document.querySelector('textarea[aria-label="コピー用の相談テンプレート"]') !== null,
      linksToSafetyAi: document.querySelectorAll('a[href="/safety-ai"]').length,
      footerLinksToSafetyAi: document.querySelectorAll('footer a[href="/safety-ai"]').length,
      horizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  }, selector);
  await context.close();
  return {
    status: response?.status() ?? 0,
    xRobotsTag: responseHeaders["x-robots-tag"] ?? null,
    cacheControl: responseHeaders["cache-control"] ?? null,
    ...result,
  };
}

async function inspectReflow(route) {
  const output = [];
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 1024 ? 768 : 900 },
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    await attachPreviewProtection(page);
    await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    output.push(
      await page.evaluate((viewportWidth) => ({
        width: viewportWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        primaryVisible: (() => {
          const element = document.querySelector("[data-hero-primary] a");
          if (!(element instanceof HTMLElement)) return false;
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height >= 44;
        })(),
      }),
      width,
    ));
    await context.close();
  }
  return output;
}

async function inspectNoJavaScript() {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  await attachPreviewProtection(page);
  await page.goto(`${baseUrl}/safety-ai`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const lp = await page.evaluate(() => ({
    h1: document.querySelector("h1")?.textContent?.trim() ?? null,
    primaryHref: document.querySelector("[data-hero-primary] a")?.getAttribute("href") ?? null,
  }));
  await page.goto(`${baseUrl}/contact/automation-email`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  const contact = await page.evaluate(() => ({
    template: document.querySelector('textarea[aria-label="コピー用の相談テンプレート"]') !== null,
    nativePost:
      document.querySelector('form[method="post"][action="/contact/automation-email/draft"]') !== null,
    noScriptInstructions: (document.body.textContent ?? "").includes("上の定型文を選択"),
  }));
  await context.close();
  return { lp, contact };
}

async function captureScreenshots() {
  if (!screenshotDirectory) return [];
  const routes = [
    ["home", "/"],
    ["safety-ai", "/safety-ai"],
    ["project-story", "/about/project-story"],
    ["automation", "/services/automation"],
  ];
  const records = [];
  await mkdir(path.resolve(screenshotDirectory), { recursive: true });
  for (const [name, route] of routes) {
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: width >= 768 ? 900 : 1000 },
        serviceWorkers: "block",
      });
      const page = await context.newPage();
      await attachPreviewProtection(page);
      const response = await page.goto(`${baseUrl}${route}`, {
        waitUntil: "networkidle",
        timeout: 30_000,
      });
      // Full-page capture is evidence, not a runtime performance measurement.
      // Render content-visibility:auto sections so the image reflects what a
      // user sees while scrolling instead of Chromium's off-screen placeholders.
      await page.addStyleTag({
        content: "* { content-visibility: visible !important; }",
      });
      const layout = await page.evaluate(() => ({
        h1Count: document.querySelectorAll("h1").length,
        overflow:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1,
      }));
      const fileName = `${name}-${width}.png`;
      await page.screenshot({
        path: path.join(path.resolve(screenshotDirectory), fileName),
        fullPage: true,
      });
      records.push({
        route,
        width,
        status: response?.status() ?? 0,
        h1Count: layout.h1Count,
        overflow: layout.overflow,
        fileName,
      });
      await context.close();
    }
  }
  return records;
}

try {
  const [
    home,
    lp,
    story,
    automation,
    contact,
    quality,
    reflow,
    noJavaScript,
    robots,
    sitemap,
    heatHub,
    heatSlides,
    heatElearning,
    contactQueryGet,
    screenshots,
  ] = await Promise.all([
    inspectPage("/"),
    inspectPage("/safety-ai", "[data-simple-safety-ai-lp]"),
    inspectPage("/about/project-story", "[data-project-story]"),
    inspectPage("/services/automation"),
    inspectPage("/contact/automation-email"),
    inspectPage("/about/quality"),
    inspectReflow("/safety-ai"),
    inspectNoJavaScript(),
    fetchText("/robots.txt"),
    fetchText("/sitemap.xml"),
    fetchText("/heat-illness-prevention"),
    fetchText("/heat-illness-prevention/slides"),
    fetchText("/heat-illness-prevention/elearning"),
    fetchText("/contact/automation-email/draft?message=synthetic-must-not-be-read"),
    captureScreenshots(),
  ]);
  const notFound = await fetchText("/__simple-lp-smoke-missing__");

  const draftPost = await fetchText("/contact/automation-email/draft?message=synthetic-query", {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "message=synthetic-body-must-not-be-read",
  });
  const location = draftPost.headers.location ?? "";
  const mailto = location.startsWith("mailto:") ? new URL(location) : null;
  const mailTo = mailto ? decodeURIComponent(mailto.pathname) : null;
  const mailBcc = mailto?.searchParams.get("bcc") ?? null;
  const mailSubject = mailto?.searchParams.get("subject") ?? null;
  const mailBody = mailto?.searchParams.get("body") ?? null;

  const chunkPaths = [
    ...new Set(
      [home, lp, story, automation, contact, quality]
        .flatMap((page) => [
          ...page.html.matchAll(/<script[^>]+src=["']([^"']+)["']/giu),
        ])
        .map((match) => match[1])
        .filter((value) => value.startsWith("/_next/static/")),
    ),
  ];
  const chunks = await Promise.all(
    chunkPaths.map(async (chunkPath) => ({
      pathHash: sha256(chunkPath),
      body: (await fetchText(chunkPath)).body,
    })),
  );
  const chunkExposure = chunks.filter(({ body }) =>
    expectedRecipients.some((recipient) => body.includes(recipient)),
  );
  const chunkRemovedTermExposure = chunks.filter(({ body }) =>
    removedTerms.some((term) => body.includes(term)),
  );

  const publicPages = [home, lp, story, automation, contact, quality];
  const exposedTerms = publicPages.flatMap((page) =>
    exposeRemovedTerms(page.html),
  );
  const result = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    baseUrl,
    mode: previewMode ? "preview" : "production",
    pages: {
      home: { status: home.status, h1Count: home.h1.length, linksToSafetyAi: home.linksToSafetyAi },
      lp: {
        status: lp.status,
        title: lp.title,
        description: lp.description,
        canonical: lp.canonical,
        h1: lp.h1,
        textLength: normalizeText(lp.normalizedText).length,
        sectionCount: lp.sectionCount,
        ctaCount: lp.ctaCount,
        primaryHeroCount: lp.primaryHeroCount,
        secondaryHeroCount: lp.secondaryHeroCount,
        jsonLdEmailCount: emailCount(lp.jsonLd),
      },
      story: {
        status: story.status,
        title: story.title,
        description: story.description,
        canonical: story.canonical,
        h1: story.h1,
        textLength: normalizeText(story.normalizedText).length,
        blockCount: story.storyBlockCount,
        removedTerms: exposeRemovedTerms(story.bodyText),
        jsonLdEmailCount: emailCount(story.jsonLd),
      },
      automation: {
        status: automation.status,
        h1: automation.h1,
        mailState: automation.hasMailState,
        webFormState: automation.hasWebFormState,
        topLevelCaseGroups: automation.modelCaseTopLevelDetails,
        remainingTwelve: automation.hasRemainingTwelve,
      },
      contact: {
        status: contact.status,
        robots: contact.robots,
        canonical: contact.canonical,
        mailState: contact.hasMailState,
        copyTemplate: contact.hasCopyTemplate,
        htmlEmailCount: emailCount(contact.html),
        jsonLdEmailCount: emailCount(contact.jsonLd),
      },
      quality: { status: quality.status, linksToSafetyAi: quality.linksToSafetyAi },
      notFound: { status: notFound.status },
    },
    draft: {
      getStatus: contactQueryGet.status,
      getNoStore: /no-store/iu.test(contactQueryGet.headers["cache-control"] ?? ""),
      getNoindex: /noindex/iu.test(contactQueryGet.headers["x-robots-tag"] ?? ""),
      postStatus: draftPost.status,
      postNoStore: /no-store/iu.test(draftPost.headers["cache-control"] ?? ""),
      postNoindex: /noindex/iu.test(draftPost.headers["x-robots-tag"] ?? ""),
      postNoReferrer: draftPost.headers["referrer-policy"] === "no-referrer",
      mailtoScheme: Boolean(mailto),
      toMatchesExpected: Boolean(expectedTo) && mailTo === expectedTo,
      bccMatchesExpected: Boolean(expectedBcc) && mailBcc === expectedBcc,
      subjectMatchesExpected: mailSubject === expectedSubject,
      fixedBodyIgnoresInput:
        Boolean(mailBody) &&
        !mailBody.includes("synthetic-query") &&
        !mailBody.includes("synthetic-body-must-not-be-read"),
      bodyContainsPrivacyWarning: Boolean(mailBody) && mailBody.includes("個人情報"),
      locationStored: false,
    },
    privacy: {
      expectedRecipientCount: expectedRecipients.length,
      publicHtmlRecipientExposureCount: publicPages.reduce(
        (sum, page) =>
          sum + expectedRecipients.filter((recipient) => page.html.includes(recipient)).length,
        0,
      ),
      publicJsonLdRecipientExposureCount: publicPages.reduce(
        (sum, page) =>
          sum + expectedRecipients.filter((recipient) => page.jsonLd.includes(recipient)).length,
        0,
      ),
      clientChunkCount: chunks.length,
      clientChunkRecipientExposureCount: chunkExposure.length,
      exposedChunkPathHashes: chunkExposure.map(({ pathHash }) => pathHash),
      clientChunkRemovedTermExposureCount: chunkRemovedTermExposure.length,
      removedTermChunkPathHashes: chunkRemovedTermExposure.map(
        ({ pathHash }) => pathHash,
      ),
      removedTermExposure: [...new Set(exposedTerms)],
      consultationBodyLogged: false,
      recipientValuesStored: false,
    },
    seo: {
      robotsStatus: robots.status,
      productionRobotsAllowsRoot: !/^Disallow:\s*\/\s*$/imu.test(
        defaultRobotsGroup(robots.body),
      ),
      previewRobotsDisallowsRoot: /^Disallow:\s*\/\s*$/imu.test(
        defaultRobotsGroup(robots.body),
      ),
      allPublicPagesNoindexHeader: publicPages.every((page) =>
        /noindex,\s*nofollow,\s*noarchive/iu.test(page.xRobotsTag ?? ""),
      ),
      sitemapStatus: sitemap.status,
      contactInSitemap: sitemap.body.includes("/contact/automation-email"),
      heatInSitemap: [
        "/heat-illness-prevention</loc>",
        "/heat-illness-prevention/slides</loc>",
        "/heat-illness-prevention/elearning</loc>",
      ].some((value) => sitemap.body.includes(value)),
      heatNoindexFollow: [heatHub, heatSlides, heatElearning].map((response) => ({
        status: response.status,
        noindex: /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/iu.test(response.body),
        follow: /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*follow/iu.test(response.body),
      })),
    },
    accessibility: {
      reflow,
      noJavaScript,
      consoleErrors,
      pageErrors,
      failedAssets,
      previewPlatformDiagnostics,
      screenshots,
    },
  };

  result.accepted =
    result.pages.lp.status === 200 &&
    result.pages.lp.h1.length === 1 &&
    result.pages.lp.textLength >= 1200 &&
    result.pages.lp.textLength <= 1800 &&
    result.pages.lp.sectionCount === 5 &&
    result.pages.lp.ctaCount === 13 &&
    result.pages.lp.primaryHeroCount === 1 &&
    result.pages.lp.secondaryHeroCount <= 2 &&
    result.pages.story.status === 200 &&
    result.pages.story.textLength >= 900 &&
    result.pages.story.textLength <= 1400 &&
    result.pages.story.blockCount === 5 &&
    result.pages.story.removedTerms.length === 0 &&
    result.pages.automation.mailState &&
    !result.pages.automation.webFormState &&
    result.pages.automation.remainingTwelve &&
    result.pages.contact.status === 200 &&
    /noindex/iu.test(result.pages.contact.robots ?? "") &&
    result.pages.contact.canonical === null &&
    result.pages.contact.copyTemplate &&
    result.draft.getStatus === 405 &&
    result.draft.postStatus === 303 &&
    result.draft.getNoStore &&
    result.draft.getNoindex &&
    result.draft.postNoStore &&
    result.draft.postNoindex &&
    result.draft.postNoReferrer &&
    result.draft.mailtoScheme &&
    result.draft.toMatchesExpected &&
    result.draft.bccMatchesExpected &&
    result.draft.subjectMatchesExpected &&
    result.draft.fixedBodyIgnoresInput &&
    result.privacy.publicHtmlRecipientExposureCount === 0 &&
    result.privacy.publicJsonLdRecipientExposureCount === 0 &&
    result.privacy.clientChunkRecipientExposureCount === 0 &&
    result.privacy.clientChunkRemovedTermExposureCount === 0 &&
    result.privacy.removedTermExposure.length === 0 &&
    result.seo.robotsStatus === 200 &&
    (previewMode
      ? result.seo.previewRobotsDisallowsRoot
      : result.seo.productionRobotsAllowsRoot) &&
    result.seo.sitemapStatus === 200 &&
    !result.seo.contactInSitemap &&
    !result.seo.heatInSitemap &&
    result.seo.heatNoindexFollow.every((entry) => entry.status === 200 && entry.noindex && entry.follow) &&
    result.accessibility.reflow.every((entry) => !entry.overflow && entry.primaryVisible) &&
    result.accessibility.noJavaScript.lp.primaryHref === "/" &&
    result.accessibility.noJavaScript.contact.template &&
    result.accessibility.noJavaScript.contact.nativePost &&
    result.accessibility.consoleErrors.length === 0 &&
    result.accessibility.pageErrors.length === 0 &&
    result.accessibility.failedAssets.length === 0 &&
    (!screenshotDirectory ||
      (result.accessibility.screenshots.length === 16 &&
        result.accessibility.screenshots.every(
          (entry) =>
            entry.status === 200 &&
            entry.h1Count === 1 &&
            !entry.overflow,
        ))) &&
    result.pages.notFound.status === 404;

  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath) {
    await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
    await writeFile(path.resolve(outputPath), serialized, "utf8");
  }
  process.stdout.write(
    `${JSON.stringify({ accepted: result.accepted, lpTextLength: result.pages.lp.textLength, storyTextLength: result.pages.story.textLength, recipientExposure: result.privacy.clientChunkRecipientExposureCount })}\n`,
  );
  if (!result.accepted) process.exitCode = 1;
} finally {
  await browser.close();
}
