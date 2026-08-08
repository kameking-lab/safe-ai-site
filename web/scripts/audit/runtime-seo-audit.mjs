import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const baseUrl = process.env.SEO_AUDIT_BASE_URL ?? "http://127.0.0.1:3320";
const publicOrigin = "https://www.anzen-ai-portal.jp";
const concurrency = Number(process.env.SEO_AUDIT_CONCURRENCY ?? 24);
const evidenceRoot = process.env.SEO_AUDIT_EVIDENCE_ROOT
  ? resolve(process.env.SEO_AUDIT_EVIDENCE_ROOT)
  : resolve(process.cwd(), "../docs/audits/evidence/accuracy-ux-seo");
mkdirSync(evidenceRoot, { recursive: true });

function locs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
    match[1].replaceAll("&amp;", "&"),
  );
}

function urlEntries(xml) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => {
    const block = match[1];
    const loc = (block.match(/<loc>([^<]+)<\/loc>/) ?? [null, ""])[1]
      .replaceAll("&amp;", "&")
      .trim();
    const lastmod = (block.match(/<lastmod>([^<]+)<\/lastmod>/) ?? [
      null,
      "",
    ])[1].trim();
    return { loc, lastmod };
  });
}

function normaliseUrl(value) {
  return value.replace(/\/$/, "");
}

function localUrl(publicUrl) {
  const url = new URL(publicUrl);
  return `${baseUrl}${url.pathname}${url.search}`;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: "manual",
      headers: {
        "user-agent": "safe-ai-local-seo-audit/2026-07-24",
        ...(options.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function getText(url) {
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

const sitemapIndex = await getText(`${baseUrl}/sitemap-index.xml`);
const childSitemaps = locs(sitemapIndex);
if (childSitemaps.length === 0) {
  throw new Error("sitemap-index.xml contains no child sitemap");
}

const sitemapContents = await Promise.all(
  childSitemaps.map(async (publicUrl) => ({
    publicUrl,
    xml: await getText(localUrl(publicUrl)),
  })),
);
const sitemapUrls = [
  ...new Set(sitemapContents.flatMap(({ xml }) => locs(xml))),
].sort();
const sitemapEntries = sitemapContents
  .flatMap(({ xml }) => urlEntries(xml))
  .filter((entry) => entry.loc);

writeFileSync(
  resolve(evidenceRoot, "sitemap-runtime-urls.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      baseUrl,
      childSitemaps,
      urls: sitemapUrls,
      entries: sitemapEntries,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

const failures = [];
const statusCounts = {};
let jsonLdScripts = 0;
let completed = 0;

async function auditUrl(publicUrl) {
  let response;
  let error;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      response = await fetchWithTimeout(localUrl(publicUrl));
      error = undefined;
      break;
    } catch (caught) {
      error = caught;
    }
  }
  if (!response) {
    failures.push({
      url: publicUrl,
      type: "fetch-error",
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  statusCounts[response.status] = (statusCounts[response.status] ?? 0) + 1;
  if (response.status !== 200) {
    failures.push({
      url: publicUrl,
      type: "http-status",
      status: response.status,
      location: response.headers.get("location"),
    });
    return;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return;

  const html = await response.text();
  const canonicalMatch =
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i.exec(
      html,
    );
  const canonical = canonicalMatch
    ? new URL(canonicalMatch[1], publicOrigin).toString()
    : "";
  if (!canonical) {
    failures.push({ url: publicUrl, type: "missing-canonical" });
  } else if (normaliseUrl(canonical) !== normaliseUrl(publicUrl)) {
    failures.push({
      url: publicUrl,
      type: "canonical-mismatch",
      canonical,
    });
  }

  const robots =
    /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["'][^>]*>/i.exec(
      html,
    )?.[1] ?? "";
  if (/noindex/i.test(robots)) {
    failures.push({ url: publicUrl, type: "sitemap-noindex", robots });
  }

  let scriptIndex = 0;
  for (const match of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    jsonLdScripts += 1;
    try {
      JSON.parse(match[1]);
    } catch (caught) {
      failures.push({
        url: publicUrl,
        type: "jsonld-syntax",
        scriptIndex,
        message: caught instanceof Error ? caught.message : String(caught),
      });
    }
    scriptIndex += 1;
  }
}

let cursor = 0;
async function worker() {
  while (cursor < sitemapUrls.length) {
    const index = cursor;
    cursor += 1;
    await auditUrl(sitemapUrls[index]);
    completed += 1;
    if (completed % 500 === 0 || completed === sitemapUrls.length) {
      process.stdout.write(
        `audited ${completed}/${sitemapUrls.length}; failures=${failures.length}\n`,
      );
    }
  }
}

await Promise.all(
  Array.from({ length: Math.max(1, concurrency) }, () => worker()),
);

const quarantineChecks = [];
for (const route of [
  "/circulars/mhlw-notice-0870",
  "/circulars/mhlw-notice-1000",
  "/circulars/mhlw-notice-1069",
]) {
  const response = await fetchWithTimeout(`${baseUrl}${route}`);
  quarantineChecks.push({ route, status: response.status });
  if (response.status !== 404) {
    failures.push({
      url: `${publicOrigin}${route}`,
      type: "quarantine-reachable",
      status: response.status,
    });
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  sitemapCount: childSitemaps.length,
  sitemapUrlCount: sitemapUrls.length,
  statusCounts,
  jsonLdScripts,
  failureCount: failures.length,
  failureTypes: Object.fromEntries(
    [...new Set(failures.map((failure) => failure.type))]
      .sort()
      .map((type) => [
        type,
        failures.filter((failure) => failure.type === type).length,
      ]),
  ),
  quarantineChecks,
};

writeFileSync(
  resolve(evidenceRoot, "sitemap-http-canonical-indexability.json"),
  `${JSON.stringify({ summary, failures }, null, 2)}\n`,
  "utf8",
);
writeFileSync(
  resolve(evidenceRoot, "sitemap-http-summary.json"),
  `${JSON.stringify(summary, null, 2)}\n`,
  "utf8",
);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (failures.length > 0) process.exitCode = 1;
