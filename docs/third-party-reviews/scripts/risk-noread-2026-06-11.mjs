/**
 * 無読テスト（柱0 リスクマップ /risk・2026-06-11）
 *
 * ペルソナ: 「台風前日の元請安全担当・段落を絶対に読まない」
 *   - 朝イチにスマホで開いて、全国(自エリア)の警報の有無と作業可否の当たりを3秒で付けたい。
 *
 * 判定:
 *   ①結論カード(role=status)がスマホ390×844のファーストビュー内
 *   ②色の文法（警報=赤/取得失敗・注意報=黄/なし=緑・確認不能を緑にしない）
 *     — 警報・失敗経路は route モックで実機検証（実データ待ちにしない）
 *   ③次にやること（気象庁公式リンク・モード切替）が44px以上
 *   ④多重h1なし（柱C-7関連の是正検証）
 *
 * 実行: cp docs/third-party-reviews/scripts/risk-noread-2026-06-11.mjs web/tmp-risk-noread.mjs
 *       cd web && node tmp-risk-noread.mjs && rm tmp-risk-noread.mjs
 * 前提: prod server (localhost:3000) 起動済み
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const results = [];
const ok = (name, cond, detail = "") => {
  results.push({ name, pass: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
};

const REGIONS = [
  ["hokkaido", "北海道"],
  ["tohoku", "東北"],
  ["kanto", "関東"],
  ["chubu", "中部"],
  ["kinki", "近畿"],
  ["chugoku", "中国"],
  ["shikoku", "四国"],
  ["kyushu", "九州"],
];

const day = (alertLevel) => ({
  date: "2026-06-11",
  weatherLabel: "晴れ",
  weatherCode: 1,
  maxTempC: 25,
  minTempC: 15,
  precipMm: 0,
  maxWindMs: 3,
  alertLevel,
});

const forecastBody = (levels = {}) => ({
  regions: REGIONS.map(([regionId, regionLabel]) => ({
    regionId,
    regionLabel,
    days: [day(levels[regionId] ?? "none")],
  })),
  fetchedAt: "2026-06-11T06:00:00+09:00",
});

const jmaBody = (levels = {}) => ({
  mapLevels: Object.fromEntries(REGIONS.map(([id]) => [id, levels[id] ?? "none"])),
  hourly: [],
});

/** 両APIをモックして /risk を開き、結論カードのテキストとクラスを返す */
async function openMocked(ctx, { forecast, jma, forecastFail, jmaFail }) {
  const page = await ctx.newPage();
  await page.route("**/api/weather-forecast", (route) =>
    forecastFail
      ? route.fulfill({ status: 500, body: "{}" })
      : route.fulfill({ json: forecast ?? forecastBody() })
  );
  await page.route("**/api/signage-weather**", (route) =>
    jmaFail
      ? route.fulfill({ status: 500, body: "{}" })
      : route.fulfill({ json: jma ?? jmaBody() })
  );
  await page.goto(`${BASE}/risk`, { waitUntil: "domcontentloaded" });
  const card = page.getByRole("status");
  await card.waitFor({ state: "visible", timeout: 15000 });
  // 取得完了（確認中の無彩から遷移）を待つ
  await page.waitForFunction(
    () => !(document.querySelector('[role="status"]')?.textContent || "").includes("確認中"),
    { timeout: 15000 }
  );
  const text = ((await card.textContent()) || "").trim();
  const cls = (await card.getAttribute("class")) || "";
  return { page, card, text, cls };
}

