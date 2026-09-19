import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";
import JSZip from "jszip";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(SCRIPT_DIR, "../..");
const DATA_DIR = path.join(WEB_ROOT, "src/data/ai-seminars");
const OUTPUT = process.env.AI_TRAINING_PPTX_OUTPUT
  ? path.resolve(process.env.AI_TRAINING_PPTX_OUTPUT)
  : path.join(WEB_ROOT, "public/training/ai-seminars/ai-chat-work/downloads/ai-chat-work-training.pptx");

const [course, claims, sources] = await Promise.all([
  readJson("ai-chat-work.json"),
  readJson("claims.json"),
  readJson("source-registry.json"),
]);

const claimMap = new Map(claims.map((claim) => [claim.claimId, claim]));
const sourceMap = new Map(sources.map((source, index) => [source.sourceId, { ...source, number: index + 1 }]));
const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });

const C = {
  navy: "#102A43",
  navyDark: "#071827",
  teal: "#0B6B66",
  tealDark: "#064E4A",
  tealSoft: "#D9EFEC",
  sky: "#0369A1",
  skySoft: "#E5F4FC",
  violet: "#6D28D9",
  violetSoft: "#F0EAFE",
  orange: "#F97316",
  amberSoft: "#FFF4D6",
  red: "#B42318",
  redSoft: "#FDEBE7",
  ink: "#172B3A",
  slate: "#526270",
  line: "#D3DEE3",
  paper: "#F7F5EF",
  white: "#FFFFFF",
};
const FONT = "Yu Gothic";
const FRAME_L = 68;
const CASE_NUMBERS = new Set([5, 7, 9, 11, 13]);
validateCanonical();

for (const data of course.slides) {
  const slide = presentation.slides.add();
  if (data.number === 1) buildCover(slide, data);
  else if (data.number === 20) buildSummary(slide, data);
  else {
    addBase(slide, data);
    if (CASE_NUMBERS.has(data.number)) buildCase(slide, data);
    else if (data.visual.type === "checklist") buildChecklist(slide, data);
    else buildSteps(slide, data);
    addFooter(slide, data);
  }
  addSpeakerNotes(slide, data);
}

await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(OUTPUT);
await applyMetadata(OUTPUT);
console.log(JSON.stringify({ output: OUTPUT, slides: course.slides.length, source: "ai-chat-work.json" }, null, 2));

async function readJson(name) {
  return JSON.parse(await fs.readFile(path.join(DATA_DIR, name), "utf8"));
}

function validateCanonical() {
  if (course.slideCount !== 20 || course.slides.length !== 20) throw new Error("AI course must contain 20 slides");
  if (course.version !== "2.0.0" || course.asOf !== "2026-08-28") throw new Error("Unexpected AI course version/date");
  if (course.slides.some((slide, index) => slide.number !== index + 1)) throw new Error("Slide numbering must be 1..20");
  for (const number of CASE_NUMBERS) {
    const body = course.slides[number - 1].body.join(" ");
    if (!/悪い依頼|危険な依頼/u.test(body) || !/改善プロンプト|安全な書換え/u.test(body) || !body.includes("出力例（架空・参考）") || !body.includes("人の確認点")) {
      throw new Error(`Slide ${number} does not contain the complete hands-on case`);
    }
  }
}

function addShape(slide, name, geometry, position, fill = "none", lineFill = "none", lineWidth = 0, radius) {
  return slide.shapes.add({
    name,
    geometry,
    position,
    fill,
    line: { style: "solid", fill: lineFill, width: lineWidth },
    ...(radius ? { borderRadius: radius } : {}),
  });
}

function addText(slide, name, text, position, style = {}) {
  const box = addShape(slide, name, "textbox", position);
  box.text = text;
  box.text.style = {
    fontFamily: FONT,
    fontSize: style.fontSize ?? 22,
    bold: style.bold ?? false,
    color: style.color ?? C.ink,
    alignment: style.alignment ?? "left",
    verticalAlignment: style.verticalAlignment ?? "middle",
    ...style,
  };
  return box;
}

