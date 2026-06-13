/**
 * 無読テスト一括巡回（柱0・機能UX班-B 自領域・2026-06-14）
 *
 * 目的: 判定・法令・統計系ルートのファーストビュー(スマホ390×844)を機械計測し、
 * 「段落を読まず色とデカ要素しか見ない現場監督」が3秒で状態と次の一手を掴めるかを
 * スクリーニングする。noread-sweep-2026-06-11 の自領域版（prod server 3100・SW block）。
 *
 * 計測:
 *   - maxFont: ファーストビュー内の最大フォント(px)。32px以上=デカ数字/結論候補
 *   - bigGraphic: 80px四方以上の SVG/IMG/CANVAS（色帯・図版）
 *   - textChars: ファーストビュー可視テキスト総文字数（多い=読ませる画面）
 *   - longParas: 80字超の <p>（段落は折りたたみへ、の違反検出）
 *   - status: role=status の結論カードの有無
 *   - h1Count: 多重/欠落h1の検出
 *
 * 判定はスクリーニング。最終は人がスクショ確認。
 * 実行: BASE_URL=http://localhost:3100 node docs/third-party-reviews/scripts/tools-noread-sweep-2026-06-14.mjs
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const OUT_DIR = process.env.SWEEP_OUT || "tmp-tools-sweep";

// 機能UX班-B 所有ルート（判定・法令・統計系）
const ROUTES = [
  "/risk",
  "/risk-prediction",
  "/chemical-database",
  "/chemical-ra",
  "/stress-check",
  "/mental-health",
  "/mental-health-management",
  "/mental-health-management/stress-check",
  "/treatment-work-balance",
  "/law-search",
  "/circulars",
  "/law-hierarchy",
  "/chatbot",
  "/stats",
  "/accidents-analytics",
  "/accidents-reports",
  "/accident-news",
  "/bcp",
  "/subsidies",
  "/insurance",
  "/organization",
  "/strategy",
  "/goods",
  "/leaflet",
  "/newsletter",
];

const main = async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  const page = await ctx.newPage();
  const rows = [];

  for (const route of ROUTES) {
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2500);

      const metrics = await page.evaluate(() => {
        const vh = 844;
        const visible = (el) => {
          const r = el.getBoundingClientRect();
          if (r.bottom <= 0 || r.top >= vh || r.width === 0 || r.height === 0) return false;
          const s = getComputedStyle(el);
          return s.visibility !== "hidden" && s.display !== "none";
        };
        let maxFont = 0;
        let bigGraphic = false;
        let textChars = 0;
        let longParas = 0;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
        while (walker.nextNode()) {
          const el = walker.currentNode;
          if (!visible(el)) continue;
          const tag = el.tagName;
          if (tag === "SVG" || tag === "svg" || tag === "IMG" || tag === "CANVAS") {
            const r = el.getBoundingClientRect();
            if (r.width >= 80 && r.height >= 80) bigGraphic = true;
          }
          let ownText = "";
          for (const n of el.childNodes) {
            if (n.nodeType === Node.TEXT_NODE) ownText += n.textContent || "";
          }
          ownText = ownText.replace(/\s+/g, "");
          if (ownText.length > 0) {
            textChars += ownText.length;
            const f = parseFloat(getComputedStyle(el).fontSize) || 0;
            if (f > maxFont) maxFont = f;
          }
          if (tag === "P") {
            const t = (el.textContent || "").replace(/\s+/g, "");
            if (t.length > 80) longParas += 1;
          }
        }
        const status = Array.from(document.querySelectorAll('[role="status"]')).some(visible);
        const h1Count = document.querySelectorAll("h1").length;
        return { maxFont: Math.round(maxFont), bigGraphic, textChars, longParas, status, h1Count };
      });

      const bigVisual = metrics.maxFont >= 32 || metrics.bigGraphic;
      const screenPass =
        bigVisual && metrics.textChars <= 1200 && metrics.longParas <= 1 && metrics.h1Count === 1;
      const file = `${OUT_DIR}/${route.replace(/\//g, "_") || "_root"}.png`;
      await page.screenshot({ path: file });
      rows.push({ route, ...metrics, bigVisual, screenPass });
      console.log(
        `${screenPass ? "PASS?" : "FAIL?"} ${route} font=${metrics.maxFont} big=${metrics.bigGraphic} chars=${metrics.textChars} paras=${metrics.longParas} status=${metrics.status} h1=${metrics.h1Count}`
      );
    } catch (e) {
      rows.push({ route, error: String(e).slice(0, 120) });
      console.log(`ERROR ${route}: ${String(e).slice(0, 120)}`);
    }
  }

  fs.writeFileSync(`${OUT_DIR}/sweep-results.json`, JSON.stringify(rows, null, 2));
  await browser.close();
  const fails = rows.filter((r) => r.error || !r.screenPass).length;
  console.log(`\nDone: ${rows.length} routes, screening-fail ${fails}`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
