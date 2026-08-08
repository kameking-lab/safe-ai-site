import { expect, test } from "@playwright/test";

test("quarantine first/middle/last direct URLs are hard 404 without record output", async ({ request }) => {
  for (const [id, title] of [
    ["mhlw-notice-0870", "化学物質の自律的管理に係るリスクアセスメントの実施義務の拡大について"],
    ["mhlw-notice-0969", "事業場における労働者の健康保持増進のための指針の一部を改正する指針（令和6年改正）"],
    ["mhlw-notice-1069", "令和7年「全国安全週間」準備期間・本週間の実施について（スローガン・推進施策）"],
  ]) {
    const response = await request.get(`/circulars/${id}`);
    expect(response.status(), id).toBe(404);
    const body = await response.text();
    expect(body).not.toContain(`通達ID: ${id}`);
    expect(body).not.toContain("external-legal-review-pending");
    expect(body).not.toContain(title);
  }
});

test("a public circular remains directly reachable", async ({ request }) => {
  const response = await request.get("/circulars/mhlw-notice-0001");
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("熱中症防止対策");
});
