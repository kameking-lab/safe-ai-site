import { test, expect } from "@playwright/test";

/**
 * Copilot journey smoke test — verifies the 3-feature integration:
 *   /chatbot  →  /accidents-reports/[industry]  →  /strategy/plan-generator
 *
 * The test checks that each page renders the shared CopilotStepNav and that
 * the industry chosen on /accidents-reports/construction is carried over to
 * the plan-generator deep link. We don't exercise the chatbot LLM round-trip
 * (covered separately) — we only check the cross-feature wiring stays alive.
 */
test.describe("Copilot 3-feature journey @smoke", () => {
  test("chatbot page renders Copilot step nav and memo (in collapsible <details>)", async ({ page }) => {
    const res = await page.goto("/chatbot");
    expect(res?.status()).toBeLessThan(400);
    // P0-020 (usability-audit-day4): CopilotStepNav/CopilotMemo は chatbot
    // ファーストビューから退避し <details> 内に折りたたみ移動した。継続利用者は
    // <summary> クリックで展開できる。初見の現場職長を「Copilot/引き継ぎ」
    // 語彙で戸惑わせない設計。
    const summary = page.locator(
      'details summary:has-text("安全Copilot: メイン3機能")',
    );
    await expect(summary).toBeVisible();
    await summary.click();
    await expect(page.getByRole("navigation", { name: /Copilot/ })).toBeVisible();
    // Step labels
    await expect(page.getByText("1. 質問する")).toBeVisible();
    await expect(page.getByText("2. 事故傾向を確認")).toBeVisible();
    await expect(page.getByText("3. 年次計画を作成")).toBeVisible();
  });

  test("accidents-reports hub renders step nav and links to industries", async ({
    page,
  }) => {
    const res = await page.goto("/accidents-reports");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("navigation", { name: /Copilot/ })).toBeVisible();
    await expect(page.getByText("業種別 労働災害分析レポート")).toBeVisible();
  });

  test("accidents-reports industry detail shows step nav with construction industry deep link", async ({
    page,
  }) => {
    const res = await page.goto("/accidents-reports/construction");
    expect(res?.status()).toBeLessThan(400);
    // Step nav present
    await expect(page.getByRole("navigation", { name: /Copilot/ })).toBeVisible();
    // The NextSteps extra CTA references the construction-flavored plan generator
    const planLinks = page.locator(
      'a[href="/strategy/plan-generator?industry=construction"]',
    );
    await expect(planLinks.first()).toBeVisible();
  });

  test("plan-generator deep link from accidents-reports pre-fills industry", async ({
    page,
  }) => {
    const res = await page.goto("/strategy/plan-generator?industry=construction");
    expect(res?.status()).toBeLessThan(400);
    // Step nav present
    await expect(page.getByRole("navigation", { name: /Copilot/ })).toBeVisible();
    // Industry select should reflect "建設業" — first <option> for that value
    const industrySelect = page
      .locator("select")
      .filter({ has: page.locator("option", { hasText: "建設業" }) })
      .first();
    await expect(industrySelect).toHaveValue("construction");
    // Prefill banner explains the carryover
    await expect(
      page.getByText("安全Copilotから引き継ぎました"),
    ).toBeVisible();
  });
});
