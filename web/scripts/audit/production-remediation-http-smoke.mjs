import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const BASE_URL =
  process.env.SMOKE_BASE_URL ?? "https://www.anzen-ai-portal.jp";
const EXPECTED_DEPLOYMENT =
  process.env.SMOKE_DEPLOYMENT_ID ?? "dpl_AH5rurMeeJaR4yozyn7w54UvMyN6";

const checks = [];
const failures = [];

function record(name, ok, detail) {
  const item = { name, ok: Boolean(ok), detail };
  checks.push(item);
  if (!item.ok) failures.push(item);
}

function metaRobots(html) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  return (
    tags.find(
      (tag) =>
        /\bname=["']robots["']/i.test(tag) ||
        /\bname=["']googlebot["']/i.test(tag),
    ) ?? ""
  );
}

function canonical(html) {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  const tag = tags.find((candidate) => /\brel=["']canonical["']/i.test(candidate));
  return tag?.match(/\bhref=["']([^"']+)["']/i)?.[1]?.replaceAll("&amp;", "&") ?? null;
}

function jsonLd(html) {
  return [...html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )].flatMap((match) => {
    try {
      const value = JSON.parse(match[1]);
      return Array.isArray(value) ? value : [value];
    } catch {
      return [];
    }
  });
}

async function request(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(45_000),
    ...init,
    headers: {
      "user-agent": "safe-ai-production-remediation-smoke/2026-07-28",
      ...(init.headers ?? {}),
    },
  });
  return {
    path,
    status: response.status,
    location: response.headers.get("location"),
    xRobotsTag: response.headers.get("x-robots-tag"),
    contentType: response.headers.get("content-type"),
    body: await response.text(),
  };
}

const htmlRoutes = [
  { path: "/", index: true },
  { path: "/services/automation", index: true },
  { path: "/risk", index: true },
  { path: "/signage", index: true },
  { path: "/ky/paper", index: true },
  { path: "/safety-diary", index: true },
  { path: "/chemical-ra", index: true },
  {
    path: "/law-search?q=%E5%AE%89%E8%A1%9B%E6%B3%95%20%E7%AC%AC61%E6%9D%A1",
    index: true,
    canonicalPath: "/law-search",
  },
  {
    path: "/accidents?acc_kw=%E5%A2%9C%E8%90%BD&acc_page=2",
    index: false,
    canonicalPath: "/accidents",
    retainQuery: true,
  },
  { path: "/education-certification/finder", index: true },
  { path: "/heat-illness-prevention", index: false },
  { path: "/privacy", index: true },
  { path: "/security", index: true },
  {
    path: "/chatbot?q=%E5%91%BC%E5%90%B8%E3%81%97%E3%81%A6%E3%81%84%E3%81%AA%E3%81%84",
    index: false,
    canonicalPath: "/chatbot",
  },
  { path: "/heat-illness-prevention/slides", index: false },
  { path: "/heat-illness-prevention/elearning", index: false },
  { path: "/e-learning" },
];

const htmlResults = await Promise.all(
  htmlRoutes.map((route) => request(route.path)),
);

for (const [index, result] of htmlResults.entries()) {
  const config = htmlRoutes[index];
  const h1Count = (result.body.match(/<h1\b/gi) ?? []).length;
  const robots = metaRobots(result.body);
  const hasNoindex = /\bnoindex\b/i.test(robots);
  const canonicalUrl = canonical(result.body);
  const expectedCanonical = `${BASE_URL}${config.canonicalPath ?? config.path.split("?")[0]}`.replace(
    /\/$/,
    "",
  );
  const normalizedCanonical = canonicalUrl?.replace(/\/$/, "");

  record(`${config.path}:HTTP-200`, result.status === 200, {
    status: result.status,
    location: result.location,
  });
  record(`${config.path}:single-H1`, h1Count === 1, h1Count);
  record(
    `${config.path}:canonical`,
    normalizedCanonical === expectedCanonical,
    canonicalUrl,
  );
  if (config.index !== undefined) {
    record(
      `${config.path}:indexability`,
      config.index ? !hasNoindex : hasNoindex,
      robots || "no restrictive robots meta",
    );
  }
  record(
    `${config.path}:no-global-preview-header`,
    !/\bnoindex\b/i.test(result.xRobotsTag ?? ""),
    result.xRobotsTag,
  );
  if (config.retainQuery) {
    record(
      `${config.path}:query-retained-no-redirect`,
      result.status === 200 && result.location === null,
      { status: result.status, location: result.location },
    );
  }
}

