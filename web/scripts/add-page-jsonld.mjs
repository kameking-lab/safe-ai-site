#!/usr/bin/env node
// 40+ top-level pages に PageJsonLd を一括追加するスクリプト。
// 各 page.tsx について:
//   1. metadata の title / description / canonical を抽出
//   2. import 文を追加
//   3. デフォルト export 関数の return 直後に <PageJsonLd ... /> を挿入

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const TARGETS = [
  "src/app/(main)/account/page.tsx",
  "src/app/(main)/api-docs/page.tsx",
  "src/app/(main)/articles/page.tsx",
  "src/app/(main)/bcp/page.tsx",
  "src/app/(main)/bear-map/page.tsx",
  "src/app/(main)/chatbot/page.tsx",
  "src/app/(main)/chemical-database/page.tsx",
  "src/app/(main)/chemical-ra/page.tsx",
  "src/app/(main)/circulars/page.tsx",
  "src/app/(main)/community-cases/page.tsx",
  "src/app/(main)/contact/page.tsx",
  "src/app/(main)/diversity/page.tsx",
  "src/app/(main)/dpa/page.tsx",
  "src/app/(main)/education/page.tsx",
  "src/app/(main)/equipment-finder/page.tsx",
  "src/app/(main)/exam-quiz/page.tsx",
  "src/app/(main)/features/page.tsx",
  "src/app/(main)/feedback/page.tsx",
  "src/app/(main)/glossary/page.tsx",
  "src/app/(main)/goods/page.tsx",
  "src/app/(main)/handover/page.tsx",
  "src/app/(main)/insurance/page.tsx",
  "src/app/(main)/law-search/page.tsx",
  "src/app/(main)/leaflet/page.tsx",
  "src/app/(main)/lms/page.tsx",
  "src/app/(main)/mental-health/page.tsx",
  "src/app/(main)/newsletter/page.tsx",
  "src/app/(main)/notifications/page.tsx",
  "src/app/(main)/organization/page.tsx",
  "src/app/(main)/partnership/page.tsx",
  "src/app/(main)/pdf/page.tsx",
  "src/app/(main)/pricing/page.tsx",
  "src/app/(main)/privacy/page.tsx",
  "src/app/(main)/qa-knowledge/page.tsx",
  "src/app/(main)/quick/page.tsx",
  "src/app/(main)/resources/page.tsx",
  "src/app/(main)/risk-prediction/page.tsx",
  "src/app/(main)/risk/page.tsx",
  "src/app/(main)/safety-diary/page.tsx",
  "src/app/(main)/security/page.tsx",
  "src/app/(main)/services/page.tsx",
  "src/app/(main)/stats/page.tsx",
  "src/app/(main)/strategy/page.tsx",
  "src/app/(main)/subsidies/page.tsx",
  "src/app/(main)/terms/page.tsx",
  "src/app/(main)/wizard/page.tsx",
];

// page.tsx のパスから URL path を導く
function urlFromFile(rel) {
  // src/app/(main)/foo/page.tsx -> /foo
  const m = rel.match(/src\/app\/\(main\)\/(.+)\/page\.tsx$/);
  if (!m) return "/";
  return "/" + m[1];
}

// metadata.title の値を抽出（"..." or `...` リテラルのみ対応）
function extractStringField(src, fieldName) {
  // title: "..." または title: `...` の単純パターン
  const re = new RegExp(`${fieldName}\\s*:\\s*("([^"\\\\]|\\\\.)*"|\`([^\`\\\\]|\\\\.)*\`)`, "");
  const m = src.match(re);
  if (!m) return null;
  let s = m[1];
  s = s.slice(1, -1); // 両端のクォートを外す
  s = s.replace(/\\"/g, '"').replace(/\\`/g, "`");
  return s;
}

// metadata の title / description を抽出
function extractMeta(src, fallbackPath) {
  let title = extractStringField(src, "title");
  if (title) {
    // "X｜ANZEN AI" のサフィックスを取り除く
    title = title.replace(/[｜|]\s*ANZEN AI.*$/u, "").trim();
  }
  if (!title) title = fallbackPath;
  let description = extractStringField(src, "description");
  if (!description) description = title + "について。労働安全衛生のポータル。";
  return { title, description };
}

function alreadyHasPageJsonLd(src) {
  return /PageJsonLd|webPageSchema|@\/components\/json-ld/.test(src);
}

function injectImport(src) {
  // import { Metadata } 等の最後の import の直後に挿入
  const importRe = /^import\s.+?;\s*$/gm;
  let lastEnd = 0;
  let m;
  while ((m = importRe.exec(src)) !== null) {
    lastEnd = m.index + m[0].length;
  }
  if (lastEnd === 0) {
    return `import { PageJsonLd } from "@/components/page-json-ld";\n` + src;
  }
  const before = src.slice(0, lastEnd);
  const after = src.slice(lastEnd);
  return before + `\nimport { PageJsonLd } from "@/components/page-json-ld";` + after;
}

// デフォルトコンポーネントの return ( ... ) の直後に <PageJsonLd /> を入れる。
// パターン: 最初の `return (\n    <Element` か `return (<Element` を探す。
function injectComponent(src, props) {
  const propStr = `<PageJsonLd name=${JSON.stringify(props.title)} description=${JSON.stringify(props.description)} path=${JSON.stringify(props.path)} />`;

  // パターン1: `return (\n  <main ...>` または `return (\n  <Suspense>`
  // タグの開きかっこを終端まで探して、その直後に挿入
  const re = /return\s*\(\s*(<[A-Za-z][^<>]*>)/;
  const m = src.match(re);
  if (!m) return null;
  const idx = m.index + m[0].length;
  const indent = "      ";
  const insertion = `\n${indent}{/* SEO: WebPage + BreadcrumbList */}\n${indent}${propStr}`;
  return src.slice(0, idx) + insertion + src.slice(idx);
}

let updated = 0;
let skipped = 0;

for (const rel of TARGETS) {
  const file = path.join(ROOT, rel);
  let src;
  try {
    src = await readFile(file, "utf8");
  } catch {
    console.warn("skip (missing):", rel);
    skipped++;
    continue;
  }
  if (alreadyHasPageJsonLd(src)) {
    console.warn("skip (already has):", rel);
    skipped++;
    continue;
  }
  const urlPath = urlFromFile(rel);
  const { title, description } = extractMeta(src, urlPath);
  let next = injectImport(src);
  const injected = injectComponent(next, { title, description, path: urlPath });
  if (!injected) {
    console.warn("skip (no return pattern):", rel);
    skipped++;
    continue;
  }
  await writeFile(file, injected, "utf8");
  console.log("updated:", rel, "→", urlPath, "title=", title);
  updated++;
}

console.log(`\nDone. updated=${updated}, skipped=${skipped}`);
