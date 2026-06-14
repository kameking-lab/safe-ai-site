/**
 * 無読テスト（柱3 リスクマップ /risk・見通しストリップの「該当地域名」表示・2026-06-14）
 *
 * ペルソナ: 「台風前日の元請安全担当・段落を絶対に読まない」
 *   - 自分の現場は特定地域（例: 九州）。明日その地域が荒れるかを3秒で知りたい。
 *   - 従来ストリップは「N地域」と件数だけで、どこかは1週間予報を開いて地図を見ないと分からなかった。
 *
 * 本改修: ストリップのセルに最悪レベル該当の地域名（九州・四国 等）を直接表示。
 *   地域名は予報データ（regions[].regionLabel）そのまま＝捏造なし。
 *
 * 判定:
 *   ① 明日が警報相当の日、セル本文に該当地域名（九州・四国）が出る（件数だけでない）
 *   ② 注意報のみの日は注意報該当地域名が出る
 *   ③ 3地域以上は「先頭2件＋他N」に省略して1行に収まる
 *   ④ 地域名は aria-label にも含まれ、読み上げユーザーも地域を取得できる
 *   ⑤ おおむね良好の日は「全国おおむね良好」（地域名は出さない）
 *
 * 実行: cp docs/third-party-reviews/scripts/risk-outlook-region-names-noread-2026-06-14.mjs web/tmp-rn.mjs
 *       cd web && BASE_URL=http://localhost:3100 node tmp-rn.mjs && rm tmp-rn.mjs
 * 前提: prod server 起動済み（own server -p 3100・domcontentloaded で待つ）
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

const forecastBody = (perRegion = {}) => ({
  regions: REGIONS.map(([regionId, regionLabel]) => ({
    regionId,
    regionLabel,
    days: DATES.map((d, i) => dayObj((perRegion[regionId] || [])[i] ?? "none", d)),
  })),
  fetchedAt: "2026-06-14T18:00:00+09:00",
});

const jmaBody = () => ({
  mapLevels: Object.fromEntries(REGIONS.map(([id]) => [id, "none"])),
  hourly: [],
});

async function openMocked(ctx, forecast) {
  const page = await ctx.newPage();
  await page.route("**/api/weather-forecast", (route) => route.fulfill({ json: forecast }));
  await page.route("**/api/signage-weather**", (route) => route.fulfill({ json: jmaBody() }));
  await page.goto(`${BASE}/risk`, { waitUntil: "domcontentloaded" });
  await page.getByText("明日からの見通し").waitFor({ state: "visible", timeout: 15000 });
  return page;
}

const main = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });

  // --- 1) 明日に警報2地域（九州・四国）: 地域名が本文に出る ---
  {
    const page = await openMocked(
      ctx,
      forecastBody({
        kyushu: ["none", "warning", "none", "none"],
        shikoku: ["none", "warning", "none", "none"],
        kanto: ["none", "advisory", "none", "none"], // 最悪=警報なので地域名には混ぜない
      })
    );
    const tomorrow = page.getByRole("button", { name: /^明日は警報相当/ });
    const txt = ((await tomorrow.first().textContent()) || "").replace(/\s+/g, "");
    ok("①明日セルに該当地域名（四国・九州）が出る", txt.includes("四国") && txt.includes("九州"), txt);
    ok("①件数のみ表示『2地域』ではない", !txt.includes("2地域"), txt);
    ok("①注意報地域(関東)は警報日の地域名に混ざらない", !txt.includes("関東"), txt);
    const aria = (await tomorrow.first().getAttribute("aria-label")) || "";
    ok("④aria-labelに地域名が含まれる", aria.includes("四国") && aria.includes("九州"), aria);
    await page.close();
  }

  // --- 2) 注意報のみ（近畿）: 注意報地域名 ---
  {
    const page = await openMocked(ctx, forecastBody({ kinki: ["none", "advisory", "none", "none"] }));
    const tomorrow = page.getByRole("button", { name: /^明日は注意報相当/ });
    const txt = ((await tomorrow.first().textContent()) || "").replace(/\s+/g, "");
    ok("②注意報のみの日は注意報該当地域名（近畿）", txt.includes("注意報相当") && txt.includes("近畿"), txt);
    await page.close();
  }

  // --- 3) 警報3地域以上: 先頭2件＋他N に省略 ---
  {
    const page = await openMocked(
      ctx,
      forecastBody({
        kanto: ["none", "warning", "none", "none"],
        chubu: ["none", "warning", "none", "none"],
        kinki: ["none", "warning", "none", "none"],
        kyushu: ["none", "warning", "none", "none"],
      })
    );
    const tomorrow = page.getByRole("button", { name: /^明日は警報相当/ });
    const txt = ((await tomorrow.first().textContent()) || "").replace(/\s+/g, "");
    ok("③3地域以上は『他N』に省略して1行に収める", txt.includes("他2"), txt);
    await page.close();
  }

  // --- 4) おおむね良好: 地域名は出さない ---
  {
    const page = await openMocked(ctx, forecastBody({}));
    const tomorrow = page.getByRole("button", { name: /^明日は概ね良好/ });
    const txt = ((await tomorrow.first().textContent()) || "").replace(/\s+/g, "");
    ok("⑤良好日は『全国おおむね良好』（地域名なし）", txt.includes("全国おおむね良好"), txt);
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
