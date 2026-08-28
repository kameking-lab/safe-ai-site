import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDirectory, "..");

function argumentsFrom(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (!key?.startsWith("--") || !value) throw new Error(`Invalid argument near ${key ?? "end"}`);
    result[key.slice(2)] = value;
  }
  return result;
}

async function json(file) {
  return JSON.parse(await readFile(path.resolve(webRoot, file), "utf8"));
}

const options = argumentsFrom(process.argv.slice(2));
for (const required of [
  "final-originals",
  "agent-a-ledger",
  "agent-a-qa",
  "agent-b-ledger",
  "agent-b-qa",
  "ledger-output",
  "qa-output",
  "independent-qa",
]) {
  if (!options[required]) throw new Error(`Missing --${required}`);
}

const prototypeDefinitions = [
  {
    id: "S001",
    slug: "helmet-required",
    prompt: "日本の建設現場の安全看板用、テーマは「保護帽を正しく着用」。自然な体格の成人作業員が、あご紐を締めたヘルメットと反射ベストを正しく着用する縦長構図で、広い余白を残す。写実寄りの鮮明なデジタルイラスト、太い輪郭、高コントラスト、簡潔な背景、文字・数字・ロゴ・透かしなし。",
    generationCount: 1,
    regenerationReasons: [],
    anatomyQa: "pass",
    ppeQa: "pass",
    equipmentQa: "not-applicable",
  },
  {
    id: "S016",
    slug: "no-entry",
    prompt: "日本の工事現場の禁止看板用、テーマは「立入禁止」。仮設バリケードの手前で成人作業員が止まり、境界と進入不可が一目で分かる正方形構図で、広い余白を残す。写実寄りの鮮明なデジタルイラスト、太い輪郭、赤は補助色、簡潔な背景、文字・数字・ロゴ・既存ピクトの模倣なし。",
    generationCount: 2,
    regenerationReasons: ["試作hard gateで境界と進入不可の明瞭性が不足"],
    anatomyQa: "pass",
    ppeQa: "pass",
    equipmentQa: "pass",
  },
  {
    id: "S041",
    slug: "no-under-suspended-load",
    prompt: "日本の建設現場の危険看板用、テーマは「吊り荷の下に入らない」。クレーンフックと緊張した吊具で荷を吊り、成人作業員は落下範囲の外で止まる横長構図で、広い余白を残す。写実寄りの鮮明なデジタルイラスト、太い輪郭、高コントラスト、簡潔な背景、文字・数字・ロゴ・流血なし。",
    generationCount: 2,
    regenerationReasons: ["試作hard gateで吊り荷と人物位置関係の明瞭性が不足"],
    anatomyQa: "pass",
    ppeQa: "pass",
    equipmentQa: "pass",
  },
  {
    id: "S060",
    slug: "hot-work-in-progress",
    prompt: "日本の建設現場の状態表示看板用、テーマは「火気使用中」。溶接面、手袋、長袖を正しく着けた成人作業員が火花を管理して溶接し、可燃物のない横長構図で広い余白を残す。写実寄りの鮮明なデジタルイラスト、太い輪郭、高コントラスト、簡潔な背景、文字・数字・ロゴなし。",
    generationCount: 1,
    regenerationReasons: [],
    anatomyQa: "pass",
    ppeQa: "pass",
    equipmentQa: "pass",
  },
  {
    id: "S082",
    slug: "maximum-load",
    prompt: "日本の建設現場の数値看板用、テーマは「最大積載荷重」。汎用の作業床と整然と置かれた資材を横長に簡潔に描き、数値を後付けする大きな空白面を残す。写実寄りの鮮明なデジタルイラスト、太い輪郭、高コントラスト、簡潔な背景、文字・数字・ロゴ・安全可否の断定なし。",
    generationCount: 2,
    regenerationReasons: ["試作hard gateで後付け数値用の安全余白が不足"],
    anatomyQa: "not-applicable",
    ppeQa: "not-applicable",
    equipmentQa: "pass",
  },
  {
    id: "S091",
    slug: "heat-illness-alert",
    prompt: "日本の建設現場の健康警戒看板用、テーマは「熱中症警戒」。強い日差しの下で成人作業員が日陰へ移り水分を取る縦長構図とし、暑さが一目で分かり広い余白を残す。写実寄りの鮮明なデジタルイラスト、太い輪郭、高コントラスト、簡潔な背景、文字・数字・ロゴなし。",
    generationCount: 1,
    regenerationReasons: [],
    anatomyQa: "pass",
    ppeQa: "pass",
    equipmentQa: "not-applicable",
  },
];

