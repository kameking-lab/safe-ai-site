import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDirectory, "..");
const repositoryRoot = path.resolve(webRoot, "..");
const inventoryPath = path.join(repositoryRoot, "docs", "audits", "current-safety-sign-market-inventory.csv");
const productsPath = path.join(repositoryRoot, "docs", "audits", "current-safety-sign-market-products.csv");
const outputPath = path.join(webRoot, "src", "data", "safety-image-library", "market-themes.json");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/u, ""));
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
      field = "";
    } else field += character;
  }
  if (quoted) throw new Error("Unclosed quoted field");
  if (field || row.length) {
    row.push(field.replace(/\r$/u, ""));
    rows.push(row);
  }
  const [headers, ...records] = rows;
  if (!headers) return [];
  return records.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function sellerDomain(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./u, "");
  } catch {
    throw new Error(`Invalid evidence URL: ${url}`);
  }
}

function requireField(row, field) {
  const value = String(row[field] ?? "").trim();
  if (!value) throw new Error(`Missing ${field} on ${row.id || row.themeId || "row"}`);
  return value;
}

const inventory = parseCsv(await readFile(inventoryPath, "utf8"));
const products = parseCsv(await readFile(productsPath, "utf8"));
if (inventory.length !== 100) throw new Error(`Expected 100 inventory rows, found ${inventory.length}`);
if (products.length < 120) throw new Error(`Expected at least 120 product observations, found ${products.length}`);

const ids = new Set();
const slugs = new Set();
const titles = new Set();
const categories = new Map();
let multiVendorThemes = 0;

const items = inventory.map((row, index) => {
  const id = requireField(row, "id");
  const slug = requireField(row, "slug");
  const titleJa = requireField(row, "titleJa");
  const marketCategory = requireField(row, "marketCategory");
  if (id !== `S${String(index + 1).padStart(3, "0")}`) throw new Error(`Inventory order/id mismatch: ${id}`);
  if (ids.has(id) || slugs.has(slug) || titles.has(titleJa)) throw new Error(`Duplicate inventory identity: ${id}/${slug}/${titleJa}`);
  ids.add(id);
  slugs.add(slug);
  titles.add(titleJa);
  categories.set(marketCategory, (categories.get(marketCategory) ?? 0) + 1);

  const evidenceUrls = requireField(row, "evidenceUrls").split(";").map((value) => value.trim()).filter(Boolean);
  const vendorDomains = new Set(evidenceUrls.map(sellerDomain));
  const vendorCount = Number(row.vendorCount);
  if (!Number.isInteger(vendorCount) || vendorCount < 1 || vendorCount !== vendorDomains.size) {
    throw new Error(`${id} vendorCount=${row.vendorCount} but distinct seller domains=${vendorDomains.size}`);
  }
  if (vendorCount >= 2) multiVendorThemes += 1;
  const orientation = requireField(row, "orientation");
  if (!["portrait", "landscape", "square"].includes(orientation)) throw new Error(`${id} invalid orientation`);

  return {
    id,
    order: index + 1,
    slug,
    titleJa,
    signPurpose: requireField(row, "signPurpose"),
    marketCategory,
    signFormat: requireField(row, "signFormat"),
    recommendedSize: requireField(row, "recommendedSize"),
    orientation,
    commonWording: requireField(row, "commonWording"),
    multilingualPriority: requireField(row, "multilingualPriority"),
    editableNumber: String(row.editableNumber).toLowerCase() === "true",
    vendorCount,
    evidenceUrls,
    constructionRelevance: requireField(row, "constructionRelevance"),
    priority: requireField(row, "priority"),
    originalityPlan: requireField(row, "originalityPlan"),
    generationStatus: requireField(row, "generationStatus"),
    qaStatus: requireField(row, "qaStatus"),
    publishStatus: requireField(row, "publishStatus"),
  };
});

if (multiVendorThemes < 80) throw new Error(`Only ${multiVendorThemes} themes have two distinct vendors; 80 required`);
const expectedDistribution = new Map([
  ["protective-equipment", 15],
  ["entry-prohibition", 15],
  ["hazard-warning", 25],
  ["work-status", 15],
  ["traffic-guidance", 10],
  ["editable-numeric", 10],
  ["heat-emergency", 10],
]);
for (const [category, count] of expectedDistribution) {
  if (categories.get(category) !== count) throw new Error(`${category}: expected ${count}, found ${categories.get(category) ?? 0}`);
}

const productKeys = new Set();
const vendors = new Set();
for (const product of products) {
  const themeId = requireField(product, "themeId");
  if (!ids.has(themeId)) throw new Error(`Product references unknown theme: ${themeId}`);
  const productUrl = requireField(product, "productUrl");
  const productTitle = requireField(product, "productTitle");
  const seller = String(product.sellerDomain || product.vendor || sellerDomain(productUrl)).trim();
  const saleStatus = requireField(product, "saleStatus");
  if (!/available|販売中|listing|掲載中|in-stock|on-sale|current-catalog/iu.test(saleStatus)) {
    throw new Error(`Unsupported saleStatus for ${themeId}: ${saleStatus}`);
  }
  vendors.add(seller.toLowerCase());
  productKeys.add(`${seller.toLowerCase()}\u0000${productTitle}\u0000${productUrl}`);
}
if (productKeys.size < 120) throw new Error(`Only ${productKeys.size} unique product observations; 120 required`);
if (vendors.size < 8) throw new Error(`Only ${vendors.size} vendors; 8 required`);

const output = {
  schemaVersion: "safety-sign-market-themes-v1",
  checkedAt: "2026-08-28",
  inventoryCount: items.length,
  productObservationCount: productKeys.size,
  vendorCount: vendors.size,
  multiVendorThemeCount: multiVendorThemes,
  categoryCounts: Object.fromEntries([...categories].sort()),
  items,
};
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ themes: items.length, products: productKeys.size, vendors: vendors.size, multiVendorThemes })}\n`);
