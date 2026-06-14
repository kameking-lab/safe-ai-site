/**
 * 無読テスト（柱3 リスクマップ /risk・明日からの見通しストリップ・2026-06-14）
 *
 * ペルソナ: 「台風前日の元請安全担当・段落を絶対に読まない」
 *   - 前日の夕方にスマホで開き、明日の屋外作業を止めるかを3秒で決めたい。
 *   - 従来は「今日」の結論カードしか上部になく、明日以降は1週間予報タブの奥だった。
 *
 * 判定:
 *   ①「明日からの見通し」ストリップがスマホ390×844のファーストビュー内に出る
 *   ②色の文法（明日に警報=赤・該当地域数／注意報=黄／なし=緑）が予報どおり塗られる
 *   ③ストリップのセルが44px以上のタップ標的で、押すと1週間予報のその日へ飛ぶ
 *   ④今日の結論カードと矛盾しない（ストリップは明日起点＝今日を二重表示しない）
 *
 * 実行: cp docs/third-party-reviews/scripts/risk-outlook-noread-2026-06-14.mjs web/tmp-risk-outlook.mjs
 *       cd web && BASE_URL=http://localhost:3100 node tmp-risk-outlook.mjs && rm tmp-risk-outlook.mjs
 * 前提: prod server 起動済み（own server -p 3100 推奨・domcontentloaded で待つ）
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3100";
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

const DATES = ["2026-06-14", "2026-06-15", "2026-06-16", "2026-06-17"];

const dayObj = (alertLevel, date) => ({
  date,
  weatherLabel: "晴れ",
  weatherCode: 1,
  maxTempC: 25,
  minTempC: 15,
  precipMm: 0,
  maxWindMs: 3,
  alertLevel,
});

/** perRegion[regionId] = [今日, 明日, 明後日, 3日後] のレベル配列（省略は none） */
const forecastBody = (perRegion = {}) => ({
  regions: REGIONS.map(([regionId, regionLabel]) => ({
    regionId,
    regionLabel,
    days: DATES.map((d, i) => dayObj((perRegion[regionId] || [])[i] ?? "none", d)),
  })),
  fetchedAt: "2026-06-14T18:00:00+09:00",
});

const jmaBody = (levels = {}) => ({
  mapLevels: Object.fromEntries(REGIONS.map(([id]) => [id, levels[id] ?? "none"])),
  hourly: [],
});

async function openMocked(ctx, { forecast, jma }) {
  const page = await ctx.newPage();
  await page.route("**/api/weather-forecast", (route) =>
    route.fulfill({ json: forecast ?? forecastBody() })
  );
  await page.route("**/api/signage-weather**", (route) =>
    route.fulfill({ json: jma ?? jmaBody() })
  );
  await page.goto(`${BASE}/risk`, { waitUntil: "domcontentloaded" });
  // ストリップ（明日以降）が描画されるのを待つ
  await page.getByText("明日からの見通し").waitFor({ state: "visible", timeout: 15000 });
  return page;
}

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });

  // --- 1) 明日に警報相当（台風前日の本命）: 赤・地域数・ファーストビュー ---
  {
    // 明日(index1)に関東+近畿が警報、明後日(index2)に九州が注意報
    const page = await openMocked(ctx, {
      forecast: forecastBody({
        kanto: ["none", "warning", "none", "none"],
        kinki: ["none", "warning", "none", "none"],
        kyushu: ["none", "none", "advisory", "none"],
      }),
    });

    const heading = page.getByText("明日からの見通し");
    const hbox = await heading.boundingBox();
    ok("①見通しストリップがファーストビュー内(390×844)", hbox && hbox.y < 844, hbox ? `y=${Math.round(hbox.y)}` : "no box");

    // 明日セル（aria-labelで特定）
    const tomorrow = page.getByRole("button", { name: /^明日は警報相当/ });
    ok("②明日セルが警報相当（赤）で出る", await tomorrow.count() > 0);
    const tText = ((await tomorrow.first().textContent()) || "").replace(/\s+/g, "");
    // 2026-06-14: 「N地域」→ 該当地域名（関東・近畿）を直接表示する改修に追従。
    ok("②明日セル: デカ警報相当＋該当地域名", tText.includes("警報相当") && tText.includes("関東") && tText.includes("近畿"), tText);
    const tcls = (await tomorrow.first().getAttribute("class")) || "";
    ok("②明日セルが赤トーン(rose)で塗られている", tcls.includes("rose"), tcls.match(/rose-\d+/)?.[0] ?? "");

    // 明後日セル = 注意報（黄）
    const dayAfter = page.getByRole("button", { name: /^明後日は注意報相当/ });
    const dcls = (await dayAfter.first().getAttribute("class")) || "";
    ok("②明後日セルが注意報相当・黄(amber)", (await dayAfter.count()) > 0 && dcls.includes("amber"), dcls.match(/amber-\d+/)?.[0] ?? "");

    // 44px タップ標的
    const tbox = await tomorrow.first().boundingBox();
    ok("③ストリップのセルが44px以上のタップ標的", tbox && tbox.height >= 44, tbox ? `h=${Math.round(tbox.height)}` : "no box");

    // タップ → 1週間予報のその日へジャンプ（予報マップが出る）
    await tomorrow.first().click();
    await page.getByText("の予報マップ").first().waitFor({ state: "visible", timeout: 8000 });
    const weekTab = page.getByRole("button", { name: "1週間予報" });
    const weekCls = (await weekTab.getAttribute("class")) || "";
    ok("③明日セルのタップで1週間予報モードへ遷移", weekCls.includes("bg-white"), "active tab");

    // 今日の結論カードは独立して存在（ストリップは明日起点で二重表示しない）
    const card = page.getByRole("status");
    ok("④今日の結論カード(role=status)が別途存在", (await card.count()) > 0);
    await page.close();
  }

  // --- 2) 明日以降おおむね良好 = 緑 ---
  {
    const page = await openMocked(ctx, { forecast: forecastBody({}) });
    const tomorrow = page.getByRole("button", { name: /^明日は概ね良好/ });
    const cls = (await tomorrow.first().getAttribute("class")) || "";
    const txt = ((await tomorrow.first().textContent()) || "").replace(/\s+/g, "");
    ok("②良好時: 明日セルが緑(emerald)・「全国おおむね良好」", cls.includes("emerald") && txt.includes("概ね良好"), cls.match(/emerald-\d+/)?.[0] ?? "");
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
