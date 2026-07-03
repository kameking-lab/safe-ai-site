// 無読テスト: signage-floor-plan-editor.tsx（サイネージ/図面ピン配置エディタ、/signage 既定表示モード）の
// 44pxタップ標的を実ブラウザで実測。
// 実行前提: `npm run build && npm run start -- -p 3101`（本番相当ビルド）で起動しておくこと。
import { chromium } from "playwright";

const BASE = "http://localhost:3101";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`${BASE}/signage`, { waitUntil: "networkidle" });

  // 図面モードは既定表示のため切替不要。まず常時表示の2要素を確認。
  const uploadTrigger = page.getByText("自社図面アップロード");
  const editToggle = page.getByRole("button", { name: /ピン配置モード|ピン配置中/ });

  const results = [];
  for (const [label, locator] of [
    ["自社図面アップロード(label)", uploadTrigger],
    ["ピン配置モード トグル", editToggle],
  ]) {
    const box = await locator.first().boundingBox();
    results.push([label, box]);
  }

  // 編集モードに入ると select / input / 全削除 が出現する
  await editToggle.first().click();
  const typeSelect = page.locator("select").first();
  const labelInput = page.locator('input[placeholder*="ラベル"]');

  for (const [label, locator] of [
    ["ピン種別 select", typeSelect],
    ["ラベル input", labelInput],
  ]) {
    const box = await locator.first().boundingBox();
    results.push([label, box]);
  }

  // ピンを1件置いて「全削除」ボタンを出現させる
  await labelInput.fill("テスト箇所");
  const canvas = page.locator(".cursor-crosshair").first();
  await canvas.click({ position: { x: 100, y: 100 } });
  const clearBtn = page.getByRole("button", { name: "全削除" });
  results.push(["全削除ボタン", await clearBtn.first().boundingBox()]);

  await browser.close();

  let allPass = true;
  for (const [label, box] of results) {
    if (!box || typeof box === "string") {
      console.log(`${label}: NOT FOUND (${box})`);
      allPass = false;
      continue;
    }
    const ok = box.height >= 44;
    if (!ok) allPass = false;
    console.log(`${label}: ${box.width.toFixed(1)}x${box.height.toFixed(1)}px ${ok ? "OK" : "FAIL"}`);
  }
  console.log(allPass ? "\n全項目 PASS" : "\n一部 FAIL");
  process.exit(allPass ? 0 : 1);
}

main();
