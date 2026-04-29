#!/usr/bin/env node
/**
 * 機能紹介ページ用スクリーンショット自動撮影スクリプト
 *
 * 実行方法:
 *   npm run capture                 # Playwrightで本番URLを巡回
 *   npm run capture -- --placeholder # SVGプレースホルダーのみ生成
 *
 * 出力:
 *   web/public/screenshots/<feature>-desktop.png
 *   web/public/screenshots/<feature>-mobile.png
 *
 * 注意:
 *   - Playwrightが入っていない/起動できない環境では SVG プレースホルダーで代替する
 *   - 本番URLは https://safe-ai-site.vercel.app
 */

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

// npm run capture はweb/から実行されるのでCWDから解決する
const cwdRequire = createRequire(path.join(process.cwd(), "package.json"));
const OUT_DIR = path.join(ROOT, "web", "public", "screenshots");

const BASE_URL = process.env.SCREENSHOT_BASE_URL || "https://safe-ai-site.vercel.app";

/** @typedef {{ slug: string, path: string, label: string, color: string }} Target */

/** @type {Target[]} */
const TARGETS = [
  { slug: "home", path: "/", label: "ホーム", color: "#10b981" },
  { slug: "chatbot", path: "/chatbot", label: "安衛法チャットボット", color: "#3b82f6" },
  { slug: "chemical-ra", path: "/chemical-ra", label: "化学物質リスクアセスメント", color: "#8b5cf6" },
  { slug: "ky", path: "/ky", label: "KY用紙", color: "#f59e0b" },
  { slug: "equipment-finder", path: "/goods", label: "安全グッズ・装備検索", color: "#ef4444" },
  { slug: "resources", path: "/resources", label: "資料ライブラリ", color: "#0ea5e9" },
  { slug: "accidents", path: "/accidents", label: "事故データベース", color: "#dc2626" },
  { slug: "chemical-database", path: "/chemical-database", label: "化学物質検索DB", color: "#7c3aed" },
  { slug: "law-search", path: "/law-search", label: "法令検索", color: "#0891b2" },
  { slug: "circulars", path: "/laws", label: "通達・法改正", color: "#0284c7" },
  { slug: "education", path: "/education", label: "特別教育", color: "#16a34a" },
  { slug: "exam-quiz", path: "/exam-quiz", label: "資格試験過去問", color: "#65a30d" },
  { slug: "wizard", path: "/wizard", label: "コンプラ診断", color: "#ca8a04" },
  { slug: "subsidies-calculator", path: "/subsidies/calculator", label: "助成金シミュレーター", color: "#059669" },
  { slug: "signage", path: "/signage", label: "サイネージ", color: "#1f2937" },
  { slug: "quick", path: "/quick", label: "クイックアクセス", color: "#0d9488" },
  { slug: "community-cases", path: "/cases", label: "導入事例・利用者の声", color: "#db2777" },
  { slug: "qa-knowledge", path: "/glossary", label: "安全用語辞書", color: "#7e22ce" },
  { slug: "stats", path: "/about", label: "サイト統計", color: "#475569" },
  { slug: "about-cases", path: "/cases", label: "導入事例", color: "#be185d" },
  { slug: "e-learning", path: "/e-learning", label: "Eラーニング", color: "#15803d" },
  { slug: "risk-prediction", path: "/risk-prediction", label: "AIリスク予測", color: "#7c2d12" },
  { slug: "safety-diary", path: "/safety-diary", label: "安全衛生日誌", color: "#1e40af" },
  { slug: "lms", path: "/lms", label: "LMS（多拠点管理）", color: "#9333ea" },
  { slug: "consulting", path: "/consulting", label: "月額顧問", color: "#0f766e" },
  { slug: "services", path: "/services", label: "受託業務", color: "#374151" },
];

const VIEWPORTS = /** @type {const} */ ([
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 375, height: 667 },
]);

/**
 * SVGプレースホルダーを生成して保存（PNG拡張子だがSVGコンテンツ）
 * Playwright未導入環境でのフォールバック。本番ではPlaywright結果が上書きする。
 */
