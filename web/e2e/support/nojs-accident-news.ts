import { expect, type Page } from "@playwright/test";

export async function assertNoJsAccidentNews(
  page: Page,
  { timeoutMs = 5_000 }: { timeoutMs?: number } = {},
): Promise<{ state: "reports" | "fallback"; recordedArticles: number }> {
  const recent = page.getByRole("region", { name: "直近の報道", exact: true });
  await expect(recent).toBeVisible({ timeout: timeoutMs });
  await expect(
    recent.getByRole("heading", { level: 2, name: "直近の報道", exact: true }),
  ).toBeVisible({ timeout: timeoutMs });
  const message = recent.locator("h2 + p");

  const results = recent.locator("[data-accident-news-results]");
  const fallback = recent.getByRole("status");
  // SSRの完了を待つが、外部RSSが常に非空になるとは仮定しない。
  await expect.poll(
    async () => (await results.count()) + (await fallback.count()),
    { timeout: timeoutMs, message: "recent news must expose exactly one settled state" },
  ).toBe(1);

  if ((await results.count()) === 1) {
    await expect(results).toBeVisible({ timeout: timeoutMs });
    await expect(message).toHaveCount(0, { timeout: timeoutMs });
    await expect(recent.getByText(/報道・内容未確認。公表日時は記事の掲載日時であり、事故発生日ではありません。/)).toHaveCount(1, { timeout: timeoutMs });
    await expect(recent.getByText(/発生経緯・原因・法的評価は一次資料で未確認です。/)).toHaveCount(1, { timeout: timeoutMs });
    await expect(recent.getByText("掲載件数は報道記事の数です。同じ事故の続報を含む場合があり、全国の事故発生件数ではありません。", { exact: true })).toBeVisible({ timeout: timeoutMs });
    const countText = await results.getAttribute("data-result-count", {
      timeout: timeoutMs,
    });
    expect(countText).toMatch(/^[1-9]\d*$/);
    const count = Number(countText);
    expect(Number.isSafeInteger(count)).toBe(true);
    const reports = results.locator(':scope > li[data-accident-origin="reported-unverified"]');
    await expect(results.locator(":scope > li")).toHaveCount(count, { timeout: timeoutMs });
    await expect(reports).toHaveCount(count, { timeout: timeoutMs });
    await expect(recent.getByText(`掲載 ${count}記事`, { exact: true })).toBeVisible({ timeout: timeoutMs });
    for (const report of await reports.all()) {
      await expect(report).toBeVisible({ timeout: timeoutMs });
      const title = report.getByRole("heading", { level: 3 });
      await expect(title).toBeVisible({ timeout: timeoutMs });
      await expect(title).toHaveText(/\S/, { timeout: timeoutMs });
      await expect(title.getByRole("link")).toHaveAttribute("href", /^https?:\/\//, { timeout: timeoutMs });
      await expect(report.locator("time[datetime]")).toHaveCount(1, { timeout: timeoutMs });
      await expect(report.locator(":scope > p").first()).toContainText("記事公表", { timeout: timeoutMs });
      await expect(report.getByText(/^報道媒体：\S+/)).toBeVisible({ timeout: timeoutMs });
      await expect(report.getByRole("link", { name: "元記事で確認する" })).toHaveAttribute("href", /^https?:\/\//, { timeout: timeoutMs });
      await expect(report.getByText(/報道・内容未確認/)).toHaveCount(0, { timeout: timeoutMs });
    }
    return { state: "reports", recordedArticles: count };
  }

  await expect(results).toHaveCount(0, { timeout: timeoutMs });
  await expect(fallback).toBeVisible({ timeout: timeoutMs });
  await expect(message).toBeVisible({ timeout: timeoutMs });
  await expect(message).toHaveText(
    /^(?:14日以内の国内労災報道を確認できませんでした。0件・事故なしとは判定しません。|報道RSSを取得できませんでした。0件・事故なしとは判定せず、厚労省速報集計を表示します。)$/,
    { timeout: timeoutMs },
  );
  await expect(fallback).toHaveText(
    "取得できない状態を「事故なし」とは表示していません。時間をおいて再確認するか、下の死亡事故データベース・公式統計を確認してください。",
    { timeout: timeoutMs },
  );
  await expect(recent.getByText("掲載 0記事", { exact: true })).toBeVisible({ timeout: timeoutMs });
  return { state: "fallback", recordedArticles: 0 };
}
