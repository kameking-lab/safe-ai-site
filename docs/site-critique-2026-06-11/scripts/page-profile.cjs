// 本番ページのUX計測プロファイル（独立酷評レビュー用・読み取り専用）
// NODE_PATH=<repo>/web/node_modules node page-profile.cjs <outDir>
const { chromium } = require("playwright");
const fs = require("node:fs");

const BASE = "https://www.anzen-ai-portal.jp";
const PAGES = [
  "/", "/chemical-ra", "/heat-illness-prevention", "/ky", "/ky/paper",
  "/chatbot", "/accidents", "/court-cases", "/whats-new", "/laws",
  "/site-records", "/equipment-finder", "/for/construction", "/learning",
  "/articles", "/circulars", "/no-such-page-404-check",
];
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: "desktop", width: 1280, height: 800, isMobile: false, hasTouch: false },
];

(async () => {
  const outDir = process.argv[2] || "/tmp/profile";
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const results = [];
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile, hasTouch: vp.hasTouch,
      userAgent: vp.isMobile
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        : undefined,
    });
    for (const path of PAGES) {
      const page = await ctx.newPage();
      const row = { path, vp: vp.name };
      try {
        const t0 = Date.now();
        const resp = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 45000 });
        row.status = resp ? resp.status() : null;
        row.dclMs = Date.now() - t0;
        try {
          await page.waitForSelector("h1", { timeout: 10000 });
          row.h1VisibleMs = Date.now() - t0;
        } catch { row.h1VisibleMs = null; }
        await page.waitForTimeout(3500); // 遅延ポップアップ・遅延描画を待つ
        row.metrics = await page.evaluate(() => {
          const vw = window.innerWidth, vh = window.innerHeight;
          const links = [...document.querySelectorAll("a[href]")];
          const buttons = [...document.querySelectorAll("button, [role=button]")];
          const inter = [...links, ...buttons];
          const visible = (el) => {
            const r = el.getBoundingClientRect();
            const s = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
          };
          const inFirstView = (el) => { const r = el.getBoundingClientRect(); return r.top < vh && r.bottom > 0; };
          const small = inter.filter(visible).filter((el) => {
            const r = el.getBoundingClientRect();
            return (r.width < 40 || r.height < 40) && r.height > 0;
          });
          const tiny = [...document.querySelectorAll("body *")].filter(visible).filter((el) => {
            const fs = parseFloat(getComputedStyle(el).fontSize);
            return el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && fs < 12;
          });
          const overlays = [...document.querySelectorAll("body *")].filter((el) => {
            const s = getComputedStyle(el);
            if (s.position !== "fixed" && s.position !== "sticky") return false;
            const r = el.getBoundingClientRect();
            return r.width * r.height > vw * vh * 0.25 && visible(el);
          }).map((el) => (el.className || el.tagName).toString().slice(0, 80));
          const h1 = document.querySelector("h1");
          const firstViewText = [...document.querySelectorAll("body *")]
            .filter(visible).filter(inFirstView)
            .map((el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(""))
            .join("").replace(/\s+/g, "").length;
          return {
            pageHeight: document.documentElement.scrollHeight,
            hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            linkCount: links.filter(visible).length,
            buttonCount: buttons.filter(visible).length,
            smallTapTargets: small.length,
            tinyTextEls: tiny.length,
            overlays,
            h1Text: h1 ? h1.textContent.trim().slice(0, 60) : null,
            bodyTextLen: document.body.innerText.replace(/\s+/g, "").length,
            firstViewTextLen: firstViewText,
            navLinks: [...document.querySelectorAll("header a, nav a")].filter(visible).length,
            hasSearchInput: !!document.querySelector('input[type=search], input[placeholder*="検索"]'),
          };
        });
        const slug = (path === "/" ? "_home" : path.replace(/\//g, "_")) + "." + vp.name;
        await page.screenshot({ path: `${outDir}/${slug}.png` });
      } catch (e) {
        row.error = String(e.message || e).slice(0, 150);
      }
      results.push(row);
      console.log(JSON.stringify(row));
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(`${outDir}/profile.ndjson`, results.map((r) => JSON.stringify(r)).join("\n"));
  console.log("PROFILE DONE");
})();