function addBase(slide, data) {
  slide.background.fill = C.paper;
  addShape(slide, `accent-${data.number}`, "rect", { left: 0, top: 0, width: 18, height: 720 }, C.teal);
  addText(slide, `kicker-${data.number}`, data.kicker, { left: FRAME_L, top: 34, width: 720, height: 26 }, { fontSize: 17, bold: true, color: C.teal });
  addText(slide, `label-${data.number}`, data.label, { left: 1010, top: 34, width: 180, height: 26 }, { fontSize: 14, bold: true, color: C.tealDark, alignment: "right" });
  addText(slide, `title-${data.number}`, data.title, { left: FRAME_L, top: 68, width: 1120, height: 58 }, { fontSize: 40, bold: true, color: C.navy });
  addShape(slide, `title-rule-${data.number}`, "rect", { left: FRAME_L, top: 136, width: 92, height: 5 }, C.orange);
  addText(slide, `message-${data.number}`, data.message, { left: FRAME_L, top: 150, width: 1120, height: 54 }, { fontSize: 21, bold: true, color: C.ink });
}

function buildCover(slide, data) {
  slide.background.fill = C.navyDark;
  addShape(slide, "cover-accent", "rect", { left: 0, top: 0, width: 20, height: 720 }, C.orange);
  addText(slide, "cover-kicker", data.kicker, { left: 84, top: 62, width: 650, height: 34 }, { fontSize: 20, bold: true, color: "#BDE8E2" });
  addText(slide, "cover-title", data.title, { left: 84, top: 126, width: 820, height: 94 }, { fontSize: 58, bold: true, color: C.white });
  addText(slide, "cover-message", data.message, { left: 86, top: 242, width: 970, height: 78 }, { fontSize: 25, bold: true, color: "#E2F4F1" });
  const steps = data.visual.steps;
  steps.forEach((step, index) => {
    const left = 86 + index * 362;
    addShape(slide, `cover-step-${index}`, "roundRect", { left, top: 366, width: 326, height: 126 }, index === 1 ? C.sky : C.teal, "none", 0, "rounded-xl");
    addText(slide, `cover-step-no-${index}`, String(index + 1), { left: left + 18, top: 382, width: 38, height: 38 }, { fontSize: 24, bold: true, color: C.white, alignment: "center" });
    addText(slide, `cover-step-label-${index}`, step.label, { left: left + 66, top: 378, width: 230, height: 38 }, { fontSize: 24, bold: true, color: C.white });
    addText(slide, `cover-step-detail-${index}`, step.detail, { left: left + 22, top: 430, width: 282, height: 42 }, { fontSize: 16, color: C.white, alignment: "center" });
  });
  addText(slide, "cover-meta", data.body.join("　｜　"), { left: 86, top: 536, width: 1040, height: 34 }, { fontSize: 17, bold: true, color: "#C6E7E3" });
  addText(slide, "cover-boundary", course.boundary, { left: 86, top: 610, width: 1010, height: 34 }, { fontSize: 15, color: "#A9D9D3" });
  addText(slide, "cover-no", "01 / 20", { left: 1080, top: 654, width: 110, height: 22 }, { fontSize: 14, color: "#92CBC4", alignment: "right" });
}

function buildCase(slide, data) {
  if (data.body.length < 4) throw new Error(`Slide ${data.number} needs four case fields`);
  const left = 68;
  const right = 658;
  addPanel(slide, `case-bad-${data.number}`, "悪い依頼", stripLabel(data.body[0]), { left, top: 226, width: 550, height: 110 }, C.redSoft, C.red, 16);
  addPanel(slide, `case-prompt-${data.number}`, "改善した具体的プロンプト", stripLabel(data.body[1]), { left, top: 350, width: 550, height: 230 }, C.skySoft, C.sky, 16);
  addPanel(slide, `case-output-${data.number}`, "短い出力例（架空・参考）", stripLabel(data.body[2]), { left: right, top: 226, width: 550, height: 164 }, C.violetSoft, C.violet, 17);
  addPanel(slide, `case-check-${data.number}`, "人が確認する点", stripLabel(data.body[3]), { left: right, top: 406, width: 550, height: 174 }, C.amberSoft, C.orange, 18);
}