const [
  marketRoot,
  agentALedgerRoot,
  agentAQaRoot,
  agentBLedgerRoot,
  agentBQaRoot,
  independentQaRoot,
] = await Promise.all([
  json("src/data/safety-image-library/market-themes.json"),
  json(options["agent-a-ledger"]),
  json(options["agent-a-qa"]),
  json(options["agent-b-ledger"]),
  json(options["agent-b-qa"]),
  json(options["independent-qa"]),
]);
if (!Array.isArray(marketRoot.items) || marketRoot.items.length !== 100) {
  throw new Error("Market registry must contain 100 themes");
}
for (const [label, root] of [
  ["agent A ledger", agentALedgerRoot],
  ["agent A QA", agentAQaRoot],
  ["agent B ledger", agentBLedgerRoot],
  ["agent B QA", agentBQaRoot],
]) {
  if (!Array.isArray(root.items) || root.items.length !== 47) {
    throw new Error(`${label} must contain exactly 47 items`);
  }
}
if (independentQaRoot.schemaVersion !== "independent-safety-sign-review-v1") {
  throw new Error("Independent QA must use independent-safety-sign-review-v1");
}
if (
  typeof independentQaRoot.reviewer !== "string" ||
  independentQaRoot.reviewer.trim().length === 0
) {
  throw new Error("Independent QA must identify its reviewer");
}
if (
  typeof independentQaRoot.reviewedAt !== "string" ||
  !Number.isFinite(Date.parse(independentQaRoot.reviewedAt))
) {
  throw new Error("Independent QA must provide a valid reviewedAt timestamp");
}
if (!Array.isArray(independentQaRoot.items) || independentQaRoot.items.length !== 100) {
  throw new Error("Independent QA must contain exactly 100 items");
}

const passOnlyQaFields = [
  "marketFitQa",
  "textFreeQa",
  "stickFigureQa",
  "svgPersonQa",
  "externalLogoQa",
  "themeMatchQa",
  "textSpaceQa",
];
const passOrNotApplicableQaFields = ["anatomyQa", "ppeQa", "equipmentQa"];
const independentQaBySlug = new Map();
for (const review of independentQaRoot.items) {
  if (!review || typeof review !== "object" || Array.isArray(review)) {
    throw new Error("Independent QA items must be objects");
  }
  if (typeof review.slug !== "string" || review.slug.length === 0) {
    throw new Error("Independent QA item has no slug");
  }
  if (independentQaBySlug.has(review.slug)) {
    throw new Error(`Independent QA contains duplicate slug: ${review.slug}`);
  }
  if (!/^[a-f0-9]{64}$/.test(review.masterChecksum)) {
    throw new Error(`${review.slug}: independent QA masterChecksum is not SHA-256`);
  }
  if (review.result !== "pass") {
    throw new Error(`${review.slug}: independent QA result must be pass`);
  }
  for (const field of passOrNotApplicableQaFields) {
    if (review[field] !== "pass" && review[field] !== "not-applicable") {
      throw new Error(`${review.slug}: independent QA ${field} must be pass or not-applicable`);
    }
  }
  for (const field of passOnlyQaFields) {
    if (review[field] !== "pass") {
      throw new Error(`${review.slug}: independent QA ${field} must be pass`);
    }
  }
  if (review.rightsStatus !== "portal-owned-commercial-editable") {
    throw new Error(`${review.slug}: independent QA rightsStatus is not publishable`);
  }
  if (review.publishStatus !== "published") {
    throw new Error(`${review.slug}: independent QA publishStatus must be published`);
  }
  independentQaBySlug.set(review.slug, review);
}

const finalOriginals = path.resolve(webRoot, options["final-originals"]);
const expectedMasterNames = new Set(marketRoot.items.map((theme) => `${theme.slug}.png`));
const actualMasterNames = (await readdir(finalOriginals, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".png"))
  .map((entry) => entry.name);
if (
  actualMasterNames.length !== 100 ||
  actualMasterNames.some((name) => !expectedMasterNames.has(name))
) {
  throw new Error("Final originals must contain exactly the 100 market-theme PNG masters");
}
const checksumBySlug = new Map();
const generatedAtBySlug = new Map();
for (const theme of marketRoot.items) {
  const file = path.join(finalOriginals, `${theme.slug}.png`);
  const [bytes, details] = await Promise.all([readFile(file), stat(file)]);
  checksumBySlug.set(theme.slug, createHash("sha256").update(bytes).digest("hex"));
  generatedAtBySlug.set(theme.slug, details.mtime.toISOString());
}
if (new Set(checksumBySlug.values()).size !== 100) throw new Error("Clean-master checksums must be unique");

const prototypeBySlug = new Map(prototypeDefinitions.map((item) => [item.slug, item]));
const sourceLedger = new Map(
  [...agentALedgerRoot.items, ...agentBLedgerRoot.items].map((item) => [item.slug, item]),
);
const sourceQa = new Map(
  [...agentAQaRoot.items, ...agentBQaRoot.items].map((item) => [item.slug, item]),
);
if (sourceLedger.size !== 94 || sourceQa.size !== 94) throw new Error("Agent fragments must cover 94 unique themes");

