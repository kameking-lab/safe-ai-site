import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

type Snapshot = { lawId: string; revisionId: string; fetchedAt: string; sha256: string };
type RevisionRecord = { lawId: string; revisionId: string; snapshotHash: string; checkedAt: string };
type PrimaryRecord = { lawShort: string; articleNum: string; revisionId: string | null; checkedAt: string; sourceUrl: string };
const snapshot = JSON.parse(readFileSync(join(process.cwd(), "src/data/laws-fulltext/347AC0000000057.json"), "utf8")) as Snapshot;
const revisions = JSON.parse(readFileSync(join(process.cwd(), "src/data/laws/current-revision-verification.json"), "utf8")) as { records: RevisionRecord[] };
const primary = JSON.parse(readFileSync(join(process.cwd(), "src/data/laws/primary-current-verification.json"), "utf8")) as { records: PrimaryRecord[] };
const currentProof = revisions.records.find((record) => record.lawId === snapshot.lawId && record.revisionId === snapshot.revisionId && record.snapshotHash === snapshot.sha256)!;
const electricalProof = primary.records.find((record) => record.lawShort === "電事法" && record.articleNum === "第42条")!;
const dateInJapan = (value: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date(value));

async function geometry(page: Page, testInfo: TestInfo, name: string) {
  const data = await page.evaluate(() => ({
    viewportWidth: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    cards: [...document.querySelectorAll("[data-chemical-mobile-card]")].map((element) => {
      const bounds = element.getBoundingClientRect();
      const link = element.querySelector("a[href^='/chemical-database/']")?.getBoundingClientRect();
      return { x: bounds.x, width: bounds.width, link: link ? { x: link.x, width: link.width, height: link.height } : null };
    }),
  }));
  expect(data.documentWidth).toBeLessThanOrEqual(data.viewportWidth + 1);
  for (const card of data.cards) {
    expect(card.x).toBeGreaterThanOrEqual(0);
    expect(card.x + card.width).toBeLessThanOrEqual(data.viewportWidth);
    if (card.link) {
      expect(card.link.x + card.link.width).toBeLessThanOrEqual(data.viewportWidth);
      expect(card.link.width).toBeGreaterThanOrEqual(44);
      expect(card.link.height).toBeGreaterThanOrEqual(44);
    }
  }
  await testInfo.attach(`${name}-geometry`, { body: JSON.stringify({ ...data, realDevice: false }, null, 2), contentType: "application/json" });
}

async function accessibility(page: Page, testInfo: TestInfo, name: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  await testInfo.attach(`${name}-axe`, { body: JSON.stringify(results.violations, null, 2), contentType: "application/json" });
  expect(results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);
}

for (const width of [375, 390]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`chemical mobile ${width} ${colorScheme}`, () => {
      test.use({ viewport: { width, height: 812 }, isMobile: true, hasTouch: true, colorScheme });
      test("name CAS recording states and detail fit without horizontal travel", async ({ page }, testInfo) => {
        await page.goto("/chemical-database?q=108-88-3");
        const card = page.locator('[data-chemical-mobile-card][data-cas="108-88-3"]');
        await expect(card).toBeVisible();
        await expect(page.locator("[data-chemical-mobile-card]")).toHaveCount(1);
        await expect(page.locator("[data-chemical-comparison-table]")).toBeHidden();
        await expect(card.getByRole("heading", { name: "トルエン", exact: true })).toBeVisible();
        await expect(card).toContainText("CAS 108-88-3");
        for (const label of ["がん原性", "皮膚等障害", "濃度基準", "SDS交付"]) {
          const field = card.locator("dl > div").filter({ has: page.getByText(label, { exact: true }) });
          await expect(field).toContainText(/掲載あり|掲載未確認/);
        }
        await expect(page.locator("#chemical-list-legend")).toContainText("法的な対象外判定ではありません");
        await expect(card.getByRole("button", { name: "有機則 第二種", exact: true })).toBeVisible();
        await card.scrollIntoViewIfNeeded();
        await geometry(page, testInfo, `chemical-${width}-${colorScheme}`);
        await accessibility(page, testInfo, `chemical-${width}-${colorScheme}`);
        await page.screenshot({ path: testInfo.outputPath(`chemical-${width}-${colorScheme}.png`) });
        await card.getByRole("link", { name: "詳細を見る", exact: true }).click();
        await expect(page).toHaveURL(/\/chemical-database\/108-88-3$/);
        await expect(page.getByRole("heading", { name: "トルエン", exact: true })).toBeVisible();
        await expect(page.getByText(/有機則：第二種有機溶剤/)).toBeVisible();
        await page.goBack();
        await expect(page.getByRole("searchbox", { name: "物質名・CAS番号で検索", exact: true })).toHaveValue("108-88-3");
        await expect(card).toBeVisible();
      });
    });
  }
}

