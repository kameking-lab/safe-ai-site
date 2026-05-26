// Phase B 実機検証: /ky/morning を 3 ビューポートで実測（捏造防止のため実スクショ取得）。
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = "../docs/signage-deep-audit-2026-05-25/screenshots";
mkdirSync(OUT, { recursive: true });

const BASE = process.env.AUDIT_BASE || "https://www.anzen-ai-portal.jp";
const kyRecord = {
  workDateYear: "2026", workDateMonth: "5", workDateDay: "26", weather: "晴れ",
  workRows: [{ workDetail: "3階スラブ配筋・型枠建込み", workPlace: "A棟 3階東側" }],
  riskRows: [
    { hazard: "配筋上の歩行で足を踏み外し転倒・墜落", reduction: "歩行用足場板を敷設、開口部は先行手すり・養生" },
    { hazard: "鉄筋端部での目・手の負傷", reduction: "端部キャップ取付、保護メガネ・手袋着用" },
    { hazard: "揚重時の吊り荷下への立入による激突・下敷き", reduction: "立入禁止区画設定、合図者を専任配置" },
  ],
  teamGoal: "開口部・端部 本日ゼロ災害",
  pointingCall: "足元ヨシ！ 頭上ヨシ！",
};

const viewports = [
  { name: "smartphone-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "largescreen-1920", width: 1920, height: 1080 },
];

const browser = await chromium.launch();
const results = [];
for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  // localStorage に ky-record を仕込んでから本番ページを開く
  await page.addInitScript((rec) => {
    try { localStorage.setItem("ky-record", JSON.stringify(rec)); } catch {}
  }, kyRecord);
  await page.goto(`${BASE}/ky/morning`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${vp.name}.png`, fullPage: true });

  // 実測: 主要見出しのフォントサイズ、コンテンツ幅、横スクロール有無
  const metrics = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { fontSize: cs.fontSize, width: Math.round(r.width), text: (el.textContent || "").slice(0, 30) };
    };
    const main = document.querySelector("main");
    const contentBox = main?.querySelector("div");
    return {
      docWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      hasHScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
      contentWidth: contentBox ? Math.round(contentBox.getBoundingClientRect().width) : null,
      mainWorkHeading: pick("section p.text-3xl, section p.text-5xl"),
      bodyBg: getComputedStyle(document.body).backgroundColor,
    };
  });
  results.push({ viewport: vp.name, ...metrics });
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
