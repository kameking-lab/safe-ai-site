#!/usr/bin/env node
/**
 * Autonomous RSS news-feed fetcher for labor-accident reporting.
 *
 * Stage 1 of the B.2 pipeline:
 *   fetch-news-feed.mjs  -> emits scripts/etl/data/news-feed-candidates.json
 *   news-ai-judge.mjs    -> reads that file, judges with Gemini, writes
 *                            web/src/data/news-feed/{approved,rejected}/index.json
 *
 * Design notes
 * ------------
 *  - Only headline + source URL is retained. No verbatim body text.
 *  - Independent AI summaries are produced in stage 2 (news-ai-judge.mjs),
 *    not here, so this script is offline-friendly when the Gemini key is
 *    unset.
 *  - Sources are restricted to outlets whose redistribution status is
 *    unambiguous:
 *       * NHK NEWS WEB RSS  - public RSS, headline citation under Article 32
 *       * MHLW press releases - public-sector works (Copyright Act art. 13)
 *  - Industry papers, Kyodo/Jiji and the MHLW accident database are NOT
 *    fetched here; their ToS forbid systematic redistribution.
 *
 * Output: writes scripts/etl/data/news-feed-candidates.json
 *   { fetchedAt: ISO, candidates: Array<RawCandidate> }
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.join(__dirname, "data");
const CANDIDATES_PATH = path.join(DATA_DIR, "news-feed-candidates.json");

const APPROVED_PATH = path.join(
  REPO_ROOT,
  "web",
  "src",
  "data",
  "news-feed",
  "approved",
  "index.json",
);
const REJECTED_PATH = path.join(
  REPO_ROOT,
  "web",
  "src",
  "data",
  "news-feed",
  "rejected",
  "index.json",
);

const USER_AGENT =
  "ANZEN-AI/labor-news-bot (+https://anzen-ai.example.jp) contact: safety@example.jp";

const FETCH_TIMEOUT_MS = 15_000;

/**
 * Source registry. Each entry MUST be one of:
 *   - kind: "rss"  – standard RSS 2.0 with <item><title><link><pubDate>
 *   - kind: "atom" – Atom feed with <entry><title><link href="..">
 *
 * The matchKeywords pass is strictly a coarse pre-filter; the AI judge gate
 * is the authoritative relevance check.
 */
const SOURCES = [
  {
    id: "nhk-shakai",
    name: "NHK NEWS WEB（社会）",
    publisher: "日本放送協会",
    kind: "rss",
    url: "https://www3.nhk.or.jp/rss/news/cat1.xml",
  },
  {
    id: "nhk-keizai",
    name: "NHK NEWS WEB（経済）",
    publisher: "日本放送協会",
    kind: "rss",
    url: "https://www3.nhk.or.jp/rss/news/cat5.xml",
  },
  {
    id: "mhlw-houdou",
    name: "厚生労働省 報道発表資料",
    publisher: "厚生労働省",
    kind: "rss",
    url: "https://www.mhlw.go.jp/stf/news.rdf",
  },
];

const KEYWORD_PATTERNS = [
  /労働災害/, /労災/, /墜落/, /転落/, /倒壊/, /崩壊/, /巻き?込まれ/,
  /挟まれ/, /はさまれ/, /感電/, /熱中症/, /酸素欠乏/, /酸欠/,
  /死亡事故/, /作業員/, /工事現場/, /建設現場/, /工場.*事故/,
  /労働基準/, /安全衛生/, /厚生労働省.*災害/, /災害発生/, /労働者.*死亡/,
  /労働者.*けが/, /墜落防止/, /足場.*崩/, /クレーン.*事故/,
  /フォークリフト.*事故/, /石綿/, /アスベスト/, /有害物質.*ばく露/,
];

/* ---------------------------------------------------------------------- */
/* utilities                                                              */
/* ---------------------------------------------------------------------- */

function hashId(url) {
  return crypto.createHash("sha256").update(url).digest("hex").slice(0, 16);
}

function nowIso() {
  return new Date().toISOString();
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJsonOrDefault(p, fallback) {
  try {
    const raw = await fs.readFile(p, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err && /** @type {NodeJS.ErrnoException} */ (err).code === "ENOENT") {
      return fallback;
    }
    throw err;
  }
}

async function fetchWithTimeout(url) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
      },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

/* ---------------------------------------------------------------------- */
/* lightweight RSS / Atom parser                                          */
/* ---------------------------------------------------------------------- */

