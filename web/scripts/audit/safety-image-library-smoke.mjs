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
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
if (!Array.isArray(items) || items.length !== 100) throw new Error("manifest must contain 100 items");

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
if (hub.status !== 200 || !hubHtml.includes("公開中100点") || /棒人間|stickman/iu.test(hubHtml)) {
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
if (sitemap.includes("/materials/safety-images/pilot/helmet-required") || sitemap.includes("/print")) {
  throw new Error("noindex pilot or print URL leaked into sitemap");
}
process.stdout.write("PASS sitemap 100 details; pilot/editor/print excluded\n");

await parallel(items, 6, async (item) => {
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
    request(item.originalPath, { method: "HEAD" }),
    request(item.previewPath, { method: "HEAD" }),
  ]);
  if (original.status !== 200 || preview.status !== 200) {
    throw new Error(`asset unavailable ${item.slug}: original=${original.status} preview=${preview.status}`);
  }
});
process.stdout.write("PASS production pages=100 originals=100 previews=100\n");

const matrix = items.flatMap((item) =>
  ["A4", "A3"].flatMap((paper) =>
    ["portrait", "landscape"].flatMap((orientation) =>
      ["jpeg", "pdf", ...(item.pngAvailable ? ["png"] : [])].map((format) => ({
        item,
        paper,
        orientation,
        format,
      })),
    ),
  ),
);
await parallel(matrix, 12, async ({ item, paper, orientation, format }) => {
  const params = new URLSearchParams({
    mode: "default",
    lang: "ja",
    brand: "branded",
    paper,
    orientation,
    format,
  });
  const response = await request(`/api/safety-images/${item.slug}/download?${params}`, {
    method: "HEAD",
  });
  if (
    response.status !== 200 ||
    response.headers.get("x-safety-image-source") !== "available" ||
    response.headers.get("x-safety-image-dimensions") !== `${paper}-${orientation}-300dpi`
  ) {
    throw new Error(`download matrix invalid ${item.slug} ${paper} ${orientation} ${format}: ${response.status}`);
  }
});
process.stdout.write(`PASS production download matrix HEAD combinations=${matrix.length}\n`);

const expectedPixels = {
  "A4-portrait": [2480, 3508],
  "A4-landscape": [3508, 2480],
  "A3-portrait": [3508, 4961],
  "A3-landscape": [4961, 3508],
};
const actualCases = [
  { slug: "helmet-required", lang: "ja", mode: "default", paper: "A4", orientation: "portrait", format: "jpeg" },
  { slug: "helmet-required", lang: "en", mode: "default", paper: "A4", orientation: "landscape", format: "pdf" },
  { slug: "helmet-required", lang: "vi", mode: "default", paper: "A3", orientation: "portrait", format: "jpeg" },
  { slug: "helmet-required", lang: "zh-CN", mode: "default", paper: "A3", orientation: "landscape", format: "pdf" },
  { slug: "helmet-required", lang: "id", mode: "clean", paper: "A4", orientation: "portrait", format: "jpeg" },
  { slug: "scaffold-work-illustration", lang: "ja", mode: "default", paper: "A4", orientation: "landscape", format: "png" },
];
for (const sample of actualCases) {
  const params = new URLSearchParams({
    mode: sample.mode,
    lang: sample.lang,
    brand: sample.mode === "clean" ? "none" : "branded",
    paper: sample.paper,
    orientation: sample.orientation,
    format: sample.format,
  });
  const response = await request(`/api/safety-images/${sample.slug}/download?${params}`);
  const body = Buffer.from(await response.arrayBuffer());
  if (response.status !== 200 || body.length < 10_000) {
    throw new Error(`actual download failed ${sample.slug} ${sample.lang} ${sample.format}: ${response.status}`);
  }
  if (sample.format === "pdf") {
    if (body.subarray(0, 8).toString("ascii") !== "%PDF-1.4" || !body.toString("latin1").includes("/Subtype /Image")) {
      throw new Error(`invalid PDF ${sample.paper} ${sample.orientation}`);
    }
  } else {
    const metadata = await sharp(body).metadata();
    const dimensions = expectedPixels[`${sample.paper}-${sample.orientation}`];
    if (
      metadata.format !== sample.format ||
      metadata.width !== dimensions[0] ||
      metadata.height !== dimensions[1] ||
      metadata.density !== 300
    ) {
      throw new Error(`invalid ${sample.format} metadata ${sample.paper} ${sample.orientation}`);
    }
  }
  process.stdout.write(`PASS actual ${sample.slug} ${sample.lang} ${sample.paper}-${sample.orientation} ${sample.format.toUpperCase()} ${body.length} bytes\n`);
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
const editedResponse = await requestWithTransientRetry("/api/safety-images/floor-load-limit/download", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ paper: "A4", orientation: "portrait", format: "pdf", settings: editedSettings }),
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
process.stdout.write(`Safety image library production smoke passed: ${origin}\n`);
