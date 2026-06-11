/**
 * 無読テスト一括巡回（柱0・2026-06-11）
 * 「リスクマップ(/risk)＋未着手の残り全ページ巡回＋全機能の無読テスト一括検収」タスクの巡回部。
 *
 * ペルソナ: 「段落を絶対に読まない・色とデカい要素しか見ない現場監督」
 * 各ページのファーストビュー(スマホ390×844)を機械計測して無読合格の見込みを判定する:
 *   - bigVisual: フォント32px以上のテキスト or 80px四方以上の図版がファーストビューにあるか
 *   - statusCard: 結論カード(role=status)があるか
 *   - textChars: ファーストビュー内の可視テキスト総文字数（多い=読ませる画面）
 *   - longParas: 80字超の段落数（段落は折りたたみへ、の違反検出）
 *   - h1Count: 多重h1の検出（柱C-7関連のついで計測）
 *
 * 自動判定はあくまでスクリーニング。最終判定は人がスクショを見て行い、
 * 不合格画面は BACKLOG.md に個別タスクとして起票する。
 *
 * 実行: node docs/third-party-reviews/scripts/noread-sweep-2026-06-11.mjs
 * 前提: prod server (npm run build && npm run start) が localhost:3000 で起動済み
 *       （dev serverはハング既知事象のため使わない）
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT_DIR = process.env.SWEEP_OUT || "tmp-sweep";

// 柱0未適用の主要ユーザー向けページ（admin/auth/法務/課金は対象外）
const ROUTES = [
  "/risk",
  "/risk-prediction",
  "/safety-diary",
  "/safety-diary/new",
  "/ky",
  "/ky/list",
  "/ky-examples",
  "/law-search",
  "/circulars",
  "/law-hierarchy",
  "/safety-signs",
  "/education-certification",
  "/education-certification/finder",
  "/education",
  "/strategy/plan-generator",
  "/subsidies",
  "/subsidies/calculator",
  "/treatment-work-balance",
  "/treatment-work-balance/plan-builder",
  "/mental-health-management",
  "/mental-health",
  "/bcp",
  "/organization",
  "/glossary",
  "/faq",
  "/features",
  "/guides",
  "/industries",
  "/diversity",
  "/accident-news",
  "/accidents-reports",
  "/accidents-analytics",
  "/stats",
  "/chemical-database",
  "/goods",
  "/quick",
  "/handover",
  "/insurance",
  "/heat-illness-prevention/r7-compliance",
  "/heat-illness-prevention/poster",
  "/resources",
  "/leaflet",
  "/notifications",
  "/favorites",
  "/newsletter",
];

const main = async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const rows = [];

  for (const route of ROUTES) {
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2500); // クライアント描画・フォント・データ取得の落ち着き待ち

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
          // 直下テキストのみ集計（子要素の二重カウント防止）
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
      // スクリーニング判定: デカ視覚要素があり、読ませ文字量が過大でない
      const screenPass = bigVisual && metrics.textChars <= 1200 && metrics.longParas <= 1;
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
