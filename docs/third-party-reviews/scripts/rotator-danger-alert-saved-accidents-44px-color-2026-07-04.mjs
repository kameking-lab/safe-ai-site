// 無読テスト: signage-rotator進捗ドット・signage-danger-alert閉じるボタンの44px化＋saved-accidentsのamber色統一
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3691";

const browser = await chromium.launch();
let allPass = true;

// /signage: 危険イベント全画面アラート「アラートを閉じる」ボタン（手動発動→オーバーレイ表示→計測）
{
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`${BASE}/signage`, { waitUntil: "networkidle" });
  const triggerBtn = page.getByRole("button", { name: /アラート発動（手動）/ }).first();
  if ((await triggerBtn.count()) > 0) {
    await triggerBtn.click();
    const closeBtn = page.getByRole("button", { name: "アラートを閉じる" });
    const box = await closeBtn.boundingBox();
    const h = box?.height ?? 0;
    const w = box?.width ?? 0;
    const ok = h >= 44 && w >= 44;
    if (!ok) allPass = false;
    console.log(`${ok ? "PASS" : "FAIL"} /signage 危険イベントアラート「閉じる」ボタン: ${w.toFixed(1)}x${h.toFixed(1)}px`);
  } else {
    allPass = false;
    console.log("FAIL /signage 危険イベントアラート発動ボタンが見つからず");
  }
  await page.close();
}

// /signage: トレンドニュース・法改正ローテーターの進捗ドット
{
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`${BASE}/signage`, { waitUntil: "networkidle" });
  const tabs = page.getByRole("tab");
  const count = await tabs.count();
  if (count > 0) {
    let dotsOk = true;
    for (let i = 0; i < count; i++) {
      const box = await tabs.nth(i).boundingBox();
      const h = box?.height ?? 0;
      const w = box?.width ?? 0;
      if (h < 44 || w < 44) dotsOk = false;
    }
    if (!dotsOk) allPass = false;
    console.log(`${dotsOk ? "PASS" : "FAIL"} /signage ローテーター進捗ドット計${count}件: すべて44x44px以上=${dotsOk}`);
  } else {
    console.log("SKIP /signage ローテーター進捗ドット: 複数件データが無く非表示（1件以下）");
  }
  await page.close();
}

// /accidents: 保存した事故事例パネル（localStorageへ事前投入してamber色を確認）
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "safe-ai:favorites:v1",
      JSON.stringify([
        {
          kind: "accident",
          id: "acc-noread-1",
          title: "無読テスト用ダミー事故事例",
          subtitle: "検証用",
          href: "/accidents/acc-noread-1",
          addedAt: new Date().toISOString(),
        },
      ]),
    );
  });
  await page.goto(`${BASE}/accidents`, { waitUntil: "networkidle" });
  const heading = page.getByText(/保存した事故事例/);
  const found = (await heading.count()) > 0;
  if (found) {
    const section = page.locator("section", { has: heading }).first();
    const html = await section.innerHTML();
    const noYellow = !html.includes("yellow-");
    const hasAmber = html.includes("amber-");
    const ok = noYellow && hasAmber;
    if (!ok) allPass = false;
    console.log(`${ok ? "PASS" : "FAIL"} /accidents 保存した事故事例パネル: yellow直書き無し=${noYellow} amber使用=${hasAmber}`);
  } else {
    allPass = false;
    console.log("FAIL /accidents 保存した事故事例パネルが見つからず");
  }
  await page.close();
}

await browser.close();
process.exit(allPass ? 0 : 1);
