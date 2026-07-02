/**
 * 監修者バイライン配線チェック（S8-a・機能UX班-B・2026-07-02）
 *
 * 目的: /circulars/[id] にE-E-A-T監修者バイライン（氏名・労働安全コンサルタント
 * 登録260022・aboutリンク）とPerson JSON-LD(contributor)が実機で配線されているか、
 * かつ既存のh1単一性・法令発出者author表記を壊していないかを機械確認する。
 *
 * 実行: BASE_URL=http://localhost:3100 node docs/third-party-reviews/scripts/circulars-supervisor-byline-noread-2026-07-02.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const ROUTES = ["/circulars/mhlw-notice-0001", "/circulars/mhlw-notice-0002"];

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  let pass = 0;
  let total = 0;

  for (const route of ROUTES) {
    const page = await ctx.newPage();
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);

    const checks = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const supervisorVisible = bodyText.includes("労働安全衛生コンサルタント（登録番号260022）");
      const aboutLink = Array.from(document.querySelectorAll("a")).some(
        (a) => a.textContent?.includes("労働安全衛生コンサルタント") && a.getAttribute("href") === "/about"
      );
      const h1Count = document.querySelectorAll("h1").length;
      const ldScripts = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]')
      ).flatMap((s) => {
        try {
          const parsed = JSON.parse(s.textContent || "");
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return [];
        }
      });
      const legalDoc = ldScripts.find((s) => s && s["@type"] === "LegalDocument");
      const contributorOk =
        !!legalDoc &&
        legalDoc.contributor &&
        legalDoc.contributor["@type"] === "Person" &&
        legalDoc.contributor.name === "労働安全衛生コンサルタント（登録番号260022）" &&
        legalDoc.contributor.url?.endsWith("/about");
      const issuerAuthorIntact =
        !legalDoc || !legalDoc.author || legalDoc.author["@type"] === "Organization";
      return { supervisorVisible, aboutLink, h1Count, contributorOk, issuerAuthorIntact };
    });

    total += 1;
    const ok =
      checks.supervisorVisible &&
      checks.aboutLink &&
      checks.h1Count === 1 &&
      checks.contributorOk &&
      checks.issuerAuthorIntact;
    if (ok) pass += 1;
    console.log(`${ok ? "PASS" : "FAIL"} ${route}`, checks);
    await page.close();
  }

  await browser.close();
  console.log(`\n${pass}/${total} PASS`);
  if (pass !== total) process.exit(1);
};

main();
