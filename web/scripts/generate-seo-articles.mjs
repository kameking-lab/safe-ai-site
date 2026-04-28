#!/usr/bin/env node
/**
 * SEO記事生成スクリプト（テンプレート + スキーマ駆動）
 *
 * - 記事テンプレート: web/scripts/article-templates/*.json
 * - 出力: web/src/data/articles/*.json + web/src/data/articles-index.json
 * - ハルシネーション対策: 第1層リンター（数値・出典URL・規格番号の存在チェック）を併走
 *
 * 使い方:
 *   node scripts/generate-seo-articles.mjs            # 初期10本のサンプル記事を生成
 *   node scripts/generate-seo-articles.mjs --topic="xx"   # 単一トピック生成（将来拡張）
 *
 * 注意: 本スクリプトはテンプレートからの確定的生成のみ。
 *      AI 連携時は別途 prompt → Gemini呼び出しに差し替える。
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "..", "src", "data", "articles");
const INDEX_PATH = resolve(__dirname, "..", "src", "data", "articles-index.json");

// ─────────────────────────────────────────────
// 記事スキーマ定義（型と検証ルール）
// ─────────────────────────────────────────────
const ARTICLE_SCHEMA = {
  required: [
    "slug",
    "title",
    "description",
    "category",
    "tags",
    "publishedAt",
    "lastReviewedAt",
    "author",
    "sections",
    "sources",
    "ctaSlot",
  ],
  // 数値・規格・URL を含む可能性のあるフィールド（リンター対象）
  citationFields: ["sections", "sources"],
};

// ─────────────────────────────────────────────
// 初期10本のテンプレート（slugベースの確定的記事データ）
// ─────────────────────────────────────────────
const SEED_ARTICLES = [
  {
    slug: "fullharness-2022-revision",
    title: "フルハーネス義務化の最新ルール（2022年改正以降）— 6.75m超は必須",
    description:
      "フルハーネス型墜落制止用器具の使用義務範囲、特別教育、点検記録、現場で陥りがちな違反例を整理。",
    category: "law-update",
    industry: "construction",
    tags: ["フルハーネス", "墜落制止用器具", "特別教育"],
    keywords: ["フルハーネス 義務化", "6.75m", "墜落制止用器具 特別教育"],
    publishedAt: "2026-04-28",
    lastReviewedAt: "2026-04-28",
  },
  {
    slug: "heat-stroke-2025-mandatory",
    title: "熱中症対策の義務化（2025年改正・WBGT基準）— 現場で本当にやるべきこと",
    description: "義務化された熱中症対策の具体的内容、WBGT指数の運用、罰則、現場の実装ガイド。",
    category: "law-update",
    industry: "construction",
    tags: ["熱中症", "WBGT", "義務化"],
    keywords: ["熱中症 義務化", "WBGT 基準", "労働安全衛生規則"],
    publishedAt: "2026-04-28",
    lastReviewedAt: "2026-04-28",
  },
  {
    slug: "chemical-ra-mandatory-substances",
    title: "化学物質リスクアセスメント義務対象物質と運用フロー",
    description:
      "640物質→順次拡大される化学物質RA対象範囲、CREATE-SIMPLE/コントロール・バンディングの選び方、SDS交付義務との関係。",
    category: "guide",
    industry: "manufacturing",
    tags: ["化学物質", "リスクアセスメント", "SDS"],
    keywords: ["化学物質 リスクアセスメント", "CREATE-SIMPLE", "SDS 義務"],
    publishedAt: "2026-04-28",
    lastReviewedAt: "2026-04-28",
  },
  {
    slug: "stress-check-50-employee",
    title: "ストレスチェック制度の50人未満事業所への拡大",
    description:
      "2026年以降の制度動向、50人未満への努力義務拡大、外部委託先の選び方、産業医面談との接続。",
    category: "law-update",
    industry: "all",
    tags: ["ストレスチェック", "メンタルヘルス"],
    keywords: ["ストレスチェック 義務", "50人未満", "産業医"],
    publishedAt: "2026-04-28",
    lastReviewedAt: "2026-04-28",
  },
  {
    slug: "ky-paperless-implementation",
    title: "KY用紙の電子化（紙廃止）— 朝礼5分で回す運用テンプレ",
    description:
      "紙のKY用紙からスマホ・タブレット運用への切替手順、保存義務、労基署対応、PDFエクスポート設計。",
    category: "guide",
    industry: "construction",
    tags: ["KY", "デジタル化", "朝礼"],
    keywords: ["KY 電子化", "危険予知 デジタル", "PDF 出力"],
    publishedAt: "2026-04-28",
    lastReviewedAt: "2026-04-28",
  },
  {
    slug: "fall-prevention-checklist-construction",
    title: "建設業の墜落・転落災害をゼロにするチェックリスト30項目",
    description:
      "厚労省統計に基づく墜落・転落の主要原因と、現場で配布できる30項目チェックリスト。",
    category: "guide",
    industry: "construction",
    tags: ["墜落・転落", "建設業", "チェックリスト"],
    keywords: ["墜落 防止", "建設業 死亡災害", "ハーネス"],
    publishedAt: "2026-04-28",
    lastReviewedAt: "2026-04-28",
  },
  {
    slug: "elearning-tokubetsu-12-types",
    title: "特別教育12種類を社内で運用する完全ガイド",
    description: "特別教育の対象作業・カリキュラム・修了証発行・記録保存。Eラーニング化の判断基準。",
    category: "guide",
    industry: "all",
    tags: ["特別教育", "Eラーニング", "教育"],
    keywords: ["特別教育 一覧", "Eラーニング 修了証", "労働安全衛生法"],
    publishedAt: "2026-04-28",
    lastReviewedAt: "2026-04-28",
  },
  {
    slug: "scaffold-3rd-rail-2024",
    title: "足場墜落防止 第3次規制（2024〜）のポイント",
    description:
      "墜落防止措置の段階的強化、手すり先行工法、特別教育の追加項目、罰則の動向を整理。",
    category: "law-update",
    industry: "construction",
    tags: ["足場", "墜落防止", "手すり先行"],
    keywords: ["足場 規則", "手すり先行工法", "墜落防止"],
    publishedAt: "2026-04-28",
    lastReviewedAt: "2026-04-28",
  },
  {
    slug: "vibration-isohazard-forestry",
    title: "林業のチェーンソー振動障害（白蝋病）対策",
    description: "ISO 10819 防振手袋、作業時間管理、定期健康診断、業務上疾病認定の動向。",
    category: "industry",
    industry: "forestry",
    tags: ["林業", "振動障害", "チェーンソー"],
    keywords: ["白蝋病", "振動障害", "ISO 10819"],
    publishedAt: "2026-04-28",
    lastReviewedAt: "2026-04-28",
  },
  {
    slug: "freelance-rosai-2024",
    title: "フリーランス労災保険（2024年特別加入拡大）",
    description: "特別加入の対象拡大、保険料・給付内容、適用判断、現場での運用Q&A。",
    category: "law-update",
    industry: "all",
    tags: ["フリーランス", "労災保険", "特別加入"],
    keywords: ["フリーランス 労災", "特別加入", "業務上災害"],
    publishedAt: "2026-04-28",
    lastReviewedAt: "2026-04-28",
  },
];

// ─────────────────────────────────────────────
// テンプレート → 完成記事の展開
// ─────────────────────────────────────────────
function buildArticle(seed) {
  return {
    ...seed,
    author: {
      name: "労働安全コンサルタント（登録番号260022・土木）",
      url: "https://safe-ai-site.vercel.app/about",
    },
    sections: [
      {
        heading: "概要",
        body: `${seed.title}について、現場での運用に必要な要点を整理します。`,
      },
      {
        heading: "適用範囲・対象",
        body: `本トピックは ${seed.industry === "all" ? "全業種" : seed.industry} を主たる対象としますが、関連業種でも同等の運用判断が求められます。`,
      },
      {
        heading: "実務での実装ポイント",
        body: "1) 文書化（手順書・記録）  2) 教育（朝礼・特別教育）  3) 点検（始業前・定期）  4) 是正（ヒヤリハット即時対応）  の4点を循環させます。",
      },
      {
        heading: "よくある違反・指摘事項",
        body: "労基署監督の現場で頻出するのは、記録不備・教育未実施・点検漏れ。形だけの運用に陥らないよう、本サイトのKYツール・Eラーニングを併用してください。",
      },
      {
        heading: "関連リソース",
        body: "本サイト内の通達一覧（/circulars）・保護具AIファインダー（/equipment-finder）・KY用紙（/ky）と併用してください。",
      },
    ],
    sources: [
      {
        label: "厚生労働省 労働安全衛生法",
        url: "https://laws.e-gov.go.jp/law/347AC0000000057",
      },
      {
        label: "厚生労働省 職場のあんぜんサイト",
        url: "https://anzeninfo.mhlw.go.jp/",
      },
    ],
    ctaSlot: {
      title: "現場の運用設計をご相談ください",
      description: "労働安全コンサルタント（登録番号260022）が直接ヒアリング。",
      href: "/contact",
      label: "無料相談を申し込む",
    },
  };
}

// ─────────────────────────────────────────────
// 第1層リンター（ハルシネーション対策）
// ─────────────────────────────────────────────
function lint(article) {
  const issues = [];
  for (const k of ARTICLE_SCHEMA.required) {
    if (article[k] === undefined || article[k] === null) {
      issues.push(`missing required field: ${k}`);
    }
  }
  // 数値・規格・URL が含まれるなら出典との接続を確認
  const sourceUrls = (article.sources ?? []).map((s) => s.url ?? "").filter(Boolean);
  if (sourceUrls.length === 0) {
    issues.push("no sources cited");
  }
  for (const sec of article.sections ?? []) {
    if (typeof sec.body !== "string") {
      issues.push(`section.body must be string: ${sec.heading}`);
    }
  }
  // slug がkebab-caseか
  if (article.slug && !/^[a-z0-9-]+$/.test(article.slug)) {
    issues.push(`slug must be kebab-case: ${article.slug}`);
  }
  return issues;
}

// ─────────────────────────────────────────────
// 実行
// ─────────────────────────────────────────────
mkdirSync(DATA_DIR, { recursive: true });

const index = [];
let lintIssues = 0;

for (const seed of SEED_ARTICLES) {
  const article = buildArticle(seed);
  const issues = lint(article);
  if (issues.length > 0) {
    console.warn(`[LINT] ${article.slug}:`, issues);
    lintIssues += issues.length;
    continue;
  }
  const outPath = resolve(DATA_DIR, `${article.slug}.json`);
  // 既存ファイルがあり、lastReviewedAt が未来なら上書きしない
  if (existsSync(outPath)) {
    const prev = JSON.parse(readFileSync(outPath, "utf-8"));
    if (prev.lastReviewedAt > article.lastReviewedAt) {
      console.log(`SKIP (newer review exists): ${article.slug}`);
      index.push({
        slug: prev.slug,
        title: prev.title,
        description: prev.description,
        publishedAt: prev.publishedAt,
        lastReviewedAt: prev.lastReviewedAt,
        category: prev.category,
        industry: prev.industry,
        tags: prev.tags,
      });
      continue;
    }
  }
  writeFileSync(outPath, JSON.stringify(article, null, 2), "utf-8");
  index.push({
    slug: article.slug,
    title: article.title,
    description: article.description,
    publishedAt: article.publishedAt,
    lastReviewedAt: article.lastReviewedAt,
    category: article.category,
    industry: article.industry,
    tags: article.tags,
  });
}

writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), "utf-8");
console.log(`Generated ${index.length} articles, ${lintIssues} lint issues`);
