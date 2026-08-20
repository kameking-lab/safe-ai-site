import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const origin = (process.argv[2] ?? "http://127.0.0.1:3311").replace(/\/$/, "");
const cookieJarPath = process.argv[3];
const artifactDirectory =
  process.argv[4] ?? path.join(process.env.LOCALAPPDATA ?? ".", "Temp", "safe-ai-pilot-browser-smoke");
const comparisonPath = "/materials/safety-images/pilot/helmet-required";
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();

async function readNetscapeCookies(filePath) {
  if (!filePath) return [];
  const rows = (await fs.readFile(filePath, "utf8")).split(/\r?\n/);
  return rows.flatMap((row) => {
    const normalized = row.startsWith("#HttpOnly_") ? row.slice("#HttpOnly_".length) : row;
    if (!normalized || normalized.startsWith("#")) return [];
    const [domain, , cookiePath, secure, expires, name, value] = normalized.split("\t");
    if (!domain || !cookiePath || !name || value === undefined) return [];
    return [{
      domain,
      path: cookiePath,
      secure: secure === "TRUE",
      httpOnly: row.startsWith("#HttpOnly_"),
      expires: Number(expires) > 0 ? Number(expires) : -1,
      name,
      value,
    }];
  });
}

await fs.mkdir(artifactDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const consoleErrors = [];
const pageErrors = [];
const assetFailures = [];
let vercelToolbarNoise = 0;

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    extraHTTPHeaders: {
      "x-vercel-skip-toolbar": "1",
      ...(protectionBypass
        ? { "x-vercel-protection-bypass": protectionBypass }
        : {}),
    },
  });
  const cookies = await readNetscapeCookies(cookieJarPath);
  if (cookies.length > 0) await context.addCookies(cookies);
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (message.text().includes("https://vercel.live/_next-live/feedback/feedback.js")) {
      vercelToolbarNoise += 1;
      return;
    }
    consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (
      (response.url().includes("/safety-images/") ||
        response.url().includes("/api/safety-images/")) &&
      response.status() >= 400
    ) {
      assetFailures.push(`${response.status()} ${new URL(response.url()).pathname}`);
    }
  });

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
    const response = await page.goto(`${origin}${comparisonPath}`, { waitUntil: "networkidle" });
    if (response?.status() !== 200) throw new Error(`${width}px page status ${response?.status()}`);
    if (!(await page.getByRole("heading", { level: 1, name: "文字の作り方を比較" }).isVisible())) {
      throw new Error(`${width}px heading missing`);
    }
    if (!(await page.getByRole("img", { name: /後付け表示/ }).isVisible())) {
      throw new Error(`${width}px A image missing`);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (overflow > 1) throw new Error(`${width}px horizontal overflow ${overflow}px`);
    if (width < 1024) {
      await page.getByRole("tab", { name: "B 画像内文字" }).click();
      if (!(await page.getByRole("img", { name: /画像生成時に直接/ }).isVisible())) {
        throw new Error(`${width}px B image missing`);
      }
      await page.getByRole("tab", { name: "A 後付け文字" }).click();
    }
    if (width === 390 || width === 1440) {
      await page.screenshot({
        path: path.join(artifactDirectory, `pilot-${width}.png`),
        fullPage: true,
      });
    }
    process.stdout.write(`PASS browser ${width}px no-overflow A/B\n`);
  }

  await page.getByRole("button", { name: "English" }).click();
  if (!(await page.getByRole("img", { name: /WEAR A SAFETY HELMET/ }).isVisible())) {
    throw new Error("language switch failed");
  }
  await page.getByRole("button", { name: "なし", exact: true }).click();
  if ((await page.getByLabel("ブランド表示：安全AIポータル").count()) !== 0) {
    throw new Error("brand switch failed");
  }
  if (
    !(await page.locator('meta[name="robots"]').getAttribute("content"))
      ?.toLowerCase()
      .includes("noindex, follow")
  ) {
    throw new Error("noindex, follow metadata missing");
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "4";
  });
  if (!(await page.getByRole("link", { name: "A4縦 JPEG" }).isVisible())) {
    throw new Error("400% reflow download link missing");
  }
  process.stdout.write("PASS browser keyboard-controls language brand 400%-zoom\n");

  if (consoleErrors.length || pageErrors.length || assetFailures.length) {
    throw new Error(
      `runtime failures console=${consoleErrors.length} page=${pageErrors.length} assets=${assetFailures.length}\n` +
        [...consoleErrors, ...pageErrors, ...assetFailures].join("\n"),
    );
  }
  process.stdout.write("PASS browser console-errors=0 page-errors=0 asset-failures=0\n");
  if (vercelToolbarNoise > 0) {
    process.stdout.write(`INFO preview-toolbar-csp-noise=${vercelToolbarNoise} (platform injection excluded)\n`);
  }
} finally {
  await browser.close();
}
