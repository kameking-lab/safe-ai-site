import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Artifact Tool is unavailable in this supplied runtime. This builder therefore
// uses the bundled PptxGenJS package, then retains the presentation finalizer's
// package, geometry and font validation gates. No packages are installed here.
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(SCRIPT_DIR, "../..");
const DATA_DIR = path.join(WEB_ROOT, "src/data/safety-seminars");
const PUBLIC_DIR = path.join(WEB_ROOT, "public");
const COURSE_ID = "safety-management-basics-osh-law";
const FINAL_PPTX = process.env.TRAINING_PPTX_OUTPUT
  ? path.resolve(process.env.TRAINING_PPTX_OUTPUT)
  : path.join(PUBLIC_DIR, "training/safety-seminars", COURSE_ID, "downloads", `${COURSE_ID}-training.pptx`);
const SKILL_DIR = process.env.SKILL_DIR;
const RUNTIME_PYTHON = process.env.RUNTIME_PYTHON;
const RUNTIME_NODE_MODULES = process.env.RUNTIME_NODE_MODULES;

for (const [name, value] of Object.entries({ SKILL_DIR, RUNTIME_PYTHON, RUNTIME_NODE_MODULES })) {
  if (!path.isAbsolute(value ?? "")) throw new Error(`Set absolute ${name} before building the PPTX.`);
}

const { default: PptxGenJS } = await import(pathToFileURL(
  path.join(RUNTIME_NODE_MODULES, "pptxgenjs", "dist", "pptxgen.es.js"),
).href);
const { default: JSZip } = await import(pathToFileURL(
  path.join(RUNTIME_NODE_MODULES, "jszip", "lib", "index.js"),
).href);
const { finalizePresentation } = await import(pathToFileURL(
  path.join(SKILL_DIR, "container_tools", "artifact_tool_utils.mjs"),
).href);

const [course, claims, sources] = await Promise.all([
  readJson(path.join(DATA_DIR, `${COURSE_ID}.json`)),
  readJson(path.join(DATA_DIR, `${COURSE_ID}-claims.json`)),
  readJson(path.join(DATA_DIR, `${COURSE_ID}-source-registry.json`)),
]);
if (course.slideCount !== 12 || course.slides.length !== 12) {
  throw new Error(`Expected 12 slides, received ${course.slides.length}.`);
}

const claimMap = new Map(claims.map((claim) => [claim.claimId, claim]));
const sourceMap = new Map(sources.map((source, index) => [source.sourceId, { ...source, sourceNo: index + 1 }]));
const pptx = new PptxGenJS();
pptx.defineLayout({ name: "SAFETY_WIDE", width: 12192000 / 914400, height: 6858000 / 914400 });
pptx.layout = "SAFETY_WIDE";
pptx.author = "安全AIポータル編集部";
pptx.company = "安全AIポータル編集部";
pptx.subject = `${course.subtitle}｜労働安全コンサルタント監修`;
pptx.title = `${course.title}｜安全AIポータル`;
pptx.lang = "ja-JP";
pptx.theme = { headFontFace: "Yu Gothic", bodyFontFace: "Yu Gothic", lang: "ja-JP" };

const PX = 1 / 96;
const pt = (pixels) => Math.round(pixels * 0.75 * 10) / 10;
const inch = (pixels) => Math.round(pixels * PX * 10000) / 10000;
const color = (value) => String(value).replace("#", "");
const COLORS = {
  forest: "073C35", evergreen: "0A6257", paper: "FCFCF8", ink: "173B36",
  slate: "56706B", line: "BDD4CD", orange: "F6A234", coral: "EA735F", white: "FFFFFF",
};
const MARGIN = 76;

for (const data of course.slides) {
  const slide = pptx.addSlide();
  if (data.number === 1) await buildCover(slide, data);
  else if (data.number === course.slideCount) buildClose(slide, data);
  else {
    addBase(slide, data);
    if (data.visual.type === "image") await buildImageSlide(slide, data);
    else if (data.visual.type === "steps") buildSteps(slide, data);
    else if (data.visual.type === "metrics") buildMetrics(slide, data);
    else if (data.visual.type === "checklist") buildChecklist(slide, data);
    else throw new Error(`Unsupported visual type on slide ${data.number}: ${data.visual.type}`);
    addFooter(slide, data);
  }
  addSpeakerNotes(slide, data);
}

const stagingDir = path.join(WEB_ROOT, ".codex-finalizer", COURSE_ID);
const candidatePath = path.join(stagingDir, `${COURSE_ID}-candidate.pptx`);
await fs.mkdir(stagingDir, { recursive: true });
await fs.mkdir(path.dirname(FINAL_PPTX), { recursive: true });
await pptx.writeFile({ fileName: candidatePath, compression: true });
await removeDanglingSlideMasterOverrides(candidatePath);

