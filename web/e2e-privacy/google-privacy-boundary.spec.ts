import { expect, test } from "@playwright/test";

const CONSENT_KEY = "safe-ai:optional-tracking-consent:v1";
const MARKER = "sensitive-token-marker-7391";
const GOOGLE_HOST = /(?:google-analytics\.com|googletagmanager\.com|googlesyndication\.com|doubleclick\.net)$/;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "globalPrivacyControl", {
      configurable: true,
      value: false,
    });
    Object.defineProperty(navigator, "doNotTrack", {
      configurable: true,
      value: "0",
    });
    Object.defineProperty(window, "doNotTrack", {
      configurable: true,
      value: "0",
    });
  });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (!GOOGLE_HOST.test(url.hostname)) return route.continue();
    if (url.hostname === "www.googletagmanager.com") {
      return route.fulfill({
        contentType: "application/javascript",
        body: `(()=>{const send=()=>fetch('https://www.google-analytics.com/g/collect?dl='+encodeURIComponent(location.href)).catch(()=>{});const p=history.pushState;history.pushState=function(){const r=p.apply(this,arguments);send();return r};addEventListener('popstate',send);send()})()`,
      });
    }
    if (url.hostname.includes("googlesyndication.com")) {
      return route.fulfill({ contentType: "application/javascript", body: "window.adsbygoogle=window.adsbygoogle||[]" });
    }
    return route.fulfill({ status: 204, body: "" });
  });
  await page.goto("/privacy");
  await page.evaluate((key) => localStorage.setItem(key, "granted"), CONSENT_KEY);
  expect(await page.evaluate((key) => localStorage.getItem(key), CONSENT_KEY)).toBe("granted");
});

test("consented public page hard-isolates a sensitive SPA target before Google can receive it", async ({ page }) => {
  const googleRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (GOOGLE_HOST.test(url.hostname)) googleRequests.push(request.url());
  });

  await page.goto("/laws");
  expect(await page.evaluate((key) => localStorage.getItem(key), CONSENT_KEY)).toBe("granted");
  await expect
    .poll(() => googleRequests.length, { timeout: 20_000 })
    .toBeGreaterThan(0);
  await page.evaluate((marker) => {
    const link = document.createElement("a");
    link.id = "privacy-sensitive-link";
    link.href = `/chatbot/share/${marker}?access_token=${marker}`;
    link.textContent = "sensitive transition";
    document.body.appendChild(link);
  }, MARKER);
  await page.evaluate(() => document.querySelector<HTMLAnchorElement>("#privacy-sensitive-link")?.click());
  await page.waitForURL((url) => url.pathname.includes(`/chatbot/share/${MARKER}`));
  await page.waitForTimeout(500);

  expect(googleRequests.some((url) => decodeURIComponent(url).includes(MARKER))).toBe(false);
  const sensitiveResources = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((entry) => entry.name).filter((url) => /google|doubleclick/.test(url)),
  );
  expect(sensitiveResources).toEqual([]);
});

test("withdrawal removes host-only and registrable-root Google cookies only", async ({ context, page, baseURL }) => {
  const root = new URL(baseURL!);
  await context.addCookies([
    { name: "_ga_HOST", value: "host", url: root.origin },
    { name: "_ga_ROOT", value: "root", domain: ".localtest.me", path: "/" },
    { name: "_gid", value: "root-gid", domain: ".localtest.me", path: "/" },
    { name: "portal_preference", value: "keep", domain: ".localtest.me", path: "/" },
  ]);
  await page.goto("/laws");
  expect(await page.evaluate((key) => localStorage.getItem(key), CONSENT_KEY)).toBe("granted");
  await page.getByRole("button", { name: "Cookie設定" }).evaluate((button: HTMLButtonElement) => button.click());
  const denyButton = page.getByRole("button", { name: "拒否する" });
  await expect(denyButton).toBeAttached();
  await denyButton.evaluate((button: HTMLButtonElement) => button.click());
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), CONSENT_KEY)).toBe("denied");

  await expect.poll(async () => (await context.cookies()).filter((cookie) => /^_ga|^_gid/.test(cookie.name)).length).toBe(0);
  expect((await context.cookies()).some((cookie) => cookie.name === "portal_preference")).toBe(true);
});