const ledger = [];
const qa = [];
for (const theme of marketRoot.items) {
  const prototype = prototypeBySlug.get(theme.slug);
  const checksum = checksumBySlug.get(theme.slug);
  const source = sourceLedger.get(theme.slug);
  const sourceReview = sourceQa.get(theme.slug);
  const independentReview = independentQaBySlug.get(theme.slug);
  if (!prototype && (!source || !sourceReview)) throw new Error(`Missing generation evidence: ${theme.slug}`);
  if (!independentReview) throw new Error(`Missing independent QA: ${theme.slug}`);
  if (independentReview.masterChecksum !== checksum) {
    throw new Error(`${theme.slug}: independent QA checksum does not match the approved image`);
  }
  const generation = prototype
    ? {
        id: prototype.id,
        slug: prototype.slug,
        prompt: prototype.prompt,
        generatedAt: generatedAtBySlug.get(theme.slug),
        generationCount: prototype.generationCount,
        regenerationReasons: prototype.regenerationReasons,
        generationMethod: "OpenAI image generation",
        sourceFile: `public/safety-images/library/originals/${theme.slug}.png`,
        checksumAlgorithm: "sha256",
        checksum,
        rightsStatus: "portal-owned-commercial-editable",
        publishStatus: "published",
      }
    : {
        ...source,
        sourceFile: `public/safety-images/library/originals/${theme.slug}.png`,
        checksum,
        publishStatus: "published",
      };
  if (generation.id !== theme.id) throw new Error(`${theme.slug}: id mismatch`);
  if ([...generation.prompt].length > 250) throw new Error(`${theme.slug}: prompt exceeds 250 characters`);
  if (generation.prompt.split(/[.!?。！？]+/u).filter((part) => part.trim()).length > 3) {
    throw new Error(`${theme.slug}: prompt exceeds three sentences`);
  }
  if (!/(?:文字[^。！？]{0,30}なし|text[- ]?free|without text)/iu.test(generation.prompt)) {
    throw new Error(`${theme.slug}: prompt lacks text-free requirement`);
  }
  if (!Number.isInteger(generation.generationCount)) {
    throw new Error(`${theme.slug}: generationCount must be an integer`);
  }
  if (!Array.isArray(generation.regenerationReasons)) {
    throw new Error(`${theme.slug}: regenerationReasons must be an array`);
  }
  const ordinaryGeneration =
    generation.generationCount >= 1 &&
    generation.generationCount <= 2 &&
    generation.exceptionalRegenerationApproved !== true;
  const approvedExceptionalGeneration =
    generation.generationCount === 3 &&
    generation.exceptionalRegenerationApproved === true &&
    generation.regenerationReasons.length === 2;
  if (!ordinaryGeneration && !approvedExceptionalGeneration) {
    throw new Error(
      `${theme.slug}: generationCount must be 1-2, or 3 with exceptionalRegenerationApproved and two reasons`,
    );
  }
  if (generation.regenerationReasons.length !== generation.generationCount - 1) {
    throw new Error(`${theme.slug}: regeneration reason count mismatch`);
  }
  if (!prototype && source.checksum !== checksum) {
    throw new Error(`${theme.slug}: agent ledger checksum does not match the approved image`);
  }
  ledger.push(generation);
  qa.push({
    slug: theme.slug,
    reviewedAt: independentQaRoot.reviewedAt,
    reviewer: independentQaRoot.reviewer,
    generationCount: generation.generationCount,
    masterChecksum: independentReview.masterChecksum,
    result: independentReview.result,
    anatomyQa: independentReview.anatomyQa,
    ppeQa: independentReview.ppeQa,
    equipmentQa: independentReview.equipmentQa,
    marketFitQa: independentReview.marketFitQa,
    textFreeQa: independentReview.textFreeQa,
    stickFigureQa: independentReview.stickFigureQa,
    svgPersonQa: independentReview.svgPersonQa,
    externalLogoQa: independentReview.externalLogoQa,
    themeMatchQa: independentReview.themeMatchQa,
    textSpaceQa: independentReview.textSpaceQa,
    rightsStatus: independentReview.rightsStatus,
    publishStatus: independentReview.publishStatus,
  });
}

const summary = {
  themes: 100,
  totalGenerationCalls: ledger.reduce((sum, item) => sum + item.generationCount, 0),
  totalRegenerations: ledger.reduce((sum, item) => sum + item.regenerationReasons.length, 0),
  uniqueChecksums: new Set(ledger.map((item) => item.checksum)).size,
  independentReviewer: independentQaRoot.reviewer,
  approved: 100,
};
await Promise.all([
  writeFile(
    path.resolve(webRoot, options["ledger-output"]),
    `${JSON.stringify({ schemaVersion: "safety-sign-generation-ledger-v2", summary, items: ledger }, null, 2)}\n`,
    "utf8",
  ),
  writeFile(
    path.resolve(webRoot, options["qa-output"]),
    `${JSON.stringify({ schemaVersion: "safety-sign-qa-v2", summary, items: qa }, null, 2)}\n`,
    "utf8",
  ),
]);
process.stdout.write(`${JSON.stringify(summary)}\n`);