const result = await finalizePresentation({
  explicitTotalSlideCount: 12,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
  workspaceDir: WEB_ROOT,
  candidatePath,
  finalPath: FINAL_PPTX,
  pythonExecutable: RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit"],
  fontPolicy: { basis: "design", families: ["Yu Gothic"] },
  // Explicit fallback: Artifact Tool's package directory is absent in the
  // supplied runtime, while PptxGenJS is bundled and auditable.
  verifyArtifactToolImport: false,
  receiptPath: path.join(stagingDir, `${COURSE_ID}.validation-${course.version}.json`),
});
console.log(JSON.stringify({ output: FINAL_PPTX, slides: course.slides.length, result }, null, 2));

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function removeDanglingSlideMasterOverrides(pptxPath) {
  // PptxGenJS 4.0.1 writes one content-type override per slide while emitting
  // only the shared slideMaster1 part. Remove only overrides whose targets do
  // not exist; the finalizer then verifies the repaired package independently.
  const zip = await JSZip.loadAsync(await fs.readFile(pptxPath));
  const contentTypesFile = zip.file("[Content_Types].xml");
  if (!contentTypesFile) throw new Error("PPTX content-types part is missing.");
  let contentTypes = await contentTypesFile.async("string");
  contentTypes = contentTypes.replace(
    /<Override PartName="\/ppt\/slideMasters\/slideMaster(\d+)\.xml" ContentType="application\/vnd\.openxmlformats-officedocument\.presentationml\.slideMaster\+xml"\/>/g,
    (entry, number) =>
      zip.file(`ppt/slideMasters/slideMaster${number}.xml`) ? entry : "",
  );
  zip.file("[Content_Types].xml", contentTypes);
  await fs.writeFile(
    pptxPath,
    await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    }),
  );
}