const notFoundRoutes = [
  "/circulars/mhlw-notice-0870",
  "/accidents/synthetic-audit-case",
  "/production-remediation-smoke-not-found",
];
const notFoundResults = await Promise.all(notFoundRoutes.map((path) => request(path)));
for (const result of notFoundResults) {
  record(`${result.path}:HTTP-404`, result.status === 404, result.status);
}

const [robots, sitemap, sitemapIndex] = await Promise.all([
  request("/robots.txt"),
  request("/sitemap.xml"),
  request("/sitemap-index.xml"),
]);
record("robots:HTTP-200", robots.status === 200, robots.status);
record(
  "robots:production-root-allowed",
  /User-Agent:\s*\*\s*[\r\n]+Allow:\s*\/(?:\s|$)/i.test(robots.body),
  robots.body.slice(0, 240),
);
record(
  "robots:sitemap-declared",
  /Sitemap:\s*https:\/\/www\.anzen-ai-portal\.jp\/sitemap-index\.xml/i.test(
    robots.body,
  ),
  "sitemap-index.xml",
);
record("sitemap:HTTP-200", sitemap.status === 200, sitemap.status);
record("sitemap-index:HTTP-200", sitemapIndex.status === 200, sitemapIndex.status);
for (const included of [BASE_URL, `${BASE_URL}/services/automation`]) {
  const candidates =
    included === BASE_URL ? [included, `${included}/`] : [included];
  record(
    `sitemap:includes:${included}`,
    candidates.some((candidate) =>
      sitemap.body.includes(`<loc>${candidate}</loc>`),
    ),
    included,
  );
}
for (const excluded of [
  "/heat-illness-prevention</loc>",
  "/heat-illness-prevention/slides</loc>",
  "/heat-illness-prevention/elearning</loc>",
  "/chatbot?q=",
  "/accidents</loc>",
  "/circulars/mhlw-notice-0870",
  "/accidents/synthetic-audit-case",
]) {
  record(`sitemap:excludes:${excluded}`, !sitemap.body.includes(excluded), excluded);
}

const emergencyJson = await request("/api/chatbot", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: BASE_URL,
  },
  body: JSON.stringify({
    message: "大量に血が出ていて止まりません",
    privacyConfirmed: true,
  }),
});
record("emergency-json:HTTP-200", emergencyJson.status === 200, emergencyJson.status);
for (const phrase of ["119", "直接圧迫", "感染", "救急隊"]) {
  record(
    `emergency-json:${phrase}`,
    emergencyJson.body.includes(phrase),
    emergencyJson.body.slice(0, 500),
  );
}
record(
  "emergency-json:no-normal-cta",
  !/KYを作成|無料相談|料金を見る|検索結果/.test(emergencyJson.body),
  "normal CTA absent",
);

const emergencySse = await request("/api/chatbot/stream", {
  method: "POST",
  headers: {
    accept: "text/event-stream",
    "content-type": "application/json",
    origin: BASE_URL,
  },
  body: JSON.stringify({
    message: "呼吸していない",
    privacyConfirmed: true,
  }),
});
record("emergency-sse:HTTP-200", emergencySse.status === 200, emergencySse.status);
for (const phrase of ["119", "反応", "呼吸", "AED", "胸骨圧迫", "救急隊"]) {
  record(
    `emergency-sse:${phrase}`,
    emergencySse.body.includes(phrase),
    emergencySse.body.slice(0, 600),
  );
}

