// 無読テスト: signage-today-documents.tsx（サイネージ「今日の作業資料」）と
// accident-ai-analyzer.tsx（/accidents AI事故分析パネル）の44pxタップ標的を実ブラウザで実測。
// 実行前提: `npm run build && npm run start -- -p 3101`（本番相当ビルド）で起動しておくこと。
import { chromium } from "playwright";

const BASE = "http://localhost:3101";

async function main() {
  const browser = await chromium.launch();
  const results = [];

  // --- signage-today-documents.tsx: サイネージに1件ダミー資料を仕込んでカルーセルを表示させる ---
  {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.addInitScript(() => {
      const dummy = [
        {
          id: "seed-1",
          title: "テスト資料",
          memo: "",
          dataUrl:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          type: "image",
        },
      ];
      window.localStorage.setItem("signage-today-documents", JSON.stringify(dummy));
    });
    await page.goto(`${BASE}/signage`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "作業資料" }).click();

    const addBtn = page.getByRole("button", { name: "＋ 資料を追加" });
    const clearBtn = page.getByRole("button", { name: "一括クリア" });
    const deleteBtn = page.getByRole("button", { name: "この資料を削除" });

    for (const [label, locator] of [
      ["＋ 資料を追加", addBtn],
      ["一括クリア", clearBtn],
      ["カルーセル削除(✕ 削除)", deleteBtn],
    ]) {
      const box = await locator.first().boundingBox();
      results.push([`signage-today-documents: ${label}`, box]);
    }
    await page.close();
  }

  // --- accident-ai-analyzer.tsx: /accidents ハブ内のAI分析パネル ---
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${BASE}/accidents`, { waitUntil: "networkidle" });
    const langSelect = page.getByLabel("表示言語 / Display language");
    const industrySelect = page.getByLabel("業種", { exact: true });
    const workInput = page.getByLabel("作業内容", { exact: true });
    const analyzeBtn = page.getByRole("button", { name: "AIで分析する" });

    for (const [label, locator] of [
      ["表示言語 select", langSelect],
      ["業種 select", industrySelect],
      ["作業内容 input", workInput],
      ["分析実行ボタン", analyzeBtn],
    ]) {
      try {
        const box = await locator.first().boundingBox();
        results.push([`accident-ai-analyzer: ${label}`, box]);
      } catch (e) {
        results.push([`accident-ai-analyzer: ${label}`, `ERROR: ${e.message}`]);
      }
    }
    await page.close();
  }

  await browser.close();

  let allPass = true;
  for (const [label, box] of results) {
    if (!box || typeof box === "string") {
      console.log(`${label}: NOT FOUND (${box})`);
      allPass = false;
      continue;
    }
    const ok = box.height >= 44 && box.width >= 44;
    if (!ok) allPass = false;
    console.log(`${label}: ${box.width.toFixed(1)}x${box.height.toFixed(1)}px ${ok ? "OK" : "FAIL"}`);
  }
  console.log(allPass ? "\n全項目 PASS" : "\n一部 FAIL");
  process.exit(allPass ? 0 : 1);
}

main();
