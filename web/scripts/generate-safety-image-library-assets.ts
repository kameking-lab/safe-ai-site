import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import {
  SAFETY_IMAGE_LAYOUTS,
  SAFETY_IMAGE_THEMES,
} from "../src/data/safety-image-library/index.ts";

const EXPECTED_MASTER_COUNT = 100;
const LEDGER_SCHEMA_VERSION = "safety-sign-generation-ledger-v2";
const QA_SCHEMA_VERSION = "safety-sign-qa-v2";
const RIGHTS_STATUS = "portal-owned-commercial-editable";
const PASS_OR_NOT_APPLICABLE = new Set(["pass", "not-applicable"]);

type JsonObject = Record<string, unknown>;

export type SafetyImageThemeContract = JsonObject & {
  id: string;
  slug: string;
  title: string;
  category: string;
  orientation: string;
  texts: Record<string, string>;
  pngAvailable?: boolean;
};

export type SafetyImageAssetPipelineOptions = {
  workspace: string;
  themes: readonly SafetyImageThemeContract[];
  ledgerInputPath: string;
  qaInputPath: string;
  originalsDirectory: string;
  previewsDirectory: string;
  dataDirectory: string;
  expectedCount?: number;
  minimumMasterDimension?: number;
};

type ValidatedLedgerItem = {
  id: string;
  slug: string;
  prompt: string;
  generatedAt: string;
  generationCount: number;
  regenerationReasons: string[];
  exceptionalRegenerationApproved?: true;
  generationMethod: "OpenAI image generation";
  sourceFile: string;
  checksumAlgorithm: "sha256";
  checksum: string;
  rightsStatus: typeof RIGHTS_STATUS;
  publishStatus: "approved" | "published";
};

type ValidatedQaItem = {
  slug: string;
  reviewedAt: string;
  reviewer: string;
  generationCount: number;
  masterChecksum: string;
  result: "pass";
  anatomyQa: "pass" | "not-applicable";
  ppeQa: "pass" | "not-applicable";
  equipmentQa: "pass" | "not-applicable";
  marketFitQa: "pass";
  textFreeQa: "pass";
  stickFigureQa: "pass";
  svgPersonQa: "pass";
  externalLogoQa: "pass";
  themeMatchQa: "pass";
  textSpaceQa: "pass";
  rightsStatus: typeof RIGHTS_STATUS;
  publishStatus: "approved" | "published";
};

type MasterInspection = {
  slug: string;
  bytes: number;
  checksum: string;
  width: number;
  height: number;
  hasAlpha: boolean;
  entropy: number;
  original: Buffer;
};

type PreviewInspection = {
  slug: string;
  path: string;
  checksum: string;
  width: number;
  height: number;
  bytes: number;
};