const jmaResponse = await request("/api/signage/jma");
let jma;
try {
  jma = JSON.parse(jmaResponse.body);
} catch {
  jma = null;
}
const warningRegions = Object.values(jma?.warnings?.byIso ?? {});
const warningSummary = {
  status: jma?.warnings?.quality?.status ?? null,
  attempted: jma?.warnings?.quality?.attempted ?? 0,
  succeeded: jma?.warnings?.quality?.succeeded ?? 0,
  failed: jma?.warnings?.quality?.failed ?? 0,
  live: warningRegions.filter((item) => item.sourceStatus === "live").length,
  fallback: warningRegions.filter((item) => item.sourceStatus === "fallback").length,
  legitimateNone: warningRegions.filter(
    (item) => item.sourceStatus === "live" && item.level === "none",
  ).length,
  futureOrAbnormal: warningRegions.filter((item) =>
    /future|abnormal/i.test(item.sourceIssue ?? ""),
  ).length,
};
record("jma:HTTP-200", jmaResponse.status === 200, jmaResponse.status);
record(
  "jma:legitimate-none-distinct",
  warningSummary.legitimateNone > 0,
  warningSummary,
);
record(
  "jma:failures-not-none",
  warningRegions
    .filter((item) => item.sourceStatus !== "live")
    .every((item) => item.sourceIssue),
  warningSummary,
);

const consult = await request("/api/automation-consult", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: BASE_URL,
  },
  body: "{}",
});
record("consult:fail-closed-503", consult.status === 503, consult.status);
record(
  "consult:no-PII-read",
  /個人情報は送信されていません/.test(consult.body),
  consult.body,
);

const automation = htmlResults[1].body;
const home = htmlResults[0].body;
record(
  "consult:UI-mail-contact-without-web-form",
  /メール相談受付中/.test(automation) &&
    /action="\/contact\/automation-email\/draft"/i.test(automation) &&
    !/name="email"/i.test(automation),
  "mail consultation present; PII Web form absent",
);
record(
  "consult:home-prominence",
  /安全管理や定型業務の自動化/.test(home) &&
    [
      "業務自動化",
      "安全衛生業務の効率化",
      "AI活用相談",
      "講習・研修",
      "講習会資料",
      "マニュアル・手順書",
      "メールで相談する",
      "料金を見る",
      "自動化例を見る",
      "税込33,000円から",
    ].every((label) => home.includes(label)),
  "home consult section, six offerings, and active mail CTA",
);
record(
  "consult:pricing",
  ["33,000", "88,000", "110,000", "440,000", "55,000", "99,000"].every(
    (price) => automation.includes(price),
  ),
  "tax-inclusive tiers present",
);
const serviceNodes = jsonLd(automation).filter(
  (node) => node?.["@type"] === "Service",
);
record("jsonld:service-present", serviceNodes.length > 0, serviceNodes.length);
record(
  "jsonld:consult-not-falsely-open",
  serviceNodes.every(
    (node) =>
      node.offers === undefined &&
      node.potentialAction === undefined &&
      node.email === undefined,
  ),
  serviceNodes.map((node) => Object.keys(node)),
);
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
record(
  "recipient:no-email-exposure",
  !(home + automation).match(emailPattern),
  (home + automation).match(emailPattern) ?? [],
);

const [ambiguousChemical, mismatchChemical] = await Promise.all([
  request("/api/chemical-ra", {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE_URL },
    body: JSON.stringify({ chemicalName: "キシレン" }),
  }),
  request("/api/chemical-ra", {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE_URL },
    body: JSON.stringify({ chemicalName: "トルエン", casNumber: "1330-20-7" }),
  }),
]);
record(
  "chemical:ambiguous-server-reject",
  ambiguousChemical.status === 422 &&
    /"code":"AMBIGUOUS"/.test(ambiguousChemical.body),
  { status: ambiguousChemical.status, body: ambiguousChemical.body },
);
record(
  "chemical:name-CAS-mismatch-reject",
  mismatchChemical.status === 422 &&
    /"code":"CAS_MISMATCH"/.test(mismatchChemical.body),
  { status: mismatchChemical.status, body: mismatchChemical.body },
);

const result = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  expectedDeploymentId: EXPECTED_DEPLOYMENT,
  passed: failures.length === 0,
  checkCount: checks.length,
  passedCount: checks.length - failures.length,
  failedCount: failures.length,
  failures,
  jma: warningSummary,
  checks,
};

if (process.env.SMOKE_OUTPUT_PATH) {
  const outputPath = resolve(process.env.SMOKE_OUTPUT_PATH);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify(result, null, 2));
if (failures.length > 0) process.exitCode = 1;
