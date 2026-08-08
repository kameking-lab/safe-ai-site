import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",
]);

const inputRoot = path.resolve(
  process.argv[2] ?? "C:\\Users\\kanet\\20260522\\pic",
);
const outputCsv = path.resolve(
  process.argv[3] ??
    path.join(
      process.cwd(),
      "..",
      "docs",
      "audits",
      "visual-kyt-asset-inventory-2026-07-30.csv",
    ),
);
const outputSummary = path.resolve(
  process.argv[4] ??
    path.join(
      process.cwd(),
      "..",
      "docs",
      "audits",
      "evidence",
      "visual-kyt-academy-2026-07-30",
      "assets",
      "inventory-summary.json",
    ),
);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(absolutePath)));
    } else if (
      entry.isFile() &&
      IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
    ) {
      files.push(absolutePath);
    }
  }
  return files;
}

function sha256(filePath) {
  return new Promise((resolve, reject) => {
    const digest = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => digest.update(chunk));
    stream.on("end", () => resolve(digest.digest("hex")));
  });
}

function normalizeRelative(filePath) {
  return path.relative(inputRoot, filePath).replaceAll("\\", "/");
}

const VISUALLY_REVIEWED = new Map([
  [
    "outputs/2026-07-05/工事現場/c01_flux-2-dev_1.9円_01.png",
    {
      scene:
        "住宅地の掘削現場。油圧ショベル2台と掘削溝の周囲に作業員がいる生成画像。",
      hazardCategory: "重機・車両",
      peopleCount: "5（目視概算）",
      textLogoWatermark:
        "機体に疑似企業名・記号、現場札に疑似文字あり。透かしは目視で未検出。",
      visualQuality: "中。構図は明瞭だが、細部文字と機械表示が破綻。",
      safetyAccuracy:
        "不適合。旋回範囲・掘削端への近接、あご紐不明瞭、立入管理の表現が安全教材として不十分。",
    },
  ],
  [
    "outputs/2026-07-05/工事現場/c01_flux-2-pro_4.8円_01.png",
    {
      scene:
        "基礎掘削現場。油圧ショベル、開口部、立入柵の外側に4人の作業員がいる生成画像。",
      hazardCategory: "重機・車両",
      peopleCount: "4",
      textLogoWatermark:
        "実在企業を想起させるCATロゴと日本語標識あり。透かしは目視で未検出。",
      visualQuality: "高。ただし機体ロゴと画像内文字が本件の禁止条件に抵触。",
      safetyAccuracy:
        "不適合。安全な状態に近く危険原因が曖昧で、KYT問題として因果を一意に読めない。",
    },
  ],
  [
    "outputs/2026-07-05/工事現場/c01_flux-dev_4.0円_01.png",
    {
      scene:
        "深い掘削溝を挟んで油圧ショベル2台が配置され、周辺に作業員がいる生成画像。",
      hazardCategory: "重機・車両",
      peopleCount: "4以上（目視概算）",
      textLogoWatermark:
        "機体に疑似ブランド文字・ラベルあり。透かしは目視で未検出。",
      visualQuality: "低。油圧ショベルのブーム・作業装置・配置が不自然。",
      safetyAccuracy:
        "不適合。機械構造と掘削部の因果が破綻し、安全教育上の誤学習につながる。",
    },
  ],
  [
    "outputs/2026-07-05/工事現場/c01_flux-schnell_0.5円_01.png",
    {
      scene:
        "掘削溝の直近で油圧ショベルが稼働し、作業員2人と運転者がいる生成画像。",
      hazardCategory: "重機・車両",
      peopleCount: "3",
      textLogoWatermark:
        "ブームに疑似ブランド文字あり。透かしは目視で未検出。",
      visualQuality: "中。危険は見えるが機体細部と現場構成が粗い。",
      safetyAccuracy:
        "不適合。作業員が作業装置と掘削端へ近接し、あご紐・誘導者・立入管理が不明瞭。",
    },
  ],
  [
    "outputs/2026-07-05/工事現場/c02_flux-2-dev_1.9円_01.png",
    {
      scene: "夜のラウンジで黒いドレスを着た成人女性の生成ポートレート。",
      hazardCategory: "対象外",
      peopleCount: "1",
      textLogoWatermark: "文字・ロゴ・透かしは目視で未検出。",
      visualQuality: "高。ただし安全教育と無関係。",
      safetyAccuracy: "対象外。安全教育の状況を表していない。",
    },
  ],
  [
    "outputs/2026-07-05/工事現場/c02_flux-schnell_0.5円_01.png",
    {
      scene: "夜の繁華街に立つ成人女性のアニメ調生成イラスト。",
      hazardCategory: "対象外",
      peopleCount: "1（背景人物を除く）",
      textLogoWatermark:
        "背景看板に疑似文字あり。ロゴ・透かしは目視で未検出。",
      visualQuality: "中。背景文字が破綻し、安全教育と無関係。",
      safetyAccuracy: "対象外。安全教育の状況を表していない。",
    },
  ],
]);