function stripCdata(s) {
  if (!s) return "";
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

function pickTag(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  return m ? stripCdata(m[1]) : "";
}

function pickAttr(block, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["']`, "i");
  const m = block.match(re);
  return m ? m[1] : "";
}

function parseRssItems(xml) {
  const items = [];
  const itemRe = /<item[\s>][\s\S]*?<\/item>/gi;
  for (const m of xml.matchAll(itemRe)) {
    const block = m[0];
    const title = pickTag(block, "title");
    const link = pickTag(block, "link");
    const pubDate = pickTag(block, "pubDate") || pickTag(block, "dc:date");
    if (!title || !link) continue;
    items.push({ title, link, pubDate });
  }
  return items;
}

function parseAtomEntries(xml) {
  const items = [];
  const entryRe = /<entry[\s>][\s\S]*?<\/entry>/gi;
  for (const m of xml.matchAll(entryRe)) {
    const block = m[0];
    const title = pickTag(block, "title");
    let link = pickAttr(block, "link", "href");
    if (!link) link = pickTag(block, "link");
    const pubDate = pickTag(block, "updated") || pickTag(block, "published");
    if (!title || !link) continue;
    items.push({ title, link, pubDate });
  }
  return items;
}

function parseFeed(kind, xml) {
  if (kind === "atom") return parseAtomEntries(xml);
  return parseRssItems(xml);
}

/* ---------------------------------------------------------------------- */
/* filtering + dedupe                                                     */
/* ---------------------------------------------------------------------- */

function matchesKeywords(title) {
  return KEYWORD_PATTERNS.some((re) => re.test(title));
}

/**
 * Collect every URL the pipeline has ever seen so we never re-judge an entry.
 * Approved + rejected are merged here; if a URL was rejected once it stays
 * rejected (the AI gate is deterministic enough at the score threshold that
 * re-rolling the dice would just waste API quota).
 */
async function loadSeenIds() {
  const approved = await readJsonOrDefault(APPROVED_PATH, { entries: [] });
  const rejected = await readJsonOrDefault(REJECTED_PATH, { entries: [] });
  const ids = new Set();
  for (const list of [approved.entries ?? [], rejected.entries ?? []]) {
    for (const e of list) {
      if (e && typeof e.id === "string") ids.add(e.id);
      if (e && e.source && typeof e.source.url === "string") {
        ids.add(hashId(e.source.url));
      }
    }
  }
  return ids;
}

/* ---------------------------------------------------------------------- */
/* main                                                                   */
/* ---------------------------------------------------------------------- */

async function main() {
  await ensureDir(DATA_DIR);
  const seen = await loadSeenIds();

  const fetchedAt = nowIso();
  const candidates = [];
  const stats = {};

  for (const src of SOURCES) {
    const srcStats = { fetched: 0, matched: 0, deduped: 0, error: null };
    try {
      const xml = await fetchWithTimeout(src.url);
      const items = parseFeed(src.kind, xml);
      srcStats.fetched = items.length;
      for (const it of items) {
        if (!matchesKeywords(it.title)) continue;
        srcStats.matched += 1;
        const id = hashId(it.link);
        if (seen.has(id)) {
          srcStats.deduped += 1;
          continue;
        }
        seen.add(id);
        candidates.push({
          id,
          headline: it.title,
          source: {
            name: src.name,
            url: it.link,
            publisher: src.publisher,
            publishedAt: it.pubDate || undefined,
            fetchedAt,
          },
        });
      }
    } catch (err) {
      srcStats.error = err && err.message ? err.message : String(err);
      console.warn(`[fetch-news-feed] ${src.id} failed: ${srcStats.error}`);
    }
    stats[src.id] = srcStats;
  }

  const out = { fetchedAt, candidates, stats };
  await fs.writeFile(CANDIDATES_PATH, JSON.stringify(out, null, 2), "utf8");

  const totalCandidates = candidates.length;
  console.log(
    `[fetch-news-feed] wrote ${totalCandidates} new candidates -> ${path.relative(REPO_ROOT, CANDIDATES_PATH)}`,
  );
  for (const [id, s] of Object.entries(stats)) {
    console.log(
      `  ${id}: fetched=${s.fetched} matched=${s.matched} deduped=${s.deduped}${s.error ? " err=" + s.error : ""}`,
    );
  }
}

main().catch((err) => {
  console.error("[fetch-news-feed] fatal:", err);
  process.exit(1);
});
