#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl = new URL(
  process.argv.find((value) => value.startsWith("--base="))?.slice(7) ??
    "https://www.anzen-ai-portal.jp",
);
const outputPath = resolve(
  process.cwd(),
  process.argv.find((value) => value.startsWith("--output="))?.slice(9) ??
    "effect-first-production-interaction-audit.json",
);

// Fixed, non-personal audit inputs. The report intentionally records only
// booleans and counts, never these values or emulated device coordinates.
const sampleChatQuestion = "足場の特別教育は必要？";
const sampleChemicalQuery = "キシレン";

function containsValue(values, needle) {
  return values.some((value) => String(value).includes(needle));
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  });
  const page = await context.newPage();
  const requestUrls = [];
  const consoleMessages = [];
  page.on("request", (request) => requestUrls.push(request.url()));
  page.on("console", (message) => consoleMessages.push(message.text()));

  await page.addInitScript(() => {
    window.__effectFirstGeoCalls = 0;
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: {
        query: async () => ({ state: "prompt" }),
      },
    });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition(success) {
          window.__effectFirstGeoCalls += 1;
          success({
            coords: {
              latitude: 35.6895,
              longitude: 139.6917,
              accuracy: 20,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          });
        },
      },
    });
  });

  await page.goto(baseUrl.href, { waitUntil: "networkidle" });
  const locationButton = page.getByRole("button", {
    name: "現在地を更新",
    exact: true,
  });
  await locationButton.waitFor({ state: "visible" });
  await locationButton.scrollIntoViewIfNeeded();
  const locationBefore = await page.evaluate(() => ({
    geoCalls: window.__effectFirstGeoCalls,
    coarseArea: localStorage.getItem("safe-ai:coarse-area-id:v1"),
  }));
  const hitTarget = await locationButton.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    const element = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    const slide = document
      .querySelector("[data-home-heat-slide-deck]")
      ?.getBoundingClientRect();
    return {
      ownsCenter: Boolean(element && button.contains(element)),
      height: rect.height,
      overlapsSlide: Boolean(
        slide &&
          rect.left < slide.right &&
          rect.right > slide.left &&
          rect.top < slide.bottom &&
          rect.bottom > slide.top,
      ),
    };
  });
  await locationButton.click();
  await page
    .getByText("現在地付近（端末内で都道府県へ変換）", { exact: true })
    .waitFor({ state: "visible" });
  const locationAfter = await page.evaluate(() => {
    const storage = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      storage.push(`${key}:${key ? localStorage.getItem(key) : ""}`);
    }
    return {
      geoCalls: window.__effectFirstGeoCalls,
      coarseArea: localStorage.getItem("safe-ai:coarse-area-id:v1"),
      storage,
      cookie: document.cookie,
      href: location.href,
    };
  });

  const exactCoordinateTokens = ["35.6895", "139.6917"];
  const locationResult = {
    beforeExplicitAction: {
      geolocationCallCount: locationBefore.geoCalls,
      coarseAreaStored: Boolean(locationBefore.coarseArea),
    },
    explicitAction: {
      geolocationCallCount: locationAfter.geoCalls,
      resolvedToCoarseArea: locationAfter.coarseArea === "tokyo-shinjuku",
      coarseAreaCookiePresent: locationAfter.cookie.includes(
        "safe-ai-coarse-area-v1=tokyo-shinjuku",
      ),
      buttonOwnsCenter: hitTarget.ownsCenter,
      minimumTargetHeightMet: hitTarget.height >= 44,
      slideOverlap: hitTarget.overlapsSlide,
    },
    privacy: {
      exactCoordinatesInUrl: exactCoordinateTokens.some((token) =>
        locationAfter.href.includes(token),
      ),
      exactCoordinatesInStorage: exactCoordinateTokens.some((token) =>
        containsValue(locationAfter.storage, token),
      ),
      exactCoordinatesInRequestUrl: exactCoordinateTokens.some((token) =>
        containsValue(requestUrls, token),
      ),
    },
  };

  const chatContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  });
  const chatPage = await chatContext.newPage();
  const chatRequestUrls = [];
  const chatTrackingBodies = [];
  const chatConsoleMessages = [];
  let streamStatus = null;
  chatPage.on("request", (request) => {
    chatRequestUrls.push(request.url());
    if (/\/api\/rum|analytics/i.test(request.url())) {
      chatTrackingBodies.push(request.postData() ?? "");
    }
  });
  chatPage.on("response", (response) => {
    if (response.url().includes("/api/chatbot/stream")) {
      streamStatus = response.status();
    }
  });
  chatPage.on("console", (message) => chatConsoleMessages.push(message.text()));
  await chatPage.goto(baseUrl.href, { waitUntil: "networkidle" });
  const chatInput = chatPage.getByLabel("安衛法AIへの質問", { exact: true });
  await chatInput.fill(sampleChatQuestion);
  const streamResponsePromise = chatPage
    .waitForResponse(
      (response) => response.url().includes("/api/chatbot/stream"),
      { timeout: 30_000 },
    )
    .catch(() => null);
  await chatInput.press("Enter");
  await chatPage.waitForURL((url) => url.pathname === "/chatbot");
  const streamResponse = await streamResponsePromise;
  if (streamResponse) streamStatus = streamResponse.status();
  await chatPage.waitForTimeout(500);
  const normalizedChatQuestion = sampleChatQuestion.normalize("NFKC");
  const sameQuestionVisibleWithoutReentry = await chatPage.evaluate(
    (sample) =>
      document.body.textContent?.includes(sample) ||
      Array.from(document.querySelectorAll("textarea")).some(
        (input) => input.value === sample,
      ) ||
      false,
    normalizedChatQuestion,
  );
  const chatStorage = await chatPage.evaluate(() => {
    const readStorage = (storage) => {
      const values = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        values.push(`${key}:${key ? storage.getItem(key) : ""}`);
      }
      return values;
    };
    return {
      local: readStorage(localStorage),
      session: readStorage(sessionStorage),
      path: location.pathname,
      search: location.search,
      hash: location.hash,
    };
  });
  const chatResult = {
    operationCount: 1,
    destinationReached: chatStorage.path === "/chatbot",
    sameQuestionVisibleWithoutReentry,
    streamStatus,
    privacy: {
      questionInUrl:
        [sampleChatQuestion, normalizedChatQuestion].some(
          (value) =>
            chatStorage.search.includes(value) ||
            chatStorage.hash.includes(value) ||
            containsValue(chatRequestUrls, value),
        ),
      questionInLocalStorage: [sampleChatQuestion, normalizedChatQuestion].some(
        (value) => containsValue(chatStorage.local, value),
      ),
      questionInSessionStorage: [
        sampleChatQuestion,
        normalizedChatQuestion,
      ].some((value) => containsValue(chatStorage.session, value)),
      questionInTrackingBody: [sampleChatQuestion, normalizedChatQuestion].some(
        (value) => containsValue(chatTrackingBodies, value),
      ),
      questionInConsole: [sampleChatQuestion, normalizedChatQuestion].some(
        (value) => containsValue(chatConsoleMessages, value),
      ),
    },
  };
  await chatContext.close();

  const chemicalContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  });
  const chemicalPage = await chemicalContext.newPage();
  const chemicalConsoleErrors = [];
  chemicalPage.on("console", (message) => {
    if (message.type() === "error") chemicalConsoleErrors.push(message.text());
  });
  await chemicalPage.goto(baseUrl.href, { waitUntil: "networkidle" });
  const chemicalInput = chemicalPage.getByRole("combobox", {
    name: "化学物質を検索",
    exact: true,
  });
  await chemicalInput.fill(sampleChemicalQuery);
  await chemicalInput.press("Enter");
  await chemicalPage.waitForURL((url) => url.pathname === "/chemical-ra");
  await chemicalPage.waitForFunction(
    () =>
      document.querySelectorAll('[role="option"]').length > 1 ||
      Boolean(document.querySelector("[data-chemical-catalog-unavailable]")),
    undefined,
    { timeout: 30_000 },
  );
  const chemicalResult = await chemicalPage.evaluate((sample) => {
    const candidateOptions = document.querySelectorAll('[role="option"]');
    const activeInput = Array.from(
      document.querySelectorAll("input"),
    ).find((input) => input.value === sample);
    return {
      operationCount: 1,
      destinationReached: location.pathname === "/chemical-ra",
      inputPreserved: Boolean(activeInput),
      candidateCount: candidateOptions.length,
      ambiguousIdentityNotAutoSelected:
        !new URLSearchParams(location.search).has("cas"),
    };
  }, sampleChemicalQuery);
  chemicalResult.consoleErrorCount = chemicalConsoleErrors.length;
  await chemicalContext.close();

  const result = {
    baseUrl: baseUrl.origin,
    capturedAt: new Date().toISOString(),
    location: locationResult,
    chat: chatResult,
    chemical: chemicalResult,
  };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  await browser.close();
}