function inferredScene(relativePath) {
  const lower = relativePath.toLowerCase();
  if (lower.startsWith("materials/")) {
    return "成人向け出版物の生成画像素材プール（個別内容は本監査で安全教材として未承認）。";
  }
  if (lower.startsWith("grok/") || lower.startsWith("gemini/")) {
    return "別プロジェクトの生成画像または生成結果画面（成人向け・販売用途を含む）。";
  }
  if (lower.startsWith("photobook/")) {
    return "成人向けAI写真集の本編・候補・表紙または検査画像。";
  }
  if (lower.startsWith("cg_collection/")) {
    return "成人向けAI-CG集の挿絵または表紙。";
  }
  if (lower.startsWith("sns/")) {
    return "成人向け出版ブランドのSNS用画像または投稿確認画面。";
  }
  if (lower.startsWith("logs/") || lower.startsWith("tools/")) {
    return "別プロジェクトのログ・評価・操作スクリーンショット。";
  }
  if (lower.startsWith("lp/")) {
    return "成人向け出版ブランドのロゴ・アイコン。";
  }
  return "別画像生成・販売プロジェクトの画像。安全教材として個別承認なし。";
}

function machineFlags(relativePath, width, height, bytes) {
  const lower = relativePath.toLowerCase();
  const flags = new Set([
    "unresolved-rights",
    "unsuitable-safety-content",
    "review-required",
  ]);
  if (
    width < 768 ||
    height < 432 ||
    bytes < 50_000 ||
    width / Math.max(1, height) > 3 ||
    height / Math.max(1, width) > 3
  ) {
    flags.add("low-quality");
  }
  if (
    /(?:cover|result|error|screenshot|screen|gallery|listing|page|post|banner|report)/i.test(
      lower,
    )
  ) {
    flags.add("contains-text");
  }
  if (/(?:icon|logo|profile)/i.test(lower)) {
    flags.add("contains-logo");
  }
  if (relativePath.includes("/c01_")) {
    flags.add("contains-text");
    flags.add("contains-logo");
  }
  if (relativePath.includes("/c02_flux-schnell")) {
    flags.add("contains-text");
  }
  return flags;
}

