#!/usr/bin/env node
/**
 * SEO記事品質監査スクリプト
 * 対象: web/src/data/seo-articles/ 配下のJSONLファイル群（1,960本）
 * 生成前の場合はソースデータを分析してレディネスレポートを出力する
 */

import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ─── ユーティリティ ───────────────────────────────────────────────────────────

function readJsonl(filePath) {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, 'utf8')
    .trim()
    .split('\n')
    .filter(l => l.trim())
    .map(l => JSON.parse(l));
}

/** 本文中の見出し数をカウント（【】形式 + ##/### Markdown形式） */
function countHeadings(text = '') {
  const brackets = (text.match(/^【[^】]{1,30}】/gm) || []).length;
  const h2 = (text.match(/^##\s/gm) || []).length;
  const h3 = (text.match(/^###\s/gm) || []).length;
  return { brackets, h2, h3, total: brackets + h2 + h3 };
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((sorted.length - 1) * p / 100);
  return sorted[idx];
}

function avg(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function dist(arr) {
  const counter = {};
  arr.forEach(v => { counter[v] = (counter[v] || 0) + 1; });
  return counter;
}

// ─── SEO記事ディレクトリの分析 ────────────────────────────────────────────────

function analyzeSeoArticles(seoDir) {
  // index.json からファイル・カテゴリ対応を読み込む
  const indexPath = join(seoDir, 'index.json');
  let fileMap = [];
  if (existsSync(indexPath)) {
    const idx = JSON.parse(readFileSync(indexPath, 'utf8'));
    fileMap = idx.files || [];
  } else {
    // index.json がない場合はファイル名からカテゴリを推定
    const jsonlFiles = readdirSync(seoDir).filter(f => f.endsWith('.jsonl'));
    for (const file of jsonlFiles) {
      const m = file.match(/seo-articles-([a-z]+)/);
      fileMap.push({ file, category: m ? m[1] : 'unknown' });
    }
  }

  const allArticles = [];
  const categoryStats = {};

  for (const { file, category, count: expectedCount } of fileMap) {
    const articles = readJsonl(join(seoDir, file));
    if (!categoryStats[category]) {
      categoryStats[category] = { files: 0, count: 0, articles: [], expectedCount: 0 };
    }
    categoryStats[category].files += 1;
    categoryStats[category].count += articles.length;
    categoryStats[category].expectedCount += (expectedCount || 0);
    categoryStats[category].articles.push(...articles);
    allArticles.push(...articles);
  }

  return { allArticles, categoryStats };
}

// ─── ソースデータの分析 ───────────────────────────────────────────────────────

function analyzeSourceData() {
  const notices = readJsonl(join(ROOT, 'data/mhlw-notices.jsonl'));
  const leaflets = readJsonl(join(ROOT, 'data/mhlw-leaflets.jsonl'));
  const accidents = readJsonl(join(ROOT, 'data/accidents-10years.jsonl'));
  const lawUpdates = readJsonl(join(ROOT, 'data/law-updates-10years.jsonl'));
  const mlitResources = readJsonl(join(ROOT, 'data/mlit-resources.jsonl'));
  const lawArticles = readJsonl(join(ROOT, 'web/src/data/laws-mhlw/articles.jsonl'));

  let chemicals = [];
  const chemCompact = join(ROOT, 'web/src/data/chemicals-mhlw/compact.json');
  if (existsSync(chemCompact)) {
    const raw = JSON.parse(readFileSync(chemCompact, 'utf8'));
    chemicals = Array.isArray(raw) ? raw : (raw.items || []);
  }
  if (!chemicals.length) {
    chemicals = readJsonl(join(ROOT, 'web/src/data/chemicals-mhlw/chemicals.jsonl'));
  }

  let subsidies = [];
  const subsidyPath = join(ROOT, 'web/src/data/subsidies.json');
  if (existsSync(subsidyPath)) {
    const raw = JSON.parse(readFileSync(subsidyPath, 'utf8'));
    subsidies = Array.isArray(raw) ? raw : (raw.subsidies || raw.items || []);
  }

  return {
    notices: { count: notices.count || notices.length },
    leaflets: { count: leaflets.length },
    accidents: { count: accidents.length },
    lawUpdates: { count: lawUpdates.length },
    mlitResources: { count: mlitResources.length },
    lawArticles: { count: lawArticles.length },
    chemicals: { count: chemicals.length },
    subsidies: { count: subsidies.length },
  };
}

// ─── 記事統計計算 ─────────────────────────────────────────────────────────────

function calcStats(articles) {
  if (!articles.length) return null;

  const bodyLens = articles.map(a => (a.body || '').length);
  const titleLens = articles.map(a => (a.title || '').length);
  const summaryLens = articles.map(a => (a.summary || a.description || '').length);

  // 見出し数（【】 + ## ###）
  const headingCounts = articles.map(a => countHeadings(a.body || '').total);
  const bracketHeadingCounts = articles.map(a => countHeadings(a.body || '').brackets);
  const mdHeadingCounts = articles.map(a => countHeadings(a.body || '').h2 + countHeadings(a.body || '').h3);

  // sourceUrls
  const sourceUrlCounts = articles.map(a =>
    Array.isArray(a.sourceUrls) ? a.sourceUrls.length : (a.sourceUrl ? 1 : 0)
  );

  const hasSummary = articles.filter(a => a.summary || a.description).length;
  const hasSourceUrls = articles.filter(a => a.sourceUrls?.length || a.sourceUrl).length;
  const hasRelatedArticles = articles.filter(a => a.relatedArticles?.length).length;
  const hasSlug = articles.filter(a => a.slug).length;
  const hasPublishedAt = articles.filter(a => a.publishedAt).length;
  const hasLawRefs = articles.filter(a => a.lawRefs?.length).length;

  // 多言語タイトル
  const hasMultilingual = articles.filter(a => a.titleEn || a.titleKo || a.titleVi).length;

  // 重複チェック
  const titles = articles.map(a => a.title || '');
  const titleDups = titles.length - new Set(titles).size;
  const summaries = articles.map(a => (a.summary || a.description || '').trim()).filter(Boolean);
  const summaryDups = summaries.length - new Set(summaries).size;
  const slugs = articles.map(a => a.slug || '').filter(Boolean);
  const slugDups = slugs.length - new Set(slugs).size;
  const ids = articles.map(a => a.id || '').filter(Boolean);
  const idDups = ids.length - new Set(ids).size;

  // body先頭200文字重複
  const bodyPrefixes = articles.map(a => (a.body || '').slice(0, 200).trim()).filter(Boolean);
  const prefixDups = bodyPrefixes.length - new Set(bodyPrefixes).size;

  // publishedAt分布
  const monthDist = {};
  const dayDist = {};
  articles.forEach(a => {
    if (a.publishedAt) {
      const d = new Date(a.publishedAt);
      if (isNaN(d.getTime())) return;
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthDist[ym] = (monthDist[ym] || 0) + 1;
      const ymd = `${ym}-${String(d.getDate()).padStart(2, '0')}`;
      dayDist[ymd] = (dayDist[ymd] || 0) + 1;
    }
  });
  const maxPerDay = Math.max(0, ...Object.values(dayDist));
  const maxDayEntry = Object.entries(dayDist).sort((a, b) => b[1] - a[1])[0];
  const sortedMonths = Object.entries(monthDist).sort((a, b) => a[0].localeCompare(b[0]));

  // ドメイン分布
  const domainDist = {};
  articles.forEach(a => {
    const urls = Array.isArray(a.sourceUrls) ? a.sourceUrls : (a.sourceUrl ? [a.sourceUrl] : []);
    urls.forEach(url => {
      try {
        const domain = new URL(url).hostname;
        domainDist[domain] = (domainDist[domain] || 0) + 1;
      } catch {}
    });
  });

  return {
    count: articles.length,
    body: {
      avg: avg(bodyLens),
      min: Math.min(...bodyLens),
      max: Math.max(...bodyLens),
      median: percentile(bodyLens, 50),
      p25: percentile(bodyLens, 25),
      p75: percentile(bodyLens, 75),
      under500: bodyLens.filter(l => l < 500).length,
      under1000: bodyLens.filter(l => l < 1000).length,
      over1500: bodyLens.filter(l => l >= 1500).length,
      over2000: bodyLens.filter(l => l >= 2000).length,
    },
    title: {
      avg: avg(titleLens),
      min: Math.min(...titleLens),
      max: Math.max(...titleLens),
      median: percentile(titleLens, 50),
    },
    summary: {
      avg: avg(summaryLens.filter(l => l > 0)),
      existCount: hasSummary,
      existRate: `${((hasSummary / articles.length) * 100).toFixed(1)}%`,
    },
    headings: {
      avgTotal: (headingCounts.reduce((a, b) => a + b, 0) / articles.length).toFixed(1),
      avgBracket: (bracketHeadingCounts.reduce((a, b) => a + b, 0) / articles.length).toFixed(1),
      avgMarkdown: (mdHeadingCounts.reduce((a, b) => a + b, 0) / articles.length).toFixed(1),
      noHeadings: headingCounts.filter(c => c === 0).length,
    },
    sourceUrls: {
      avgCount: (sourceUrlCounts.reduce((a, b) => a + b, 0) / articles.length).toFixed(1),
      existCount: hasSourceUrls,
      existRate: `${((hasSourceUrls / articles.length) * 100).toFixed(1)}%`,
    },
    relatedArticles: {
      setCount: hasRelatedArticles,
      setRate: `${((hasRelatedArticles / articles.length) * 100).toFixed(1)}%`,
    },
    lawRefs: {
      setCount: hasLawRefs,
      setRate: `${((hasLawRefs / articles.length) * 100).toFixed(1)}%`,
    },
    slug: {
      setCount: hasSlug,
      setRate: `${((hasSlug / articles.length) * 100).toFixed(1)}%`,
      dups: slugDups,
    },
    multilingual: {
      setCount: hasMultilingual,
      setRate: `${((hasMultilingual / articles.length) * 100).toFixed(1)}%`,
    },
    publishedAt: {
      setCount: hasPublishedAt,
      setRate: `${((hasPublishedAt / articles.length) * 100).toFixed(1)}%`,
      maxPerDay,
      maxDay: maxDayEntry?.[0],
      sortedMonths,
    },
    duplicates: {
      titleDups,
      titleDupRate: `${((titleDups / articles.length) * 100).toFixed(2)}%`,
      summaryDups,
      summaryDupRate: `${((summaryDups / Math.max(summaries.length, 1)) * 100).toFixed(2)}%`,
      prefixDups,
      slugDups,
      idDups,
    },
    domains: Object.entries(domainDist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([domain, count]) => ({ domain, count, pct: ((count / sourceUrlCounts.reduce((a,b)=>a+b,0)) * 100).toFixed(1) + '%' })),
  };
}

// ─── レポート生成 ─────────────────────────────────────────────────────────────

function buildReport(seoData, sourceData, generatedAt) {
  const lines = [];
  const p = (...args) => lines.push(...args);
  const total = seoData.allArticles.length;
  const globalStats = calcStats(seoData.allArticles);

  p('# SEO 1,960本記事 品質監査レポート');
  p('');
  p(`生成日時: ${generatedAt}`);
  p('');

  // ─── 0. エグゼクティブサマリー ─────────────────────────────────────────────
  p('## サマリー');
  p('');
  p(`| 指標 | 値 |`);
  p(`|------|----|`);
  p(`| 総記事数 | **${total.toLocaleString()}** / 目標 1,960 |`);
  p(`| 達成率 | ${((total / 1960) * 100).toFixed(1)}% |`);
  p(`| body 平均文字数 | ${globalStats.body.avg.toLocaleString()} 文字 |`);
  p(`| body 中央値 | ${globalStats.body.median.toLocaleString()} 文字 |`);
  p(`| 500文字未満の記事 | ${globalStats.body.under500} 件 (${((globalStats.body.under500/total)*100).toFixed(1)}%) |`);
  p(`| 1,500文字以上の記事 | ${globalStats.body.over1500} 件 (${((globalStats.body.over1500/total)*100).toFixed(1)}%) |`);
  p(`| title 重複数 | ${globalStats.duplicates.titleDups} 件 |`);
  p(`| slug 重複数 | ${globalStats.duplicates.slugDups} 件 |`);
  p(`| ID 重複数 | ${globalStats.duplicates.idDups} 件 |`);
  p(`| body先頭200文字重複（テンプレ検出） | ${globalStats.duplicates.prefixDups} 件 |`);
  p('');

  // ─── 1. 文字数統計 ──────────────────────────────────────────────────────────
  p('---');
  p('');
  p('## 1. 文字数統計（bodyフィールド）');
  p('');
  p('### 全体統計');
  p('');
  p(`| 指標 | 値 |`);
  p(`|------|----|`);
  p(`| 平均 | ${globalStats.body.avg.toLocaleString()} 文字 |`);
  p(`| 最小 | ${globalStats.body.min.toLocaleString()} 文字 |`);
  p(`| 最大 | ${globalStats.body.max.toLocaleString()} 文字 |`);
  p(`| 中央値 | ${globalStats.body.median.toLocaleString()} 文字 |`);
  p(`| 第1四分位 (P25) | ${globalStats.body.p25.toLocaleString()} 文字 |`);
  p(`| 第3四分位 (P75) | ${globalStats.body.p75.toLocaleString()} 文字 |`);
  p(`| 500文字未満 | ${globalStats.body.under500} 件 (${((globalStats.body.under500/total)*100).toFixed(1)}%) |`);
  p(`| 1,000文字未満 | ${globalStats.body.under1000} 件 (${((globalStats.body.under1000/total)*100).toFixed(1)}%) |`);
  p(`| 1,500文字以上 | ${globalStats.body.over1500} 件 (${((globalStats.body.over1500/total)*100).toFixed(1)}%) |`);
  p(`| 2,000文字以上 | ${globalStats.body.over2000} 件 (${((globalStats.body.over2000/total)*100).toFixed(1)}%) |`);
  p('');
  p('### カテゴリ別 body 文字数');
  p('');
  p('| カテゴリ | 件数 | 平均 | 中央値 | 最小 | 最大 |');
  p('|---------|------|------|--------|------|------|');
  for (const [cat, stat] of Object.entries(seoData.categoryStats)) {
    const s = calcStats(stat.articles);
    if (!s) continue;
    p(`| ${cat} | ${stat.count} | ${s.body.avg.toLocaleString()} | ${s.body.median.toLocaleString()} | ${s.body.min} | ${s.body.max.toLocaleString()} |`);
  }
  p('');

  // ─── 2. テンプレート・多様性 ────────────────────────────────────────────────
  p('---');
  p('');
  p('## 2. カテゴリ別記事数とテンプレート分析');
  p('');
  p('| カテゴリ | 記事数 | 期待数 | 過不足 | ファイル数 |');
  p('|---------|--------|--------|--------|-----------|');
  const catOrder = ['circulars', 'accidents', 'chemicals', 'seasonal', 'legal', 'subsidies', 'international'];
  const expectedMap = { circulars: 1158, accidents: 500, chemicals: 100, seasonal: 52, legal: 60, subsidies: 30, international: 60 };
  for (const cat of catOrder) {
    const stat = seoData.categoryStats[cat];
    if (!stat) {
      p(`| ${cat} | ❌ 0 | ${expectedMap[cat] || '-'} | -${expectedMap[cat] || 0} | 0 |`);
      continue;
    }
    const expected = expectedMap[cat] || stat.expectedCount || stat.count;
    const diff = stat.count - expected;
    const diffStr = diff === 0 ? '±0 ✅' : (diff > 0 ? `+${diff}` : `${diff} ⚠️`);
    p(`| ${cat} | ${stat.count} | ${expected} | ${diffStr} | ${stat.files} |`);
  }
  p('');
  p('> **注**: 通達解説（circulars）はnotices（869本）+ leaflets（289本）= 1,158本がソース。');
  p('');
  p('### body先頭200文字の重複（テンプレ量産度）');
  p('');
  p('| カテゴリ | 記事数 | body先頭200文字重複 | 重複率 |');
  p('|---------|--------|-------------------|--------|');
  for (const cat of catOrder) {
    const stat = seoData.categoryStats[cat];
    if (!stat) continue;
    const prefixes = stat.articles.map(a => (a.body || '').slice(0, 200).trim()).filter(Boolean);
    const dups = prefixes.length - new Set(prefixes).size;
    const rate = ((dups / Math.max(prefixes.length, 1)) * 100).toFixed(1);
    const flag = dups > stat.articles.length * 0.3 ? ' ⚠️' : (dups > 0 ? ' ℹ️' : ' ✅');
    p(`| ${cat} | ${stat.count} | ${dups} | ${rate}%${flag} |`);
  }
  p('');

  // ─── 3. 構成要素チェック ────────────────────────────────────────────────────
  p('---');
  p('');
  p('## 3. 記事構成要素チェック');
  p('');
  p('### 全体');
  p('');
  p('| 要素 | 平均/値 | 存在率 | 評価 |');
  p('|------|---------|--------|------|');
  p(`| title 平均文字数 | ${globalStats.title.avg} 文字（中央値 ${globalStats.title.median}） | 100% | - |`);
  p(`| summary 平均文字数 | ${globalStats.summary.avg} 文字 | ${globalStats.summary.existRate} | ${globalStats.summary.existCount === total ? '✅' : '⚠️'} |`);
  p(`| body 見出し数（【】形式） | 平均 ${globalStats.headings.avgBracket} 個 | - | - |`);
  p(`| body 見出し数（Markdown ##/###） | 平均 ${globalStats.headings.avgMarkdown} 個 | - | - |`);
  p(`| body 見出し数（合計） | 平均 ${globalStats.headings.avgTotal} 個 | - | ${parseFloat(globalStats.headings.avgTotal) < 2 ? '⚠️ 少ない' : '✅'} |`);
  p(`| 見出しゼロの記事 | ${globalStats.headings.noHeadings} 件 | - | ${globalStats.headings.noHeadings > 0 ? '⚠️' : '✅'} |`);
  p(`| sourceUrls 平均数 | ${globalStats.sourceUrls.avgCount} 個 | ${globalStats.sourceUrls.existRate} | ${parseFloat(globalStats.sourceUrls.existRate) < 90 ? '⚠️' : '✅'} |`);
  p(`| relatedArticles 設定率 | - | ${globalStats.relatedArticles.setRate} | ${parseFloat(globalStats.relatedArticles.setRate) < 50 ? '⚠️' : '✅'} |`);
  p(`| lawRefs 設定率 | - | ${globalStats.lawRefs.setRate} | - |`);
  p(`| slug 設定率 | - | ${globalStats.slug.setRate} | ${globalStats.slug.dups > 0 ? '⚠️ 重複あり' : '✅'} |`);
  p(`| publishedAt 設定率 | - | ${globalStats.publishedAt.setRate} | ${parseFloat(globalStats.publishedAt.setRate) < 100 ? '⚠️' : '✅'} |`);
  p(`| 多言語タイトル（En/Ko/Vi/Pt/Tl） | - | ${globalStats.multilingual.setRate} | - |`);
  p('');

  // ─── 4. SEO品質チェック ─────────────────────────────────────────────────────
  p('---');
  p('');
  p('## 4. SEO品質チェック');
  p('');
  p('### 重複チェック');
  p('');
  p('| チェック項目 | 重複数 | 重複率 | 評価 |');
  p('|------------|--------|--------|------|');
  p(`| title 重複 | ${globalStats.duplicates.titleDups} | ${globalStats.duplicates.titleDupRate} | ${globalStats.duplicates.titleDups === 0 ? '✅ 重複なし' : '⚠️ 要確認'} |`);
  p(`| summary 重複 | ${globalStats.duplicates.summaryDups} | ${globalStats.duplicates.summaryDupRate} | ${globalStats.duplicates.summaryDups === 0 ? '✅ 重複なし' : '⚠️ 要確認'} |`);
  p(`| slug 重複 | ${globalStats.duplicates.slugDups} | - | ${globalStats.duplicates.slugDups === 0 ? '✅ 全て一意' : '❌ 修正必須'} |`);
  p(`| ID 重複 | ${globalStats.duplicates.idDups} | - | ${globalStats.duplicates.idDups === 0 ? '✅ 全て一意' : '❌ 修正必須'} |`);
  p(`| body先頭200文字重複 | ${globalStats.duplicates.prefixDups} | - | ${globalStats.duplicates.prefixDups > total * 0.05 ? '⚠️ テンプレ量産の疑い' : '✅ 許容範囲'} |`);
  p('');

  // ─── 5. 通達DBとの整合性 ────────────────────────────────────────────────────
  p('---');
  p('');
  p('## 5. 既存通達DBとの整合性');
  p('');
  const circCount = seoData.categoryStats['circulars']?.count || 0;
  const matchNotices = sourceData.notices.count + sourceData.leaflets.count;
  p(`| 確認項目 | 期待値 | 実測値 | 判定 |`);
  p(`|---------|--------|--------|------|`);
  p(`| seo-articles 通達解説記事数 | 1,158 | ${circCount.toLocaleString()} | ${circCount === 1158 ? '✅ 一致' : '⚠️ 不一致'} |`);
  p(`| ソースDB通達数（notices） | 869 | ${sourceData.notices.count} | ${sourceData.notices.count === 869 ? '✅' : '⚠️'} |`);
  p(`| ソースDB リーフレット数 | 289 | ${sourceData.leaflets.count} | ${sourceData.leaflets.count === 289 ? '✅' : '⚠️'} |`);
  p(`| 通達解説ソース合計 | 1,158 | ${matchNotices} | ${matchNotices === 1158 ? '✅ 一致' : '⚠️ 不一致'} |`);
  p(`| accidents ソース件数 | 4,257以上 | ${sourceData.accidents.count.toLocaleString()} | ${sourceData.accidents.count >= 500 ? '✅ 十分' : '❌ 不足'} |`);
  p(`| legal ソース件数 | 31+ | ${sourceData.lawUpdates.count} | ${sourceData.lawUpdates.count >= 31 ? '✅' : '⚠️'} |`);
  p('');

  // ─── 6. sourceUrls ドメイン分布 ─────────────────────────────────────────────
  p('---');
  p('');
  p('## 6. sourceUrls ドメイン分布（全記事）');
  p('');
  p('| ドメイン | URL数 | 割合 |');
  p('|---------|------|------|');
  for (const { domain, count, pct } of globalStats.domains) {
    p(`| ${domain} | ${count.toLocaleString()} | ${pct} |`);
  }
  p('');

  // ─── 7. publishedAt 分布 ────────────────────────────────────────────────────
  p('---');
  p('');
  p('## 7. publishedAt 分布');
  p('');
  p(`| 指標 | 値 |`);
  p(`|------|----|`);
  p(`| 日付設定あり | ${globalStats.publishedAt.setCount.toLocaleString()} / ${total.toLocaleString()} (${globalStats.publishedAt.setRate}) |`);
  p(`| 1日最大公開数 | **${globalStats.publishedAt.maxPerDay}** 件（${globalStats.publishedAt.maxDay}） |`);
  p('');
  if (globalStats.publishedAt.maxPerDay > 20) {
    p(`> ⚠️ 1日${globalStats.publishedAt.maxPerDay}件は検索エンジンのクロール負荷・インデックス遅延を招く可能性があります。`);
    p('');
  }
  p('**月別公開予定件数（全期間）:**');
  p('');
  p('| 年月 | 件数 | 日次平均 |');
  p('|------|------|---------|');
  for (const [ym, cnt] of globalStats.publishedAt.sortedMonths) {
    const daysInMonth = new Date(parseInt(ym.split('-')[0]), parseInt(ym.split('-')[1]), 0).getDate();
    p(`| ${ym} | ${cnt} | ${(cnt / daysInMonth).toFixed(1)} |`);
  }
  p('');

  // ─── 8. カテゴリ別詳細 ─────────────────────────────────────────────────────
  p('---');
  p('');
  p('## 8. カテゴリ別詳細統計');
  p('');

  for (const cat of catOrder) {
    const stat = seoData.categoryStats[cat];
    if (!stat || !stat.articles.length) {
      p(`### ${cat}: データなし`);
      p('');
      continue;
    }
    const s = calcStats(stat.articles);
    p(`### ${cat}（${stat.count}件）`);
    p('');
    p(`| 指標 | 値 |`);
    p(`|------|----|`);
    p(`| body 平均文字数 | ${s.body.avg.toLocaleString()} 文字 |`);
    p(`| body 中央値 | ${s.body.median.toLocaleString()} 文字 |`);
    p(`| body 最小 | ${s.body.min.toLocaleString()} 文字 |`);
    p(`| body 最大 | ${s.body.max.toLocaleString()} 文字 |`);
    p(`| 500文字未満 | ${s.body.under500} 件 (${((s.body.under500/stat.count)*100).toFixed(1)}%) |`);
    p(`| 1,500文字以上 | ${s.body.over1500} 件 (${((s.body.over1500/stat.count)*100).toFixed(1)}%) |`);
    p(`| title 平均文字数 | ${s.title.avg} 文字 |`);
    p(`| summary 存在率 | ${s.summary.existRate} |`);
    p(`| 見出し平均数（全形式） | ${s.headings.avgTotal} 個 |`);
    p(`| sourceUrls 存在率 | ${s.sourceUrls.existRate} |`);
    p(`| relatedArticles 設定率 | ${s.relatedArticles.setRate} |`);
    p(`| title 重複 | ${s.duplicates.titleDups} 件 |`);
    p(`| slug 重複 | ${s.duplicates.slugDups} 件 |`);
    p('');
  }

  // ─── 9. 品質評価まとめ ─────────────────────────────────────────────────────
  p('---');
  p('');
  p('## 9. 品質評価まとめ・推奨アクション');
  p('');
  p('### 合格基準チェック');
  p('');

  const checks = [
    { item: '総記事数 1,960本', pass: total === 1960, detail: `実測 ${total}件` },
    { item: 'ID一意性', pass: globalStats.duplicates.idDups === 0, detail: `重複${globalStats.duplicates.idDups}件` },
    { item: 'slug一意性', pass: globalStats.duplicates.slugDups === 0, detail: `重複${globalStats.duplicates.slugDups}件` },
    { item: 'title重複率 1%未満', pass: globalStats.duplicates.titleDups / total < 0.01, detail: `${globalStats.duplicates.titleDupRate}` },
    { item: 'summary 存在率 95%以上', pass: parseFloat(globalStats.summary.existRate) >= 95, detail: globalStats.summary.existRate },
    { item: 'sourceUrls 存在率 80%以上', pass: parseFloat(globalStats.sourceUrls.existRate) >= 80, detail: globalStats.sourceUrls.existRate },
    { item: 'body 平均文字数 800文字以上', pass: globalStats.body.avg >= 800, detail: `${globalStats.body.avg}文字` },
    { item: 'body 500文字未満が10%以下', pass: globalStats.body.under500 / total <= 0.10, detail: `${((globalStats.body.under500/total)*100).toFixed(1)}%` },
    { item: '見出しゼロの記事が5%以下', pass: globalStats.headings.noHeadings / total <= 0.05, detail: `${globalStats.headings.noHeadings}件` },
    { item: '通達解説記事数 = 1,158', pass: (seoData.categoryStats['circulars']?.count || 0) === 1158, detail: `${seoData.categoryStats['circulars']?.count || 0}件` },
    { item: '1日最大公開数 20件以下', pass: globalStats.publishedAt.maxPerDay <= 20, detail: `${globalStats.publishedAt.maxPerDay}件` },
  ];

  p('| チェック項目 | 結果 | 詳細 |');
  p('|------------|------|------|');
  for (const { item, pass, detail } of checks) {
    p(`| ${item} | ${pass ? '✅ 合格' : '⚠️ 要確認'} | ${detail} |`);
  }
  p('');

  const passCount = checks.filter(c => c.pass).length;
  p(`**合格率: ${passCount}/${checks.length}（${((passCount/checks.length)*100).toFixed(0)}%）**`);
  p('');

  // 推奨アクション
  const failedChecks = checks.filter(c => !c.pass);
  if (failedChecks.length > 0) {
    p('### 推奨アクション');
    p('');
    for (const { item, detail } of failedChecks) {
      p(`- **${item}**: ${detail} — 対象記事の内容を見直してください。`);
    }
    p('');
  }

  p('---');
  p('');
  p('*このレポートは `scripts/audit-seo-articles.mjs` により自動生成されました。*');
  p(`*監査スクリプトバージョン: 2.0 / 生成日時: ${generatedAt}*`);

  return lines.join('\n');
}

// ─── メイン ───────────────────────────────────────────────────────────────────

async function main() {
  const generatedAt = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  console.log(`\n🔍 SEO記事品質監査開始 (${generatedAt})`);

  const seoDir = join(ROOT, 'web/src/data/seo-articles');
  const seoExists = existsSync(seoDir);

  console.log(`\n📂 seo-articles ディレクトリ: ${seoExists ? '存在します ✅' : '存在しません ❌'}`);

  console.log('\n📊 ソースデータを分析中...');
  const sourceData = analyzeSourceData();
  console.log(`   通達ソース合計: ${sourceData.notices.count + sourceData.leaflets.count} 件（目標1,158と${sourceData.notices.count + sourceData.leaflets.count === 1158 ? '一致 ✅' : '不一致 ⚠️'}）`);

  if (!seoExists) {
    console.error('\n❌ seo-articles ディレクトリが存在しません。先に generate-seo-articles.mjs を実行してください。');
    process.exit(1);
  }

  console.log('\n📑 SEO記事を読み込み中...');
  const seoData = analyzeSeoArticles(seoDir);
  const total = seoData.allArticles.length;
  console.log(`   → ${total.toLocaleString()} 件の記事を読み込みました`);

  for (const [cat, stat] of Object.entries(seoData.categoryStats)) {
    console.log(`   ✅ ${cat.padEnd(15)}: ${String(stat.count).padStart(5)} 件 (${stat.files}ファイル)`);
  }

  console.log('\n📈 統計計算中...');
  const report = buildReport(seoData, sourceData, generatedAt);

  const docsDir = join(ROOT, 'docs');
  if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true });

  const reportPath = join(docsDir, 'seo-2000-quality-report.md');
  writeFileSync(reportPath, report, 'utf8');
  console.log(`\n✅ レポートを保存しました: docs/seo-2000-quality-report.md`);
  console.log(`   文字数: ${report.length.toLocaleString()} 文字 / 行数: ${report.split('\n').length.toLocaleString()} 行`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
