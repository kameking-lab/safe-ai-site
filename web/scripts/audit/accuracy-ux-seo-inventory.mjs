import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

const webRoot = process.cwd();
const repoRoot = resolve(webRoot, "..");
const nextRoot = join(webRoot, ".next");
const serverAppRoot = join(nextRoot, "server", "app");
const auditRoot = join(repoRoot, "docs", "audits");
const evidenceRoot = process.env.AUDIT_EVIDENCE_ROOT
  ? resolve(process.env.AUDIT_EVIDENCE_ROOT)
  : join(auditRoot, "evidence", "accuracy-ux-seo");
const outputCsv = process.env.AUDIT_OUTPUT_CSV
  ? resolve(process.env.AUDIT_OUTPUT_CSV)
  : join(auditRoot, "seo-indexability-inventory-2026-07-23.csv");
const siteOrigin = "https://www.anzen-ai-portal.jp";
const reviewedAt = process.env.AUDIT_REVIEWED_AT ?? "2026-07-23";

mkdirSync(evidenceRoot, { recursive: true });

const prerenderManifest = JSON.parse(
  readFileSync(join(nextRoot, "prerender-manifest.json"), "utf8"),
);

const runtimeSitemapPath = join(evidenceRoot, "sitemap-runtime-urls.json");
const runtimeSitemapUrls = existsSync(runtimeSitemapPath)
  ? new Set(JSON.parse(readFileSync(runtimeSitemapPath, "utf8")).urls ?? [])
  : new Set();

function readBuildTaskCount() {
  const buildLogPath = join(evidenceRoot, "final-production-build.log");
  if (!existsSync(buildLogPath)) return null;
  const buffer = readFileSync(buildLogPath);
  const encoding =
    buffer[0] === 0xff && buffer[1] === 0xfe ? "utf16le" : "utf8";
  const content = buffer.toString(encoding);
  const matches = [
    ...content.matchAll(/Generating static pages[^\r\n]*\((\d+)\/(\d+)\)/g),
  ];
  const last = matches.at(-1);
  return last ? Number(last[2]) : null;
}

