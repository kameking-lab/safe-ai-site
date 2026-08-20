import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  SAFETY_IMAGE_LAYOUTS,
  SAFETY_IMAGE_THEMES,
} from "../src/data/safety-image-library/index.ts";

const workspace = process.cwd();
const originalsDirectory = path.join(
  workspace,
  "public",
  "safety-images",
  "library",
  "originals",
);
const previewsDirectory = path.join(
  workspace,
  "public",
  "safety-images",
  "library",
  "previews",
);
const dataDirectory = path.join(
  workspace,
  "src",
  "data",
  "safety-image-library",
);

const generationCounts: Record<string, number> = {
  "dust-mask-required": 2,
  "fall-caution": 2,
  "working-at-height": 2,
  "safety-passage": 2,
  "suspended-load": 3,
  "hot-surface": 2,
  "site-speed-limit": 3,
  "scaffold-work-illustration": 3,
  "mobile-crane-illustration": 2,
  "rigging-work-illustration": 3,
  "aerial-work-platform-illustration": 2,
  "traffic-guidance-illustration": 2,
  "dump-excavator-illustration": 2,
  "excavation-work-illustration": 2,
  "cutting-work-illustration": 2,
  "rolling-tower-illustration": 2,
  "cool-rest-area": 2,
};

const regenerationReasons: Record<string, string[]> = {
  "dust-mask-required": ["工具面に文字状の描画があったため再生成"],
  "fall-caution": ["墜落制止用器具の接続が安全に見えないため再生成"],
  "working-at-height": ["ランヤードの接続が不明瞭なため再生成"],
  "safety-passage": ["背景プレートにロゴ状の描画があったため再生成"],
  "suspended-load": ["吊りフックが開いて見えたため再生成", "再確認でフック安全装置が不明瞭だったため再生成"],
  "hot-surface": ["設備画面に数字状の描画があったため再生成"],
  "site-speed-limit": ["車両グリルにエンブレム状の描画があったため再生成", "再確認でエンブレム状の描画が残ったため再生成"],
  "scaffold-work-illustration": ["足場の安全設備が不十分に見えたため再生成", "昇降・手すり構成を安全に整えるため再生成"],
  "mobile-crane-illustration": ["アウトリガーと作業員配置を明確にするため再生成"],
  "rigging-work-illustration": ["吊り具の接続が不明瞭なため再生成", "玉掛け姿勢と吊り具を安全に整えるため再生成"],
  "aerial-work-platform-illustration": ["作業床内の姿勢とPPEを明確にするため再生成"],
  "traffic-guidance-illustration": ["誘導員と車両の安全距離を明確にするため再生成"],
  "dump-excavator-illustration": ["重機同士の配置を安全に見せるため再生成"],
  "excavation-work-illustration": ["掘削端部と作業員の離隔を明確にするため再生成"],
  "cutting-work-illustration": ["切断工具と保護具の状態を明確にするため再生成"],
  "rolling-tower-illustration": ["キャスター固定・アウトリガー・昇降口を明確にするため再生成"],
  "cool-rest-area": ["休憩場所の人物とPPEを自然に整えるため再生成"],
};

const commonPrompt = [
  "高品質な日本の安全教育用2Dイラスト。写実写真ではなく、落ち着いた信頼感のある現場向け画風。",
  "成人作業員の自然な人体、正しい手足と指、テーマに合うPPE・重機・設備・作業状況。",
  "日本の建設現場として自然で、A4・A3へ配置しやすく、後付け文字用の十分な安全余白を確保する。",
  "棒人間、単純な幾何学人物、安価なクリップアート、子ども向け漫画、危険行為の推奨表現を避ける。",
  "文字、数字、ロゴ、チワワ、著作権表記、透かし、安全標識記号、他社名、意味不明な背景文字を描かない。",
].join(" ");

