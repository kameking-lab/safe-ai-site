import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createServer } from "vite";

const webRoot = process.cwd();
const repoRoot = path.resolve(webRoot, "..");
const outputCsv = path.join(
  repoRoot,
  "docs",
  "audits",
  "visual-kyt-scenario-inventory-2026-07-30.csv",
);
const outputJson = path.join(
  repoRoot,
  "docs",
  "audits",
  "evidence",
  "visual-kyt-academy-2026-07-30",
  "content",
  "scenario-validation.json",
);

const vite = await createServer({
  root: webRoot,
  appType: "custom",
  logLevel: "error",
  server: { middlewareMode: true },
  resolve: { alias: { "@": path.join(webRoot, "src") } },
});

try {
  const { VISUAL_KY_SCENARIOS, PUBLIC_VISUAL_KY_SCENARIOS } =
    await vite.ssrLoadModule("/src/data/visual-ky/scenarios.ts");

  function csvCell(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
  }

  const headers = [
    "scenario ID",
    "slug",
    "title",
    "short title",
    "category",
    "category tags",
    "industry",
    "difficulty",
    "estimated time",
    "image",
    "image alt",
    "full textual scene description",
    "hotspot coordinates",
    "hazard list",
    "distractor",
    "answer explanation",
    "prevention hierarchy",
    "official source",
    "source locator",
    "source checked date",
    "related accident IDs",
    "related law IDs",
    "related qualification IDs",
    "KY prefill",
    "review status",
    "reviewed by",
    "reviewed date",
    "indexability",
    "rights status",
    "synthetic disclosure",
    "updated date",
  ];

  const rows = VISUAL_KY_SCENARIOS.map((scenario) => [
    scenario.id,
    scenario.slug,
    scenario.title,
    scenario.shortTitle,
    scenario.category,
    scenario.categoryTags.join(";"),
    scenario.industry.join(";"),
    scenario.difficulty,
    `${scenario.estimatedMinutes}分`,
    `${scenario.image.src} (${scenario.image.width}x${scenario.image.height})`,
    scenario.image.alt,
    scenario.image.fullDescription,
    scenario.hotspots
      .map(
        (spot) =>
          `${spot.id}:${spot.x},${spot.y},r${spot.radius}->${spot.hazardId ?? "distractor"}`,
      )
      .join(";"),
    scenario.hazards
      .map((hazard) => `${hazard.id}:${hazard.title}`)
      .join(";"),
    `${scenario.distractor.hotspotId}:${scenario.distractor.label} — ${scenario.distractor.explanation}`,
    scenario.answerExplanation,
    [
      `除去=${scenario.preventionHierarchy.elimination.join("／")}`,
      `代替=${scenario.preventionHierarchy.substitution.join("／")}`,
      `工学=${scenario.preventionHierarchy.engineering.join("／")}`,
      `管理=${scenario.preventionHierarchy.administrative.join("／")}`,
      `PPE=${scenario.preventionHierarchy.ppe.join("／")}`,
    ].join(";"),
    scenario.officialSources
      .map((source) => `${source.organization}:${source.title}`)
      .join(";"),
    scenario.officialSources
      .map((source) => `${source.id}:${source.locator}`)
      .join(";"),
    scenario.officialSources
      .map((source) => `${source.id}:${source.checkedDate}`)
      .join(";"),
    scenario.relatedAccidents.map((item) => item.id).join(";"),
    scenario.relatedLaws.map((item) => item.id).join(";"),
    scenario.relatedQualifications.map((item) => item.id).join(";"),
    `work=${scenario.kyPrefill.workDetail}; risks=${scenario.kyPrefill.risks
      .map((risk) => `${risk.hazard}->${risk.reduction}`)
      .join("／")}; humanReview=${scenario.kyPrefill.humanReviewRequired}; notice=${scenario.kyPrefill.notice}`,
    scenario.reviewStatus,
    scenario.reviewedBy,
    scenario.reviewedDate,
    scenario.indexability,
    scenario.rightsStatus,
    scenario.syntheticDisclosure,
    scenario.updatedDate,
  ]);

  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\r\n");
  await mkdir(path.dirname(outputCsv), { recursive: true });
  await mkdir(path.dirname(outputJson), { recursive: true });
  await writeFile(outputCsv, `\uFEFF${csv}\r\n`, "utf8");

  const evidence = {
    generatedAt: new Date().toISOString(),
    schemaValidatedCount: VISUAL_KY_SCENARIOS.length,
    publicCount: PUBLIC_VISUAL_KY_SCENARIOS.length,
    reviewedCount: VISUAL_KY_SCENARIOS.filter(
      (item) => item.reviewStatus === "reviewed",
    ).length,
    indexableCount: VISUAL_KY_SCENARIOS.filter(
      (item) => item.indexability === "index",
    ).length,
    rightsClearedCount: VISUAL_KY_SCENARIOS.filter((item) =>
      ["approved-user-owned", "generated-for-this-project"].includes(
        item.rightsStatus,
      ),
    ).length,
    syntheticCount: VISUAL_KY_SCENARIOS.filter((item) => item.synthetic).length,
    hotspotCount: VISUAL_KY_SCENARIOS.reduce(
      (sum, item) => sum + item.hotspots.length,
      0,
    ),
    hazardCount: VISUAL_KY_SCENARIOS.reduce(
      (sum, item) => sum + item.hazards.length,
      0,
    ),
    officialSourceLinkCount: VISUAL_KY_SCENARIOS.reduce(
      (sum, item) => sum + item.officialSources.length,
      0,
    ),
    uniqueOfficialSourceCount: new Set(
      VISUAL_KY_SCENARIOS.flatMap((item) =>
        item.officialSources.map((source) => source.url),
      ),
    ).size,
    allKyPrefillsRequireHumanReview: VISUAL_KY_SCENARIOS.every(
      (item) => item.kyPrefill.humanReviewRequired,
    ),
    allImagesHaveAltAndTextEquivalent: VISUAL_KY_SCENARIOS.every(
      (item) =>
        item.image.alt.length >= 20 &&
        item.image.fullDescription.length >= 80,
    ),
    ids: VISUAL_KY_SCENARIOS.map((item) => item.id),
    scenarios: VISUAL_KY_SCENARIOS.map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.shortTitle,
      category: item.category,
      hazardCount: item.hazards.length,
      hotspotCount: item.hotspots.length,
      sourceCount: item.officialSources.length,
      reviewed: item.reviewStatus,
      indexability: item.indexability,
      rightsStatus: item.rightsStatus,
    })),
  };
  await writeFile(outputJson, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
} finally {
  await vite.close();
}
