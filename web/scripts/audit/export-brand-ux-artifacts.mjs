import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURE_PORTFOLIO } from "../../src/config/feature-portfolio.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(HERE, "../..");
const REPO_ROOT = path.resolve(WEB_ROOT, "..");
const AUDIT_ROOT = path.join(REPO_ROOT, "docs", "audits");
const EVIDENCE_ROOT = path.join(
  AUDIT_ROOT,
  "evidence",
  "brand-ux-feature-restructure-2026-07-30",
);

const before = JSON.parse(
  await readFile(path.join(EVIDENCE_ROOT, "before", "browser-audit.json"), "utf8"),
);
const after = JSON.parse(
  await readFile(
    path.join(EVIDENCE_ROOT, "after-local", "browser-audit.json"),
    "utf8",
  ),
);

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(rows) {
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function median(values) {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function viewportMap(report, viewport = "390x844") {
  return new Map(
    report.viewportResults
      .filter((item) => item.viewport === viewport)
      .map((item) => [item.slug, item]),
  );
}

const before390 = viewportMap(before);
const after390 = viewportMap(after);

const primary14 = new Set([
  "home",
  "risk",
  "heat-hub",
  "chatbot",
  "chemical-ra",
  "whats-new",
  "laws",
  "law-search",
  "accident-news",
  "accidents",
  "ky-paper",
  "safety-diary",
  "visual-ky",
  "qualifications",
]);

const featureRows = [
  [
    "feature",
    "route",
    "current role",
    "proposed tier",
    "reason",
    "user value",
    "data source",
    "AI/API integration",
    "operational readiness",
    "SEO value",
    "safety risk",
    "nav placement",
    "indexability",
    "redirect/canonical",
    "automation sample potential",
    "action",
    "acceptance criteria",
  ],
  ...FEATURE_PORTFOLIO.map((feature) => [
    feature.label,
    [feature.route, ...(feature.relatedRoutes ?? [])].join(" | "),
    feature.currentRole,
    `Tier ${feature.tier}`,
    feature.reason,
    feature.userValue,
    feature.dataSource,
    feature.aiApiIntegration,
    `${feature.operationalStatus}: ${feature.operationalReadiness}`,
    feature.seoValue,
    feature.safetyRisk,
    feature.navPlacement,
    feature.indexability,
    feature.redirectCanonical,
    feature.automationSamplePotential,
    feature.action,
    feature.acceptanceCriteria,
  ]),
];

await writeFile(
  path.join(AUDIT_ROOT, "feature-portfolio-tiering-2026-07-30.csv"),
  csv(featureRows),
  "utf8",
);

const densityRows = [
  [
    "selected_major_14",
    "slug",
    "route",
    "before_h1",
    "after_h1",
    "before_first_view_characters",
    "after_first_view_characters",
    "reduction_percent",
    "before_paragraphs",
    "after_paragraphs",
    "before_cta",
    "after_cta",
    "before_colors",
    "after_colors",
    "before_gradients",
    "after_gradients",
    "before_scroll_screens",
    "after_scroll_screens",
    "after_mascot_count",
    "after_horizontal_overflow",
  ],
];

const densityRecords = [];
for (const route of after.routes) {
  const beforeItem = before390.get(route.slug);
  const afterItem = after390.get(route.slug);
  if (!afterItem) continue;
  const beforeIsComparable =
    beforeItem &&
    !(
      route.slug === "automation-examples" &&
      beforeItem.h1?.includes("ページが見つかりません")
    );
  const reduction =
    beforeIsComparable && beforeItem.firstViewCharacters > 0
      ? ((beforeItem.firstViewCharacters - afterItem.firstViewCharacters) /
          beforeItem.firstViewCharacters) *
        100
      : null;
  densityRecords.push({
    slug: route.slug,
    routePath: route.routePath,
    selected: primary14.has(route.slug),
    before: beforeIsComparable ? beforeItem : null,
    after: afterItem,
    reduction,
  });
  densityRows.push([
    primary14.has(route.slug) ? "yes" : "no",
    route.slug,
    route.routePath,
    beforeIsComparable ? beforeItem.h1?.join(" | ") : "new route",
    afterItem.h1?.join(" | "),
    beforeIsComparable ? beforeItem.firstViewCharacters : "",
    afterItem.firstViewCharacters,
    reduction == null ? "new route" : reduction.toFixed(1),
    beforeIsComparable ? beforeItem.firstViewParagraphCount : "",
    afterItem.firstViewParagraphCount,
    beforeIsComparable ? beforeItem.firstViewCtaCount : "",
    afterItem.firstViewCtaCount,
    beforeIsComparable ? beforeItem.colorCount : "",
    afterItem.colorCount,
    beforeIsComparable ? beforeItem.gradientCount : "",
    afterItem.gradientCount,
    beforeIsComparable ? beforeItem.scrollScreens : "",
    afterItem.scrollScreens,
    afterItem.mascotCount,
    afterItem.horizontalOverflow ? "yes" : "no",
  ]);
}

await writeFile(
  path.join(AUDIT_ROOT, "content-density-audit-2026-07-30.csv"),
  csv(densityRows),
  "utf8",
);

const navigationTasks = [
  ["今日の安全を確認", "全ページ", "/risk", "Tier 1", 2, 1, 2, 2, "PC一次ナビ「今日の安全」"],
  ["熱中症対策を確認", "全ページ", "/heat-illness-prevention", "Tier 1 / 季節重点", 1, 1, 1, 1, "ホーム先頭・モバイル「熱中症」"],
  ["安衛法AIへ質問", "全ページ", "/chatbot", "Tier 1", 2, 1, 2, 1, "PC一次ナビ・モバイル「法令AI」"],
  ["化学物質RAを開始", "全ページ", "/chemical-ra", "Tier 1", 2, 1, 2, 2, "PC一次ナビ「化学物質」"],
  ["事故・法改正の新着", "全ページ", "/whats-new", "Tier 1", 2, 1, 3, 2, "PC一次ナビ「事故・法改正」"],
  ["死亡災害事例を検索", "ホーム", "/accident-news", "Tier 1", 2, 1, 3, 1, "ホーム主力カード"],
  ["法令条文を検索", "全ページ", "/law-search", "Tier 1", 2, 2, 3, 2, "法令AIメニュー内"],
  ["教育・資格を確認", "全ページ", "/education-certification", "Tier 1", 2, 1, 2, 1, "PC一次ナビ・モバイル「学ぶ」"],
  ["Visual KYTを開始", "全ページ", "/training/visual-ky", "Tier 1", 2, 1, 3, 2, "PC一次ナビ「KYT・実務」"],
  ["KY用紙を作成", "全ページ", "/ky/paper", "Tier 2", 1, 2, 2, 2, "KYT・実務メニュー内"],
  ["工程打合せ書を作成", "全ページ", "/safety-diary", "Tier 2", 3, 2, 3, 2, "KYT・実務メニュー内"],
  ["資格Finderを使う", "全ページ", "/education-certification/finder", "Tier 2", 2, 2, 3, 2, "学ぶ・資格から"],
  ["Safety Labsを見る", "全ページ", "/automation-examples", "Tier 3", 4, 2, 4, 2, "Safety Labsメニュー・ホーム"],
  ["自動化相談の状態確認", "全ページ", "/services/automation", "受注導線", 1, 1, 2, 2, "PC一次ナビ・モバイルメニュー強調"],
  ["全機能を見る", "全ページ", "/features", "全Tier", 2, 1, 1, 1, "メニュー・検索"],
  ["横断検索", "全ページ", "/search", "横断導線", 1, 1, 2, 1, "PCヘッダー・モバイルメニュー"],
];

await writeFile(
  path.join(AUDIT_ROOT, "navigation-task-audit-2026-07-30.csv"),
  csv([
    [
      "task",
      "origin",
      "destination",
      "tier",
      "desktop_clicks_before",
      "desktop_clicks_after",
      "mobile_clicks_before",
      "mobile_clicks_after",
      "after_evidence",
      "acceptance",
    ],
    ...navigationTasks.map((row) => [...row, Number(row[5]) <= 2 && Number(row[7]) <= 2 ? "PASS" : "REVIEW"]),
  ]),
  "utf8",
);

function luminance(hex) {
  const channels = hex
    .replace("#", "")
    .match(/.{2}/g)
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(a, b) {
  const high = Math.max(luminance(a), luminance(b));
  const low = Math.min(luminance(a), luminance(b));
  return ((high + 0.05) / (low + 0.05)).toFixed(2);
}

const colors = [
  ["background", "--background", "#f7f8f6", "#0b1726", "生成りの全体背景", "#132238", "#f7f8f6"],
  ["surface", "--surface", "#ffffff", "#132238", "本文・カード面", "#132238", "#ffffff"],
  ["surface emphasis", "--surface-emphasis", "#edf6f2", "#12352f", "選択・案内面", "#132238", "#edf6f2"],
  ["text", "--foreground", "#132238", "#f7fbff", "本文", "#132238", "#ffffff"],
  ["muted", "--muted", "#526173", "#b7c3cf", "補助本文", "#526173", "#ffffff"],
  ["border", "--border", "#d7dfdc", "#34465a", "境界線", "", ""],
  ["primary", "--primary", "#0b5d4b", "#65d6b4", "ブランド・主CTA", "#0b5d4b", "#ffffff"],
  ["primary hover", "--primary-hover", "#08483b", "#8be3c8", "主CTA hover", "#08483b", "#ffffff"],
  ["secondary", "--secondary", "#142d4c", "#b8cee8", "見出し・深い面", "#142d4c", "#ffffff"],
  ["accent warm", "--accent", "#f59e0b", "#fbbf24", "チワワ・季節重点", "#132238", "#f59e0b"],
  ["accent cool", "--accent-cool", "#0891b2", "#67e8f9", "データ・補助強調", "#132238", "#67e8f9"],
  ["accent cool on dark", "--accent-cool-on-dark", "#a5f3fc", "#a5f3fc", "濃色面の補助強調", "#a5f3fc", "#203755"],
  ["success", "--success", "#087a55", "#6ee7b7", "完了・確認済み", "#087a55", "#ffffff"],
  ["success solid", "--success-solid", "#087a55", "#087a55", "白文字を載せる完了・選択面", "#ffffff", "#087a55"],
  ["caution", "--caution", "#a84f08", "#fbbf24", "要確認・注意", "#a84f08", "#ffffff"],
  ["caution solid", "--caution-solid", "#a84f08", "#a84f08", "白文字を載せる要確認・選択面", "#ffffff", "#a84f08"],
  ["danger", "--danger", "#b42318", "#fda29b", "危険・緊急", "#b42318", "#ffffff"],
  ["info", "--info", "#075985", "#7dd3fc", "情報", "#075985", "#ffffff"],
  ["AI", "--ai", "#6d28d9", "#c4b5fd", "AI・自動化", "#6d28d9", "#ffffff"],
  ["official", "--official", "#1d4ed8", "#93c5fd", "公式情報", "#1d4ed8", "#ffffff"],
  ["synthetic", "--synthetic", "#795548", "#d7b6a4", "合成・モック", "#795548", "#ffffff"],
  ["stale", "--stale", "#667085", "#cbd5e1", "更新期限超過", "#667085", "#ffffff"],
  ["offline", "--offline", "#475467", "#b8c4d4", "取得不能", "#475467", "#ffffff"],
  ["pending", "--pending", "#9a6700", "#fde68a", "確認待ち", "#9a6700", "#ffffff"],
];

await writeFile(
  path.join(AUDIT_ROOT, "color-token-audit-2026-07-30.csv"),
  csv([
    [
      "role",
      "css_variable",
      "light",
      "dark",
      "usage",
      "tested_foreground",
      "tested_background",
      "contrast_ratio",
      "rule",
    ],
    ...colors.map(([role, variable, light, dark, usage, foreground, background]) => [
      role,
      variable,
      light,
      dark,
      usage,
      foreground,
      background,
      foreground && background ? contrast(foreground, background) : "n/a",
      role === "border"
        ? "意味を色だけで伝えず、文字・アイコン・状態ラベルを併用"
        : "主要コンポーネントはトークン経由。任意色の追加は禁止",
    ]),
  ]),
  "utf8",
);

const comparable = densityRecords.filter((record) => record.before);
const selected = comparable.filter((record) => record.selected);
const beforeComparable = comparable.map((record) => record.before);
const afterComparable = comparable.map((record) => record.after);
const selectedReductionMedian = median(selected.map((record) => record.reduction));

const metricsSummary = {
  schemaVersion: 1,
  measuredAt: after.completedAt,
  viewport: "390x844",
  methodology: {
    firstView:
      "main内でviewportと交差する見出し・段落・リスト・label・summary。固定モバイルナビは除外。",
    zoom:
      "1280px基準の200%/400%ブラウザーズーム等価幅（640px/320px）でreflowを確認。",
  },
  comparableRouteCount: comparable.length,
  selectedMajor14: [...primary14],
  selectedMajor14ReductionMedianPercent: Number(
    selectedReductionMedian?.toFixed(1),
  ),
  allComparable: {
    beforeFirstViewCharactersMedian: median(
      beforeComparable.map((item) => item.firstViewCharacters),
    ),
    afterFirstViewCharactersMedian: median(
      afterComparable.map((item) => item.firstViewCharacters),
    ),
    beforeCtaMedian: median(beforeComparable.map((item) => item.firstViewCtaCount)),
    afterCtaMedian: median(afterComparable.map((item) => item.firstViewCtaCount)),
    beforeColorCountMedian: median(beforeComparable.map((item) => item.colorCount)),
    afterColorCountMedian: median(afterComparable.map((item) => item.colorCount)),
    beforeGradientCountMedian: median(
      beforeComparable.map((item) => item.gradientCount),
    ),
    afterGradientCountMedian: median(
      afterComparable.map((item) => item.gradientCount),
    ),
    afterHorizontalOverflowCount: afterComparable.filter(
      (item) => item.horizontalOverflow,
    ).length,
    afterBrokenImageCount: afterComparable.reduce(
      (total, item) => total + item.brokenImageCount,
      0,
    ),
  },
  tiers: Object.fromEntries(
    [1, 2, 3, 4].map((tier) => [
      `tier${tier}`,
      FEATURE_PORTFOLIO.filter((feature) => feature.tier === tier).length,
    ]),
  ),
};

await writeFile(
  path.join(EVIDENCE_ROOT, "metrics-summary.json"),
  `${JSON.stringify(metricsSummary, null, 2)}\n`,
  "utf8",
);

process.stdout.write(`${JSON.stringify(metricsSummary, null, 2)}\n`);
