import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3901";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

  const results = [];

  // 1) 死亡事故カード: 「10年事故DB一覧へ →」リンク
  const dbLink = page.getByRole("link", { name: /10年事故DB一覧へ/ });
  const dbBox = await dbLink.boundingBox();
  results.push({ label: "10年事故DB一覧へリンク", height: dbBox?.height });

  // 2) AlertGenerator: 「注意喚起文を作成」ボタン(死亡事故カード)
  const genButton = page.getByRole("button", { name: /注意喚起文を作成/ }).first();
  const genBox = await genButton.boundingBox();
  results.push({ label: "注意喚起文を作成ボタン", height: genBox?.height });

  // 3) 失敗を3回誘発して 再試行/管理者連絡 を出す（ネットワーク遮断でAPIを強制失敗させる）
  await page.route("**/api/safety-alert", (route) => route.abort());
  await page.waitForTimeout(2000); // クライアントコンポーネントのハイドレーション待ち
  for (let i = 0; i < 3; i += 1) {
    await genButton.click();
    // eslint-disable-next-line no-await-in-loop
    await page.getByText("ネットワークエラーが発生しました。").first().waitFor({ state: "visible", timeout: 10000 });
  }
  const retryButton = page.getByRole("button", { name: /再試行/ }).first();
  const retryBox = await retryButton.boundingBox();
  results.push({ label: "再試行ボタン", height: retryBox?.height });

  const contactLink = page.getByRole("link", { name: /管理者に連絡/ }).first();
  const contactBox = await contactLink.boundingBox();
  results.push({ label: "管理者に連絡リンク", height: contactBox?.height });

  console.log("=== トップ 本日の安全トピック タップ標的 実測 ===");
  for (const r of results) {
    console.log(`${r.label}: height=${r.height}px ${(r.height ?? 0) >= 44 ? "PASS" : "FAIL"}`);
  }

  const allPass = results.length === 4 && results.every((r) => (r.height ?? 0) >= 44);
  console.log(allPass ? `\n無読テスト: PASS (${results.length}/${results.length})` : "\n無読テスト: FAIL");

  await browser.close();
  process.exit(allPass ? 0 : 1);
}

main();
