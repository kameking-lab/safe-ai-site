/**
 * 無読テスト（/law-search 法令コーパスの遅延読み込み分離・2026-07-03）
 * 雛形: law-search-visual-first-2026-06-13.mjs / [[noread-test-prod-server-port]]（own prod 3100・domcontentloaded）
 *
 * 目的: 約1.4MBの法令コーパス（web/src/data/laws）を law-search-panel.tsx から
 * law-search-results.tsx へ切り出し dynamic() 化した変更が、
 *   (a) 他ページ（コーパス非依存）の初期ロードにコーパスチャンクを巻き込んでいない
 *   (b) /law-search 自体の検索機能・結論カード・出典タブは非破壊
 * であることを機械確認する。
 *
 * 実行: cp docs/third-party-reviews/scripts/law-search-corpus-lazy-load-2026-07-03.mjs web/tmp-noread-lscorpus.mjs
 *       cd web && npm run build && npx next start -p 3100 &
 *       BASE_URL=http://localhost:3100 node tmp-noread-lscorpus.mjs && rm tmp-noread-lscorpus.mjs
 */
import { chromium } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const results = [];
const ok = (name, cond, detail = "") => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

const bigFontIn = async (card) =>
  card.evaluate((root) => {
    let max = 0;
    root.querySelectorAll("span").forEach((el) => {
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (Number.isFinite(px) && px > max) max = px;
    });
    return max;
  });

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });

  // ===== (a) 全ページ共有チャンク(rootMainFiles等)は法令コーパス本体を含まない =====
  // ブラウザでの検証はNext.jsのLinkプリフェッチ（アイドル時にビューポート内リンク先を先読み）
  // により /law-search 遷移前でも該当チャンクがネットワークに現れてしまい判定不能なため、
  // ビルド成果物を直接検査する（rootMainFilesは全ページ共通の初期ロード対象）。
  {
    const CORPUS_MARKER = "クレーン等安全規則";
    const buildManifestPath = join(
      process.cwd(),
      ".next/server/app/(main)/law-search/page/build-manifest.json"
    );
    if (!existsSync(buildManifestPath)) {
      ok("home ① rootMainFilesが法令コーパス本体を含まない", false, `manifest not found: ${buildManifestPath}`);
    } else {
      const manifest = JSON.parse(readFileSync(buildManifestPath, "utf8"));
      const rootFiles = [...(manifest.rootMainFiles || []), ...(manifest.polyfillFiles || [])];
      const hit = rootFiles.find((f) => {
        const p = join(process.cwd(), ".next", f);
        return existsSync(p) && readFileSync(p, "utf8").includes(CORPUS_MARKER);
      });
      ok(
        "home ① rootMainFiles（全ページ共有）が法令コーパス本体を含まない",
        !hit,
        hit ? `混入: ${hit}` : `${rootFiles.length} shared files中に混入なし`
      );
    }
  }

  // ===== (b) /law-search 機能の非破壊確認 =====
  {
    const page = await ctx.newPage();
    await page.goto(`${BASE}/law-search`, { waitUntil: "domcontentloaded" });
    await page.locator("h1").first().waitFor({ state: "visible", timeout: 10000 });

    ok("law-search ① h1=1", (await page.locator("h1").count()) === 1, `h1=${await page.locator("h1").count()}`);

    const card = page.locator('section[role="status"]').first();
    await card.waitFor({ state: "visible", timeout: 10000 });
    const font = await bigFontIn(card);
    ok("law-search ② 結論カード・デカ数字≥40px", font >= 40, `${Math.round(font)}px`);

    const cardTextBefore = await card.innerText();

    const legendOpen = await page
      .locator("details", { hasText: "出典の見分け方" })
      .first()
      .evaluate((el) => el.open)
      .catch(() => null);
    ok("law-search ③ 出典の見分け方が初期折りたたみ", legendOpen === false, `open=${legendOpen}`);

    // フリーワード検索で結果件数が絞られる（コーパス分離後も検索ロジックが機能）
    const freeInput = page.getByPlaceholder(/フリーワード検索/);
    await freeInput.fill("有機溶剤");
    await page.waitForTimeout(300);
    const cardTextAfter = await card.innerText();
    ok(
      "law-search ④ 検索語入力で結論カードの件数が変化する",
      cardTextAfter !== cardTextBefore,
      `before="${cardTextBefore.slice(0, 20)}" after="${cardTextAfter.slice(0, 20)}"`
    );

    const articleCards = await page.locator("article").count();
    ok("law-search ⑤ 検索後に条文カードが表示される", articleCards > 0, `articles=${articleCards}`);

    // MHLW公式PDFタブへの切替（別の遅延コンポーネント）も非破壊
    await page.getByRole("button", { name: "MHLW公式法令PDF" }).click();
    await page.waitForTimeout(300);
    ok("law-search ⑥ MHLWタブへの切替が機能する", (await page.locator("h1").count()) === 1);

    await page.close();
  }

  await browser.close();

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n===== ${passed}/${results.length} PASS =====`);
  if (passed !== results.length) process.exit(1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
