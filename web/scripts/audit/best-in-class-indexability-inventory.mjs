#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

const webRoot = process.cwd();
const repoRoot = resolve(webRoot, "..");
const nextRoot = join(webRoot, ".next");
const serverAppRoot = join(nextRoot, "server", "app");
const publicOrigin = "https://www.anzen-ai-portal.jp";
const localOrigin =
  process.env.INDEXABILITY_BASE_URL ?? "http://127.0.0.1:3320";
const reviewedAt = process.env.INDEXABILITY_REVIEWED_AT ?? "2026-07-26";
const evidenceRoot = process.env.INDEXABILITY_EVIDENCE_ROOT
  ? resolve(process.env.INDEXABILITY_EVIDENCE_ROOT)
  : join(
      repoRoot,
      "docs",
      "audits",
      "evidence",
      "best-in-class-resume-2026-07-26",
      "indexability",
    );
const outputCsv = process.env.INDEXABILITY_OUTPUT_CSV
  ? resolve(process.env.INDEXABILITY_OUTPUT_CSV)
  : join(
      repoRoot,
      "docs",
      "audits",
      "seo-indexability-inventory-2026-07-24.csv",
    );
const sitemapFile = process.env.INDEXABILITY_SITEMAP_FILE
  ? resolve(process.env.INDEXABILITY_SITEMAP_FILE)
  : join(
      repoRoot,
      "docs",
      "audits",
      "evidence",
      "best-in-class-resume-2026-07-26",
      "runtime-seo",
      "sitemap-runtime-urls.json",
    );

for (const required of [
  join(nextRoot, "prerender-manifest.json"),
  join(nextRoot, "routes-manifest.json"),
  join(nextRoot, "server", "app-paths-manifest.json"),
]) {
  if (!existsSync(required)) {
    throw new Error(`production build manifest is missing: ${required}`);
  }
}

mkdirSync(evidenceRoot, { recursive: true });
mkdirSync(dirname(outputCsv), { recursive: true });

const prerenderManifest = JSON.parse(
  readFileSync(join(nextRoot, "prerender-manifest.json"), "utf8"),
);
const routesManifest = JSON.parse(
  readFileSync(join(nextRoot, "routes-manifest.json"), "utf8"),
);
const appPathsManifest = JSON.parse(
  readFileSync(join(nextRoot, "server", "app-paths-manifest.json"), "utf8"),
);
const sitemapPayload = existsSync(sitemapFile)
  ? JSON.parse(readFileSync(sitemapFile, "utf8"))
  : { urls: [] };

const sitemapUrls = new Set(
  (sitemapPayload.urls ?? []).map((value) => normalisePublicUrl(value)),
);
const sitemapLastmodByUrl = new Map(
  (sitemapPayload.entries ?? []).map((entry) => [
    normalisePublicUrl(entry.loc),
    entry.lastmod ?? "",
  ]),
);

const humanReviewExact = new Set([
  "/heat-illness-prevention",
  "/heat-illness-prevention/slides",
  "/heat-illness-prevention/elearning",
  "/articles/heat-stroke-2025-mandatory",
]);
const quarantinePrefixes = [
  "/accidents",
  "/court-cases",
  "/e-learning",
  "/education",
  "/equipment",
  "/equipment-finder",
  "/faq",
  "/health-checkup-scheduler",
  "/safety-signs",
  "/work-environment-measurement",
];

