import { expect, test } from "@playwright/test";

test("quarantined safety-plan input never survives its fixed redirect @privacy", async ({
  page,
  request,
}) => {
  const marker = "PII-plan-090-1234-5678";
  const source = `/strategy/plan-generator?organization=${encodeURIComponent(marker)}&notes=${encodeURIComponent(`private-${marker}`)}#fragment-${marker}`;

  const redirect = await request.get(source, { maxRedirects: 0 });
  expect(redirect.status()).toBe(308);
  const location = redirect.headers()["location"];
  expect(location).toBeTruthy();
  expect(location).not.toContain(marker);

  const destination = new URL(location!, "http://localhost");
  expect(destination.pathname).toBe("/about/quality");
  expect(destination.search).toBe("");
  expect(destination.hash).toBe("");

  await page.goto(source);
  const finalUrl = new URL(page.url());
  expect(finalUrl.pathname).toBe("/about/quality");
  expect(finalUrl.search).toBe("");
  expect(finalUrl.hash).toBe("");
  expect(page.url()).not.toContain(marker);
});

test("signage links never include precise map coordinates @privacy", async ({
  page,
}) => {
  await page.goto("/signage/map?lat=35.6812&lng=139.7671&zoom=16");
  const fullscreen = page.getByRole("link", { name: /フルスクリーン表示/ });
  await expect(fullscreen).toHaveAttribute(
    "href",
    "/signage/display?fullscreen=true",
  );
});

test("quarantined asbestos input reaches only the fixed official host @privacy", async ({
  page,
  request,
}) => {
  const marker = "PII-asbestos-090-9876-5432";
  const source = `/asbestos-management/investigation-checker?project=${encodeURIComponent(marker)}&conditions=${encodeURIComponent(`private-${marker}`)}#fragment-${marker}`;

  const redirect = await request.get(source, { maxRedirects: 0 });
  expect(redirect.status()).toBe(308);
  const location = redirect.headers()["location"];
  expect(location).toBeTruthy();
  expect(location).not.toContain(marker);

  const destination = new URL(location!);
  expect(destination.protocol).toBe("https:");
  expect(destination.hostname).toBe("www.ishiwata.mhlw.go.jp");
  expect(destination.pathname).toBe("/");
  expect(destination.search).toBe("");
  expect(destination.hash).toBe("");

  await page.route("https://www.ishiwata.mhlw.go.jp/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: "<!doctype html><title>Official asbestos portal</title>",
    });
  });
  await page.goto(source);

  const finalUrl = new URL(page.url());
  expect(finalUrl.protocol).toBe("https:");
  expect(finalUrl.hostname).toBe("www.ishiwata.mhlw.go.jp");
  expect(finalUrl.pathname).toBe("/");
  expect(finalUrl.search).toBe("");
  expect(finalUrl.hash).toBe("");
  expect(page.url()).not.toContain(marker);
});
