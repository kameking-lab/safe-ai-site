import { expect, test } from "@playwright/test";

test("old safety-image preview is not public", async ({ request }) => {
  const page = await request.get("/materials/safety-images/pilot/helmet-required");
  const asset = await request.get("/safety-images/pilot/helmet-required-a-all-branded.webp");
  expect(page.status()).toBe(404);
  expect(asset.status()).toBe(404);
});