function addPanel(slide, name, label, text, position, fill, accent, fontSize) {
  addShape(slide, `${name}-bg`, "roundRect", position, fill, C.line, 1, "rounded-xl");
  addShape(slide, `${name}-bar`, "rect", { left: position.left, top: position.top, width: 8, height: position.height }, accent);
  addText(slide, `${name}-label`, label, { left: position.left + 24, top: position.top + 12, width: position.width - 42, height: 28 }, { fontSize: 15, bold: true, color: accent });
  addText(slide, `${name}-text`, text, { left: position.left + 24, top: position.top + 44, width: position.width - 44, height: position.height - 54 }, { fontSize, bold: position.height < 140, color: C.ink, verticalAlignment: "top" });
}

function stripLabel(text) {
  return text.replace(/^(悪い依頼|危険な依頼|改善プロンプト|安全な書換え|出力例（架空・参考）|人の確認点)：/u, "");
}

function buildSteps(slide, data) {
  const steps = data.visual.steps;
  const count = steps.length;
  const gap = 18;
  const width = (1120 - gap * (count - 1)) / count;
  steps.forEach((step, index) => {
    const left = FRAME_L + index * (width + gap);
    const accent = [C.teal, C.sky, C.violet, C.orange][index % 4];
    addShape(slide, `step-card-${data.number}-${index}`, "roundRect", { left, top: 236, width, height: 280 }, C.white, C.line, 1, "rounded-xl");
    addText(slide, `step-no-${data.number}-${index}`, String(index + 1).padStart(2, "0"), { left: left + 18, top: 252, width: 70, height: 54 }, { fontSize: 38, bold: true, color: accent });
    addShape(slide, `step-rule-${data.number}-${index}`, "rect", { left: left + 18, top: 318, width: width - 36, height: 4 }, accent);
    addText(slide, `step-label-${data.number}-${index}`, step.label, { left: left + 18, top: 342, width: width - 36, height: 58 }, { fontSize: count >= 4 ? 22 : 25, bold: true, color: C.navy, alignment: "center" });
    addText(slide, `step-detail-${data.number}-${index}`, step.detail, { left: left + 18, top: 412, width: width - 36, height: 74 }, { fontSize: count >= 4 ? 17 : 19, color: C.slate, alignment: "center", verticalAlignment: "top" });
  });
  if (data.body?.length) addText(slide, `body-${data.number}`, data.body.join("　｜　"), { left: FRAME_L, top: 540, width: 1120, height: 54 }, { fontSize: 15, color: C.slate });
}

function buildChecklist(slide, data) {
  const items = data.visual.items;
  const columns = 2;
  const perColumn = Math.ceil(items.length / columns);
  items.forEach((item, index) => {
    const col = Math.floor(index / perColumn);
    const row = index % perColumn;
    const left = FRAME_L + col * 570;
    const top = 232 + row * 88;
    addShape(slide, `check-${data.number}-${index}`, "ellipse", { left, top: top + 7, width: 34, height: 34 }, C.teal);
    addText(slide, `check-mark-${data.number}-${index}`, "✓", { left, top: top + 7, width: 34, height: 34 }, { fontSize: 20, bold: true, color: C.white, alignment: "center" });
    addText(slide, `check-text-${data.number}-${index}`, item, { left: left + 50, top, width: 500, height: 56 }, { fontSize: 19, bold: true, color: C.ink });
    addShape(slide, `check-rule-${data.number}-${index}`, "rect", { left: left + 50, top: top + 64, width: 500, height: 1 }, C.line);
  });
  if (data.body?.length) addText(slide, `body-${data.number}`, data.body.join("　｜　"), { left: FRAME_L, top: 548, width: 1120, height: 46 }, { fontSize: 15, color: C.slate });
}

