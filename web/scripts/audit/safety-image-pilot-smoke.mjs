import sharp from "sharp";

const origin = (process.argv[2] ?? "http://127.0.0.1:3311").replace(/\/$/, "");
const expectedDimensions = {
  A4: [2480, 3508],
  A3: [3508, 4961],
};

async function get(path) {
  const response = await fetch(`${origin}${path}`, {
    redirect: "manual",
    headers: { "User-Agent": "safe-ai-safety-image-pilot-smoke/1.0" },
  });
  return {
    response,
    body: Buffer.from(await response.arrayBuffer()),
  };
}

for (const path of ["/materials/safety-images/pilot/helmet-required"]) {
  const { response, body } = await get(path);
  const html = body.toString("utf8");
  if (response.status !== 200) throw new Error(`${path}: ${response.status}`);
  if (!/<meta[^>]+name="robots"[^>]+content="noindex, follow"/i.test(html)) {
    throw new Error(`${path}: missing noindex, follow`);
  }
  if (!/<link[^>]+rel="canonical"/i.test(html)) {
    throw new Error(`${path}: missing canonical`);
  }
  process.stdout.write(`PASS page ${path} 200 noindex,follow canonical\n`);
}

const sitemap = await get("/sitemap.xml");
if (sitemap.response.status !== 200) throw new Error("sitemap unavailable");
const sitemapText = sitemap.body.toString("utf8");
if (
  !sitemapText.includes("/materials/safety-images/helmet-required") ||
  sitemapText.includes("/materials/safety-images/pilot/helmet-required")
) {
  throw new Error("formal library sitemap or pilot exclusion is invalid");
}
process.stdout.write("PASS sitemap formal library included and pilot excluded\n");

for (const variant of ["a", "b"]) {
  for (const paper of ["A4", "A3"]) {
    for (const format of ["jpeg", "pdf"]) {
      const search = new URLSearchParams({
        variant,
        lang: "all",
        brand: "branded",
        paper,
        format,
      });
      const { response, body } = await get(
        `/api/safety-images/pilot/helmet-required/download?${search}`,
      );
      if (response.status !== 200) {
        throw new Error(`${variant} ${paper} ${format}: ${response.status}`);
      }
      if (format === "jpeg") {
        const metadata = await sharp(body).metadata();
        if (
          metadata.format !== "jpeg" ||
          metadata.width !== expectedDimensions[paper][0] ||
          metadata.height !== expectedDimensions[paper][1] ||
          metadata.density !== 300
        ) {
          throw new Error(`${variant} ${paper}: invalid JPEG metadata`);
        }
      } else if (
        body.subarray(0, 8).toString("ascii") !== "%PDF-1.4" ||
        !body.toString("latin1").includes("/Subtype /Image")
      ) {
        throw new Error(`${variant} ${paper}: invalid image PDF`);
      }
      process.stdout.write(
        `PASS download ${variant.toUpperCase()} ${paper} ${format.toUpperCase()} ${body.length} bytes\n`,
      );
    }
  }
}

for (const lang of ["ja", "en", "vi", "zh-CN", "id"]) {
  const search = new URLSearchParams({
    variant: "a",
    lang,
    brand: "clean",
    paper: "A4",
    format: "jpeg",
  });
  const { response } = await get(
    `/api/safety-images/pilot/helmet-required/download?${search}`,
  );
  if (response.status !== 200) {
    throw new Error(`method A ${lang}: ${response.status}`);
  }
  process.stdout.write(`PASS language A ${lang}\n`);
}

process.stdout.write(`Safety image pilot smoke passed: ${origin}\n`);