function csv(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function decodeHtml(value = "") {
  return String(value)
    .replace(/&#(\d+);/g, (_, number) =>
      String.fromCodePoint(Number(number)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, number) =>
      String.fromCodePoint(Number.parseInt(number, 16)),
    )
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&nbsp;", " ");
}

function stripTags(value = "") {
  return decodeHtml(value)
    .replace(/<(script|style|svg|noscript)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function attrMap(source) {
  const attributes = {};
  const pattern =
    /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = pattern.exec(source))) {
    attributes[match[1].toLowerCase()] = decodeHtml(
      match[2] ?? match[3] ?? match[4] ?? "",
    );
  }
  return attributes;
}

function extractMetadata(html, responseHeaders = {}) {
  const canonical = [];
  let match;
  const linkPattern = /<link\b([^>]*)>/gi;
  while ((match = linkPattern.exec(html))) {
    const attributes = attrMap(match[1]);
    if (
      (attributes.rel ?? "").toLowerCase().split(/\s+/).includes("canonical")
    ) {
      canonical.push(normalisePublicUrl(attributes.href ?? ""));
    }
  }

  const meta = {};
  const metaPattern = /<meta\b([^>]*)>/gi;
  while ((match = metaPattern.exec(html))) {
    const attributes = attrMap(match[1]);
    const key = (attributes.name || attributes.property || "").toLowerCase();
    if (key && !(key in meta)) meta[key] = attributes.content ?? "";
  }

  const jsonLdErrors = [];
  let jsonLdCount = 0;
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  while ((match = scriptPattern.exec(html))) {
    const attributes = attrMap(match[1]);
    if ((attributes.type ?? "").toLowerCase() !== "application/ld+json") {
      continue;
    }
    jsonLdCount += 1;
    try {
      JSON.parse(decodeHtml(match[2]).trim());
    } catch (error) {
      jsonLdErrors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const title =
    stripTags((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) ?? [])[1]) ??
    "";
  const h1 =
    stripTags((html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) ?? [])[1]) ?? "";
  const body = (html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i) ?? [
    null,
    html,
  ])[1];
  const visibleTextLength = stripTags(body).length;
  const headerRobots = String(
    responseHeaders["x-robots-tag"] ?? responseHeaders["X-Robots-Tag"] ?? "",
  );

  return {
    title,
    h1,
    description: meta.description ?? "",
    robots: [meta.robots, meta.googlebot, headerRobots]
      .filter(Boolean)
      .join(" | "),
    canonical,
    visibleTextLength,
    jsonLdCount,
    jsonLdErrorCount: jsonLdErrors.length,
  };
}

function normalisePath(value) {
  if (!value) return "/";
  const withoutTrailingSlash = value.replace(/\/+$/, "");
  return withoutTrailingSlash || "/";
}

function normalisePublicUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value, publicOrigin);
    return `${url.origin}${normalisePath(url.pathname)}${url.search}`;
  } catch {
    return value;
  }
}

function pathFromPublicUrl(value) {
  try {
    const url = new URL(value, publicOrigin);
    return `${normalisePath(url.pathname)}${url.search}`;
  } catch {
    return "";
  }
}

function artifactBase(route) {
  return route === "/"
    ? join(serverAppRoot, "index")
    : join(serverAppRoot, route.replace(/^\/+/, ""));
}

function readPrerenderRecord(route) {
  const base = artifactBase(route);
  const htmlPath = `${base}.html`;
  const metaPath = `${base}.meta`;
  const html = existsSync(htmlPath) ? readFileSync(htmlPath, "utf8") : "";
  const responseMeta = existsSync(metaPath)
    ? JSON.parse(readFileSync(metaPath, "utf8"))
    : {};
  const status = Number(
    responseMeta.status ??
      prerenderManifest.routes[route]?.initialStatus ??
      (route === "/_not-found" ? 404 : 200),
  );
  return {
    status,
    location: responseMeta.headers?.location ?? "",
    contentType: responseMeta.headers?.["content-type"] ?? "",
    html,
    metadata: extractMetadata(html, responseMeta.headers ?? {}),
    error: html ? "" : "prerender HTML artifact missing",
  };
}

