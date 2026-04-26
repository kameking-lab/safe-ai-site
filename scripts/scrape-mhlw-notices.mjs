#!/usr/bin/env node
// Parse JAISH (安全衛生情報センター) notice/告示 listings into JSONL.
// Source: https://www.jaish.gr.jp/user/anzen/hor/tsutatsu*.html  (通達)
//          https://www.jaish.gr.jp/user/anzen/hor/kokuji.html     (告示・指針)
// Pages are SHIFT_JIS encoded — converted to UTF-8 via iconv beforehand or via Node.

import { readFile, writeFile } from "node:fs/promises";

const BASE = "https://www.jaish.gr.jp";
const OUT_PATH = "data/mhlw-notices.jsonl";

const TSUTATSU_FILES = [
  { file: "tmp/scrape/tsutatsu.html", year: 2026, era: "令和8年" },
  { file: "tmp/scrape/tsutatsu_r07.html", year: 2025, era: "令和7年" },
  { file: "tmp/scrape/tsutatsu_r06.html", year: 2024, era: "令和6年" },
  { file: "tmp/scrape/tsutatsu_r05.html", year: 2023, era: "令和5年" },
  { file: "tmp/scrape/tsutatsu_r04.html", year: 2022, era: "令和4年" },
  { file: "tmp/scrape/tsutatsu_r03.html", year: 2021, era: "令和3年" },
  { file: "tmp/scrape/tsutatsu_r02.html", year: 2020, era: "令和2年" },
  { file: "tmp/scrape/tsutatsu_h31.html", year: 2019, era: "平成31年・令和元年" },
  { file: "tmp/scrape/tsutatsu_h30.html", year: 2018, era: "平成30年" },
  { file: "tmp/scrape/tsutatsu_h29.html", year: 2017, era: "平成29年" },
  { file: "tmp/scrape/tsutatsu_h28.html", year: 2016, era: "平成28年" },
  { file: "tmp/scrape/tsutatsu_h27.html", year: 2015, era: "平成27年" },
];

const KOKUJI_FILE = "tmp/scrape/kokuji.html";
const TSUTATSU_INDEX_URL = `${BASE}/user/anzen/hor/tsutatsu.html`;
const KOKUJI_INDEX_URL = `${BASE}/user/anzen/hor/kokuji.html`;

function decodeSjisFile(buf) {
  // We rely on iconv-converted file when available, otherwise try TextDecoder.
  try {
    return new TextDecoder("shift-jis").decode(buf);
  } catch {
    return buf.toString("utf8");
  }
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

function stripTags(s) {
  return s.replace(/<[^>]+>/g, "");
}

function clean(s) {
  return decodeEntities(stripTags(s))
    .replace(/[\u00A0\s　]+/g, " ")
    .trim();
}

function zenkakuToInt(str) {
  return parseInt(
    String(str).replace(/[０-９]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0),
    ),
    10,
  );
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
  return null;
}

function absoluteUrl(href, base) {
  if (!href) return null;
  if (href.startsWith("http")) return href;
  if (href.startsWith("/")) return `${BASE}${href}`;
  return new URL(href, base).toString();
}

