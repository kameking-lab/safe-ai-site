import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDirectory, "..");
const repositoryRoot = path.resolve(webRoot, "..");
const dataDirectory = path.join(webRoot, "src", "data", "safety-image-library");
const auditDirectory = path.join(repositoryRoot, "docs", "audits");
const inventoryPath = path.join(auditDirectory, "current-safety-sign-market-inventory.csv");
const productsPath = path.join(auditDirectory, "current-safety-sign-market-products.csv");

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
  if (quoted) throw new Error("Unclosed quoted CSV field");
  if (field || row.length) {
    row.push(field.replace(/\r$/u, ""));
    rows.push(row);
  }
  const [headers, ...records] = rows;
  if (!headers) return { headers: [], records: [] };
  return {
    headers,
    records: records.map((values) =>
      Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
    ),
  };
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function serializeCsv(headers, records) {
  return `${headers.join(",")}\n${records
    .map((record) => headers.map((header) => csvCell(record[header])).join(","))
    .join("\n")}\n`;
}

async function json(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

function exactItems(root, label) {
  if (!Array.isArray(root.items) || root.items.length !== 100) {
    throw new Error(`${label} must contain exactly 100 items`);
  }
  return root.items;
}

const [manifestRoot, ledgerRoot, qaRoot, translationRoot, marketRoot, inventoryCsv, productsCsv] =
  await Promise.all([
    json(path.join(dataDirectory, "generated-manifest.json")),
    json(path.join(dataDirectory, "generation-ledger.json")),
    json(path.join(dataDirectory, "qa.json")),
    json(path.join(dataDirectory, "translation-registry.json")),
    json(path.join(dataDirectory, "market-themes.json")),
    readFile(inventoryPath, "utf8"),
    readFile(productsPath, "utf8"),
  ]);

const manifest = exactItems(manifestRoot, "generated manifest");
const ledger = exactItems(ledgerRoot, "generation ledger");
const qa = exactItems(qaRoot, "QA registry");
const translations = exactItems(translationRoot, "translation registry");
const market = exactItems(marketRoot, "market registry");
const { headers: inventoryHeaders, records: inventory } = parseCsv(inventoryCsv);
const { records: products } = parseCsv(productsCsv);
if (inventory.length !== 100) throw new Error("Market inventory must contain exactly 100 themes");
if (products.length < 120) throw new Error("Market product evidence must contain at least 120 rows");
if (marketRoot.vendorCount < 8 || marketRoot.multiVendorThemeCount < 80) {
  throw new Error("Market evidence gate failed");
}
if (translationRoot.nativeReviewClaimed !== false) {
  throw new Error("Translation registry must not claim native-speaker review");
}

const expectedSlugs = market.map((item) => item.slug);
for (const [label, items] of [
  ["manifest", manifest],
  ["ledger", ledger],
  ["QA", qa],
  ["translations", translations],
  ["inventory", inventory],
]) {
  const slugs = items.map((item) => item.slug);
  if (new Set(slugs).size !== 100 || slugs.some((slug, index) => slug !== expectedSlugs[index])) {
    throw new Error(`${label} order/slugs do not match the market registry`);
  }
}

const ledgerBySlug = new Map(ledger.map((item) => [item.slug, item]));
const qaBySlug = new Map(qa.map((item) => [item.slug, item]));
const manifestBySlug = new Map(manifest.map((item) => [item.slug, item]));
const checksums = new Set();
for (const slug of expectedSlugs) {
  const asset = manifestBySlug.get(slug);
  const generation = ledgerBySlug.get(slug);
  const review = qaBySlug.get(slug);
  if (!asset || !generation || !review) throw new Error(`Registry join failed: ${slug}`);
  if (!asset.published || generation.publishStatus !== "published" || review.publishStatus !== "published") {
    throw new Error(`${slug}: published status is incomplete`);
  }
  if (
    review.result !== "pass" ||
    ![review.anatomyQa, review.ppeQa, review.equipmentQa].every((value) =>
      ["pass", "not-applicable"].includes(value),
    ) ||
    [
      review.marketFitQa,
      review.textFreeQa,
      review.stickFigureQa,
      review.svgPersonQa,
      review.externalLogoQa,
      review.themeMatchQa,
      review.textSpaceQa,
    ].some((value) => value !== "pass")
  ) {
    throw new Error(`${slug}: QA gate failed`);
  }
  if (
    !Number.isInteger(generation.generationCount) ||
    generation.generationCount < 1 ||
    generation.generationCount > 3 ||
    (generation.generationCount === 3 && generation.exceptionalRegenerationApproved !== true) ||
    (generation.exceptionalRegenerationApproved === true && generation.generationCount !== 3)
  ) {
    throw new Error(`${slug}: invalid generationCount`);
  }
  const sourcePath = path.resolve(webRoot, generation.sourceFile);
  const expectedSource = path.resolve(webRoot, "public", "safety-images", "library", "originals", `${slug}.png`);
  if (sourcePath !== expectedSource) throw new Error(`${slug}: source path mismatch`);
  const source = await readFile(sourcePath);
  const checksum = createHash("sha256").update(source).digest("hex");
  if (checksum !== generation.checksum || checksum !== review.masterChecksum || checksum !== asset.sourceChecksum) {
    throw new Error(`${slug}: checksum mismatch`);
  }
  if (checksums.has(checksum)) throw new Error(`${slug}: duplicate clean master`);
  checksums.add(checksum);
}

const translationStatuses = new Set(["official-confirmed", "translated-backchecked-not-native"]);
let phraseCount = 0;
let officialPhraseCount = 0;
let numericThemeCount = 0;
for (const item of translations) {
  const languageEntries = Object.entries(item.translations ?? {});
  if (languageEntries.length !== 5) throw new Error(`${item.slug}: five translations required`);
  for (const [language, translation] of languageEntries) {
    phraseCount += 1;
    if (!translationStatuses.has(translation.status) || !translation.text || !translation.backTranslationJa) {
      throw new Error(`${item.slug}/${language}: translation review incomplete`);
    }
    if (translation.officialConfirmed) officialPhraseCount += 1;
  }
  if (item.editableNumber) {
    numericThemeCount += 1;
    for (const [language, translation] of languageEntries) {
      if (!translation.text.includes("{value}")) {
        throw new Error(`${item.slug}/${language}: numeric placeholder missing`);
      }
    }
  }
}
if (phraseCount !== 500 || numericThemeCount !== 10) {
  throw new Error(`Translation counts invalid: phrases=${phraseCount}, numeric=${numericThemeCount}`);
}

const finalizedInventory = inventory.map((row) => ({
  ...row,
  generationStatus: "generated",
  qaStatus: "pass",
  publishStatus: "published",
}));
const finalizedMarket = {
  ...marketRoot,
  items: market.map((item) => ({
    ...item,
    generationStatus: "generated",
    qaStatus: "pass",
    publishStatus: "published",
  })),
};

const qaHeaders = [
  "id",
  "slug",
  "titleJa",
  "prompt",
  "generatedAt",
  "generationCount",
  "regenerationReasons",
  "sourceFile",
  "checksum",
  "reviewedAt",
  "reviewer",
  "anatomyQa",
  "ppeQa",
  "equipmentQa",
  "marketFitQa",
  "textFreeQa",
  "stickFigureQa",
  "svgPersonQa",
  "externalLogoQa",
  "themeMatchQa",
  "textSpaceQa",
  "rightsStatus",
  "publishStatus",
];
const marketBySlug = new Map(market.map((item) => [item.slug, item]));
const qaRows = expectedSlugs.map((slug) => {
  const theme = marketBySlug.get(slug);
  const generation = ledgerBySlug.get(slug);
  const review = qaBySlug.get(slug);
  return {
    id: theme.id,
    slug,
    titleJa: theme.titleJa,
    prompt: generation.prompt,
    generatedAt: generation.generatedAt,
    generationCount: generation.generationCount,
    regenerationReasons: generation.regenerationReasons.join(";"),
    sourceFile: generation.sourceFile,
    checksum: generation.checksum,
    reviewedAt: review.reviewedAt,
    reviewer: review.reviewer,
    anatomyQa: review.anatomyQa,
    ppeQa: review.ppeQa,
    equipmentQa: review.equipmentQa,
    marketFitQa: review.marketFitQa,
    textFreeQa: review.textFreeQa,
    stickFigureQa: review.stickFigureQa,
    svgPersonQa: review.svgPersonQa,
    externalLogoQa: review.externalLogoQa,
    themeMatchQa: review.themeMatchQa,
    textSpaceQa: review.textSpaceQa,
    rightsStatus: review.rightsStatus,
    publishStatus: review.publishStatus,
  };
});

const totalCalls = ledger.reduce((sum, item) => sum + item.generationCount, 0);
const regenerations = totalCalls - 100;
const exceptionalThirdPasses = ledger.filter((item) => item.exceptionalRegenerationApproved === true).length;
const state = `# 現場安全看板ライブラリ 現行状態\n\n` +
  `基準日: 2026-08-28 JST\n\n` +
  `## 公開候補\n\n` +
  `- 市場調査: ${products.length}商品、${marketRoot.vendorCount}事業者\n` +
  `- 確定テーマ: 100件（複数事業者確認 ${marketRoot.multiVendorThemeCount}件）\n` +
  `- 文字なしクリーンマスター: 100点、最適化WebPプレビュー: 100点\n` +
  `- 画像生成: ${totalCalls}回（再生成 ${regenerations}回。通常最大2回、独立QA是例外承認 ${exceptionalThirdPasses}点のみ3回）\n` +
  `- 独立QA: 100/100 PASS、棒人間0、SVG人物0、埋込み文字0、外部ロゴ0\n` +
  `- 言語: 日本語・英語・ベトナム語・中国語簡体・インドネシア語（500文言、公式確認 ${officialPhraseCount}文言）\n` +
  `- 翻訳表示: ネイティブ確認済みとは表示しない\n\n` +
  `## 実装\n\n` +
  `- 一覧: \`/materials/safety-images\`\n` +
  `- 詳細: 静的100 URL、カテゴリ7 URL\n` +
  `- 編集: 文字、5言語、数値・単位、文字位置・サイズ・背景帯、ブランド表示\n` +
  `- 出力: JPEG・PNG・PDF、A4・A3・市場サイズ13種、300dpi設定\n` +
  `- privacy: 編集文字はURL・ファイル名・analytics・RUM・ログへ送らず、POST本文だけで処理\n` +
  `- rights: 安全AIポータル作成／商用利用可／加工可。法定・JIS適合品の代替とは表示しない\n` +
  `- legacy: 旧詳細は意味対応する301または410、旧画像・pilotは非公開\n\n` +
  `## 正本\n\n` +
  `- 市場: \`docs/audits/current-safety-sign-market-inventory.csv\`\n` +
  `- 生成: \`web/src/data/safety-image-library/generation-ledger.json\`\n` +
  `- QA: \`docs/audits/current-safety-sign-qa.csv\`\n` +
  `- 翻訳: \`web/src/data/safety-image-library/translation-registry.json\`\n` +
  `- レイアウト: \`web/src/data/safety-image-library/layouts.json\`\n`;

await Promise.all([
  writeFile(inventoryPath, serializeCsv(inventoryHeaders, finalizedInventory), "utf8"),
  writeFile(path.join(dataDirectory, "market-themes.json"), `${JSON.stringify(finalizedMarket, null, 2)}\n`, "utf8"),
  writeFile(path.join(auditDirectory, "current-safety-sign-qa.csv"), serializeCsv(qaHeaders, qaRows), "utf8"),
  writeFile(path.join(auditDirectory, "current-safety-sign-library-state.md"), state, "utf8"),
]);

process.stdout.write(
  `${JSON.stringify({ themes: 100, products: products.length, vendors: marketRoot.vendorCount, multiVendorThemes: marketRoot.multiVendorThemeCount, generationCalls: totalCalls, regenerations, exceptionalThirdPasses, qaPassed: 100, translations: phraseCount, officialTranslations: officialPhraseCount })}\n`,
);
