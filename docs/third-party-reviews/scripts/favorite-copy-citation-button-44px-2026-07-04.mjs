// 無読テスト: FavoriteButton・CopyCitationButton compact/normal variantの44px化
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3691";

const browser = await chromium.launch();
let allPass = true;

function check(label, box) {
  const h = box?.height ?? 0;
  const w = box?.width ?? 0;
  const ok = h >= 44 && w >= 44;
  if (!ok) allPass = false;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}: ${w.toFixed(1)}x${h.toFixed(1)}px`);
}

// /accidents/[id]: FavoriteButton normal variant（h1横のお気に入りボタン）
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/accidents`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /サイト収録事例/ }).click();
  const firstDetail = page.locator('a[href^="/accidents/"]').first();
  await firstDetail.waitFor({ state: "visible" });
  await firstDetail.scrollIntoViewIfNeeded();
  await firstDetail.click();
  await page.waitForURL(/\/accidents\/[a-z0-9-]+$/, { timeout: 10000 });
  const favBtn = page.getByRole("button", { name: /^お気に入り(済)?$/ });
  if ((await favBtn.count()) > 0) {
    check("/accidents/[id] FavoriteButton(normal)", await favBtn.boundingBox());
  } else {
    allPass = false;
    console.log("FAIL /accidents/[id] FavoriteButtonが見つからず");
  }
  await page.close();
}

// /circulars: CopyCitationButton・FavoriteButton compact variant（一覧行内）
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/circulars`, { waitUntil: "networkidle" });
  const copyBtn = page.getByRole("button", { name: "引用をコピー" }).first();
  const favBtn = page.getByRole("button", { name: /お気に入りに追加|お気に入りから削除/ }).first();
  if ((await copyBtn.count()) > 0 && (await favBtn.count()) > 0) {
    check("/circulars CopyCitationButton(compact)", await copyBtn.boundingBox());
    check("/circulars FavoriteButton(compact)", await favBtn.boundingBox());
  } else {
    allPass = false;
    console.log("FAIL /circulars でボタンが見つからず");
  }
  await page.close();
}

// /law-search: CopyCitationButton・FavoriteButton compact variant（条文結果行内）
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/law-search?law=労働安全衛生法`, { waitUntil: "networkidle" });
  const copyBtn = page.getByRole("button", { name: "引用をコピー" }).first();
  const favBtn = page.getByRole("button", { name: /お気に入りに追加|お気に入りから削除/ }).first();
  if ((await copyBtn.count()) > 0 && (await favBtn.count()) > 0) {
    check("/law-search CopyCitationButton(compact)", await copyBtn.boundingBox());
    check("/law-search FavoriteButton(compact)", await favBtn.boundingBox());
  } else {
    allPass = false;
    console.log("FAIL /law-search でボタンが見つからず");
  }
  await page.close();
}

await browser.close();
console.log(allPass ? "\nALL PASS" : "\nSOME FAILED");
process.exit(allPass ? 0 : 1);
