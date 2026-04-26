#!/usr/bin/env node
// Parse MHLW leaflet listing HTML → JSONL.
// Source: https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/gyousei/anzen/index.html
// Pure regex — no external deps.

import { readFile, writeFile } from "node:fs/promises";

const SOURCE_URL =
  "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/gyousei/anzen/index.html";
const HTML_PATH = "tmp/scrape/leaflets.html";
const OUT_PATH = "data/mhlw-leaflets.jsonl";

const CATEGORY_MAP = {
  安全衛生関係: "general",
  安全関係: "safety",
  労働衛生関係: "occupational-health",
  化学物質関係: "chemicals",
  免許等: "licenses",
  その他: "other",
};

function zenkakuToInt(str) {
  const half = String(str).replace(/[０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0),
  );
  return parseInt(half, 10);
}

function jpDateToISO(jp) {
  if (!jp) return null;
  const cleaned = jp.replace(/[\s　]/g, "");
  let m = cleaned.match(/令和(元|\d+|[０-９]+)年(\d+|[０-９]+)月(?:(\d+|[０-９]+)日)?/);
  if (m) {
    const y = m[1] === "元" ? 2019 : 2018 + zenkakuToInt(m[1]);
    return `${y}-${String(zenkakuToInt(m[2])).padStart(2, "0")}-${String(m[3] ? zenkakuToInt(m[3]) : 1).padStart(2, "0")}`;
  }
  m = cleaned.match(/平成(元|\d+|[０-９]+)年(\d+|[０-９]+)月(?:(\d+|[０-９]+)日)?/);
  if (m) {
    const y = m[1] === "元" ? 1989 : 1988 + zenkakuToInt(m[1]);
    return `${y}-${String(zenkakuToInt(m[2])).padStart(2, "0")}-${String(m[3] ? zenkakuToInt(m[3]) : 1).padStart(2, "0")}`;
  }
  m = cleaned.match(/昭和(\d+|[０-９]+)年(\d+|[０-９]+)月(?:(\d+|[０-９]+)日)?/);
  if (m) {
    const y = 1925 + zenkakuToInt(m[1]);
    return `${y}-${String(zenkakuToInt(m[2])).padStart(2, "0")}-${String(m[3] ? zenkakuToInt(m[3]) : 1).padStart(2, "0")}`;
  }
  m = cleaned.match(/(\d{4})[年./-](\d{1,2})[月./-](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return null;
}

function absoluteUrl(href) {
  if (!href) return null;
  if (href.startsWith("http")) return href;
  if (href.startsWith("/")) return `https://www.mhlw.go.jp${href}`;
  return null;
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, "");
}

function decodeEntities(s) {
  return s
    .replace(/&#160;/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function cleanTitle(t) {
  return decodeEntities(stripTags(t))
    .replace(/[［\[][^］\]]*(?:KB|MB|kB|mb|ＫＢ|ＭＢ)[^］\]]*[］\]]/gi, "")
    .replace(/[\u00A0\s　]+/g, " ")
    .trim();
}

function inferLanguages(title, url) {
  const langs = ["ja"];
  const txt = (title + " " + (url || "")).toLowerCase();
  if (/英語|english|_en\.|en\.pdf/.test(txt)) langs.push("en");
  if (/中国|chinese|_zh\.|zh\.pdf/.test(txt)) langs.push("zh");
  if (/韓国|korean|_ko\.|ko\.pdf/.test(txt)) langs.push("ko");
  if (/ベトナム|vietnamese|_vi\.|vi\.pdf/.test(txt)) langs.push("vi");
  if (/ポルトガル|portuguese|_pt\.|pt\.pdf/.test(txt)) langs.push("pt");
  return langs;
}

function inferTarget(title) {
  if (/事業者|事業主/.test(title)) return "employer";
  if (/労働者向け|労働者の/.test(title)) return "worker";
  if (/外国人/.test(title)) return "foreign-worker";
  if (/医師|歯科医師|看護/.test(title)) return "medical";
  return "general";
}

