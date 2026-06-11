// 本番ページのSEOメタ一斉抽出（独立酷評レビュー用・読み取り専用）
// usage: node meta-audit.mjs <url-list-file> <out-ndjson>
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";

const [, , listFile, outFile] = process.argv;
const urls = readFileSync(listFile, "utf8").split(/\r?\n/).filter(Boolean);
writeFileSync(outFile, "");

function pick(re, html) {
  const m = html.match(re);
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}
function pickAll(re, html) {
  return [...html.matchAll(re)].map((m) => m[1]);
}

const CONCURRENCY = 8;
let i = 0;
async function worker() {
  while (i < urls.length) {
    const url = urls[i++];
    const row = { url };
    try {
      const t0 = Date.now();
      const res = await fetch(url, { redirect: "manual", headers: { "user-agent": "Mozilla/5.0 (site-critique-audit)" } });
      row.status = res.status;
      row.ms = Date.now() - t0;
      if (res.status >= 300 && res.status < 400) {
        row.location = res.headers.get("location");
      }
      if (res.status === 200 && (res.headers.get("content-type") || "").includes("text/html")) {
        const html = await res.text();
        row.bytes = html.length;
        row.title = pick(/<title[^>]*>([^<]*)<\/title>/i, html);
        row.titleLen = row.title ? row.title.length : 0;
        row.desc = pick(/<meta\s+name="description"\s+content="([^"]*)"/i, html) || pick(/<meta\s+content="([^"]*)"\s+name="description"/i, html);
        row.descLen = row.desc ? row.desc.length : 0;
        row.canonical = pick(/<link\s+rel="canonical"\s+href="([^"]*)"/i, html);
        row.ogTitle = !!html.match(/property="og:title"/i);
        row.ogImage = pick(/<meta\s+property="og:image"\s+content="([^"]*)"/i, html);
        row.robotsMeta = pick(/<meta\s+name="robots"\s+content="([^"]*)"/i, html);
        const ldBlocks = pickAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi, html);
        row.jsonLdTypes = [];
        for (const b of ldBlocks) {
          try {
            const j = JSON.parse(b);
            const arr = Array.isArray(j) ? j : j["@graph"] ? j["@graph"] : [j];
            for (const o of arr) if (o && o["@type"]) row.jsonLdTypes.push(String(o["@type"]));
          } catch { row.jsonLdTypes.push("PARSE_ERROR"); }
        }
        row.h1 = pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html)?.replace(/<[^>]+>/g, "").trim() ?? null;
        row.h1Count = (html.match(/<h1[\s>]/gi) || []).length;
        const body = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");
        row.textLen = body.replace(/\s+/g, "").length;
        row.hasNoscript = /<noscript/i.test(html);
      }
    } catch (e) {
      row.error = String(e.message || e).slice(0, 120);
    }
    appendFileSync(outFile, JSON.stringify(row) + "\n");
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log("META AUDIT DONE:", urls.length, "urls ->", outFile);
