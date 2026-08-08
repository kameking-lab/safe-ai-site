import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

function readArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1]
    ? process.argv[index + 1]
    : fallback;
}

const beforeBase = readArg("before", "https://www.anzen-ai-portal.jp");
const afterBase = readArg("after", "http://127.0.0.1:3200");
const outputPath = path.resolve(
  readArg(
    "out",
    "../docs/audits/evidence/intuitive-ux-heat-first-2026-07-29/click-paths.json",
  ),
);
const targets = [
  "/risk",
  "/heat-illness-prevention",
  "/ky/paper",
  "/safety-diary",
  "/law-search",
  "/education-certification/finder",
  "/accidents",
  "/chemical-ra",
  "/services/automation",
  "/signage",
];

const browser = await chromium.launch({ headless: true });
const evidence = [];
try {
  for (const [phase, baseUrl] of [
    ["before-production", beforeBase],
    ["after-local", afterBase],
  ]) {
    const context = await browser.newContext({
      serviceWorkers: "block",
      locale: "ja-JP",
      timezoneId: "Asia/Tokyo",
    });
    const page = await context.newPage();
    const response = await page.goto(baseUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    const directLinks = await page.evaluate((targetPaths) => {
      const links = Array.from(document.querySelectorAll("a[href]"));
      return targetPaths.map((target) => {
        const matches = links.filter(
          (link) => new URL(link.href, document.baseURI).pathname === target,
        );
        const mainMatches = matches.filter((link) => link.closest("main"));
        return {
          target,
          directFromDocument: matches.length,
          directFromMain: mainMatches.length,
          labels: [
            ...new Set(
              mainMatches
                .map((link) => (link.textContent ?? "").replace(/\s+/g, " ").trim())
                .filter(Boolean),
            ),
          ],
        };
      });
    }, targets);
    evidence.push({
      phase,
      baseUrl,
      status: response?.status() ?? null,
      directLinks,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(
  outputPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      method:
        "ホームHTML内の同一pathリンクを数える。directFromMain>0はホーム本文から1クリック。0の場合の2クリック到達は別途ナビ遷移テストで確認する。",
      targets,
      evidence,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

process.stdout.write(`${JSON.stringify({ outputPath, evidence }, null, 2)}\n`);