type PipelineResult = {
  summary: JsonObject;
  manifestPath: string;
  ledgerPath: string;
  qaPath: string;
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(
  item: JsonObject,
  field: string,
  label: string,
  errors: string[],
): string {
  const value = item[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${label}.${field} must be a non-empty string`);
    return "";
  }
  return value.trim();
}

function integerValue(
  item: JsonObject,
  field: string,
  label: string,
  errors: string[],
): number {
  const value = item[field];
  if (!Number.isInteger(value)) {
    errors.push(`${label}.${field} must be an integer`);
    return 0;
  }
  return value as number;
}

function stringArrayValue(
  item: JsonObject,
  field: string,
  label: string,
  errors: string[],
): string[] {
  const value = item[field];
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string" || entry.trim().length === 0)
  ) {
    errors.push(`${label}.${field} must be an array of non-empty strings`);
    return [];
  }
  return value.map((entry) => (entry as string).trim());
}

function assertIsoDate(value: string, label: string, errors: string[]): void {
  if (!/^\d{4}-\d{2}-\d{2}T/u.test(value) || Number.isNaN(Date.parse(value))) {
    errors.push(`${label} must be an ISO-8601 date-time`);
  }
}

function assertSha256(value: string, label: string, errors: string[]): void {
  if (!/^[a-f0-9]{64}$/u.test(value)) {
    errors.push(`${label} must be a lowercase SHA-256 hex digest`);
  }
}

function assertExactStatus(
  item: JsonObject,
  field: string,
  allowed: ReadonlySet<string>,
  label: string,
  errors: string[],
): string {
  const value = stringValue(item, field, label, errors);
  if (value && !allowed.has(value)) {
    errors.push(`${label}.${field} must be one of: ${[...allowed].join(", ")}`);
  }
  return value;
}

function parseItemsRoot(
  value: unknown,
  expectedSchemaVersion: string,
  label: string,
  errors: string[],
): JsonObject[] {
  if (!isObject(value)) {
    errors.push(`${label} root must be an object`);
    return [];
  }
  if (value.schemaVersion !== expectedSchemaVersion) {
    errors.push(`${label}.schemaVersion must be ${expectedSchemaVersion}`);
  }
  if (!Array.isArray(value.items)) {
    errors.push(`${label}.items must be an array`);
    return [];
  }
  return value.items.flatMap((item, index) => {
    if (!isObject(item)) {
      errors.push(`${label}.items[${index}] must be an object`);
      return [];
    }
    return [item];
  });
}

function validateExactSlugSet(
  items: readonly JsonObject[],
  expectedSlugs: readonly string[],
  label: string,
  errors: string[],
): void {
  const slugs = items.map((item, index) => {
    const value = item.slug;
    if (typeof value !== "string" || value.trim().length === 0) {
      errors.push(`${label}.items[${index}].slug must be a non-empty string`);
      return "";
    }
    return value.trim();
  });
  const counts = new Map<string, number>();
  for (const slug of slugs.filter(Boolean)) {
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  for (const [slug, count] of counts) {
    if (count > 1) errors.push(`${label} has duplicate slug: ${slug}`);
  }
  const expected = new Set(expectedSlugs);
  const actual = new Set(slugs.filter(Boolean));
  for (const slug of expected) {
    if (!actual.has(slug)) errors.push(`${label} is missing slug: ${slug}`);
  }
  for (const slug of actual) {
    if (!expected.has(slug)) errors.push(`${label} has unexpected slug: ${slug}`);
  }
}

function validateLedgerItem(
  raw: JsonObject,
  workspace: string,
  errors: string[],
): ValidatedLedgerItem | undefined {
  const slug = stringValue(raw, "slug", "ledger item", errors);
  const label = `ledger[${slug || "unknown"}]`;
  const id = stringValue(raw, "id", label, errors);
  const prompt = stringValue(raw, "prompt", label, errors);
  const generatedAt = stringValue(raw, "generatedAt", label, errors);
  const generationCount = integerValue(raw, "generationCount", label, errors);
  const regenerationReasons = stringArrayValue(
    raw,
    "regenerationReasons",
    label,
    errors,
  );
  const exceptionalRegenerationApproved = raw.exceptionalRegenerationApproved === true;
  const generationMethod = assertExactStatus(
    raw,
    "generationMethod",
    new Set(["OpenAI image generation"]),
    label,
    errors,
  );
  const sourceFile = stringValue(raw, "sourceFile", label, errors).replaceAll("\\", "/");
  const checksumAlgorithm = assertExactStatus(
    raw,
    "checksumAlgorithm",
    new Set(["sha256"]),
    label,
    errors,
  );
  const checksum = stringValue(raw, "checksum", label, errors);
  const rightsStatus = assertExactStatus(
    raw,
    "rightsStatus",
    new Set([RIGHTS_STATUS]),
    label,
    errors,
  );
  const publishStatus = assertExactStatus(
    raw,
    "publishStatus",
    new Set(["approved", "published"]),
    label,
    errors,
  );

  assertIsoDate(generatedAt, `${label}.generatedAt`, errors);
  assertSha256(checksum, `${label}.checksum`, errors);
  const promptLength = [...prompt].length;
  if (promptLength > 250) errors.push(`${label}.prompt exceeds 250 characters (${promptLength})`);
  const sentenceCount = prompt.split(/[.!?。！？]+/u).filter((part) => part.trim()).length;
  if (sentenceCount > 3) errors.push(`${label}.prompt exceeds 3 sentences (${sentenceCount})`);
  if (prompt && !/(?:文字[^。！？]{0,30}なし|text[- ]?free|without text)/iu.test(prompt)) {
    errors.push(`${label}.prompt must explicitly require a text-free image`);
  }
  if (
    generationCount < 1 ||
    generationCount > 3 ||
    (generationCount === 3 && !exceptionalRegenerationApproved) ||
    (exceptionalRegenerationApproved && generationCount !== 3)
  ) {
    errors.push(
      `${label}.generationCount must be 1-2, or exactly 3 with exceptionalRegenerationApproved`,
    );
  }
  if (regenerationReasons.length !== Math.max(0, generationCount - 1)) {
    errors.push(
      `${label}.regenerationReasons must contain exactly generationCount - 1 entries`,
    );
  }
  const expectedSourceFile = `public/safety-images/library/originals/${slug}.png`;
  if (sourceFile !== expectedSourceFile) {
    errors.push(`${label}.sourceFile must be ${expectedSourceFile}`);
  }
  if (sourceFile) {
    const resolvedSource = path.resolve(workspace, sourceFile);
    const resolvedWorkspace = path.resolve(workspace);
    if (
      resolvedSource !== resolvedWorkspace &&
      !resolvedSource.startsWith(`${resolvedWorkspace}${path.sep}`)
    ) {
      errors.push(`${label}.sourceFile escapes the workspace`);
    }
  }

  if (!slug || !id) return undefined;
  return {
    id,
    slug,
    prompt,
    generatedAt,
    generationCount,
    regenerationReasons,
    ...(exceptionalRegenerationApproved ? { exceptionalRegenerationApproved: true as const } : {}),
    generationMethod: generationMethod as "OpenAI image generation",
    sourceFile,
    checksumAlgorithm: checksumAlgorithm as "sha256",
    checksum,
    rightsStatus: rightsStatus as typeof RIGHTS_STATUS,
    publishStatus: publishStatus as "approved" | "published",
  };
}

function validateQaItem(raw: JsonObject, errors: string[]): ValidatedQaItem | undefined {
  const slug = stringValue(raw, "slug", "qa item", errors);
  const label = `qa[${slug || "unknown"}]`;
  const reviewedAt = stringValue(raw, "reviewedAt", label, errors);
  const reviewer = stringValue(raw, "reviewer", label, errors);
  const generationCount = integerValue(raw, "generationCount", label, errors);
  const masterChecksum = stringValue(raw, "masterChecksum", label, errors);
  const result = assertExactStatus(raw, "result", new Set(["pass"]), label, errors);
  const anatomyQa = assertExactStatus(
    raw,
    "anatomyQa",
    PASS_OR_NOT_APPLICABLE,
    label,
    errors,
  );
  const ppeQa = assertExactStatus(raw, "ppeQa", PASS_OR_NOT_APPLICABLE, label, errors);
  const equipmentQa = assertExactStatus(
    raw,
    "equipmentQa",
    PASS_OR_NOT_APPLICABLE,
    label,
    errors,
  );
  const passOnlyFields = [
    "marketFitQa",
    "textFreeQa",
    "stickFigureQa",
    "svgPersonQa",
    "externalLogoQa",
    "themeMatchQa",
    "textSpaceQa",
  ] as const;
  const statuses = Object.fromEntries(
    passOnlyFields.map((field) => [
      field,
      assertExactStatus(raw, field, new Set(["pass"]), label, errors),
    ]),
  ) as Record<(typeof passOnlyFields)[number], string>;
  const rightsStatus = assertExactStatus(
    raw,
    "rightsStatus",
    new Set([RIGHTS_STATUS]),
    label,
    errors,
  );
  const publishStatus = assertExactStatus(
    raw,
    "publishStatus",
    new Set(["approved", "published"]),
    label,
    errors,
  );
  assertIsoDate(reviewedAt, `${label}.reviewedAt`, errors);
  assertSha256(masterChecksum, `${label}.masterChecksum`, errors);

  if (!slug) return undefined;
  return {
    slug,
    reviewedAt,
    reviewer,
    generationCount,
    masterChecksum,
    result: result as "pass",
    anatomyQa: anatomyQa as "pass" | "not-applicable",
    ppeQa: ppeQa as "pass" | "not-applicable",
    equipmentQa: equipmentQa as "pass" | "not-applicable",
    marketFitQa: statuses.marketFitQa as "pass",
    textFreeQa: statuses.textFreeQa as "pass",
    stickFigureQa: statuses.stickFigureQa as "pass",
    svgPersonQa: statuses.svgPersonQa as "pass",
    externalLogoQa: statuses.externalLogoQa as "pass",
    themeMatchQa: statuses.themeMatchQa as "pass",
    textSpaceQa: statuses.textSpaceQa as "pass",
    rightsStatus: rightsStatus as typeof RIGHTS_STATUS,
    publishStatus: publishStatus as "approved" | "published",
  };
}

async function inspectMasters(
  options: SafetyImageAssetPipelineOptions,
  ledgerBySlug: ReadonlyMap<string, ValidatedLedgerItem>,
  qaBySlug: ReadonlyMap<string, ValidatedQaItem>,
  errors: string[],
): Promise<MasterInspection[]> {
  // Image-generation aspect ratios can resolve to 864-887 px on the short
  // side while retaining 1,774-1,821 px on the long side. Preserve those
  // original generated masters and reject genuinely undersized assets below
  // the evidence-backed floor instead of resampling them before checksum QA.
  const minimumDimension = options.minimumMasterDimension ?? 850;
  const entries = await readdir(options.originalsDirectory, {
    withFileTypes: true,
    encoding: "utf8",
  }).catch((error: unknown) => {
    errors.push(
      `Unable to read originals directory: ${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  });
  if (!entries) return [];
  const actualFiles = entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort();
  const expectedFiles = options.themes.map((theme) => `${theme.slug}.png`).sort();
  const actualSet = new Set(actualFiles);
  const expectedSet = new Set(expectedFiles);
  for (const file of expectedFiles) {
    if (!actualSet.has(file)) errors.push(`Missing PNG clean master: ${file}`);
  }
  for (const file of actualFiles) {
    if (!expectedSet.has(file)) errors.push(`Unexpected file in clean-master directory: ${file}`);
  }
  if (actualFiles.length !== (options.expectedCount ?? EXPECTED_MASTER_COUNT)) {
    errors.push(
      `Expected exactly ${options.expectedCount ?? EXPECTED_MASTER_COUNT} master files, found ${actualFiles.length}`,
    );
  }

  const inspections: MasterInspection[] = [];
  const checksums = new Map<string, string>();
  for (const theme of options.themes) {
    const masterPath = path.join(options.originalsDirectory, `${theme.slug}.png`);
    let original: Buffer;
    try {
      original = await readFile(masterPath);
    } catch {
      continue;
    }
    try {
      const image = sharp(original, { failOn: "warning", limitInputPixels: 100_000_000 });
      const [metadata, statistics] = await Promise.all([image.metadata(), image.stats()]);
      if (metadata.format !== "png") errors.push(`${theme.slug}: clean master is not PNG`);
      if (metadata.pages && metadata.pages !== 1) errors.push(`${theme.slug}: master must have one frame`);
      if (!metadata.width || !metadata.height) {
        errors.push(`${theme.slug}: master dimensions are unavailable`);
        continue;
      }
      if (metadata.width < minimumDimension || metadata.height < minimumDimension) {
        errors.push(
          `${theme.slug}: master must be at least ${minimumDimension}px on both axes (found ${metadata.width}x${metadata.height})`,
        );
      }
      if (statistics.entropy < 0.5) {
        errors.push(`${theme.slug}: master entropy is too low for a finished illustration`);
      }
      const checksum = createHash("sha256").update(original).digest("hex");
      const duplicate = checksums.get(checksum);
      if (duplicate) {
        errors.push(`Duplicate clean-master checksum: ${duplicate} and ${theme.slug}`);
      } else {
        checksums.set(checksum, theme.slug);
      }
      const ledger = ledgerBySlug.get(theme.slug);
      const qa = qaBySlug.get(theme.slug);
      if (ledger && ledger.checksum !== checksum) {
        errors.push(`${theme.slug}: computed checksum does not match the external ledger`);
      }
      if (qa && qa.masterChecksum !== checksum) {
        errors.push(`${theme.slug}: computed checksum does not match the external QA record`);
      }
      if (ledger && qa) {
        if (ledger.generationCount !== qa.generationCount) {
          errors.push(`${theme.slug}: generationCount differs between ledger and QA`);
        }
        if (Date.parse(qa.reviewedAt) < Date.parse(ledger.generatedAt)) {
          errors.push(`${theme.slug}: QA review predates generation`);
        }
      }
      inspections.push({
        slug: theme.slug,
        bytes: original.byteLength,
        checksum,
        width: metadata.width,
        height: metadata.height,
        hasAlpha: metadata.hasAlpha ?? false,
        entropy: statistics.entropy,
        original,
      });
    } catch (error) {
      errors.push(
        `${theme.slug}: PNG inspection failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return inspections;
}

async function createPreviews(
  inspections: readonly MasterInspection[],
  previewsDirectory: string,
): Promise<PreviewInspection[]> {
  const parentDirectory = path.dirname(previewsDirectory);
  const stagingDirectory = path.join(
    parentDirectory,
    `.previews-staging-${process.pid}-${Date.now()}`,
  );
  await mkdir(stagingDirectory, { recursive: true });
  try {
    const previews: PreviewInspection[] = [];
    const previewChecksums = new Map<string, string>();
    for (const inspection of inspections) {
      const previewPath = path.join(stagingDirectory, `${inspection.slug}.webp`);
      await sharp(inspection.original, { failOn: "warning" })
        .rotate()
        .resize({ width: 720, height: 720, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 84, smartSubsample: true, effort: 6 })
        .toFile(previewPath);
      const preview = await readFile(previewPath);
      const metadata = await sharp(preview, { failOn: "warning" }).metadata();
      if (metadata.format !== "webp" || !metadata.width || !metadata.height) {
        throw new Error(`Invalid WebP preview generated for ${inspection.slug}`);
      }
      const checksum = createHash("sha256").update(preview).digest("hex");
      const duplicate = previewChecksums.get(checksum);
      if (duplicate) {
        throw new Error(`Duplicate WebP preview checksum: ${duplicate} and ${inspection.slug}`);
      }
      previewChecksums.set(checksum, inspection.slug);
      previews.push({
        slug: inspection.slug,
        path: `/safety-images/library/previews/${inspection.slug}.webp`,
        checksum,
        width: metadata.width,
        height: metadata.height,
        bytes: preview.byteLength,
      });
    }
    const stagedFiles = (await readdir(stagingDirectory)).filter((file) => file.endsWith(".webp"));
    if (stagedFiles.length !== inspections.length) {
      throw new Error(
        `Preview staging count mismatch: expected ${inspections.length}, found ${stagedFiles.length}`,
      );
    }
    await replaceDirectory(stagingDirectory, previewsDirectory);
    return previews;
  } catch (error) {
    await rm(stagingDirectory, { recursive: true, force: true });
    throw error;
  }
}

async function replaceDirectory(source: string, target: string): Promise<void> {
  const resolvedSource = path.resolve(source);
  const resolvedTarget = path.resolve(target);
  if (path.dirname(resolvedSource) !== path.dirname(resolvedTarget)) {
    throw new Error("Preview staging and target directories must share a parent");
  }
  const backup = `${resolvedTarget}.backup-${process.pid}-${Date.now()}`;
  let movedExisting = false;
  try {
    await rename(resolvedTarget, backup);
    movedExisting = true;
  } catch (error) {
    const code = isObject(error) && typeof error.code === "string" ? error.code : "";
    if (code !== "ENOENT") throw error;
  }
  try {
    await rename(resolvedSource, resolvedTarget);
  } catch (error) {
    if (movedExisting) await rename(backup, resolvedTarget);
    throw error;
  }
  if (movedExisting) await rm(backup, { recursive: true, force: true });
}

function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function throwValidationErrors(errors: readonly string[]): never {
  throw new Error(
    `Safety-image asset validation failed with ${errors.length} issue(s):\n- ${errors.join("\n- ")}`,
  );
}

async function readJson(file: string, label: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as unknown;
  } catch (error) {
    throw new Error(
      `Unable to read ${label} at ${file}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function runSafetyImageAssetPipeline(
  options: SafetyImageAssetPipelineOptions,
): Promise<PipelineResult> {
  const expectedCount = options.expectedCount ?? EXPECTED_MASTER_COUNT;
  const errors: string[] = [];
  if (options.themes.length !== expectedCount) {
    errors.push(`Expected exactly ${expectedCount} themes, found ${options.themes.length}`);
  }
  const themeSlugs = options.themes.map((theme) => theme.slug);
  if (new Set(themeSlugs).size !== themeSlugs.length) errors.push("Theme slugs must be unique");

  const outputLedgerPath = path.resolve(options.dataDirectory, "generation-ledger.json");
  const outputQaPath = path.resolve(options.dataDirectory, "qa.json");
  if (path.resolve(options.ledgerInputPath) === outputLedgerPath) {
    errors.push("External ledger input cannot be the generated generation-ledger.json output");
  }
  if (path.resolve(options.qaInputPath) === outputQaPath) {
    errors.push("External QA input cannot be the generated qa.json output");
  }
  if (errors.length) throwValidationErrors(errors);

  const [ledgerRoot, qaRoot] = await Promise.all([
    readJson(options.ledgerInputPath, "external generation ledger"),
    readJson(options.qaInputPath, "external QA evidence"),
  ]);
  const rawLedgerItems = parseItemsRoot(
    ledgerRoot,
    LEDGER_SCHEMA_VERSION,
    "ledger",
    errors,
  );
  const rawQaItems = parseItemsRoot(qaRoot, QA_SCHEMA_VERSION, "qa", errors);
  if (rawLedgerItems.length !== expectedCount) {
    errors.push(`External ledger must contain exactly ${expectedCount} items`);
  }
  if (rawQaItems.length !== expectedCount) {
    errors.push(`External QA evidence must contain exactly ${expectedCount} items`);
  }
  validateExactSlugSet(rawLedgerItems, themeSlugs, "ledger", errors);
  validateExactSlugSet(rawQaItems, themeSlugs, "qa", errors);
  const ledgerItems = rawLedgerItems.flatMap((item) => {
    const validated = validateLedgerItem(item, options.workspace, errors);
    return validated ? [validated] : [];
  });
  const qaItems = rawQaItems.flatMap((item) => {
    const validated = validateQaItem(item, errors);
    return validated ? [validated] : [];
  });
  const ledgerBySlug = new Map(ledgerItems.map((item) => [item.slug, item]));
  const qaBySlug = new Map(qaItems.map((item) => [item.slug, item]));
  for (const theme of options.themes) {
    const ledger = ledgerBySlug.get(theme.slug);
    const qa = qaBySlug.get(theme.slug);
    if (ledger && ledger.id !== theme.id) {
      errors.push(`${theme.slug}: ledger id ${ledger.id} does not match theme id ${theme.id}`);
    }
    if (ledger && qa && ledger.publishStatus !== qa.publishStatus) {
      errors.push(`${theme.slug}: publishStatus differs between ledger and QA`);
    }
  }
  const inspections = await inspectMasters(options, ledgerBySlug, qaBySlug, errors);
  if (inspections.length !== expectedCount) {
    errors.push(`Exactly ${expectedCount} valid PNG master inspections are required`);
  }
  if (errors.length) throwValidationErrors(errors);

  const previews = await createPreviews(inspections, options.previewsDirectory);
  const inspectionBySlug = new Map(inspections.map((item) => [item.slug, item]));
  const previewBySlug = new Map(previews.map((item) => [item.slug, item]));
  const normalizedLedger = options.themes.map((theme) => {
    const source = ledgerBySlug.get(theme.slug);
    const inspection = inspectionBySlug.get(theme.slug);
    if (!source || !inspection) throw new Error(`Internal ledger join failed: ${theme.slug}`);
    return {
      ...source,
      sourceFileUnmodified: true,
      sourceDimensions: { width: inspection.width, height: inspection.height },
      sourceBytes: inspection.bytes,
      hasAlpha: inspection.hasAlpha,
      entropy: Number(inspection.entropy.toFixed(4)),
    };
  });
  const normalizedQa = options.themes.map((theme) => {
    const item = qaBySlug.get(theme.slug);
    if (!item) throw new Error(`Internal QA join failed: ${theme.slug}`);
    return item;
  });
  const manifest = options.themes.map((theme) => {
    const master = inspectionBySlug.get(theme.slug);
    const preview = previewBySlug.get(theme.slug);
    const ledger = ledgerBySlug.get(theme.slug);
    if (!master || !preview || !ledger) throw new Error(`Internal manifest join failed: ${theme.slug}`);
    return {
      ...theme,
      cleanMaster: true,
      overlay: "runtime-code-layer",
      downloadFormats: ["jpeg", "png", "pdf"],
      originalPath: `/safety-images/library/originals/${theme.slug}.png`,
      previewPath: preview.path,
      sourceDimensions: { width: master.width, height: master.height },
      sourceChecksum: master.checksum,
      previewDimensions: { width: preview.width, height: preview.height },
      previewChecksum: preview.checksum,
      previewBytes: preview.bytes,
      generationCount: ledger.generationCount,
      published: true,
    };
  });
  const categoryCounts = Object.fromEntries(
    [...new Set(options.themes.map((theme) => theme.category))].map((category) => [
      category,
      options.themes.filter((theme) => theme.category === category).length,
    ]),
  );
  const summary = {
    schemaVersion: "safety-sign-asset-pipeline-v2",
    generatedForProject: true,
    generationEvidence: "external-ledger-and-independent-qa",
    generatedCleanMasters: inspections.length,
    generatedPreviews: previews.length,
    uniqueChecksums: new Set(inspections.map((item) => item.checksum)).size,
    totalGenerationCalls: ledgerItems.reduce((sum, item) => sum + item.generationCount, 0),
    totalRegenerations: ledgerItems.reduce(
      (sum, item) => sum + item.regenerationReasons.length,
      0,
    ),
    categoryCounts,
    qaPassed: normalizedQa.length,
    qaFailed: 0,
    textFreeQaPassed: normalizedQa.filter((item) => item.textFreeQa === "pass").length,
    stickFigureQaPassed: normalizedQa.filter((item) => item.stickFigureQa === "pass").length,
    svgPersonQaPassed: normalizedQa.filter((item) => item.svgPersonQa === "pass").length,
    embeddedTextPolicy: "none",
    rightsDisplay: "安全AIポータル作成／商用利用可／加工可",
  };
  const ledgerOutput = {
    schemaVersion: LEDGER_SCHEMA_VERSION,
    summary,
    items: normalizedLedger,
  };
  const qaOutput = { schemaVersion: QA_SCHEMA_VERSION, summary, items: normalizedQa };

  await mkdir(options.dataDirectory, { recursive: true });
  const manifestPath = path.join(options.dataDirectory, "generated-manifest.json");
  const ledgerPath = path.join(options.dataDirectory, "generation-ledger.json");
  const qaPath = path.join(options.dataDirectory, "qa.json");
  await Promise.all([
    writeFile(manifestPath, stableJson({ summary, items: manifest })),
    writeFile(ledgerPath, stableJson(ledgerOutput)),
    writeFile(qaPath, stableJson(qaOutput)),
    writeFile(path.join(options.dataDirectory, "layouts.json"), stableJson(SAFETY_IMAGE_LAYOUTS)),
  ]);
  return { summary, manifestPath, ledgerPath, qaPath };
}

export function parseCliArguments(args: readonly string[]): {
  ledgerInputPath: string;
  qaInputPath: string;
} {
  let ledgerInputPath = "";
  let qaInputPath = "";
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--ledger") {
      ledgerInputPath = args[index + 1] ?? "";
      index += 1;
    } else if (argument === "--qa") {
      qaInputPath = args[index + 1] ?? "";
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!ledgerInputPath || !qaInputPath) {
    throw new Error(
      "Both --ledger <external-ledger.json> and --qa <external-qa.json> are required. Generated outputs are not accepted as evidence inputs.",
    );
  }
  return { ledgerInputPath, qaInputPath };
}

async function main(): Promise<void> {
  const workspace = process.cwd();
  const args = parseCliArguments(process.argv.slice(2));
  const result = await runSafetyImageAssetPipeline({
    workspace,
    themes: SAFETY_IMAGE_THEMES as readonly SafetyImageThemeContract[],
    ledgerInputPath: path.resolve(workspace, args.ledgerInputPath),
    qaInputPath: path.resolve(workspace, args.qaInputPath),
    originalsDirectory: path.join(
      workspace,
      "public",
      "safety-images",
      "library",
      "originals",
    ),
    previewsDirectory: path.join(
      workspace,
      "public",
      "safety-images",
      "library",
      "previews",
    ),
    dataDirectory: path.join(workspace, "src", "data", "safety-image-library"),
  });
  process.stdout.write(`${stableJson(result.summary)}Validated 100 masters and generated 100 previews.\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  await main();
}
