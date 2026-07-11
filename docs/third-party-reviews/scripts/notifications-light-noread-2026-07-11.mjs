// 通知ライト（③章・鍵なし）無読チェック＋実測。
// 実行: cd web && (npm run start -- -p 3100 &) ; node ../docs/third-party-reviews/scripts/notifications-light-noread-2026-07-11.mjs
// 無読の問い:
//   1. どのページでもヘッダーのベルから通知センターに到達でき、未読→既読が機能するか
//   2. /notifications で「4経路・鍵なし制約」が3秒で読め、OS通知の許可→テスト発火まで通るか
//   3. /api/notify/feed と /feed/weather-alerts.xml（RSS）が実応答するか
//   4. サイネージにOS通知トグルが出るか（発火ロジック自体はRTLテストで機械固定済み）
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
const webDir = fileURLToPath(new URL("../../../web/", import.meta.url));
const { chromium } = createRequire(webDir)("playwright");

const BASE = process.env.BASE || "http://localhost:3100";
const SHOT_DIR = fileURLToPath(new URL("../artifacts/notifications-light-2026-07-11/", import.meta.url));
mkdirSync(SHOT_DIR, { recursive: true });

let pass = 0;
let total = 0;
function check(label, cond, detail = "") {
  total += 1;
  if (cond) pass += 1;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
await ctx.grantPermissions(["notifications"]);
const page = await ctx.newPage();
// OS通知の発火を機械観測するため Notification をスタブ（headlessでは表示できないため）
await page.addInitScript(() => {
  window.__notifCalls = [];
  class FakeNotification {
    static permission = "granted";
    static requestPermission = async () => "granted";
    constructor(title, options) {
      window.__notifCalls.push({ title, options });
    }
    close() {}
  }
  // @ts-ignore
  window.Notification = FakeNotification;
});

// ---- 0) API・フィードの実応答 ----
const feedRes = await page.request.get(`${BASE}/api/notify/feed?pref=JP-13`);
check("api/notify/feed が200", feedRes.status() === 200);
const feed = await feedRes.json().catch(() => null);
check("feed: items配列が非空", Array.isArray(feed?.items) && feed.items.length > 0, `items=${feed?.items?.length}`);
check("feed: 法改正カテゴリを含む", (feed?.items ?? []).some((i) => i.category === "law-revision"));
const rssRes = await page.request.get(`${BASE}/feed/weather-alerts.xml`);
const rssText = await rssRes.text();
check("feed/weather-alerts.xml が200・RSS2.0", rssRes.status() === 200 && rssText.includes('<rss version="2.0"'));
const lawRss = await page.request.get(`${BASE}/feed/law-revisions.xml`);
check("feed/law-revisions.xml（既存）も200", lawRss.status() === 200);

// ---- 1) ベル（トップページ・390px） ----
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="notification-bell"]', { timeout: 20000 });
const bell = page.getByTestId("notification-bell").first();
check("ヘッダーにベルが常設", await bell.isVisible().catch(() => false));
await page.waitForTimeout(1200); // フィード取得
const badge = page.getByTestId("notification-badge").first();
const badgeVisible = await badge.isVisible().catch(() => false);
check("未読バッジが出る（新着あり）", badgeVisible);
await bell.click();
check("ベルタップで通知センターが開く", await page.getByRole("dialog", { name: "通知センター" }).isVisible());
check(
  "通知にカテゴリラベル（法改正等）が付く",
  (await page.getByRole("dialog", { name: "通知センター" }).textContent())?.includes("法改正") ?? false,
);
await page.screenshot({ path: `${SHOT_DIR}bell-panel-390px.png` });
await page.getByRole("button", { name: "すべて既読" }).click();
await page.waitForTimeout(300);
check("すべて既読でバッジが消える", !(await badge.isVisible().catch(() => false)));
// 既読はlocalStorage（端末内）に保存される
const readStored = await page.evaluate(() => window.localStorage.getItem("safe-ai:notif-read:v1"));
check("既読が端末内に保存される（safe-ai:notif-read:v1）", !!readStored && readStored.includes("news-"));

// ---- 2) /notifications 設定ページ ----
await page.goto(`${BASE}/notifications`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="notification-settings"]', { timeout: 20000 });
check(
  "結論カード: 4経路提供中が読める",
  (await page.locator('section[aria-label^="いまの状態"]').textContent())?.includes("通知を受け取る方法") ?? false,
);
check(
  "鍵なし制約の正直な明記（開いているタブのみ）",
  (await page.textContent("body"))?.includes("ページを開いているタブからのみ") ?? false,
);
check("RSS 4フィードのリンクが並ぶ", (await page.locator('a[href^="/feed/"]').count()) >= 4);
// OS通知: permission=granted スタブなのでトグルが直接出る
const toggle = page.locator('[data-testid="notification-settings"] input[type="checkbox"]');
check("OS通知トグルが出る（許可済み）", await toggle.isVisible().catch(() => false));
await toggle.check();
await page.getByRole("button", { name: "テスト通知を送る" }).click();
await page.waitForTimeout(300);
const calls = await page.evaluate(() => window.__notifCalls);
check("テスト通知がNotification APIで発火", Array.isArray(calls) && calls.length === 1, `calls=${calls?.length}`);
check("発火タイトルが実文言", calls?.[0]?.title?.includes("テスト通知") ?? false);
await page.screenshot({ path: `${SHOT_DIR}notifications-settings-390px.png`, fullPage: true });

// ---- 3) サイネージのOS通知トグル ----
const pc = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: "block" });
await pc.grantPermissions(["notifications"]);
const p2 = await pc.newPage();
await p2.addInitScript(() => {
  class FakeNotification {
    static permission = "granted";
    static requestPermission = async () => "granted";
    constructor() {}
    close() {}
  }
  // @ts-ignore
  window.Notification = FakeNotification;
});
await p2.goto(`${BASE}/signage`, { waitUntil: "domcontentloaded" });
await p2.waitForTimeout(2500);
const signageToggle = p2.getByTestId("signage-os-notify-toggle");
check("サイネージにOS通知トグル", await signageToggle.isVisible().catch(() => false));
await signageToggle.click();
await p2.waitForTimeout(300);
check("トグルONで永続化（signage-os-notify=1）", (await p2.evaluate(() => window.localStorage.getItem("signage-os-notify"))) === "1");
await p2.screenshot({ path: `${SHOT_DIR}signage-os-notify-toggle.png` });

await browser.close();
console.log(`\n${pass}/${total} passed`);
process.exit(pass === total ? 0 : 1);
