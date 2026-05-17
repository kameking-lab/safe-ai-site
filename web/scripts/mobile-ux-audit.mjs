#!/usr/bin/env node
/**
 * Mobile UX audit across 4 viewports × 40 pages.
 *
 * Detects 10 issue categories per (page, viewport):
 *   horizontalScroll, smallFont (<14px), tinyTap (<44px), missingInputmode,
 *   stickyHeaderHeight, hiddenFooter, hamburgerMissing, modalDrawer,
 *   tableOverflow, imageAspectRatio.
 *
 * Writes a JSON report so a follow-up pass can rank P0/P1/P2/P3 fixes.
 *
 * Usage:
 *   node scripts/mobile-ux-audit.mjs           # full run
 *   node scripts/mobile-ux-audit.mjs --quick   # 1 viewport, sanity check
 */
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.AUDIT_BASE || "http://127.0.0.1:3000";
const OUT_DIR = path.resolve("audit-out");

const VIEWPORTS = [
  { name: "iphone-se", width: 375, height: 667 },
  { name: "iphone-pro", width: 414, height: 896 },
  { name: "android", width: 360, height: 640 },
  { name: "ipad-portrait", width: 768, height: 1024 },
];

const PAGES = [
  "/",
  "/about",
  "/accidents",
  "/accidents-analytics",
  "/accidents-reports",
  "/articles",
  "/asbestos-management",
  "/bcp",
  "/chatbot",
  "/chemical-database",
  "/chemical-ra",
  "/circulars",
  "/community-cases",
  "/contact",
  "/diversity",
  "/e-learning",
  "/education",
  "/quiz",
  "/equipment-finder",
  "/exam-quiz",
  "/faq",
  "/features",
  "/foreign-workers",
  "/glossary",
  "/goods",
  "/handover",
  "/heat-illness-prevention",
  "/industries",
  "/insurance",
  "/ky",
  "/law-hierarchy",
  "/law-search",
  "/laws",
  "/mental-health",
  "/notifications",
  "/pricing",
  "/qa-knowledge",
  "/risk-prediction",
  "/safety-diary",
  "/safety-signs",
];

const QUICK = process.argv.includes("--quick");
const SUFFIX_ARG = process.argv.find((a) => a.startsWith("--suffix="));
const SUFFIX = SUFFIX_ARG ? SUFFIX_ARG.split("=")[1] : process.env.AUDIT_SUFFIX || "before";