test("desktop keeps comparison table and the four recording columns", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/chemical-database?q=108-88-3");
  const table = page.locator("[data-chemical-comparison-table]");
  await expect(table).toBeVisible();
  await expect(page.locator('[data-chemical-mobile-card][data-cas="108-88-3"]')).toBeHidden();
  for (const name of ["がん原性", "皮膚障害", "濃度基準", "SDS義務"]) {
    await expect(table.getByRole("columnheader", { name, exact: true })).toBeVisible();
  }
  await expect(table.getByRole("row", { name: /108-88-3/ })).toContainText("トルエン");
  await expect(table.getByRole("link", { name: "開く", exact: true })).toHaveAttribute("href", "/chemical-database/108-88-3");
});

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`favorite source ${colorScheme}`, () => {
    test.use({ viewport: { width: 390, height: 844 }, colorScheme });
    test("law source facts survive an explicit favorite save and full reload", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/law-navi/347AC0000000057/2");
  const source = page.locator("details").filter({ has: page.getByText("原典情報", { exact: false }) });
  await source.locator("summary").click();
  await expect(source).toContainText(snapshot.revisionId);
  await expect(source).toContainText(dateInJapan(snapshot.fetchedAt));
  await expect(source).toContainText(dateInJapan(currentProof.checkedAt));
  await expect(source).toContainText("原典版の照合");
  await expect(source.getByRole("link")).toHaveAttribute("href", `https://laws.e-gov.go.jp/law/${snapshot.lawId}`);
  await page.getByRole("button", { name: "お気に入りに追加", exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("safe-ai:favorites:v1") ?? "[]") as Array<{ sourceProvenance?: Record<string, string> }>);
  expect(saved[0]?.sourceProvenance).toEqual({ url: `https://laws.e-gov.go.jp/law/${snapshot.lawId}`, version: snapshot.revisionId, fetchedAt: snapshot.fetchedAt, checkedAt: currentProof.checkedAt, checkKind: "revision" });
  await page.goto("/favorites");
  await page.reload();
  const favoriteSource = page.locator("details").filter({ has: page.getByText("原典情報", { exact: false }) });
  await favoriteSource.locator("summary").click();
  await expect(favoriteSource).toContainText(snapshot.revisionId);
  await expect(favoriteSource).toContainText(dateInJapan(currentProof.checkedAt));
  await favoriteSource.scrollIntoViewIfNeeded();
  await geometry(page, testInfo, `favorite-source-${colorScheme}`);
  await accessibility(page, testInfo, "favorite-source");
  await page.screenshot({ path: testInfo.outputPath(`favorite-source-390-${colorScheme}.png`) });
});
  });
}

test("chat source details display the existing full e-Gov revision unchanged", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let intercepted = 0;
  const sourceFacts = { url: electricalProof.sourceUrl, version: electricalProof.revisionId, fetchedAt: "2026-08-09", checkedAt: electricalProof.checkedAt, checkKind: "publication-excerpt" };
  await page.route("**/api/chatbot/stream", async (route) => {
    intercepted += 1;
    const answer = "収録原典の抜粋と版を確認してください。";
    const payload = { answer, sources: [{ law: "電気事業法", article: "第42条", articleTitle: "保安規程", text: "収録原典の抜粋", url: electricalProof.sourceUrl, sourceProvenance: sourceFacts }], source_type: "rag", confidence: "low", requiresHumanReview: true };
    await route.fulfill({ status: 200, headers: { "content-type": "text/event-stream; charset=utf-8" }, body: `event: text\ndata: ${JSON.stringify({ chunk: answer })}\n\nevent: meta\ndata: ${JSON.stringify(payload)}\n\n` });
  });
  await page.goto("/chatbot");
  await page.getByRole("textbox", { name: "質問入力" }).fill("電気事業法第42条の収録原典を確認したい");
  await page.locator('[data-chatbot-composer] button[type="submit"]').click();
  await expect.poll(() => intercepted).toBe(1);
  await page.locator("[data-chatbot-source-details] > summary").click();
  const source = page.locator("[data-chatbot-source-entry] details");
  await source.locator("summary").click();
  await expect(source).toContainText("339AC0000000170_20260803_508AC0000000068");
  await expect(source).toContainText("2026-08-09");
  await expect(source).toContainText(dateInJapan(electricalProof.checkedAt));
  await expect(source).toContainText("原典抜粋の照合");
  await source.scrollIntoViewIfNeeded();
  await geometry(page, testInfo, "chat-source");
  await accessibility(page, testInfo, "chat-source");
  await page.screenshot({ path: testInfo.outputPath("chat-source-390.png") });
});
