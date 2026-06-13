/**
 * 無読テスト（柱0バッチ6/9 メンタル・両立系・2026-06-13）
 * 雛形: law-search-visual-first-2026-06-13.mjs
 *
 * ペルソナ「段落を絶対に読まず色とデカい要素しか見ない現場/担当」。
 * 色・アイコン・デカボタンだけ見て「いまの状態」と「次にやること」が分かるか。
 *
 * 判定:
 *   /treatment-work-balance/plan-builder（記入のこり/結論カード）
 *     ① 結論カード(role=status)がファーストビュー内
 *     ② 未生成は青(info)＝指示の色・「次にやること」アクションあり
 *     ③ 生成ボタンが44px以上のデカボタン
 *     ④ 生成押下で結論カードが緑(safe)「作成完了」へ・プラン本体が出る
 *   ハブ3枚（/mental-health・/mental-health-management・/treatment-work-balance）
 *     ⑤ h1=1
 *     ⑥ 位置付けの長文段落が初期折りたたみ(details:not([open]))
 *     ⑦ 免責の長文段落が初期折りたたみ
 *
 * 実行: cp docs/third-party-reviews/scripts/mental-health-visual-first-2026-06-13.mjs web/tmp-noread-mh.mjs
 *       cd web && node tmp-noread-mh.mjs && rm tmp-noread-mh.mjs
 * 前提: localhost:3000 起動済み（devハング回避のため npm run start 推奨）
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const results = [];
const ok = (name, cond, detail = "") => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  const page = await ctx.newPage();

  // ===== /treatment-work-balance/plan-builder =====
  await page.goto(`${BASE}/treatment-work-balance/plan-builder`, {
    waitUntil: "networkidle",
  });

  const card = page.locator('section[role="status"]').first();
  await card.waitFor({ state: "visible", timeout: 10000 });
  const box = await card.boundingBox();
  ok(
    "plan-builder ① 結論カードがファーストビュー内(y<700)",
    box && box.y < 700,
    box ? `y=${Math.round(box.y)}` : "no box",
  );

  // ② 未生成は青(info)・rose/amber/emerald系の塗りでない＝sky系のborder
  const cls = (await card.getAttribute("class")) || "";
  ok("plan-builder ② 未生成は青(sky/info)", /sky/.test(cls), cls.slice(0, 80));
  const aLabel = await card.locator("a").first().innerText().catch(() => "");
  ok("plan-builder ② 次にやることアクションあり", aLabel.length > 0, aLabel);

  // ③ 生成ボタンが44px以上
  const genBtn = page.getByRole("button", { name: /両立支援プランを生成/ });
  const gBox = await genBtn.boundingBox();
  ok("plan-builder ③ 生成ボタン高さ≥44px", gBox && gBox.height >= 44, gBox ? `${Math.round(gBox.height)}px` : "no box");

  // ④ 生成押下 → 緑(safe)「作成完了」＋プラン本体
  await genBtn.click();
  await page.waitForTimeout(400);
  const cls2 = (await card.getAttribute("class")) || "";
  ok("plan-builder ④ 生成後は緑(emerald/safe)", /emerald/.test(cls2), cls2.slice(0, 80));
  const title2 = await card.innerText();
  ok("plan-builder ④ 「作成完了」表示", /作成完了/.test(title2));
  ok(
    "plan-builder ④ プラン本体(#plan-output)が出る",
    (await page.locator("#plan-output").count()) === 1,
  );

  // ===== ハブ3枚 =====
  const hubs = [
    "/mental-health",
    "/mental-health-management",
    "/treatment-work-balance",
  ];
  for (const path of hubs) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    ok(`${path} ⑤ h1=1`, (await page.locator("h1").count()) === 1, `h1=${await page.locator("h1").count()}`);
    // ⑥⑦ 折りたたみ(details)が2枚以上・いずれも初期closed
    const details = page.locator("details");
    const dCount = await details.count();
    ok(`${path} ⑥⑦ 折りたたみが2枚以上`, dCount >= 2, `details=${dCount}`);
    const openCount = await page.locator("details[open]").count();
    ok(`${path} ⑥⑦ 初期はすべて閉じている`, openCount === 0, `open=${openCount}`);
  }

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) {
    console.log("FAILED:", failed.map((f) => f.name).join("; "));
    process.exit(1);
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