async function main() {
  const html = await readFile(HTML_PATH, "utf8");

  // Extract sections demarcated by <h2 ... > and <h3 ...>, then tables.
  // Strategy: scan for tagged anchors (h2/h3/table tbody rows) by position.
  const tokens = [];
  const tagRe =
    /<(h2|h3)[^>]*>([\s\S]*?)<\/\1>|<table[^>]*class="m-table"[^>]*>([\s\S]*?)<\/table>/gi;
  let m;
  while ((m = tagRe.exec(html))) {
    if (m[1] && m[1].toLowerCase() === "h2") {
      tokens.push({ type: "h2", text: cleanTitle(m[2]) });
    } else if (m[1] && m[1].toLowerCase() === "h3") {
      tokens.push({ type: "h3", text: cleanTitle(m[2]) });
    } else if (m[3]) {
      tokens.push({ type: "table", html: m[3] });
    }
  }

  /** @type {Array<object>} */
  const rows = [];
  let currentH2 = null;
  let currentH3 = null;
  let seq = 0;

  for (const tok of tokens) {
    if (tok.type === "h2") {
      currentH2 = tok.text;
      currentH3 = null;
      continue;
    }
    if (tok.type === "h3") {
      currentH3 = tok.text;
      continue;
    }
    // table — extract <tr>...<td>...</td>...</tr>
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trM;
    while ((trM = trRe.exec(tok.html))) {
      const trInner = trM[1];
      const tds = [...trInner.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((x) => x[1]);
      if (tds.length === 0) continue;
      // First TD must contain anchor with href
      const firstTd = tds[0];
      const aMatch = firstTd.match(/<a([^>]*)>([\s\S]*?)<\/a>/i);
      if (!aMatch) continue;
      const attrs = aMatch[1];
      const inner = aMatch[2];
      const hrefM = attrs.match(/href="([^"]+)"/i);
      if (!hrefM) continue;
      const url = absoluteUrl(hrefM[1]);
      if (!url) continue;
      const dataIcon = (attrs.match(/data-icon="([^"]+)"/i) || [])[1] || "";
      const isPdf = /\.pdf(\?|$)/i.test(url) || dataIcon === "pdf";
      const title = cleanTitle(inner);
      if (!title) continue;
      const pageCellText = stripTags(decodeEntities(tds[1] || "")).trim();
      const dateCellText = stripTags(decodeEntities(tds[2] || "")).trim();
      const pageMatch = pageCellText.match(/(\d+)/);
      const pageCount = pageMatch ? parseInt(pageMatch[1], 10) : null;
      const publishedDate = jpDateToISO(dateCellText);
      const cat = CATEGORY_MAP[currentH2] || "other";
      seq += 1;
      rows.push({
        id: `mhlw-leaflet-${String(seq).padStart(4, "0")}`,
        title,
        publisher: "厚生労働省",
        publishedDate,
        publishedDateRaw: dateCellText || null,
        target: inferTarget(title),
        category: cat,
        categoryLabel: currentH2,
        subCategory: currentH3 || null,
        languages: inferLanguages(title, url),
        sourceUrl: SOURCE_URL,
        pdfUrl: isPdf ? url : null,
        detailUrl: isPdf ? null : url,
        pageCount,
      });
    }
  }

  // Deduplicate by URL
  const seen = new Set();
  const dedup = [];
  for (const r of rows) {
    const key = r.pdfUrl || r.detailUrl;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(r);
  }

  const out = dedup.map((r) => JSON.stringify(r)).join("\n") + "\n";
  await writeFile(OUT_PATH, out, "utf8");
  console.log(`wrote ${dedup.length} rows → ${OUT_PATH}`);
  const byCat = dedup.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {});
  console.log("by category:", byCat);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