const main = async () => {
  const browser = await chromium.launch();
  // PWA の service worker が fetch を握ると page.route が効かないためブロックする
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });

  // --- 1) 実データ: ファーストビュー・44px・h1 ---
  {
    const page = await ctx.newPage();
    await page.goto(`${BASE}/risk`, { waitUntil: "domcontentloaded" });
    const card = page.getByRole("status");
    await card.waitFor({ state: "visible", timeout: 15000 });
    const box = await card.boundingBox();
    ok("①結論カードがファーストビュー内(390×844)", box && box.y + 80 < 844, box ? `y=${Math.round(box.y)}` : "no box");

    const jmaLink = page.getByRole("link", { name: "気象庁公式で確認" });
    const linkBox = await jmaLink.boundingBox();
    ok("③気象庁公式リンクが44px以上", linkBox && linkBox.height >= 44, linkBox ? `h=${linkBox.height}` : "no box");

    const tab = page.getByRole("button", { name: "1週間予報" });
    const tabBox = await tab.boundingBox();
    ok("③モード切替タブが44px以上", tabBox && tabBox.height >= 44, tabBox ? `h=${tabBox.height}` : "no box");

    const h1Count = await page.locator("h1").count();
    ok("④h1が1つだけ（多重h1是正）", h1Count === 1, `h1=${h1Count}`);

    // 実データの色がいずれかの正規トーン（緑/黄/赤/無彩）で塗られている
    await page.waitForTimeout(2000);
    const cls = (await card.getAttribute("class")) || "";
    ok(
      "②実データの結論カードが正規トーンで塗られている",
      /emerald|amber|rose|slate/.test(cls),
      cls.match(/(emerald|amber|rose|slate)-\d+/)?.[0] ?? ""
    );
    await page.close();
  }

  // --- 2) モック: 全国異常なし = 緑 ---
  {
    const { page, text, cls } = await openMocked(ctx, {});
    ok("②異常なし: 緑「警報・注意報なし」", text.includes("警報・注意報なし") && cls.includes("emerald"));
    await page.close();
  }

  // --- 3) モック: 予報側の警報 = 赤・地域名 ---
  {
    const { page, text, cls } = await openMocked(ctx, {
      forecast: forecastBody({ kanto: "warning" }),
    });
    ok(
      "②警報相当: 赤・デカ数字1地域・関東",
      text.includes("警報相当あり") && text.includes("1") && text.includes("関東") && cls.includes("rose")
    );
    await page.close();
  }

  // --- 4) モック: 気象庁側の特別警報 = 赤・タイトル区別 ---
  {
    const { page, text, cls } = await openMocked(ctx, {
      jma: jmaBody({ kinki: "special" }),
    });
    ok("②特別警報: 赤「特別警報あり」", text.includes("特別警報あり") && cls.includes("rose"));
    await page.close();
  }

  // --- 5) モック: 両API失敗 = 黄「取得失敗」（緑にも赤にもしない） ---
  {
    const { page, text, cls } = await openMocked(ctx, { forecastFail: true, jmaFail: true });
    ok(
      "②両ソース失敗: 黄「気象情報 取得失敗」",
      text.includes("気象情報 取得失敗") && cls.includes("amber") && !cls.includes("emerald") && !cls.includes("rose")
    );
    await page.close();
  }

  // --- 6) モック: 片方失敗＋異常なし = 黄「一部 確認不能」（緑を宣言しない） ---
  {
    const { page, text, cls } = await openMocked(ctx, { jmaFail: true });
    ok("②片方失敗: 黄「一部 確認不能」（偽緑なし）", text.includes("一部 確認不能") && cls.includes("amber"));
    await page.close();
  }

  // --- 7) モック: 注意報2地域 = 黄・件数 ---
  {
    const { page, text, cls } = await openMocked(ctx, {
      forecast: forecastBody({ shikoku: "advisory" }),
      jma: jmaBody({ kyushu: "advisory" }),
    });
    ok(
      "②注意報相当: 黄・2地域・四国/九州",
      text.includes("注意報相当あり") && text.includes("2") && text.includes("四国") && text.includes("九州") && cls.includes("amber")
    );
    await page.close();
  }

  await browser.close();
  const pass = results.filter((r) => r.pass).length;
  console.log(`\n==== 無読テスト結果: ${pass}/${results.length} PASS ====`);
  if (pass !== results.length) process.exit(1);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
