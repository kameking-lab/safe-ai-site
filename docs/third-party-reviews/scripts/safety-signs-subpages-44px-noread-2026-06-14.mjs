/**
 * 無読テスト: /safety-signs サブページ 柱0補充 タップ標的44px化（2026-06-14）
 *
 * 背景: 標識DBのサブページ（カテゴリ詳細・業種詳細・標識詳細）で、ペルソナが
 *   標識→カテゴリ→業種を行き来する主たるナビが指で押しにくいサイズだった。
 *   - 「…に戻る」リンク … text-xs の素の inline-flex（≈16〜20px）
 *   - 業種チップ（他の業種ガイド／業種別ガイドへ）… px-3 py-2 ≈32px
 * 対策: いずれも min-h-[44px]（チップは inline-flex items-center 併用）へ。
 *
 * ペルソナ: 段落を読まず、現場でスマホ(390×844)を親指操作する一人親方/職長。
 * 判定基準（無読テスト）: 各サブページで「戻る」「別の業種へ」が見て分かり、
 *   指で確実に押せるか。
 *
 * 実行: dev server (localhost:3000) を起動した上で web/ から実行
 *   cp docs/third-party-reviews/scripts/safety-signs-subpages-44px-noread-2026-06-14.mjs web/noread-tmp.mjs
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

const allAtLeast44 = async (locator) => {
  const heights = await locator.evaluateAll((els) =>
    els.map((e) => e.getBoundingClientRect().height),
  );
  return { ok: heights.length > 0 && heights.every((h) => h >= 44), heights };
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: MOBILE });

// ---------- A) カテゴリ詳細: 戻るリンク ----------
console.log("\n[/safety-signs/category/prohibition] 戻るナビ 44px");
await page.goto(`${BASE}/safety-signs/category/prohibition`, { waitUntil: "networkidle" });
{
  const back = page.getByRole("link", { name: /標識データベースに戻る/ });
  const box = await back.boundingBox();
  check("カテゴリ詳細: 戻るリンクが44px以上", box !== null && box.height >= 44, `h=${box?.height}`);
}

// ---------- B) 業種詳細: 戻るリンク＋他の業種ガイドチップ ----------
console.log("\n[/safety-signs/industry/construction] 戻るナビ＋業種チップ 44px");
await page.goto(`${BASE}/safety-signs/industry/construction`, { waitUntil: "networkidle" });
{
  const back = page.getByRole("link", { name: /標識データベースに戻る/ });
  const box = await back.boundingBox();
  check("業種詳細: 戻るリンクが44px以上", box !== null && box.height >= 44, `h=${box?.height}`);
}
{
  const chips = page.locator('a[href^="/safety-signs/industry/"]');
  const { ok, heights } = await allAtLeast44(chips);
  check("業種詳細: 他の業種ガイドチップが全て44px以上", ok, `min=${Math.min(...heights)} n=${heights.length}`);
}

// ---------- C) 標識詳細: 戻るリンク＋業種別ガイドへチップ ----------
console.log("\n[/safety-signs/sign/fire-extinguisher] 戻るナビ＋業種チップ 44px");
await page.goto(`${BASE}/safety-signs/sign/fire-extinguisher`, { waitUntil: "networkidle" });
{
  const back = page.getByRole("link", { name: /に戻る/ });
  const box = await back.boundingBox();
  check("標識詳細: 戻るリンクが44px以上", box !== null && box.height >= 44, `h=${box?.height}`);
}
{
  // 「業種別ガイドへ」のチップ群（rounded-lg のタイル）のみに限定。
  // 本文中の業種インラインリンク（rounded-lg なし）は除外する。
  const chips = page.locator('a[href^="/safety-signs/industry/"].rounded-lg');
  const { ok, heights } = await allAtLeast44(chips);
  check("標識詳細: 業種別ガイドへチップが全て44px以上", ok, `min=${Math.min(...heights)} n=${heights.length}`);
}

await browser.close();
console.log(`\n結果: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
