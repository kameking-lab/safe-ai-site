import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const origin = (process.argv[2] ?? "http://127.0.0.1:3311").replace(/\/$/u, "");
const manifestPath = path.join(
  process.cwd(),
  "src",
  "data",
  "safety-image-library",
  "generated-manifest.json",
);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const items = manifest.items;
const marketThemes = JSON.parse(
  await readFile(
    path.join(process.cwd(), "src", "data", "safety-image-library", "market-themes.json"),
    "utf8",
  ),
).items;
const legacySource = await readFile(
  path.join(process.cwd(), "src", "data", "safety-image-library", "legacy.ts"),
  "utf8",
);
const legacySetBody = legacySource.match(/LEGACY_SAFETY_IMAGE_SLUGS\s*=\s*new Set\(\[([\s\S]*?)\]\)/u)?.[1];
const retiredAssetSlugs = [...(legacySetBody ?? "").matchAll(/"([a-z0-9-]+)"/gu)].map((match) => match[1]);
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
if (!Array.isArray(items) || items.length !== 100) throw new Error("manifest must contain 100 items");
if (!Array.isArray(marketThemes) || marketThemes.length !== 100) {
  throw new Error("market registry must contain 100 items");
}
if (items.some((item, index) => item.slug !== marketThemes[index]?.slug)) {
  throw new Error("manifest order/slugs do not match market registry");
}

async function request(relative, init = {}, attempts = 3) {
  const { headers, ...requestInit } = init;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(`${origin}${relative}`, {
        redirect: "manual",
        ...requestInit,
        headers: {
          "User-Agent": "safe-ai-safety-image-library-smoke/1.0",
          ...(protectionBypass
            ? { "x-vercel-protection-bypass": protectionBypass }
            : {}),
          ...(headers ?? {}),
        },
      });
    } catch (error) {
      if (attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw new Error("request retry loop exhausted");
}

async function requestWithTransientRetry(relative, init, attempts = 3) {
  let response;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    response = await request(relative, init);
    if (![429, 502, 503, 504].includes(response.status) || attempt === attempts) {
      return response;
    }
    await response.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, attempt * 1_500));
  }
  return response;
}

async function parallel(values, limit, operation) {
  const queue = [...values];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const value = queue.shift();
      await operation(value);
    }
  });
  await Promise.all(workers);
}

const hub = await request("/materials/safety-images");
const hubHtml = await hub.text();
if (
  hub.status !== 200 ||
  !hubHtml.includes("現場安全看板ライブラリ") ||
  !hubHtml.includes("100") ||
  /棒人間|stickman/iu.test(hubHtml)
) {
  throw new Error(`library hub invalid: ${hub.status}`);
}
if (!/<meta[^>]+name="robots"[^>]+content="index, follow"/iu.test(hubHtml)) {
  throw new Error("library hub is not index,follow");
}
process.stdout.write("PASS hub 100 items index,follow legacy-stick-reference=0\n");

const sitemapResponse = await request("/sitemap.xml");
const sitemap = await sitemapResponse.text();
if (sitemapResponse.status !== 200) throw new Error("sitemap unavailable");
for (const item of items) {
  if (!sitemap.includes(`/materials/safety-images/${item.slug}`)) {
    throw new Error(`sitemap missing ${item.slug}`);
  }
}
const indexedSignUrls = sitemap.match(/<loc>[^<]*\/materials\/safety-images(?:\/category\/[^<]+|\/[^<]+)?<\/loc>/gu) ?? [];
if (indexedSignUrls.length !== 108) {
  throw new Error(`sitemap sign URL count must be 108, received ${indexedSignUrls.length}`);
}
if (sitemap.includes("/materials/safety-images/pilot/helmet-required") || sitemap.includes("/print")) {
  throw new Error("noindex pilot or print URL leaked into sitemap");
}
process.stdout.write("PASS sitemap 100 details; pilot/editor/print excluded\n");

