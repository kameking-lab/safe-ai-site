import { expect, test } from "@playwright/test";

const PROJECT_PATH = "/about/project-story";
const privateRegistration = ["260", "022"].join("");
const privateFullName = String.fromCodePoint(0x91d1, 0x7530, 0x7fa9, 0x592a);
const privateFamilyName = String.fromCodePoint(0x91d1, 0x7530);

test("project policy stays anonymous and readable without horizontal overflow", async ({ page, request }) => {
  const response = await page.goto(PROJECT_PATH, { waitUntil: "networkidle" });
  expect(response?.ok()).toBe(true);

  const article = page.locator("[data-project-story]");
  await expect(article).toBeVisible();
  await expect(article.locator("h1")).toHaveCount(1);
  await expect(article.locator("[data-story-block]")).toHaveCount(5);

  const publicOutput = await page.locator("body").innerText();
  expect(publicOutput).not.toContain(privateRegistration);
  expect(publicOutput).not.toContain(privateFullName);
  expect(publicOutput).not.toContain(privateFamilyName);

  const structuredData = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  expect(structuredData.join("\n")).not.toContain('"@type":"Person"');
  expect(structuredData.join("\n")).not.toContain("worksFor");

  const geometry = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    body: document.body.scrollWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(geometry.body).toBeLessThanOrEqual(geometry.viewport);
  expect(geometry.document).toBeLessThanOrEqual(geometry.viewport);

  const internalLinks = await article.locator('a[href^="/"]').evaluateAll((links) =>
    links.map((link) => (link as HTMLAnchorElement).getAttribute("href") ?? ""),
  );
  expect(internalLinks).toEqual(
    expect.arrayContaining(["/", "/safety-ai", "/about/quality", "/about#work-support"]),
  );
  for (const href of new Set(internalLinks)) {
    const target = new URL(href, page.url());
    target.hash = "";
    const linkResponse = await request.get(target.toString());
    expect(linkResponse.status(), `broken internal link: ${href}`).toBeLessThan(400);
  }
});

test("paid support stays separate and unpublished marketplace links stay hidden", async ({ page }) => {
  const response = await page.goto("/about#work-support", { waitUntil: "networkidle" });
  expect(response?.ok()).toBe(true);

  const section = page.locator("#work-support");
  await expect(section).toBeVisible();
  await expect(section.locator("li")).toHaveCount(5);
  await expect(section.locator('a[href*="coconala.com"]')).toHaveCount(0);
});