function assetPath(src) {
  return path.join(PUBLIC_DIR, src.replace(/^\//, ""));
}

function addShape(slide, kind, position, fillValue = null, lineValue = null, transparency = 0) {
  slide.addShape(kind, {
    x: inch(position.left), y: inch(position.top), w: inch(position.width), h: inch(position.height),
    fill: fillValue ? { color: color(fillValue), transparency } : { color: "FFFFFF", transparency: 100 },
    line: lineValue ? { color: color(lineValue), transparency: 0 } : { color: "FFFFFF", transparency: 100 },
  });
}

function addText(slide, text, position, style = {}) {
  slide.addText(text, {
    x: inch(position.left), y: inch(position.top), w: inch(position.width), h: inch(position.height),
    fontFace: "Yu Gothic",
    fontSize: pt(style.fontSize ?? 21),
    color: color(style.color ?? COLORS.ink),
    bold: style.bold ?? false,
    align: style.alignment ?? "left",
    valign: style.verticalAlignment ?? "mid",
    margin: 0,
    breakLine: false,
    fit: "shrink",
    paraSpaceAfterPt: 0,
  });
}

function addImage(slide, filePath, alt, position, sizing = "contain") {
  slide.addImage({
    path: filePath,
    altText: alt,
    x: inch(position.left), y: inch(position.top), w: inch(position.width), h: inch(position.height),
    sizing: { type: sizing, x: inch(position.left), y: inch(position.top), w: inch(position.width), h: inch(position.height) },
  });
}

function addBase(slide, data) {
  slide.background = { color: COLORS.paper };
  addShape(slide, pptx.ShapeType.rect, { left: 0, top: 0, width: 18, height: 720 }, COLORS.evergreen);
  addText(slide, data.kicker, { left: MARGIN, top: 42, width: 600, height: 27 }, { fontSize: 16, bold: true, color: COLORS.evergreen });
  addText(slide, data.label, { left: 857, top: 40, width: 340, height: 28 }, { fontSize: 15, bold: true, color: COLORS.slate, alignment: "right" });
  addText(slide, data.title, { left: MARGIN, top: 82, width: 1120, height: 61 }, { fontSize: 56, bold: true, color: COLORS.forest });
  addShape(slide, pptx.ShapeType.rect, { left: MARGIN, top: 153, width: 96, height: 6 }, COLORS.orange);
  addText(slide, data.message, { left: MARGIN, top: 178, width: 1100, height: 49 }, { fontSize: 23, bold: true, color: COLORS.ink });
}

async function buildCover(slide, data) {
  slide.background = { color: COLORS.forest };
  addImage(slide, assetPath(data.visual.src), data.visual.alt, { left: 730, top: 0, width: 550, height: 720 }, "cover");
  addShape(slide, pptx.ShapeType.rect, { left: 700, top: 0, width: 580, height: 720 }, COLORS.forest, null, 35);
  addShape(slide, pptx.ShapeType.rect, { left: 0, top: 0, width: 22, height: 720 }, COLORS.orange);
  addText(slide, data.kicker, { left: 84, top: 68, width: 530, height: 30 }, { fontSize: 19, bold: true, color: "A8E8D7" });
  addText(slide, data.title, { left: 84, top: 135, width: 690, height: 142 }, { fontSize: 56, bold: true, color: COLORS.white });
  addText(slide, data.subtitle ?? data.message, { left: 88, top: 304, width: 590, height: 72 }, { fontSize: 25, color: "E6FAF1" });
  addShape(slide, pptx.ShapeType.rect, { left: 88, top: 420, width: 500, height: 2 }, "77BFAE");
  addText(slide, data.body.join("　"), { left: 88, top: 443, width: 560, height: 70 }, { fontSize: 19, bold: true, color: COLORS.white });
  addText(slide, course.boundary, { left: 88, top: 603, width: 590, height: 41 }, { fontSize: 15, color: "BFE6DA" });
  addText(slide, `基準日 ${formatDate(course.asOf)}`, { left: 88, top: 658, width: 280, height: 25 }, { fontSize: 14, color: "A3D7CA" });
  addText(slide, "01 / 12", { left: 1090, top: 658, width: 108, height: 25 }, { fontSize: 14, bold: true, color: COLORS.white, alignment: "right" });
}

async function buildImageSlide(slide, data) {
  addImage(slide, assetPath(data.visual.src), data.visual.alt, { left: 676, top: 242, width: 510, height: 324 });
  addText(slide, data.body[0] ?? "", { left: MARGIN, top: 278, width: 500, height: 92 }, { fontSize: 28, bold: true, color: COLORS.evergreen });
  addShape(slide, pptx.ShapeType.rect, { left: MARGIN, top: 386, width: 442, height: 4 }, COLORS.orange);
  addText(slide, data.body.slice(1).join("\n"), { left: MARGIN, top: 418, width: 510, height: 126 }, { fontSize: 23, color: COLORS.ink });
  addText(slide, "安全AIポータル教材用イラスト", { left: 676, top: 578, width: 510, height: 20 }, { fontSize: 13, color: COLORS.slate });
}

function buildSteps(slide, data) {
  const steps = data.visual.steps;
  const palette = [COLORS.evergreen, COLORS.orange, COLORS.coral, COLORS.forest];
  const top = 257;
  if (steps.length === 4) {
    steps.forEach((step, index) => {
      const left = MARGIN + (index % 2) * 565;
      const y = top + Math.floor(index / 2) * 145;
      addText(slide, String(index + 1).padStart(2, "0"), { left, top: y, width: 70, height: 50 }, { fontSize: 37, bold: true, color: palette[index] });
      addText(slide, step.label, { left: left + 86, top: y, width: 440, height: 38 }, { fontSize: 26, bold: true, color: COLORS.forest });
      addText(slide, step.detail, { left: left + 86, top: y + 45, width: 438, height: 51 }, { fontSize: 23, color: COLORS.slate });
      addShape(slide, pptx.ShapeType.rect, { left, top: y + 106, width: 522, height: 3 }, palette[index]);
    });
  } else {
    const width = steps.length === 3 ? 334 : 254;
    const gap = steps.length === 3 ? 38 : 25;
    steps.forEach((step, index) => {
      const left = MARGIN + index * (width + gap);
      const fill = palette[index % palette.length];
      addText(slide, String(index + 1).padStart(2, "0"), { left, top, width, height: 52 }, { fontSize: 40, bold: true, color: fill });
      addShape(slide, pptx.ShapeType.rect, { left, top: top + 65, width, height: 4 }, fill);
      addText(slide, step.label, { left, top: top + 92, width, height: 50 }, { fontSize: 24, bold: true, color: COLORS.forest });
      addText(slide, step.detail, { left, top: top + 150, width, height: 98 }, { fontSize: 23, color: COLORS.slate });
    });
  }
  addBottomCopy(slide, data);
}

function buildMetrics(slide, data) {
  const metrics = data.visual.metrics;
  const grid = metrics.length === 4;
  metrics.forEach((metric, index) => {
    const left = MARGIN + (grid ? (index % 2) * 566 : index * 352);
    const top = 263 + (grid ? Math.floor(index / 2) * 145 : 0);
    addText(slide, metric.value, { left, top, width: 440, height: 60 }, { fontSize: grid ? 46 : 42, bold: true, color: index % 2 ? COLORS.orange : COLORS.evergreen });
    addText(slide, metric.label, { left, top: top + 67, width: 490, height: 32 }, { fontSize: 23, bold: true, color: COLORS.forest });
    if (metric.note) addText(slide, metric.note, { left, top: top + 102, width: 490, height: 24 }, { fontSize: 23, color: COLORS.slate });
  });
  addBottomCopy(slide, data);
}

function buildChecklist(slide, data) {
  const items = data.visual.items;
  const perColumn = Math.ceil(items.length / 2);
  items.forEach((item, index) => {
    const left = MARGIN + Math.floor(index / perColumn) * 574;
    const top = 255 + (index % perColumn) * 77;
    addShape(slide, pptx.ShapeType.ellipse, { left, top: top + 4, width: 31, height: 31 }, COLORS.evergreen);
    addText(slide, "✓", { left, top: top + 2, width: 31, height: 32 }, { fontSize: 20, bold: true, color: COLORS.white, alignment: "center" });
    addText(slide, item, { left: left + 47, top, width: 498, height: 38 }, { fontSize: 23, bold: true, color: COLORS.ink });
    addShape(slide, pptx.ShapeType.rect, { left: left + 47, top: top + 48, width: 480, height: 1 }, COLORS.line);
  });
  addBottomCopy(slide, data);
}

function buildClose(slide, data) {
  slide.background = { color: COLORS.forest };
  addShape(slide, pptx.ShapeType.rect, { left: 0, top: 0, width: 22, height: 720 }, COLORS.orange);
  addText(slide, data.kicker, { left: 84, top: 60, width: 450, height: 30 }, { fontSize: 19, bold: true, color: "A8E8D7" });
  addText(slide, data.title, { left: 84, top: 112, width: 920, height: 66 }, { fontSize: 46, bold: true, color: COLORS.white });
  const items = data.visual.type === "checklist" ? data.visual.items : data.body;
  items.slice(0, 5).forEach((item, index) => {
    const top = 225 + index * 65;
    addText(slide, String(index + 1).padStart(2, "0"), { left: 90, top, width: 58, height: 42 }, { fontSize: 29, bold: true, color: COLORS.orange });
    addText(slide, item, { left: 174, top, width: 790, height: 42 }, { fontSize: 25, bold: true, color: COLORS.white });
  });
  addText(slide, data.message, { left: 86, top: 590, width: 930, height: 44 }, { fontSize: 23, bold: true, color: "D9FAEE" });
  addText(slide, "12 / 12", { left: 1080, top: 658, width: 118, height: 25 }, { fontSize: 14, bold: true, color: "BFE6DA", alignment: "right" });
}

function addBottomCopy(slide, data) {
  if (data.body?.length) addText(slide, data.body.join("　"), { left: MARGIN, top: 574, width: 1100, height: 58 }, { fontSize: 23, color: COLORS.slate });
}

function sourceIdsFor(data) {
  const ids = [];
  for (const claimId of data.claimIds ?? []) {
    const claim = claimMap.get(claimId);
    if (!claim) throw new Error(`Unknown claim ID on slide ${data.number}: ${claimId}`);
    for (const sourceId of claim.sourceIds ?? []) if (!ids.includes(sourceId)) ids.push(sourceId);
  }
  return ids;
}

function addFooter(slide, data) {
  const sourceNumbers = sourceIdsFor(data).map((id) => sourceMap.get(id)?.sourceNo).filter(Boolean);
  addShape(slide, pptx.ShapeType.rect, { left: MARGIN, top: 640, width: 1122, height: 1 }, COLORS.line);
  addText(slide, sourceNumbers.length ? `出典 S${sourceNumbers.join("・S")}（詳細はノート）` : "教材内の確認事項", { left: MARGIN, top: 647, width: 780, height: 22 }, { fontSize: 13, color: COLORS.slate });
  addText(slide, `${String(data.number).padStart(2, "0")} / 12`, { left: 1072, top: 647, width: 124, height: 22 }, { fontSize: 13, bold: true, color: COLORS.evergreen, alignment: "right" });
}

function addSpeakerNotes(slide, data) {
  const sourceLines = sourceIdsFor(data).map((sourceId) => {
    const source = sourceMap.get(sourceId);
    if (!source) throw new Error(`Unknown source ID: ${sourceId}`);
    return `- S${source.sourceNo} ${source.sourceId}: ${source.url}`;
  });
  slide.addNotes([
    "ナレーション", data.narration, "", "講師補足",
    ...(data.instructorNotes ?? []).map((note) => `- ${note}`),
    "", "主張ID", data.claimIds?.length ? data.claimIds.join(", ") : "教材案内", "", "[Sources]",
    ...(sourceLines.length ? sourceLines : ["- 教材ページ: https://anzen-ai-portal.jp/training/safety-seminars/safety-management-basics-osh-law"]),
  ].join("\n"));
}

function formatDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}
