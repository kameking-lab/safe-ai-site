import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import {
  parseCliArguments,
  runSafetyImageAssetPipeline,
  type SafetyImageAssetPipelineOptions,
  type SafetyImageThemeContract,
} from "../../../scripts/generate-safety-image-library-assets.ts";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const themes: SafetyImageThemeContract[] = [
  {
    id: "S001",
    slug: "helmet-required",
    title: "保護帽を着用",
    category: "ppe",
    orientation: "portrait",
    texts: { ja: "保護帽を着用" },
  },
  {
    id: "S002",
    slug: "suspended-load",
    title: "吊り荷の下に入らない",
    category: "hazard",
    orientation: "landscape",
    texts: { ja: "吊り荷の下に入らない" },
  },
];

function testPixels(seed: number): Buffer {
  const width = 16;
  const height = 16;
  const pixels = Buffer.alloc(width * height * 3);
  for (let index = 0; index < pixels.length; index += 1) {
    pixels[index] = (index * (seed + 17) + seed * 41) % 256;
  }
  return pixels;
}

async function createFixture(): Promise<{
  options: SafetyImageAssetPipelineOptions;
  ledger: { schemaVersion: string; items: Record<string, unknown>[] };
  qa: { schemaVersion: string; items: Record<string, unknown>[] };
}> {
  const root = await mkdtemp(path.join(tmpdir(), "safety-image-pipeline-"));
  temporaryRoots.push(root);
  const originalsDirectory = path.join(root, "public", "safety-images", "library", "originals");
  const previewsDirectory = path.join(root, "public", "safety-images", "library", "previews");
  const dataDirectory = path.join(root, "src", "data", "safety-image-library");
  const evidenceDirectory = path.join(root, "external-evidence");
  await Promise.all([
    mkdir(originalsDirectory, { recursive: true }),
    mkdir(previewsDirectory, { recursive: true }),
    mkdir(dataDirectory, { recursive: true }),
    mkdir(evidenceDirectory, { recursive: true }),
  ]);
  const ledgerItems: Record<string, unknown>[] = [];
  const qaItems: Record<string, unknown>[] = [];
  for (const [index, theme] of themes.entries()) {
    const file = path.join(originalsDirectory, `${theme.slug}.png`);
    await sharp(testPixels(index + 1), { raw: { width: 16, height: 16, channels: 3 } })
      .png()
      .toFile(file);
    const checksum = createHash("sha256").update(await readFile(file)).digest("hex");
    ledgerItems.push({
      id: theme.id,
      slug: theme.slug,
      prompt: `建設現場の安全看板用イラスト。テーマは「${theme.title}」。文字なし。`,
      generatedAt: "2026-08-28T09:00:00.000+09:00",
      generationCount: 1,
      regenerationReasons: [],
      generationMethod: "OpenAI image generation",
      sourceFile: `public/safety-images/library/originals/${theme.slug}.png`,
      checksumAlgorithm: "sha256",
      checksum,
      rightsStatus: "portal-owned-commercial-editable",
      publishStatus: "approved",
    });
    qaItems.push({
      slug: theme.slug,
      reviewedAt: "2026-08-28T10:00:00.000+09:00",
      reviewer: "independent-image-reviewer",
      generationCount: 1,
      masterChecksum: checksum,
      result: "pass",
      anatomyQa: "pass",
      ppeQa: "pass",
      equipmentQa: "pass",
      marketFitQa: "pass",
      textFreeQa: "pass",
      stickFigureQa: "pass",
      svgPersonQa: "pass",
      externalLogoQa: "pass",
      themeMatchQa: "pass",
      textSpaceQa: "pass",
      rightsStatus: "portal-owned-commercial-editable",
      publishStatus: "approved",
    });
  }
  const ledger = {
    schemaVersion: "safety-sign-generation-ledger-v2",
    items: ledgerItems,
  };
  const qa = { schemaVersion: "safety-sign-qa-v2", items: qaItems };
  const ledgerInputPath = path.join(evidenceDirectory, "ledger.json");
  const qaInputPath = path.join(evidenceDirectory, "qa.json");
  await Promise.all([
    writeFile(ledgerInputPath, JSON.stringify(ledger)),
    writeFile(qaInputPath, JSON.stringify(qa)),
  ]);
  return {
    ledger,
    qa,
    options: {
      workspace: root,
      themes,
      ledgerInputPath,
      qaInputPath,
      originalsDirectory,
      previewsDirectory,
      dataDirectory,
      expectedCount: themes.length,
      minimumMasterDimension: 16,
    },
  };
}

describe("safety-image asset pipeline", () => {
  it("requires explicit external ledger and QA inputs", () => {
    expect(() => parseCliArguments([])).toThrow(/Both --ledger/u);
    expect(
      parseCliArguments(["--ledger", "external/ledger.json", "--qa", "external/qa.json"]),
    ).toEqual({
      ledgerInputPath: "external/ledger.json",
      qaInputPath: "external/qa.json",
    });
  });

  it("validates external evidence and creates byte-tracked WebP previews", async () => {
    const fixture = await createFixture();
    const result = await runSafetyImageAssetPipeline(fixture.options);
    expect(result.summary).toMatchObject({
      generatedCleanMasters: 2,
      generatedPreviews: 2,
      uniqueChecksums: 2,
      qaPassed: 2,
      textFreeQaPassed: 2,
    });
    const previewFiles = await readdir(fixture.options.previewsDirectory);
    expect(previewFiles.sort()).toEqual([
      "helmet-required.webp",
      "suspended-load.webp",
    ]);
    const manifest = JSON.parse(await readFile(result.manifestPath, "utf8")) as {
      items: Array<{ sourceChecksum: string; previewChecksum: string }>;
    };
    expect(manifest.items).toHaveLength(2);
    expect(manifest.items.every((item) => /^[a-f0-9]{64}$/u.test(item.sourceChecksum))).toBe(true);
    expect(manifest.items.every((item) => /^[a-f0-9]{64}$/u.test(item.previewChecksum))).toBe(true);
  });

  it("rejects duplicate masters, stale checksums, and non-passing text QA", async () => {
    const fixture = await createFixture();
    const first = path.join(fixture.options.originalsDirectory, "helmet-required.png");
    const second = path.join(fixture.options.originalsDirectory, "suspended-load.png");
    await writeFile(second, await readFile(first));
    fixture.qa.items[0].textFreeQa = "fail";
    await writeFile(fixture.options.qaInputPath, JSON.stringify(fixture.qa));
    const rejection = await runSafetyImageAssetPipeline(fixture.options).catch((error: unknown) =>
      error instanceof Error ? error.message : String(error),
    );
    expect(rejection).toContain("textFreeQa must be one of: pass");
    expect(rejection).toContain("Duplicate clean-master checksum");
    expect(rejection).toContain("computed checksum does not match the external ledger");
    expect(await readdir(fixture.options.previewsDirectory)).toEqual([]);
  });

  it("refuses generated outputs as self-referential evidence", async () => {
    const fixture = await createFixture();
    fixture.options.ledgerInputPath = path.join(
      fixture.options.dataDirectory,
      "generation-ledger.json",
    );
    await expect(runSafetyImageAssetPipeline(fixture.options)).rejects.toThrow(
      /External ledger input cannot be the generated/u,
    );
  });
});