function csv(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function decodeHtml(value = "") {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extract(html, pattern) {
  const match = pattern.exec(html);
  return match ? decodeHtml(match[1]) : "";
}

function absoluteUrl(route) {
  return route === "/" ? siteOrigin : `${siteOrigin}${route}`;
}

function artifactBase(route) {
  if (route === "/") return join(serverAppRoot, "index");
  return join(serverAppRoot, route.slice(1));
}

function normaliseInternalHref(value) {
  if (!value || value.startsWith("#")) return null;
  try {
    const url = new URL(value, siteOrigin);
    if (url.origin !== siteOrigin) return null;
    const path = decodeURIComponent(url.pathname).replace(/\/+$/, "") || "/";
    if (
      path.startsWith("/api/") ||
      path.startsWith("/_next/") ||
      path.match(/\.(?:png|jpe?g|webp|svg|ico|pdf|xml|txt|json)$/i)
    ) {
      return null;
    }
    return path;
  } catch {
    return null;
  }
}

function isExplicitReviewRoute(route) {
  return [
    "/api-docs",
    "/dev/",
    "/lms",
    "/organization",
    "/qa-knowledge",
    "/stats",
  ].some((prefix) => route === prefix || route.startsWith(prefix));
}

function classify(record) {
  if (record.route === "/_not-found" || record.status === 404) {
    return ["404", "Not Found出力"];
  }
  if (record.status === 410) return ["410", "明示的な410"];
  if (record.status === 308) {
    return ["301", `恒久リダイレクト（実HTTP 308）→ ${record.location}`];
  }
  if (record.status >= 300 && record.status < 400) {
    return [
      "canonical統合",
      `一時リダイレクト（実HTTP ${record.status}）→ ${record.location}`,
    ];
  }
  if (record.route.includes("quarantine")) {
    return ["quarantine", "quarantine経路"];
  }
  if (record.kind === "technical-output") {
    return ["noindex", "HTMLページではない技術出力"];
  }
  if (record.noindex) return ["noindex", "robots noindexを確認"];
  if (record.canonical && record.canonical !== record.url) {
    return ["canonical統合", `別canonicalへ統合: ${record.canonical}`];
  }
  if (
    record.route === "/search" ||
    record.route.startsWith("/search/") ||
    record.route === "/faq/search"
  ) {
    return ["noindex", "検索結果ページ"];
  }
  if (isExplicitReviewRoute(record.route)) {
    return ["人手確認待ち", "デモ・管理・薄い説明ページ候補"];
  }
  if (
    !record.title ||
    !record.h1 ||
    record.descriptionLength < 35 ||
    record.visibleTextLength < 300
  ) {
    return [
      "人手確認待ち",
      `品質要素不足(title=${Boolean(record.title)}, h1=${Boolean(
        record.h1,
      )}, description=${record.descriptionLength}, text=${record.visibleTextLength})`,
    ];
  }
  return ["index維持", "自己canonical・index可能・実質本文あり"];
}

const records = [];
const outgoingByRoute = new Map();
const jsonLdFailures = [];
let jsonLdScripts = 0;

for (const route of Object.keys(prerenderManifest.routes).sort()) {
  const base = artifactBase(route);
  const htmlPath = `${base}.html`;
  const bodyPath = `${base}.body`;
  const metaPath = `${base}.meta`;
  const html = existsSync(htmlPath) ? readFileSync(htmlPath, "utf8") : "";
  const bodyExists = existsSync(bodyPath);
  const meta = existsSync(metaPath)
    ? JSON.parse(readFileSync(metaPath, "utf8"))
    : {};
  const status = Number(meta.status ?? 200);
  const headers = meta.headers ?? {};
  const canonicalRaw = extract(
    html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  );
  const canonical = canonicalRaw
    ? new URL(canonicalRaw, siteOrigin).toString().replace(/\/$/, "")
    : "";
  const title = extract(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = extract(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
  );
  const robots = extract(
    html,
    /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["'][^>]*>/i,
  );
  const h1 = extract(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const visibleText = decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " "),
  );
  const routeUrl = absoluteUrl(route).replace(/\/$/, "");

  const outgoing = new Set();
  for (const match of html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)) {
    const normalised = normaliseInternalHref(match[1]);
    if (normalised) outgoing.add(normalised);
  }
  outgoingByRoute.set(route, outgoing);

  let scriptIndex = 0;
  for (const match of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    jsonLdScripts += 1;
    try {
      JSON.parse(match[1]);
    } catch (error) {
      jsonLdFailures.push({
        route,
        scriptIndex,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    scriptIndex += 1;
  }

  const record = {
    route,
    url: routeUrl,
    kind: html ? "prerender-html" : bodyExists ? "technical-output" : "unknown",
    status,
    location: headers.location ?? "",
    title,
    h1,
    descriptionLength: description.length,
    canonical,
    robots,
    noindex:
      /noindex/i.test(robots) ||
      /noindex/i.test(String(headers["x-robots-tag"] ?? "")),
    visibleTextLength: visibleText.length,
    sitemapMember:
      runtimeSitemapUrls.size > 0
        ? runtimeSitemapUrls.has(routeUrl)
        : false,
  };
  const [classification, reason] = classify(record);
  records.push({ ...record, classification, reason });
}

const inbound = new Map(records.map((record) => [record.route, 0]));
for (const outgoing of outgoingByRoute.values()) {
  for (const route of outgoing) {
    if (inbound.has(route)) inbound.set(route, (inbound.get(route) ?? 0) + 1);
  }
}

const titleGroups = new Map();
for (const record of records) {
  if (
    !record.title ||
    record.kind !== "prerender-html" ||
    record.status !== 200 ||
    record.noindex ||
    (record.canonical && record.canonical !== record.url)
  ) {
    continue;
  }
  const group = titleGroups.get(record.title) ?? [];
  group.push(record.route);
  titleGroups.set(record.title, group);
}
const duplicateTitles = [...titleGroups.entries()]
  .filter(([, routes]) => routes.length > 1)
  .map(([title, routes]) => ({ title, count: routes.length, routes }));

const columns = [
  "record_id",
  "url",
  "route_kind",
  "http_status",
  "classification",
  "canonical",
  "robots",
  "title",
  "h1",
  "description_length",
  "visible_text_length",
  "internal_inlinks",
  "sitemap_member",
  "reason",
  "reviewed_at",
];
const lines = [columns.map(csv).join(",")];
records.forEach((record, index) => {
  lines.push(
    [
      index + 1,
      record.url,
      record.kind,
      record.status,
      record.classification,
      record.canonical,
      record.robots,
      record.title,
      record.h1,
      record.descriptionLength,
      record.visibleTextLength,
      inbound.get(record.route) ?? 0,
      record.sitemapMember,
      record.reason,
      reviewedAt,
    ]
      .map(csv)
      .join(","),
  );
});
writeFileSync(outputCsv, `${lines.join("\n")}\n`, "utf8");

const metadataCsv = join(evidenceRoot, "metadata-title-h1-description-canonical.csv");
writeFileSync(
  metadataCsv,
  `${[
    [
      "url",
      "title",
      "h1",
      "description_length",
      "canonical",
      "robots",
    ]
      .map(csv)
      .join(","),
    ...records.map((record) =>
      [
        record.url,
        record.title,
        record.h1,
        record.descriptionLength,
        record.canonical,
        record.robots,
      ]
        .map(csv)
        .join(","),
    ),
  ].join("\n")}\n`,
  "utf8",
);

const orphanCandidates = records
  .filter(
    (record) =>
      record.classification === "index維持" &&
      (inbound.get(record.route) ?? 0) === 0,
  )
  .map((record) => ({
    url: record.url,
    sitemapMember: record.sitemapMember,
    title: record.title,
  }));

const counts = Object.fromEntries(
  [...new Set(records.map((record) => record.classification))]
    .sort()
    .map((classification) => [
      classification,
      records.filter((record) => record.classification === classification)
        .length,
    ]),
);

const summary = {
  generatedAt: new Date().toISOString(),
  buildTaskCount: readBuildTaskCount(),
  previousBuildTaskCount: 4433,
  prerenderRouteCount: records.length,
  htmlCount: records.filter((record) => record.kind === "prerender-html").length,
  technicalOutputCount: records.filter(
    (record) => record.kind === "technical-output",
  ).length,
  classificationCounts: counts,
  runtimeSitemapUrlCount: runtimeSitemapUrls.size,
  jsonLdScripts,
  jsonLdSyntaxFailures: jsonLdFailures.length,
  duplicateTitleGroups: duplicateTitles.length,
  orphanCandidates: orphanCandidates.length,
  distinction:
    "Next.jsのGenerating static pages件数はbuild task数であり、公開URL数ではない。CSVはprerender-manifestの実URLを1行1件で分類する。",
};

const outputs = [
  ["indexability-summary.json", summary],
  ["metadata-duplicate-titles.json", duplicateTitles],
  [
    "jsonld-syntax-validation.json",
    {
      generatedAt: new Date().toISOString(),
      scripts: jsonLdScripts,
      failures: jsonLdFailures,
    },
  ],
  [
    "orphan-page-report.json",
    {
      generatedAt: new Date().toISOString(),
      definition: "index維持かつ静的HTML間の内部a[href]流入0",
      candidates: orphanCandidates,
    },
  ],
];
for (const [name, value] of outputs) {
  const path = join(evidenceRoot, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