async function fetchRuntimeRecord(route) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${localOrigin}${route}`, {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "safe-ai-local-indexability-audit/2026-07-26",
      },
    });
    const contentType = response.headers.get("content-type") ?? "";
    const html = contentType.includes("text/html")
      ? await response.text()
      : "";
    return {
      status: response.status,
      location: response.headers.get("location") ?? "",
      contentType,
      html,
      metadata: extractMetadata(html, {
        "x-robots-tag": response.headers.get("x-robots-tag") ?? "",
      }),
      error: "",
    };
  } catch (error) {
    return {
      status: 0,
      location: "",
      contentType: "",
      html: "",
      metadata: extractMetadata(""),
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function mapConcurrent(values, concurrency, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= values.length) return;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, () => worker()),
  );
  return results;
}

function isQuarantineRoute(route) {
  const noticeMatch =
    /^\/circulars\/mhlw-notice-(\d{4})$/.exec(normalisePath(route));
  if (noticeMatch) {
    const sequence = Number(noticeMatch[1]);
    if (sequence >= 870 && sequence <= 1069) return true;
  }
  return quarantinePrefixes.some(
    (prefix) => route === prefix || route.startsWith(`${prefix}/`),
  );
}

function classify(route, runtime) {
  const metadata = runtime.metadata;
  const canonical = metadata.canonical[0] ?? "";
  const expectedCanonical = normalisePublicUrl(`${publicOrigin}${route}`);

  if (isQuarantineRoute(route)) {
    return {
      classification: "quarantine",
      reason:
        "コード上の隔離境界。HTTP状態にかかわらずsitemap・検索候補から除外する。",
    };
  }
  if (runtime.status === 404 || route === "/_not-found") {
    return { classification: "404", reason: "実HTTPまたはbuild出力が404。" };
  }
  if (runtime.status === 410) {
    return { classification: "410", reason: "実HTTPが410。" };
  }
  if (
    runtime.status >= 300 &&
    runtime.status < 400
  ) {
    return {
      classification: "redirect",
      reason: `実HTTP ${runtime.status} → ${runtime.location || "(Locationなし)"}`,
    };
  }
  if (runtime.status !== 200) {
    return {
      classification: "人手確認待ち",
      reason: `HTTP ${runtime.status || "取得不能"}。${runtime.error}`.trim(),
    };
  }
  if (
    runtime.contentType &&
    !runtime.contentType.includes("text/html") &&
    !runtime.contentType.includes("application/xhtml+xml")
  ) {
    return {
      classification: "noindex",
      reason: `HTMLページではない技術出力(${runtime.contentType})。`,
    };
  }
  if (humanReviewExact.has(route)) {
    return {
      classification: "人手確認待ち",
      reason:
        "外部法務・編集・医学確認が未完了。noindex,followを維持する高リスク情報。",
    };
  }
  if (/noindex/i.test(metadata.robots)) {
    return {
      classification: "noindex",
      reason: "meta robotsまたはX-Robots-Tagでnoindexを確認。",
    };
  }
  if (
    metadata.canonical.length === 1 &&
    canonical &&
    canonical !== expectedCanonical
  ) {
    return {
      classification: "canonical統合",
      reason: `別canonicalへ統合: ${canonical}`,
    };
  }
  if (
    metadata.canonical.length !== 1 ||
    !metadata.title ||
    !metadata.h1 ||
    metadata.description.length < 35 ||
    metadata.visibleTextLength < 300
  ) {
    return {
      classification: "人手確認待ち",
      reason: `品質要素不足(canonical=${metadata.canonical.length}, title=${Boolean(
        metadata.title,
      )}, h1=${Boolean(metadata.h1)}, description=${
        metadata.description.length
      }, text=${metadata.visibleTextLength})`,
    };
  }
  return {
    classification: "index",
    reason: "HTTP 200・自己canonical・index可能・実質本文あり。",
  };
}

const prerenderRoutes = Object.keys(prerenderManifest.routes).map(
  normalisePath,
);
const staticPageRoutes = routesManifest.staticRoutes
  .map((record) => normalisePath(record.page))
  .filter(
    (route) =>
      !route.startsWith("/api/") &&
      !route.startsWith("/_next/") &&
      route !== "/_global-error",
  );
const concreteRedirectRoutes = routesManifest.redirects
  .map((record) => record.source)
  .filter(
    (route) =>
      typeof route === "string" &&
      !/[():*[\]]/.test(route) &&
      !route.startsWith("/api/"),
  )
  .map(normalisePath);
const sitemapRoutes = [...sitemapUrls]
  .map(pathFromPublicUrl)
  .filter((route) => route && !route.includes("?"));
const quarantineProbeRoutes = Array.from(
  { length: 200 },
  (_, index) =>
    `/circulars/mhlw-notice-${String(870 + index).padStart(4, "0")}`,
);

const allRoutes = [
  ...new Set([
    ...prerenderRoutes,
    ...staticPageRoutes,
    ...concreteRedirectRoutes,
    ...sitemapRoutes,
    ...quarantineProbeRoutes,
  ]),
].sort();
const prerenderRouteSet = new Set(prerenderRoutes);
const staticPageRouteSet = new Set(staticPageRoutes);
const redirectRouteSet = new Set(concreteRedirectRoutes);

const runtimeOnlyRoutes = allRoutes.filter(
  (route) => !prerenderRouteSet.has(route),
);
const runtimeResults = await mapConcurrent(
  runtimeOnlyRoutes,
  Number(process.env.INDEXABILITY_CONCURRENCY ?? 12),
  fetchRuntimeRecord,
);
const runtimeByRoute = new Map(
  runtimeOnlyRoutes.map((route, index) => [route, runtimeResults[index]]),
);

const rows = allRoutes.map((route, index) => {
  const runtime = prerenderRouteSet.has(route)
    ? readPrerenderRecord(route)
    : runtimeByRoute.get(route);
  const { classification, reason } = classify(route, runtime);
  const url = normalisePublicUrl(`${publicOrigin}${route}`);
  const routeSources = [
    prerenderRouteSet.has(route) ? "prerender-manifest" : "",
    staticPageRouteSet.has(route) ? "routes-manifest" : "",
    redirectRouteSet.has(route) ? "redirect-manifest" : "",
    sitemapUrls.has(url) ? "runtime-sitemap" : "",
    isQuarantineRoute(route) ? "quarantine-registry" : "",
  ].filter(Boolean);
  return {
    record_id: index + 1,
    url,
    route,
    route_sources: routeSources.join(" | "),
    http_status: runtime.status,
    classification,
    canonical: runtime.metadata.canonical.join(" | "),
    canonical_count: runtime.metadata.canonical.length,
    robots: runtime.metadata.robots,
    title: runtime.metadata.title,
    h1: runtime.metadata.h1,
    description_length: runtime.metadata.description.length,
    visible_text_length: runtime.metadata.visibleTextLength,
    sitemap_member: sitemapUrls.has(url),
    sitemap_lastmod: sitemapLastmodByUrl.get(url) ?? "",
    jsonld_blocks: runtime.metadata.jsonLdCount,
    jsonld_parse_errors: runtime.metadata.jsonLdErrorCount,
    location: runtime.location,
    reason,
    reviewed_at: reviewedAt,
  };
});

const rowByUrl = new Map(rows.map((row) => [row.url, row]));
const canonicalTargetFailures = rows
  .filter((row) => row.classification === "canonical統合")
  .map((row) => {
    const target = normalisePublicUrl(row.canonical.split(" | ")[0] ?? "");
    const targetRow = rowByUrl.get(target);
    return {
      url: row.url,
      target,
      targetFound: Boolean(targetRow),
      targetStatus: targetRow?.http_status ?? null,
      targetClassification: targetRow?.classification ?? null,
    };
  })
  .filter(
    (record) =>
      !record.targetFound ||
      record.targetStatus !== 200 ||
      record.targetClassification !== "index",
  );
const sitemapForbiddenRows = rows.filter(
  (row) =>
    row.sitemap_member &&
    row.classification !== "index",
);
const sitemapQueryUrls = [...sitemapUrls].filter((url) => url.includes("?"));
const sitemapUnknownUrls = [...sitemapUrls].filter((url) => !rowByUrl.has(url));
const duplicateUrls = rows
  .filter((row, index) => rows.findIndex((other) => other.url === row.url) !== index)
  .map((row) => row.url);

const dynamicRoutePatterns = routesManifest.dynamicRoutes
  .map((record) => record.page)
  .filter((route) => !route.startsWith("/api/"))
  .sort();
const appPageKeys = Object.keys(appPathsManifest)
  .filter((key) => key === "/page" || key.endsWith("/page"))
  .sort();

const columns = [
  "record_id",
  "url",
  "route",
  "route_sources",
  "http_status",
  "classification",
  "canonical",
  "canonical_count",
  "robots",
  "title",
  "h1",
  "description_length",
  "visible_text_length",
  "sitemap_member",
  "sitemap_lastmod",
  "jsonld_blocks",
  "jsonld_parse_errors",
  "location",
  "reason",
  "reviewed_at",
];
writeFileSync(
  outputCsv,
  `${[
    columns.map(csv).join(","),
    ...rows.map((row) => columns.map((column) => csv(row[column])).join(",")),
  ].join("\n")}\n`,
  "utf8",
);

const classificationCounts = Object.fromEntries(
  [...new Set(rows.map((row) => row.classification))]
    .sort()
    .map((classification) => [
      classification,
      rows.filter((row) => row.classification === classification).length,
    ]),
);
const summary = {
  generatedAt: new Date().toISOString(),
  reviewedAt,
  build: {
    buildId: existsSync(join(nextRoot, "BUILD_ID"))
      ? readFileSync(join(nextRoot, "BUILD_ID"), "utf8").trim()
      : null,
    prerenderManifestModifiedAt: statSync(
      join(nextRoot, "prerender-manifest.json"),
    ).mtime.toISOString(),
    prerenderRouteCount: prerenderRoutes.length,
    staticPageRouteCount: staticPageRoutes.length,
    dynamicPagePatternCount: dynamicRoutePatterns.length,
    appPageKeyCount: appPageKeys.length,
    redirectManifestCount: routesManifest.redirects.length,
  },
  universe: {
    urlRowCount: rows.length,
    sitemapUrlCount: sitemapUrls.size,
    quarantineProbeCount: quarantineProbeRoutes.length,
    classificationCounts,
    duplicateUrlCount: new Set(duplicateUrls).size,
  },
  checks: {
    sitemapForbiddenCount: sitemapForbiddenRows.length,
    sitemapQueryUrlCount: sitemapQueryUrls.length,
    sitemapUnknownUrlCount: sitemapUnknownUrls.length,
    canonicalTargetFailureCount: canonicalTargetFailures.length,
    jsonLdParseErrorCount: rows.reduce(
      (total, row) => total + row.jsonld_parse_errors,
      0,
    ),
    runtimeFetchErrorCount: rows.filter((row) => row.http_status === 0).length,
  },
  policy: {
    csvUnit: "実在または具体的に検査可能なURLを1行1件",
    dynamicPatterns:
      "値を列挙できない動的route patternはURL件数へ混ぜず別JSONへ記録",
    categories: [
      "index",
      "noindex",
      "人手確認待ち",
      "canonical統合",
      "redirect",
      "404",
      "410",
      "quarantine",
    ],
  },
  outputCsv,
};

writeFileSync(
  join(evidenceRoot, "indexability-summary.json"),
  `${JSON.stringify(summary, null, 2)}\n`,
  "utf8",
);
writeFileSync(
  join(evidenceRoot, "indexability-anomalies.json"),
  `${JSON.stringify(
    {
      sitemapForbiddenRows,
      sitemapQueryUrls,
      sitemapUnknownUrls,
      canonicalTargetFailures,
      duplicateUrls: [...new Set(duplicateUrls)],
      runtimeFetchErrors: rows.filter((row) => row.http_status === 0),
    },
    null,
    2,
  )}\n`,
  "utf8",
);
writeFileSync(
  join(evidenceRoot, "dynamic-route-patterns.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      patterns: dynamicRoutePatterns,
      note: "パラメータ値のないroute patternは実URL inventoryへ加算していない。",
    },
    null,
    2,
  )}\n`,
  "utf8",
);
writeFileSync(
  join(evidenceRoot, "app-page-manifest-keys.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      keys: appPageKeys,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

process.stdout.write(
  `${JSON.stringify(
    {
      outputCsv,
      evidenceRoot,
      rowCount: rows.length,
      classificationCounts,
      checks: summary.checks,
    },
    null,
    2,
  )}\n`,
);

if (
  sitemapForbiddenRows.length > 0 ||
  sitemapQueryUrls.length > 0 ||
  sitemapUnknownUrls.length > 0 ||
  canonicalTargetFailures.length > 0 ||
  duplicateUrls.length > 0 ||
  summary.checks.jsonLdParseErrorCount > 0 ||
  summary.checks.runtimeFetchErrorCount > 0
) {
  process.exitCode = 1;
}