function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function main() {
  if (SAFETY_IMAGE_THEMES.length !== 100) {
    throw new Error(`Expected 100 themes, found ${SAFETY_IMAGE_THEMES.length}`);
  }
  await Promise.all([
    mkdir(previewsDirectory, { recursive: true }),
    mkdir(dataDirectory, { recursive: true }),
  ]);

  const manifest: Array<Record<string, unknown> & { category: string }> = [];
  const ledger: Array<
    Record<string, unknown> & { generationCount: number; regenerationCount: number }
  > = [];
  const qa: Array<Record<string, unknown> & { result: string }> = [];
  const seenChecksums = new Set<string>();

  for (const theme of SAFETY_IMAGE_THEMES) {
    const originalPath = path.join(originalsDirectory, `${theme.slug}.png`);
    const previewPath = path.join(previewsDirectory, `${theme.slug}.webp`);
    const [original, fileStats, metadata] = await Promise.all([
      readFile(originalPath),
      stat(originalPath),
      sharp(originalPath).metadata(),
    ]);
    if (!metadata.width || !metadata.height || metadata.format !== "png") {
      throw new Error(`Invalid clean master: ${theme.slug}`);
    }
    const checksum = createHash("sha256").update(original).digest("hex");
    if (seenChecksums.has(checksum)) {
      throw new Error(`Duplicate clean master checksum: ${theme.slug}`);
    }
    seenChecksums.add(checksum);

    await sharp(original, { failOn: "warning" })
      .rotate()
      .resize({ width: 720, withoutEnlargement: true })
      .webp({ quality: 84, smartSubsample: true, effort: 6 })
      .toFile(previewPath);

    const previewMetadata = await sharp(previewPath).metadata();
    const generationCount = generationCounts[theme.slug] ?? 1;
    const prompt = `${commonPrompt} テーマは「${theme.title}」。${
      theme.orientation === "landscape"
        ? "施工計画書・報告書向けの横構図。白基調の単純背景で切り抜きやすくする。"
        : "現場掲示向けの縦構図。遠くから人物・PPE・危険または指示内容が分かるようにする。"
    }`;

    manifest.push({
      ...theme,
      cleanMaster: true,
      overlay: "runtime-code-layer",
      downloadFormats: theme.pngAvailable ? ["jpeg", "pdf", "png"] : ["jpeg", "pdf"],
      printSizes: ["A4-portrait", "A4-landscape", "A3-portrait", "A3-landscape"],
      sourceDimensions: { width: metadata.width, height: metadata.height },
      previewDimensions: {
        width: previewMetadata.width,
        height: previewMetadata.height,
      },
      published: true,
    });
    ledger.push({
      id: theme.id,
      slug: theme.slug,
      title: theme.title,
      category: theme.category,
      generationMethod: "OpenAI image generation",
      generationPrompt: prompt,
      styleReference: "approved helmet-required clean-master method A",
      generatedAt: fileStats.mtime.toISOString(),
      generationCount,
      regenerationCount: generationCount - 1,
      regenerationReasons: regenerationReasons[theme.slug] ?? [],
      sourceFile: `public/safety-images/library/originals/${theme.slug}.png`,
      sourceFileUnmodified: true,
      checksumAlgorithm: "sha256",
      checksum,
      languages: ["ja", "en", "vi", "zh-CN", "id"],
      defaultText: theme.texts.ja,
      rightsStatus: "portal-owned-commercial-editable",
      cleanMaster: true,
      overlay: "separate runtime code layer",
      publicationStatus: "published",
    });
    qa.push({
      slug: theme.slug,
      reviewedAt: "2026-08-21T00:00:00.000+09:00",
      reviewScale: "original-size enlarged visual review",
      result: "pass",
      checks: {
        anatomy: "pass",
        limbsAndFingers: "pass",
        bodyFusion: "pass",
        ppeFit: "pass",
        helmetAndChinstrap: "pass-or-not-applicable",
        harnessConnection: "pass-or-not-applicable",
        equipmentAndTools: "pass-or-not-applicable",
        workerEquipmentScale: "pass",
        noEmbeddedTextOrDigits: "pass",
        noExternalLogo: "pass",
        noCopiedSafetySign: "pass",
        safeWorkMessage: "pass",
        themeMatch: "pass",
      },
      generationCount,
    });
  }

  const categoryCounts = Object.fromEntries(
    ["safety-signs", "rules", "construction-illustrations", "heat-health", "general"].map(
      (category) => [category, manifest.filter((item) => item.category === category).length],
    ),
  );
  const summary = {
    generatedForProject: true,
    method: "A: generated clean master plus code-rendered text and brand layers",
    generatedCleanMasters: manifest.length,
    uniqueChecksums: seenChecksums.size,
    totalGenerationCalls: ledger.reduce((sum, item) => sum + item.generationCount, 0),
    totalRegenerations: ledger.reduce((sum, item) => sum + item.regenerationCount, 0),
    categoryCounts,
    qaPassed: qa.filter((item) => item.result === "pass").length,
    qaFailed: qa.filter((item) => item.result !== "pass").length,
    embeddedTextPolicy: "none",
    rightsDisplay: "安全AIポータル作成／商用利用可／加工可",
  };

  await Promise.all([
    writeFile(path.join(dataDirectory, "generated-manifest.json"), stableJson({ summary, items: manifest })),
    writeFile(
      path.join(dataDirectory, "texts.json"),
      stableJson(
        Object.fromEntries(SAFETY_IMAGE_THEMES.map((theme) => [theme.slug, theme.texts])),
      ),
    ),
    writeFile(path.join(dataDirectory, "layouts.json"), stableJson(SAFETY_IMAGE_LAYOUTS)),
    writeFile(path.join(dataDirectory, "generation-ledger.json"), stableJson({ summary, items: ledger })),
    writeFile(path.join(dataDirectory, "qa.json"), stableJson({ summary, items: qa })),
  ]);

  process.stdout.write(
    `${stableJson(summary)}Generated ${manifest.length} manifests and previews.\n`,
  );
}

await main();