await parallel(items, 4, async (item) => {
  const detail = await request(`/materials/safety-images/${item.slug}`);
  const html = await detail.text();
  if (
    detail.status !== 200 ||
    !html.includes(item.title) ||
    !html.includes(`/materials/safety-images/${item.slug}`) ||
    !/<meta[^>]+name="robots"[^>]+content="index, follow"/iu.test(html)
  ) {
    throw new Error(`detail invalid ${item.slug}: ${detail.status}`);
  }
  const [original, preview] = await Promise.all([
    request(item.originalPath),
    request(item.previewPath),
  ]);
  if (original.status !== 200 || preview.status !== 200) {
    throw new Error(`asset unavailable ${item.slug}: original=${original.status} preview=${preview.status}`);
  }
  const [originalBytes, previewBytes] = await Promise.all([
    original.arrayBuffer().then((value) => Buffer.from(value)),
    preview.arrayBuffer().then((value) => Buffer.from(value)),
  ]);
  const originalHash = createHash("sha256").update(originalBytes).digest("hex");
  const previewHash = createHash("sha256").update(previewBytes).digest("hex");
  const [originalMetadata, previewMetadata] = await Promise.all([
    sharp(originalBytes).metadata(),
    sharp(previewBytes).metadata(),
  ]);
  if (
    original.headers.get("content-type") !== "image/png" ||
    preview.headers.get("content-type") !== "image/webp" ||
    originalHash !== item.sourceChecksum ||
    previewHash !== item.previewChecksum ||
    originalMetadata.width !== item.sourceDimensions.width ||
    originalMetadata.height !== item.sourceDimensions.height ||
    previewMetadata.width !== item.previewDimensions.width ||
    previewMetadata.height !== item.previewDimensions.height
  ) {
    throw new Error(`asset checksum/type/dimensions invalid ${item.slug}`);
  }
});
process.stdout.write("PASS production pages=100 originals=100 previews=100 GET checksum/type/dimensions\n");

if (retiredAssetSlugs.length < 80) throw new Error("legacy asset registry unexpectedly incomplete");
await parallel(retiredAssetSlugs, 8, async (slug) => {
  for (const relative of [
    `/safety-images/library/originals/${slug}.png`,
    `/safety-images/library/previews/${slug}.webp`,
  ]) {
    const response = await request(relative, { method: "HEAD" });
    if (response.status !== 404) throw new Error(`retired asset remains public: ${relative} ${response.status}`);
  }
});
process.stdout.write(`PASS retired low-quality asset URLs unavailable=${retiredAssetSlugs.length * 2}\n`);

const outputSizes = [
  "a4-portrait",
  "a4-landscape",
  "a3-portrait",
  "a3-landscape",
  "flat-450x600",
  "flat-450x300",
  "flat-600x450",
  "flat-550x450",
  "flat-900x600",
  "banner-450x1800",
  "stand-550x1400",
  "square-450",
  "report-landscape",
];
const matrix = items.flatMap((item) =>
  ["jpeg", "png", "pdf"].map((format) => ({ item, size: "a4-portrait", format })),
);
await parallel(matrix, 12, async ({ item, size, format }) => {
  const params = new URLSearchParams({
    mode: "default",
    lang: "ja",
    brand: "branded",
    size,
    format,
  });
  const response = await request(`/api/safety-images/${item.slug}/download?${params}`, {
    method: "HEAD",
  });
  if (
    response.status !== 200 ||
    response.headers.get("x-safety-image-source") !== "available" ||
    response.headers.get("x-safety-image-size") !== `${size}-300dpi`
  ) {
    throw new Error(`download matrix invalid ${item.slug} ${size} ${format}: ${response.status}`);
  }
});
process.stdout.write(`PASS production download matrix HEAD combinations=${matrix.length}\n`);

for (const size of outputSizes) {
  const response = await request(
    `/api/safety-images/helmet-required/download?${new URLSearchParams({
      mode: "default",
      lang: "ja",
      brand: "branded",
      size,
      format: "png",
    })}`,
    { method: "HEAD" },
  );
  if (response.status !== 200 || response.headers.get("x-safety-image-size") !== `${size}-300dpi`) {
    throw new Error(`output size unavailable ${size}: ${response.status}`);
  }
}
process.stdout.write(`PASS output-size registry HEAD sizes=${outputSizes.length}\n`);