function buildSummary(slide, data) {
  slide.background.fill = C.navyDark;
  addShape(slide, "summary-accent", "rect", { left: 0, top: 0, width: 20, height: 720 }, C.orange);
  addText(slide, "summary-kicker", data.kicker, { left: 84, top: 56, width: 600, height: 30 }, { fontSize: 20, bold: true, color: "#BDE8E2" });
  addText(slide, "summary-title", data.title, { left: 84, top: 106, width: 1020, height: 72 }, { fontSize: 46, bold: true, color: C.white });
  data.visual.steps.forEach((step, index) => {
    const top = 214 + index * 112;
    const accent = [C.teal, C.sky, C.orange][index];
    addText(slide, `summary-no-${index}`, String(index + 1).padStart(2, "0"), { left: 88, top, width: 72, height: 56 }, { fontSize: 38, bold: true, color: C.orange });
    addText(slide, `summary-label-${index}`, step.label, { left: 174, top, width: 300, height: 50 }, { fontSize: 28, bold: true, color: C.white });
    addShape(slide, `summary-card-${index}`, "roundRect", { left: 492, top: top - 8, width: 648, height: 76 }, accent, "none", 0, "rounded-xl");
    addText(slide, `summary-detail-${index}`, step.detail, { left: 516, top: top + 2, width: 600, height: 54 }, { fontSize: 20, bold: true, color: C.white });
  });
  addText(slide, "summary-action", data.body.join("　｜　"), { left: 86, top: 574, width: 1010, height: 54 }, { fontSize: 18, bold: true, color: "#E2F4F1" });
  addText(slide, "summary-no", "20 / 20", { left: 1080, top: 654, width: 110, height: 22 }, { fontSize: 14, color: "#92CBC4", alignment: "right" });
}

function sourceIdsFor(data) {
  const result = [];
  for (const claimId of data.claimIds ?? []) {
    const claim = claimMap.get(claimId);
    if (!claim) throw new Error(`Unknown claim ${claimId} on slide ${data.number}`);
    for (const sourceId of claim.sourceIds ?? []) if (!result.includes(sourceId)) result.push(sourceId);
  }
  return result;
}

function addFooter(slide, data) {
  const numbers = sourceIdsFor(data).map((id) => sourceMap.get(id)?.number).filter(Boolean);
  addShape(slide, `footer-rule-${data.number}`, "rect", { left: FRAME_L, top: 626, width: 1120, height: 1 }, C.line);
  addText(slide, `footer-source-${data.number}`, numbers.length ? `出典 S${numbers.join("・S")}（詳細はノート）` : "教材内の架空例", { left: FRAME_L, top: 636, width: 760, height: 26 }, { fontSize: 12, color: C.slate });
  addText(slide, `footer-no-${data.number}`, `${String(data.number).padStart(2, "0")} / 20`, { left: 1080, top: 636, width: 110, height: 26 }, { fontSize: 12, bold: true, color: C.teal, alignment: "right" });
}

function addSpeakerNotes(slide, data) {
  const sourceLines = sourceIdsFor(data).map((id) => {
    const source = sourceMap.get(id);
    return `- S${source.number} ${source.sourceId}: ${source.title} ${source.url}`;
  });
  slide.speakerNotes.textFrame.setText([
    "ナレーション", data.narration, "", "講師補足", ...(data.instructorNotes ?? []).map((note) => `- ${note}`), "",
    "主張ID", data.claimIds?.join(", ") || "外部事実主張なし", "", "[Sources]", ...(sourceLines.length ? sourceLines : ["- 教材内の架空例"]),
  ].join("\n"));
  slide.speakerNotes.setVisible(true);
}

async function applyMetadata(file) {
  const zip = await JSZip.loadAsync(await fs.readFile(file));
  const timestamp = `${course.asOf}T00:00:00Z`;
  zip.file("docProps/core.xml", [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
    `<dc:title>${course.title}</dc:title><dc:subject>${course.subtitle}／労働安全コンサルタント監修</dc:subject><dc:creator>安全AIポータル編集部</dc:creator><cp:lastModifiedBy>安全AIポータル編集部</cp:lastModifiedBy><cp:category>労働安全コンサルタント監修</cp:category>`,
    '<cp:keywords>AI実務研修,AIチャット,プロンプト,一次資料確認</cp:keywords>',
    `<dc:description>${course.boundary}</dc:description><dcterms:created xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:modified></cp:coreProperties>`,
  ].join(""));
  const bytes = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
  await fs.writeFile(file, bytes);
}