async function writePlaceholder(target, viewport) {
  const filename = `${target.slug}-${viewport.name}.svg`;
  const filePath = path.join(OUT_DIR, filename);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${viewport.width}" height="${viewport.height}" viewBox="0 0 ${viewport.width} ${viewport.height}">
  <defs>
    <linearGradient id="g${target.slug}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${target.color}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${target.color}" stop-opacity="0.05"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="#f8fafc"/>
  <rect width="100%" height="100%" fill="url(#g${target.slug})"/>
  <rect x="20" y="20" width="${viewport.width - 40}" height="64" rx="12" fill="${target.color}" opacity="0.85"/>
  <text x="${viewport.width / 2}" y="62" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI','Hiragino Sans',sans-serif" font-size="22" font-weight="700" fill="white" text-anchor="middle">ANZEN AI</text>
  <text x="${viewport.width / 2}" y="${viewport.height / 2 - 30}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI','Hiragino Sans',sans-serif" font-size="${viewport.name === "mobile" ? 22 : 36}" font-weight="700" fill="${target.color}" text-anchor="middle">${escapeXml(target.label)}</text>
  <text x="${viewport.width / 2}" y="${viewport.height / 2 + 10}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI','Hiragino Sans',sans-serif" font-size="${viewport.name === "mobile" ? 13 : 18}" fill="#475569" text-anchor="middle">${target.path}</text>
  <text x="${viewport.width / 2}" y="${viewport.height - 40}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI','Hiragino Sans',sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">プレビュー画像（${viewport.name === "mobile" ? "375×667" : "1280×800"}）</text>
</svg>`;
  await writeFile(filePath, svg, "utf8");
  return filename;
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  })[c] || c);
}

async function tryPlaywright() {
  // npm run capture は web/ から実行されるので CWD の node_modules から playwright を解決
  const candidates = [];
  try {
    candidates.push(pathToFileURL(cwdRequire.resolve("playwright")).href);
  } catch {
    // フォールバック
  }
  candidates.push("playwright");

  for (const spec of candidates) {
    try {
      const mod = await import(spec);
      // CJSモジュールをESM dynamic importすると mod.default に入る場合がある
      const resolved = mod.default ?? mod;
      if (resolved.chromium) return resolved;
    } catch {
      // next
    }
  }
  return null;
}

async function captureWithPlaywright(playwright) {
  const browser = await playwright.chromium.launch();
  try {
    for (const target of TARGETS) {
      for (const viewport of VIEWPORTS) {
        const ctx = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          userAgent:
            viewport.name === "mobile"
              ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
              : undefined,
          deviceScaleFactor: 2,
        });
        const page = await ctx.newPage();
        const url = `${BASE_URL}${target.path}`;
        try {
          await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
          await page.waitForTimeout(800);
          const filename = `${target.slug}-${viewport.name}.png`;
          await page.screenshot({
            path: path.join(OUT_DIR, filename),
            fullPage: false,
          });
          console.log(`✔ ${filename}`);
        } catch (err) {
          console.warn(`✘ ${target.slug}-${viewport.name}: ${err.message} → プレースホルダーで代替`);
          await writePlaceholder(target, viewport);
        } finally {
          await ctx.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  if (!existsSync(OUT_DIR)) {
    await mkdir(OUT_DIR, { recursive: true });
  }

  const forcePlaceholder = process.argv.includes("--placeholder");
  const playwright = forcePlaceholder ? null : await tryPlaywright();

  if (playwright) {
    console.log(`🎬 Playwrightで ${BASE_URL} を撮影します（${TARGETS.length}ページ × ${VIEWPORTS.length}解像度）`);
    await captureWithPlaywright(playwright);
  } else {
    console.log(
      forcePlaceholder
        ? "🎨 --placeholder 指定 → SVGプレースホルダーを生成します"
        : "⚠ playwright未導入 → SVGプレースホルダーを生成します（本番でnpm i playwright後に再実行してください）",
    );
    for (const target of TARGETS) {
      for (const viewport of VIEWPORTS) {
        const filename = await writePlaceholder(target, viewport);
        console.log(`✔ ${filename}`);
      }
    }
  }

  // メタデータJSONを書き出し（features ページから読み込み可能にする）
  const meta = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    targets: TARGETS.map((t) => ({
      slug: t.slug,
      path: t.path,
      label: t.label,
    })),
  };
  await writeFile(path.join(OUT_DIR, "manifest.json"), JSON.stringify(meta, null, 2), "utf8");
  console.log(`✓ manifest.json を生成 → ${TARGETS.length}件`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
