// 柱0-0 色の文法違反＝ /ky/list（保存したKY一覧）の通知バーが常に緑(emerald)固定で
// 表示されており、safety-tone.tsの「赤=危険/黄=注意/緑=良好」の文法に反していた
// （#792 records-backup.tsx・#799 distributed-input-bar.tsx と同型）。
// 「開く」「複製」で本体が読み込めない失敗時は danger(赤)、削除成功時は safe(緑) を
// SAFETY_TONE経由で出し分けるよう是正。
// 実行: cd web && npm run build && PORT=3100 npm run start
//   BASE_URL=http://localhost:3100 node ../docs/third-party-reviews/scripts/ky-list-notice-color-grammar-2026-07-04.mjs
//
// ペルソナ: 端末を移行し過去KYを開こうとする職長／保存済みKYを削除する職長。
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE_URL ?? process.env.BASE ?? "http://localhost:3100";
const MOBILE = { width: 390, height: 844 };
const KY_LIST_KEY = "safe-ai:ky-record-list:v1";

let pass = 0;
let fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) {
    pass++;
    console.log(`  PASS: ${name}`);
  } else {
    fail++;
    console.log(`  FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const seedListEntry = (id, siteName) => ({
  id,
  workDate: "2026-07-04",
  companyName: "",
  siteName,
  projectName: "",
  foremanName: "",
  workDetail: "鉄骨組立",
  weather: "晴",
  savedAt: "2026-07-04T00:00:00Z",
});

const browser = await chromium.launch();

// ── 本体を読み込めない（端末移行想定）「開く」失敗＝赤 ──────────
{
  const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/ky/list`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, entry }) => window.localStorage.setItem(key, JSON.stringify([entry])),
    { key: KY_LIST_KEY, entry: seedListEntry("orphan-1", "○○現場（本体なし）") }
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/ky/list] 「開く」失敗時の通知バー色");

  await page.getByText("開く（再編集）").first().click();
  await page.waitForTimeout(200);
  // role="status" は結論カード(ConclusionCard)にも付くため、通知バーは末尾の1件を狙う。
  const status = page.getByRole("status").last();
  const text = await status.textContent().catch(() => null);
  check(
    "失敗メッセージが表示される",
    !!text && text.includes("読み込めませんでした"),
    `text=${text}`
  );
  const cls = await status.getAttribute("class").catch(() => "");
  check("失敗メッセージが赤系(rose)クラス", !!cls && cls.includes("border-rose"), `class=${cls}`);
  check("失敗メッセージが緑(emerald)に固定されていない", !cls || !cls.includes("border-emerald"), `class=${cls}`);
  await page.close();
  await ctx.close();
}

// ── 削除成功＝緑 ────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: MOBILE, serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept());
  await page.goto(`${BASE}/ky/list`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, entry }) => window.localStorage.setItem(key, JSON.stringify([entry])),
    { key: KY_LIST_KEY, entry: seedListEntry("del-1", "△△現場") }
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  console.log("\n[/ky/list] 削除成功時の通知バー色");

  await page.getByText("削除").first().click();
  await page.waitForTimeout(200);
  const status = page.getByRole("status").last();
  const text = await status.textContent().catch(() => null);
  check("成功メッセージが表示される", !!text && text.includes("削除しました"), `text=${text}`);
  const cls = await status.getAttribute("class").catch(() => "");
  check("成功メッセージが緑系(emerald)クラス", !!cls && cls.includes("border-emerald"), `class=${cls}`);
  check("成功メッセージが赤(rose)に誤表示されていない", !cls || !cls.includes("border-rose"), `class=${cls}`);
  await page.close();
  await ctx.close();
}

console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);

await browser.close();
process.exit(fail === 0 ? 0 : 1);