// 通達番号 (e.g. 基発0220第5号、基安発0224第1号、健発0218第3号) — used to detect bindingLevel & issuer.
function extractNoticeMeta(noticeNumber) {
  if (!noticeNumber) return { issuer: null, bindingLevel: "indirect" };
  const t = noticeNumber.replace(/[\s　]/g, "");
  // 基発: 労働基準局長通達 — 行政解釈・実務上の指示。binding for 行政だが事業者には間接拘束。
  // 基収: 労基局長による疑義回答。
  // 基安発: 安全衛生部長通達 — 同上。
  // 健発: 健康局長。
  // 老健発: 老健局長。
  // 安衛発: 旧安全衛生部発（古いもの）
  // 厚労告: 告示
  let issuer = null;
  let bindingLevel = "indirect"; // 通達は事業者に対しては間接拘束（行政解釈）
  if (/基発/.test(t)) issuer = "厚生労働省労働基準局長";
  else if (/基収/.test(t)) issuer = "厚生労働省労働基準局長（疑義照会回答）";
  else if (/基安発/.test(t)) issuer = "厚生労働省労働基準局安全衛生部長";
  else if (/基安安発/.test(t)) issuer = "厚生労働省労働基準局安全衛生部安全課長";
  else if (/基安労発/.test(t)) issuer = "厚生労働省労働基準局安全衛生部労働衛生課長";
  else if (/基安化発/.test(t)) issuer = "厚生労働省労働基準局安全衛生部化学物質対策課長";
  else if (/基安計発/.test(t)) issuer = "厚生労働省労働基準局安全衛生部計画課長";
  else if (/健発/.test(t)) issuer = "厚生労働省健康局長";
  else if (/老健発/.test(t)) issuer = "厚生労働省老健局長";
  else if (/職発/.test(t)) issuer = "厚生労働省職業安定局長";
  else if (/雇均発|雇児発/.test(t)) issuer = "厚生労働省雇用環境・均等局長";
  else if (/医政発/.test(t)) issuer = "厚生労働省医政局長";
  else if (/告示|号告/.test(t)) {
    issuer = "厚生労働大臣";
    bindingLevel = "binding"; // 告示は法的拘束力あり
  }
  return { issuer, bindingLevel };
}

function inferCategory(title) {
  const t = title;
  if (/化学物質|有機溶剤|特化則|GHS|SDS|有害物/.test(t)) return "chemicals";
  if (/熱中症/.test(t)) return "heat-stroke";
  if (/石綿|アスベスト/.test(t)) return "asbestos";
  if (/メンタルヘルス|ストレスチェック|心の健康/.test(t)) return "mental-health";
  if (/健康診断|健診|健康管理/.test(t)) return "health-checkup";
  if (/建設|足場|墜落|フルハーネス/.test(t)) return "construction";
  if (/林業|伐木/.test(t)) return "forestry";
  if (/粉じん|じん肺/.test(t)) return "dust";
  if (/電離放射線|放射線/.test(t)) return "radiation";
  if (/騒音|振動/.test(t)) return "noise-vibration";
  if (/受動喫煙|喫煙/.test(t)) return "smoking";
  if (/外国人/.test(t)) return "foreign-workers";
  if (/高年齢|エイジ/.test(t)) return "aged-workers";
  if (/フリーランス|一人親方|個人事業者/.test(t)) return "freelance";
  if (/感染症|新型コロナ|インフルエンザ/.test(t)) return "infectious-disease";
  if (/教育|安全衛生教育/.test(t)) return "training";
  if (/リスクアセスメント|RA/.test(t)) return "risk-assessment";
  if (/機械|フォークリフト|クレーン|プレス/.test(t)) return "machinery";
  return "general";
}

function parseListing(html, source, opts) {
  // opts: { issuanceYearHint, sourceUrl }
  const rows = [];
  // Each entry is an inner <table> row with two <td>: title-cell + (date<br>noticeNumber)-cell.
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = trRe.exec(html))) {
    const inner = m[1];
    const tds = [...inner.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((x) => x[1]);
    if (tds.length < 2) continue;
    const aMatch = tds[0].match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!aMatch) continue;
    const href = aMatch[1];
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
    const title = clean(aMatch[2]);
    if (!title) continue;
    const dateNoticeRaw = decodeEntities(tds[1])
      .replace(/<br\s*\/?>(\s*)/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .trim();
    const lines = dateNoticeRaw
      .split("\n")
      .map((l) => l.replace(/[\s　]+/g, " ").trim())
      .filter(Boolean);
    let issuedRaw = lines[0] || "";
    let noticeNumber = lines.slice(1).join(" / ") || null;
    // Some rows have "発出日" before notice number (most do), but some kokuji
    // rows have format "公布日: ... 告示第X号"
    const dateInLine = jpDateToISO(issuedRaw);
    const issuedDate = dateInLine;
    const meta = extractNoticeMeta(noticeNumber || "");
    const url = absoluteUrl(href, source);
    rows.push({
      title,
      issuedDate,
      issuedDateRaw: issuedRaw,
      noticeNumber,
      issuer: meta.issuer,
      bindingLevel: meta.bindingLevel,
      sourceUrl: opts.sourceUrl,
      detailUrl: url,
      pdfUrl: /\.pdf(\?|$)/i.test(url) ? url : null,
      category: inferCategory(title),
    });
  }
  return rows;
}