const auditPage = ({ minTap, minFont }) => {
  const issues = [];
  const push = (kind, detail) => issues.push({ kind, ...detail });

  // 1. horizontal scroll (>2px overflow tolerated)
  if (document.documentElement.scrollWidth - document.documentElement.clientWidth > 2) {
    push("horizontalScroll", {
      delta: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    });
  }

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.01;
  };

  // 2. small font on text nodes
  const texts = document.querySelectorAll("p, li, span, td, th, button, a, label, dd, dt, h6");
  let smallFontCount = 0;
  texts.forEach((el) => {
    if (!visible(el)) return;
    if (!el.textContent || el.textContent.trim().length < 3) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs && fs < minFont) smallFontCount++;
  });
  if (smallFontCount > 0) push("smallFont", { count: smallFontCount, threshold: minFont });

  // 3. tap targets <44px on interactive elements
  const interactive = document.querySelectorAll(
    "button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=link], [role=tab], [role=menuitem]"
  );
  let tinyTap = 0;
  const tinySamples = [];
  interactive.forEach((el) => {
    if (!visible(el)) return;
    const r = el.getBoundingClientRect();
    if (r.width < minTap || r.height < minTap) {
      tinyTap++;
      if (tinySamples.length < 5) {
        tinySamples.push({
          tag: el.tagName.toLowerCase(),
          w: Math.round(r.width),
          h: Math.round(r.height),
          text: (el.textContent || "").trim().slice(0, 40),
        });
      }
    }
  });
  if (tinyTap > 0) push("tinyTap", { count: tinyTap, threshold: minTap, samples: tinySamples });

  // 4. inputmode on numeric-ish inputs
  const numericInputs = document.querySelectorAll(
    "input[type=number], input[type=tel], input[name*=phone i], input[name*=tel i], input[name*=zip i], input[name*=postal i]"
  );
  let missingInputmode = 0;
  numericInputs.forEach((el) => {
    if (!el.getAttribute("inputmode")) missingInputmode++;
  });
  if (missingInputmode > 0) push("missingInputmode", { count: missingInputmode });

  // 5. sticky header height (warn if >25% of viewport)
  const headers = document.querySelectorAll("header, [data-sticky-header]");
  let maxStickyH = 0;
  headers.forEach((el) => {
    if (!visible(el)) return;
    const cs = getComputedStyle(el);
    if (cs.position === "sticky" || cs.position === "fixed") {
      maxStickyH = Math.max(maxStickyH, el.getBoundingClientRect().height);
    }
  });
  if (maxStickyH > innerHeight * 0.25) {
    push("stickyHeaderTooTall", { headerPx: Math.round(maxStickyH), vh: innerHeight });
  }

  // 6. footer visibility (presence + content)
  const footer = document.querySelector("footer");
  if (!footer || !visible(footer)) push("missingFooter", {});

  // 7. hamburger / nav toggle on small viewport
  if (innerWidth < 768) {
    const nav = document.querySelector(
      "[aria-label*=menu i], [aria-controls*=nav i], button[aria-expanded][aria-label*=nav i], [data-mobile-nav]"
    );
    if (!nav) push("hamburgerMissing", {});
  }

  // 8. modal / drawer constrained on narrow viewport
  const drawer = document.querySelector(
    "[role=dialog], [aria-modal=true]"
  );
  if (drawer && visible(drawer)) {
    const r = drawer.getBoundingClientRect();
    if (r.width > innerWidth + 2 || r.left < -2) {
      push("modalOverflow", { width: Math.round(r.width), vw: innerWidth });
    }
  }

  // 9. table overflow — wide tables without a horizontal-scroll wrapper
  const tables = document.querySelectorAll("table");
  let tableOverflow = 0;
  const tableSamples = [];
  tables.forEach((tbl) => {
    if (!visible(tbl)) return;
    const r = tbl.getBoundingClientRect();
    if (r.width > innerWidth + 4) {
      let parent = tbl.parentElement;
      let inScroller = false;
      while (parent && parent !== document.body) {
        const cs = getComputedStyle(parent);
        if ((cs.overflowX === "auto" || cs.overflowX === "scroll") && parent.clientWidth < r.width) {
          inScroller = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (!inScroller) {
        tableOverflow++;
        if (tableSamples.length < 3) {
          tableSamples.push({ w: Math.round(r.width), vw: innerWidth });
        }
      }
    }
  });
  if (tableOverflow > 0) push("tableOverflow", { count: tableOverflow, samples: tableSamples });

  // 10. image aspect-ratio (no width/height + no aspect-ratio)
  const imgs = document.querySelectorAll("img");
  let badImg = 0;
  imgs.forEach((img) => {
    if (!visible(img)) return;
    const hasDims = img.getAttribute("width") && img.getAttribute("height");
    const cs = getComputedStyle(img);
    const hasAR = cs.aspectRatio && cs.aspectRatio !== "auto";
    if (!hasDims && !hasAR) badImg++;
  });
  if (badImg > 0) push("missingImageDimensions", { count: badImg });

  return issues;
};

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const viewports = QUICK ? VIEWPORTS.slice(0, 1) : VIEWPORTS;
  const pagesToRun = QUICK ? PAGES.slice(0, 3) : PAGES;
  const report = { base: BASE, startedAt: new Date().toISOString(), runs: [] };
  let runIndex = 0;
  const total = viewports.length * pagesToRun.length;

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      deviceScaleFactor: 2,
      isMobile: vp.width < 768,
      hasTouch: vp.width < 1024,
    });
    for (const url of pagesToRun) {
      runIndex++;
      const page = await context.newPage();
      const consoleErrors = [];
      page.on("pageerror", (e) => consoleErrors.push(String(e)));
      const target = BASE + url;
      let issues = [];
      let status = "ok";
      let elapsed = 0;
      const t0 = Date.now();
      try {
        const resp = await page.goto(target, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
        // give layout a tick for fonts / hydration
        await page.waitForTimeout(300);
        if (resp && resp.status() >= 400) status = "http_" + resp.status();
        issues = await page.evaluate(auditPage, { minTap: 44, minFont: 14 });
      } catch (e) {
        status = "error: " + (e && e.message ? e.message.slice(0, 200) : String(e));
      }
      elapsed = Date.now() - t0;
      console.log(
        `[${runIndex}/${total}] ${vp.name} ${url} → ${status} (${issues.length} issues, ${elapsed}ms)`
      );
      report.runs.push({
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        url,
        status,
        elapsedMs: elapsed,
        issues,
        pageErrors: consoleErrors.slice(0, 5),
      });
      await page.close();
    }
    await context.close();
  }
  await browser.close();
  report.finishedAt = new Date().toISOString();
  const outPath = path.join(OUT_DIR, `audit-${SUFFIX}.json`);
  await fs.writeFile(outPath, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outPath}`);

  // quick aggregate
  const counts = {};
  for (const run of report.runs) {
    for (const iss of run.issues) {
      counts[iss.kind] = (counts[iss.kind] || 0) + 1;
    }
  }
  console.log("\nAggregate counts:");
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(28)} ${v}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