const expectedPixels = {
  "a4-portrait": [2480, 3508],
  "a4-landscape": [3508, 2480],
  "a3-portrait": [3508, 4961],
  "a3-landscape": [4961, 3508],
  "flat-450x600": [5315, 7087],
  "flat-450x300": [5315, 3543],
  "flat-600x450": [7087, 5315],
  "flat-550x450": [6496, 5315],
  "flat-900x600": [10630, 7087],
  "banner-450x1800": [5315, 21260],
  "stand-550x1400": [6496, 16535],
  "square-450": [5315, 5315],
  "report-landscape": [3508, 1972],
};
const actualCases = [
  { slug: "helmet-required", lang: "ja", mode: "default", size: "banner-450x1800", format: "jpeg" },
  { slug: "helmet-required", lang: "en", mode: "default", size: "banner-450x1800", format: "pdf" },
  { slug: "helmet-required", lang: "vi", mode: "default", size: "a3-portrait", format: "jpeg" },
  { slug: "helmet-required", lang: "zh-CN", mode: "default", size: "a3-landscape", format: "pdf" },
  { slug: "helmet-required", lang: "id", mode: "clean", size: "banner-450x1800", format: "png" },
];
for (const sample of actualCases) {
  const params = new URLSearchParams({
    mode: sample.mode,
    lang: sample.lang,
    brand: sample.mode === "clean" ? "none" : "branded",
    size: sample.size,
    format: sample.format,
  });
  const response = await request(`/api/safety-images/${sample.slug}/download?${params}`);
  const body = Buffer.from(await response.arrayBuffer());
  if (
    response.status !== 200 ||
    body.length < 10_000 ||
    !response.headers.get("cache-control")?.includes("public") ||
    !response.headers.get("cdn-cache-control")?.includes("s-maxage")
  ) {
    throw new Error(`actual download failed ${sample.slug} ${sample.lang} ${sample.format}: ${response.status}`);
  }
  if (sample.format === "pdf") {
    if (body.subarray(0, 8).toString("ascii") !== "%PDF-1.4" || !body.toString("latin1").includes("/Subtype /Image")) {
      throw new Error(`invalid PDF ${sample.size}`);
    }
  } else {
    const metadata = await sharp(body).metadata();
    const dimensions = expectedPixels[sample.size];
    if (
      metadata.format !== sample.format ||
      metadata.width !== dimensions[0] ||
      metadata.height !== dimensions[1] ||
      metadata.density !== 300
    ) {
      throw new Error(`invalid ${sample.format} metadata ${sample.size}`);
    }
  }
  process.stdout.write(`PASS actual ${sample.slug} ${sample.lang} ${sample.size} ${sample.format.toUpperCase()} ${body.length} bytes\n`);
}

const editedSettings = {
  mode: "edited",
  language: "ja",
  text: "作業床の制限荷重",
  fontSize: "large",
  position: "top",
  textColor: "#082f49",
  band: true,
  bandColor: "#ffffff",
  brand: false,
  lineHeight: 1.2,
  align: "center",
  border: true,
  padding: "standard",
  writingMode: "horizontal",
  subMessage: "",
  numericValue: "1.5",
  numericUnit: "t/㎡",
};
const editedResponse = await requestWithTransientRetry("/api/safety-images/maximum-load/download", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ size: "a4-portrait", format: "pdf", settings: editedSettings }),
});
const editedPdf = Buffer.from(await editedResponse.arrayBuffer());
const editedError = editedPdf
  .toString("utf8")
  .replace(/[^\x20-\x7e]/gu, "?")
  .slice(0, 240);
if (
  editedResponse.status !== 200 ||
  !editedResponse.headers.get("cache-control")?.includes("no-store") ||
  editedPdf.subarray(0, 8).toString("ascii") !== "%PDF-1.4" ||
  !editedPdf.toString("latin1").includes("/Subtype /Image") ||
  editedResponse.headers.get("content-disposition")?.includes("1.5")
) {
  throw new Error(
    `edited POST privacy/PDF smoke failed: status=${editedResponse.status} cache=${editedResponse.headers.get("cache-control") ?? "missing"} bytes=${editedPdf.length} pdf=${editedPdf.subarray(0, 8).toString("ascii") === "%PDF-1.4"} image=${editedPdf.toString("latin1").includes("/Subtype /Image")} filenameSafe=${!editedResponse.headers.get("content-disposition")?.includes("1.5")} response=${JSON.stringify(editedError)}`,
  );
}
process.stdout.write("PASS edited POST no-store image-bearing PDF and privacy-safe filename\n");
if (process.env.EXPECT_SAFETY_SIGN_WAF === "1") {
  const wafPath = `/api/safety-images/helmet-required/download?${new URLSearchParams({
    mode: "default",
    lang: "ja",
    brand: "branded",
    size: "a4-portrait",
    format: "jpeg",
  })}`;
  const statuses = await Promise.all(
    Array.from({ length: 7 }, async () => (await request(wafPath, {}, 1)).status),
  );
  if (!statuses.includes(429) || statuses.some((status) => ![200, 429].includes(status))) {
    throw new Error(`distributed WAF rate limit did not return 429: ${statuses.join(",")}`);
  }
  process.stdout.write(`PASS distributed WAF rate limit statuses=${statuses.join(",")}\n`);
}
process.stdout.write(`Safety image library production smoke passed: ${origin}\n`);
