/**
 * 無読テスト: /accidents（事故DB）柱0補充 タップ標的44px化（2026-06-14）
 *
 * 背景: 最上部の操作が指で押しにくいサイズだった。
 *  - 事故情報ハブナビの4チップ … px-3 py-1 ≈28px
 *  - クイック検索の入力欄/検索ボタン … py-2 ≈38px
 *  - 事故の型チップ … min-h-[36px]=36px
 *  - 保存した事故事例の削除ボタン … px-2 py-1 ≈24px
 * 対策: いずれも 44px（型チップ・ナビ・入力=min-h-[44px]、削除=h-11 w-11）へ。
 *
 * ペルソナ: 段落を読まず、現場でスマホ(390×844)を親指操作する一人親方/職長。
 * 判定基準（無読テスト）: 最上部の「探す/検索する」操作が見て分かり、指で確実に押せるか。
 *
 * 実行: dev server (localhost:3000) を起動した上で web/ から実行
 *   cp docs/third-party-reviews/scripts/accidents-pillar0-44px-noread-2026-06-14.mjs web/noread-tmp.mjs
 *   cd web && node noread-tmp.mjs && rm noread-tmp.mjs
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const MOBILE = { width: 390, height: 844 };

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

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: MOBILE });

// 保存した事故事例セクションを出すため、お気に入りを1件シード（localStorage）
await page.addInitScript(() => {
  window.localStorage.setItem(
    "safe-ai:favorites:v1",
    JSON.stringify([
      {
        kind: "accident",
        id: "noread-acc-1",
        title: "足場からの墜落",
        subtitle: "建設業・墜落",
        href: "/accidents",
        addedAt: "2026-06-14T00:00:00.000Z",
      },
    ]),
  );
});

console.log("\n[/accidents] 柱0 タップ標的44px 無読テスト（スマホ390×844）");
await page.goto(`${BASE}/accidents`, { waitUntil: "networkidle" });

const allAtLeast44 = async (locator) => {
  const heights = await locator.evaluateAll((els) =>
    els.map((e) => e.getBoundingClientRect().height),
  );
  return { ok: heights.length > 0 && heights.every((h) => h >= 44), heights };
};

// ---------- A) 事故情報ハブナビ4チップ ----------
const navLinks = page.locator('nav[aria-label="事故情報ナビ"] a');
{
  const { ok, heights } = await allAtLeast44(navLinks);
  check("事故情報ハブナビ4チップが全て44px以上", ok, `min=${Math.min(...heights)} n=${heights.length}`);
}

// ---------- B) クイック検索 入力欄 ----------
const searchInput = page.getByRole("searchbox", { name: "事故事例キーワード検索" });
{
  const box = await searchInput.boundingBox();
  check("クイック検索の入力欄が44px以上", box !== null && box.height >= 44, `h=${box?.height}`);
}

// ---------- C) クイック検索 検索ボタン ----------
// キーワード欄を含む form（QuickAccidentSearch 内に唯一）を起点に限定
const quickForm = page.locator('form:has(input[aria-label="事故事例キーワード検索"])');
const searchBtn = quickForm.locator('button[type="submit"]');
{
  const box = await searchBtn.boundingBox();
  check("クイック検索の検索ボタンが44px以上", box !== null && box.height >= 44, `h=${box?.height}`);
}

// ---------- D) 事故の型チップ（クイック検索内） ----------
// form の直後の div（型チップ群）の a に限定
const typeChips = quickForm.locator('xpath=following-sibling::div[1]').locator("a");
{
  const { ok, heights } = await allAtLeast44(typeChips);
  check("クイック検索の事故型チップが全て44px以上", ok, `min=${Math.min(...heights)} n=${heights.length}`);
}

// ---------- E) 保存した事故事例の削除ボタン ----------
const delBtn = page.getByRole("button", { name: "保存から削除" }).first();
{
  await delBtn.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  const box = await delBtn.boundingBox();
  check(
    "保存した事故事例の削除ボタンが44×44px",
    box !== null && box.height >= 44 && box.width >= 44,
    `h=${box?.height} w=${box?.width}`,
  );
}

await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