function defaultTextLogoWatermark(relativePath) {
  const lower = relativePath.toLowerCase();
  if (/(?:icon|logo|profile)/i.test(lower)) {
    return "ロゴ候補。OCR・透かしの全数目視確認は未実施。";
  }
  if (
    /(?:cover|result|error|screenshot|screen|gallery|listing|page|post|banner|report)/i.test(
      lower,
    )
  ) {
    return "文字を含む可能性が高い成果物・画面画像。ロゴ・透かしは未確定。";
  }
  return "自動OCR未実施。文字・ロゴ・透かしは未確定のためreview-required。";
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

async function inspectFile(filePath) {
  const relativePath = normalizeRelative(filePath);
  const [fileStat, digest, metadata] = await Promise.all([
    stat(filePath),
    sha256(filePath),
    sharp(filePath, { animated: false, failOn: "none" })
      .metadata()
      .catch(() => ({})),
  ]);
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const manual = VISUALLY_REVIEWED.get(relativePath);
  return {
    sourcePath: filePath,
    filename: path.basename(filePath),
    relativePath,
    width,
    height,
    dimensions: width && height ? `${width}x${height}` : "metadata-unavailable",
    aspectRatio:
      width && height ? `${(width / height).toFixed(4)}:1` : "unknown",
    fileSizeBytes: fileStat.size,
    scene: manual?.scene ?? inferredScene(relativePath),
    hazardCategory: manual?.hazardCategory ?? "対象外",
    peopleCount: manual?.peopleCount ?? "未算定（本番不採用・要個別目視）",
    textLogoWatermark:
      manual?.textLogoWatermark ?? defaultTextLogoWatermark(relativePath),
    rightsStatus:
      "unresolved-rights（安全AIポータルへの資産単位の利用許諾・モデル規約・生成経路を結ぶ証跡なし）",
    visualQuality:
      manual?.visualQuality ??
      `機械確認のみ（${width || "?"}x${height || "?"}、全数目視未承認）`,
    safetyAccuracy:
      manual?.safetyAccuracy ??
      "未評価。別プロジェクトの成人向け・販売用素材であり、安全教育への正確性確認対象外。",
    recommendedUse: relativePath.includes("/c01_")
      ? "構図上の問題点を新規生成プロンプトの反面教師として参照のみ。直接コピー・公開禁止。"
      : "なし。本番・Preview・証跡画像への転載禁止。",
    destination: "not-selected",
    checksum: `sha256:${digest}`,
    flags: machineFlags(relativePath, width, height, fileStat.size),
  };
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= items.length) return;
      results[current] = await mapper(items[current], current);
      if ((current + 1) % 250 === 0) {
        process.stdout.write(`inspected ${current + 1}/${items.length}\n`);
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

const files = (await walk(inputRoot)).sort((a, b) =>
  a.localeCompare(b, "ja"),
);
const rows = await mapWithConcurrency(files, 8, inspectFile);

const checksumCounts = new Map();
for (const row of rows) {
  checksumCounts.set(
    row.checksum,
    (checksumCounts.get(row.checksum) ?? 0) + 1,
  );
}
for (const row of rows) {
  if ((checksumCounts.get(row.checksum) ?? 0) > 1) {
    row.flags.add("duplicate");
  }
  row.classification = [...row.flags].sort().join(";");
}

const headers = [
  "source path",
  "filename",
  "dimensions",
  "aspect ratio",
  "file size",
  "scene",
  "hazard category",
  "people count",
  "text/logo/watermark",
  "rights status",
  "visual quality",
  "safety accuracy",
  "recommended use",
  "destination",
  "checksum",
  "classification",
];
const csvLines = [
  headers.map(csvCell).join(","),
  ...rows.map((row) =>
    [
      row.sourcePath,
      row.filename,
      row.dimensions,
      row.aspectRatio,
      row.fileSizeBytes,
      row.scene,
      row.hazardCategory,
      row.peopleCount,
      row.textLogoWatermark,
      row.rightsStatus,
      row.visualQuality,
      row.safetyAccuracy,
      row.recommendedUse,
      row.destination,
      row.checksum,
      row.classification,
    ]
      .map(csvCell)
      .join(","),
  ),
];

const classificationCounts = {};
for (const row of rows) {
  for (const flag of row.flags) {
    classificationCounts[flag] = (classificationCounts[flag] ?? 0) + 1;
  }
}
const duplicateGroups = [...checksumCounts.values()].filter(
  (count) => count > 1,
).length;
const summary = {
  generatedAt: new Date().toISOString(),
  inputRoot,
  outputCsv,
  imageCount: rows.length,
  totalBytes: rows.reduce((sum, row) => sum + row.fileSizeBytes, 0),
  visuallyReviewedCount: VISUALLY_REVIEWED.size,
  selectedForProductionCount: 0,
  rejectedForProductionCount: rows.length,
  duplicateGroups,
  classificationCounts,
  rightsDecision:
    "No image from the external pic workspace is approved for production. Asset-level rights and safety accuracy are unresolved.",
};

await mkdir(path.dirname(outputCsv), { recursive: true });
await mkdir(path.dirname(outputSummary), { recursive: true });
await writeFile(outputCsv, `\uFEFF${csvLines.join("\r\n")}\r\n`, "utf8");
await writeFile(outputSummary, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