async function readMaybeSjis(path) {
  const buf = await readFile(path);
  // If <meta charset="UTF-8"> present, treat as utf-8; else try shift-jis decode.
  const head = buf.slice(0, 1024).toString("utf8");
  if (/charset=utf-?8/i.test(head)) return buf.toString("utf8");
  return decodeSjisFile(buf);
}

async function main() {
  /** @type {Array<object>} */
  const all = [];

  for (const { file, era } of TSUTATSU_FILES) {
    let html;
    try {
      html = await readMaybeSjis(file);
    } catch {
      console.warn(`skip missing ${file}`);
      continue;
    }
    const rows = parseListing(html, `${BASE}/user/anzen/hor/`, {
      sourceUrl: TSUTATSU_INDEX_URL,
    });
    for (const r of rows) {
      r.docType = "通達";
      r.era = era;
    }
    console.log(`${file}: ${rows.length}`);
    all.push(...rows);
  }

  // 告示・指針 — single-TD rows grouped by parent law (rowspan'd <th>)
  try {
    const html = await readMaybeSjis(KOKUJI_FILE);
    let currentLaw = null;
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let mt;
    const rows = [];
    while ((mt = trRe.exec(html))) {
      const inner = mt[1];
      const thMatch = inner.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
      if (thMatch) currentLaw = clean(thMatch[1]);
      const tdMatches = [...inner.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
      for (const td of tdMatches) {
        const aMatch = td[1].match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
        if (!aMatch) continue;
        const href = aMatch[1];
        if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
        const title = clean(aMatch[2]);
        if (!title || title.length < 4) continue;
        const url = absoluteUrl(href, `${BASE}/user/anzen/hor/`);
        const docType = /指針|ガイドライン/.test(title) ? "指針" : "告示";
        rows.push({
          title,
          issuedDate: null,
          issuedDateRaw: null,
          noticeNumber: null,
          issuer: "厚生労働大臣",
          bindingLevel: docType === "告示" ? "binding" : "reference",
          sourceUrl: KOKUJI_INDEX_URL,
          detailUrl: url,
          pdfUrl: /\.pdf(\?|$)/i.test(url) ? url : null,
          category: inferCategory(title),
          docType,
          lawRef: currentLaw,
        });
      }
    }
    console.log(`kokuji: ${rows.length}`);
    all.push(...rows);
  } catch (e) {
    console.warn(`skip kokuji: ${e.message}`);
  }

  // Filter out junk (must have detailUrl that's a real file)
  const filtered = all.filter(
    (r) =>
      r.detailUrl &&
      !r.detailUrl.endsWith("/") &&
      r.title.length > 4 &&
      !/^\d+$/.test(r.title),
  );

  // Dedup by detailUrl
  const seen = new Set();
  const dedup = [];
  for (const r of filtered) {
    if (seen.has(r.detailUrl)) continue;
    seen.add(r.detailUrl);
    dedup.push(r);
  }

  // Sort by issuedDate desc (nulls last), then assign id
  dedup.sort((a, b) => {
    if (a.issuedDate && b.issuedDate) return b.issuedDate.localeCompare(a.issuedDate);
    if (a.issuedDate) return -1;
    if (b.issuedDate) return 1;
    return 0;
  });
  const final = dedup.map((r, i) => ({
    id: `mhlw-notice-${String(i + 1).padStart(4, "0")}`,
    ...r,
  }));

  await writeFile(OUT_PATH, final.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  console.log(`\nwrote ${final.length} rows → ${OUT_PATH}`);
  const byType = final.reduce((acc, r) => {
    acc[r.docType] = (acc[r.docType] || 0) + 1;
    return acc;
  }, {});
  console.log("by docType:", byType);
  const byBinding = final.reduce((acc, r) => {
    acc[r.bindingLevel] = (acc[r.bindingLevel] || 0) + 1;
    return acc;
  }, {});
  console.log("by binding:", byBinding);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
