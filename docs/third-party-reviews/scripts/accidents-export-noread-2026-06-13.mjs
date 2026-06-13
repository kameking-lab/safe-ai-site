// 無読テスト: 柱C-7 事故統計の出力手段（CSV/要点コピー/共有/印刷）
// 対象: /accidents-analytics ・ /accidents-reports
// ペルソナ=「月例安全会議の資料に統計を貼りたい元請の安全担当」。本文を読まず3秒で
// 「この数字を資料に持ち出す手段がある／次に押すボタンはどれか」が分かるか機械検証。
// 実行: prod server(npm run build && npm run start)→ node docs/third-party-reviews/scripts/accidents-export-noread-2026-06-13.mjs
// 既知事象(memory): devサーバーはハングするのでprod serverで実行。PWAのSWがroute握るためserviceWorkers:"block"。
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const results = [];
function check(name, cond, detail = "") {
  results.push({ name, ok: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 12相当
  serviceWorkers: "block",
});
const page = await context.newPage();

// 出力ツールバー（DataExportToolbar）の検査。aria-label で特定。
async function inspectToolbar(p) {
  const bar = p.locator('[aria-label="この集計データの出力"]').first();
  if ((await bar.count()) === 0) return null;
  const box = await bar.boundingBox();
  const csv = bar.getByRole("button", { name: "CSVダウンロード" });
  const copy = bar.getByRole("button", { name: "要点をコピー" });
  const share = bar.getByRole("button", { name: "共有" });
  const print = bar.getByRole("button", { name: "印刷" });
  const minTap = async (loc) => {
    if ((await loc.count()) === 0) return 0;
    const b = await loc.first().boundingBox();
    return b ? Math.round(b.height) : 0;
  };
  return {
    box,
    hasCsv: (await csv.count()) > 0,
    hasCopy: (await copy.count()) > 0,
    hasShare: (await share.count()) > 0,
    hasPrint: (await print.count()) > 0,
    csvTap: await minTap(csv),
  };
}

// ---- 1) /accidents-analytics ----
await page.goto(`${BASE}/accidents-analytics`, { waitUntil: "networkidle" });
{
  const t = await inspectToolbar(page);
  check("analytics: 出力ツールバーが存在", !!t);
  check("analytics: CSV/コピー/共有/印刷の4手段が揃う", t && t.hasCsv && t.hasCopy && t.hasShare && t.hasPrint,
    t ? `csv=${t.hasCsv} copy=${t.hasCopy} share=${t.hasShare} print=${t.hasPrint}` : "なし");
  check("analytics: ツールバーがファーストビュー内(y<844)", t && t.box && t.box.y < 844, t?.box ? `y=${Math.round(t.box.y)}` : "—");
  check("analytics: ボタンのタップ高さ44px以上", t && t.csvTap >= 44, t ? `${t.csvTap}px` : "—");
}

// ---- 2) /accidents-reports ----
await page.goto(`${BASE}/accidents-reports`, { waitUntil: "networkidle" });
{
  const t = await inspectToolbar(page);
  check("reports: 出力ツールバーが存在", !!t);
  check("reports: CSV/コピー/共有/印刷の4手段が揃う", t && t.hasCsv && t.hasCopy && t.hasShare && t.hasPrint,
    t ? `csv=${t.hasCsv} copy=${t.hasCopy} share=${t.hasShare} print=${t.hasPrint}` : "なし");
  check("reports: ツールバーがファーストビュー内(y<844)", t && t.box && t.box.y < 844, t?.box ? `y=${Math.round(t.box.y)}` : "—");
  check("reports: ボタンのタップ高さ44px以上", t && t.csvTap >= 44, t ? `${t.csvTap}px` : "—");
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
if (failed.length) {
  console.error("FAILED:", failed.map((f) => f.name).join(", "));
  process.exit(1);
}
