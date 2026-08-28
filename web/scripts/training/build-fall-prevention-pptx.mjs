import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";
import JSZip from "jszip";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(SCRIPT_DIR, "../..");
const DATA_DIR = path.join(WEB_ROOT, "src/data/safety-seminars");
const PUBLIC_DIR = path.join(WEB_ROOT, "public");
const OUTPUT = process.env.TRAINING_PPTX_OUTPUT
  ? path.resolve(process.env.TRAINING_PPTX_OUTPUT)
  : path.join(
      PUBLIC_DIR,
      "training/safety-seminars/fall-prevention/downloads/fall-prevention-training.pptx",
    );

const [course, claims, sources] = await Promise.all([
  readJson(path.join(DATA_DIR, "fall-prevention.json")),
  readJson(path.join(DATA_DIR, "claims.json")),
  readJson(path.join(DATA_DIR, "source-registry.json")),
]);

if (course.slideCount !== 20 || course.slides.length !== 20) {
  throw new Error(`Expected 20 slides, received ${course.slides.length}.`);
}

const claimMap = new Map(claims.map((claim) => [claim.claimId, claim]));
const sourceMap = new Map(sources.map((source, index) => [source.sourceId, { ...source, sourceNo: index + 1 }]));

const COLORS = {
  teal: "#0B6B66",
  tealDark: "#064E4A",
  tealSoft: "#D9EFEC",
  orange: "#F97316",
  orangeSoft: "#FFF0E6",
  navy: "#102A43",
  ink: "#172B3A",
  slate: "#526270",
  line: "#D3DEE3",
  paper: "#F7F5EF",
  white: "#FFFFFF",
  red: "#B42318",
  redSoft: "#FDEBE7",
  green: "#287D69",
  greenSoft: "#E4F3EC",
  yellow: "#F5B942",
};

const FONT = "Yu Gothic";
const SLIDE_W = 1280;
const SLIDE_H = 720;
const FRAME_L = 68;
const presentation = Presentation.create({ slideSize: { width: SLIDE_W, height: SLIDE_H } });

for (const slideData of course.slides) {
  const slide = presentation.slides.add();
  if (slideData.number === 1) {
    buildCover(slide, slideData);
  } else if (slideData.number === 20) {
    buildSummary(slide, slideData);
  } else {
    addBase(slide, slideData);
    switch (slideData.visual.type) {
      case "steps":
        buildSteps(slide, slideData);
        break;
      case "metrics":
        if (slideData.number === 4) buildConstructionShare(slide, slideData);
        else buildMetrics(slide, slideData);
        break;
      case "trend":
        buildTrend(slide, slideData);
        break;
      case "bars":
        if (slideData.number === 4) buildConstructionTypeBars(slide, slideData);
        else buildBars(slide, slideData);
        break;
      case "image":
        await buildImageCase(slide, slideData);
        break;
      case "checklist":
        buildChecklist(slide, slideData);
        break;
      case "ky":
        await buildKy(slide, slideData);
        break;
      default:
        throw new Error(`Unsupported visual type: ${slideData.visual.type}`);
    }
    addFooter(slide, slideData);
  }
  addSpeakerNotes(slide, slideData);
}

await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(OUTPUT);
await applyPublicIdentityMetadata(OUTPUT);
console.log(JSON.stringify({ output: OUTPUT, slides: course.slides.length }, null, 2));

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function applyPublicIdentityMetadata(pptxPath) {
  const zip = await JSZip.loadAsync(await fs.readFile(pptxPath));
  const timestamp = `${course.asOf}T00:00:00Z`;
  const coreXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
    `<dc:title>${course.title}｜労働安全コンサルタント監修</dc:title>`,
    `<dc:subject>${course.subtitle}</dc:subject>`,
    '<dc:creator>安全AIポータル編集部</dc:creator>',
    '<cp:lastModifiedBy>安全AIポータル編集部</cp:lastModifiedBy>',
    '<cp:keywords>安全研修,墜落・転落防止,フルハーネス,労働安全コンサルタント監修</cp:keywords>',
    `<dc:description>${course.boundary} 労働安全コンサルタント監修。</dc:description>`,
    `<dcterms:created xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:created>`,
    `<dcterms:modified xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:modified>`,
    '</cp:coreProperties>',
  ].join("");
  const appXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">',
    '<Application>安全AIポータル編集部</Application>',
    '<Company>安全AIポータル編集部</Company>',
    '<PresentationFormat>16:9</PresentationFormat>',
    `<Slides>${course.slideCount}</Slides>`,
    `<Notes>${course.slideCount}</Notes>`,
    '<HiddenSlides>0</HiddenSlides>',
    '<SharedDoc>false</SharedDoc>',
    '<DocSecurity>0</DocSecurity>',
    '</Properties>',
  ].join("");
  zip.file("docProps/core.xml", coreXml);
  zip.file("docProps/app.xml", appXml);
  const rewritten = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
  await fs.writeFile(pptxPath, rewritten);
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
  const box = addShape(slide, name, "textbox", position, "none", "none", 0);
  box.text = text;
  box.text.style = {
    fontFamily: FONT,
    fontSize: style.fontSize ?? 22,
    bold: style.bold ?? false,
    color: style.color ?? COLORS.ink,
    alignment: style.alignment ?? "left",
    verticalAlignment: style.verticalAlignment ?? "middle",
    ...style,
  };
  return box;
}

function addBase(slide, data) {
  slide.background.fill = COLORS.paper;
  addShape(slide, `accent-${data.number}`, "rect", { left: 0, top: 0, width: 18, height: 720 }, COLORS.teal);
  addText(slide, `kicker-${data.number}`, data.kicker, { left: FRAME_L, top: 38, width: 700, height: 24 }, {
    fontSize: 17,
    bold: true,
    color: COLORS.teal,
  });
  addText(slide, `label-${data.number}`, data.label, { left: 1004, top: 34, width: 160, height: 30 }, {
    fontSize: 14,
    bold: true,
    color: data.label.includes("法定") ? COLORS.red : COLORS.tealDark,
    alignment: "right",
  });
  addText(slide, `title-${data.number}`, data.title, { left: FRAME_L, top: 70, width: 1100, height: 58 }, {
    fontSize: 44,
    bold: true,
    color: COLORS.navy,
  });
  addShape(slide, `title-rule-${data.number}`, "rect", { left: FRAME_L, top: 136, width: 92, height: 5 }, COLORS.orange);
  addText(slide, `message-${data.number}`, data.message, { left: FRAME_L, top: 151, width: 1120, height: 62 }, {
    fontSize: 23,
    bold: true,
    color: COLORS.ink,
  });
}

async function addImage(slide, imagePath, alt, position, fit = "cover", radius = "rounded-2xl") {
  const bytes = await fs.readFile(imagePath);
  const blob = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return slide.images.add({
    blob,
    contentType: contentTypeFor(imagePath),
    alt,
    fit,
    position,
    geometry: "roundRect",
    borderRadius: radius,
  });
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".webp") return "image/webp";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "image/png";
}

function localAsset(src) {
  if (src.startsWith("/mascot-")) return path.join(PUBLIC_DIR, "mascot", src.slice(1));
  return path.join(PUBLIC_DIR, src.replace(/^\//, ""));
}

async function buildCover(slide, data) {
  slide.background.fill = COLORS.tealDark;
  addShape(slide, "cover-orange-bar", "rect", { left: 0, top: 0, width: 20, height: 720 }, COLORS.orange);
  addText(slide, "cover-kicker", data.kicker, { left: 82, top: 62, width: 560, height: 34 }, {
    fontSize: 20,
    bold: true,
    color: "#BDE8E2",
  });
  addText(slide, "cover-title", data.title, { left: 82, top: 132, width: 750, height: 170 }, {
    fontSize: 58,
    bold: true,
    color: COLORS.white,
  });
  addText(slide, "cover-subtitle", data.message, { left: 86, top: 324, width: 700, height: 82 }, {
    fontSize: 23,
    color: "#E2F4F1",
  });
  addShape(slide, "cover-time-rule", "rect", { left: 86, top: 444, width: 540, height: 2 }, "#77BEB7");
  addText(slide, "cover-time", data.body.join("　｜　"), { left: 86, top: 462, width: 650, height: 36 }, {
    fontSize: 20,
    bold: true,
    color: COLORS.white,
  });
  addText(slide, "cover-boundary", course.boundary, { left: 86, top: 612, width: 830, height: 34 }, {
    fontSize: 16,
    color: "#C6E7E3",
  });
  addText(slide, "cover-date", "基準日 2026年8月27日", { left: 86, top: 650, width: 350, height: 24 }, {
    fontSize: 14,
    color: "#92CBC4",
  });
  addShape(slide, "cover-mascot-disc", "ellipse", { left: 888, top: 136, width: 280, height: 280 }, "#EAF6F4");
  await addImage(slide, localAsset(data.visual.src), data.visual.alt, { left: 888, top: 136, width: 280, height: 280 }, "contain", "rounded-full");
  addText(slide, "cover-slide-no", "01 / 20", { left: 1080, top: 654, width: 110, height: 22 }, {
    fontSize: 14,
    color: "#92CBC4",
    alignment: "right",
  });
}

function buildSteps(slide, data) {
  const steps = data.visual.steps;
  const top = 248;
  const colW = 342;
  const gap = 37;
  const palette = [COLORS.teal, COLORS.orange, COLORS.navy];
  steps.forEach((step, index) => {
    const left = FRAME_L + index * (colW + gap);
    addText(slide, `step-no-${data.number}-${index}`, String(index + 1).padStart(2, "0"), { left, top, width: 84, height: 70 }, {
      fontSize: 52,
      bold: true,
      color: palette[index],
    });
    addShape(slide, `step-rule-${data.number}-${index}`, "rect", { left, top: top + 78, width: colW, height: 4 }, palette[index]);
    addText(slide, `step-label-${data.number}-${index}`, step.label, { left, top: top + 99, width: colW, height: 48 }, {
      fontSize: 26,
      bold: true,
      color: COLORS.navy,
    });
    addText(slide, `step-detail-${data.number}-${index}`, step.detail, { left, top: top + 158, width: colW, height: 96 }, {
      fontSize: 20,
      color: COLORS.slate,
    });
    if (index < steps.length - 1) {
      addShape(slide, `step-arrow-${data.number}-${index}`, "rightArrow", { left: left + colW + 7, top: top + 68, width: 24, height: 26 }, COLORS.line);
    }
  });
  addBodyLine(slide, data, 555);
}

function buildMetrics(slide, data) {
  const metrics = data.visual.metrics;
  const isFour = metrics.length === 4;
  const top = 244;
  metrics.forEach((metric, index) => {
    const col = isFour ? index % 2 : index;
    const row = isFour ? Math.floor(index / 2) : 0;
    const left = FRAME_L + col * 558;
    const y = top + row * 153;
    addText(slide, `metric-value-${data.number}-${index}`, metric.value, { left, top: y, width: 430, height: 66 }, {
      fontSize: isFour ? 48 : 56,
      bold: true,
      color: index % 2 === 0 ? COLORS.teal : COLORS.orange,
    });
    addText(slide, `metric-label-${data.number}-${index}`, metric.label, { left, top: y + 66, width: 470, height: 32 }, {
      fontSize: 19,
      bold: true,
      color: COLORS.navy,
    });
    if (metric.note) {
      addText(slide, `metric-note-${data.number}-${index}`, metric.note, { left, top: y + 99, width: 470, height: 26 }, {
        fontSize: 15,
        color: COLORS.slate,
      });
    }
  });
  addBodyLine(slide, data, 558);
}

function buildConstructionShare(slide, data) {
  const chartTop = 236;
  const groups = [
    { metric: data.visual.metrics[0], share: 91, other: 123, percent: "42.5%", color: COLORS.orange },
    { metric: data.visual.metrics[1], share: 4343, other: 9094, percent: "32.3%", color: COLORS.teal },
  ];
  groups.forEach((group, index) => {
    const left = 86 + index * 570;
    slide.charts.add("doughnut", {
      position: { left, top: chartTop, width: 286, height: 270 },
      categories: ["墜落・転落", "その他"],
      series: [{
        name: group.metric.label,
        values: [group.share, group.other],
        points: [
          { idx: 0, fill: group.color },
          { idx: 1, fill: "#DCE5E8" },
        ],
      }],
      doughnutOptions: { holeSize: 66, firstSliceAngle: 270 },
      hasLegend: false,
      chartFill: "none",
      plotAreaFill: "none",
      chartLine: { style: "solid", fill: "none", width: 0 },
      dataLabels: { showValue: false, showPercent: false },
    });
    addText(slide, `share-percent-${index}`, group.percent, { left: left + 72, top: chartTop + 92, width: 142, height: 58 }, {
      fontSize: 40,
      bold: true,
      color: group.color,
      alignment: "center",
    });
    addText(slide, `share-value-${index}`, group.metric.value, { left: left + 310, top: chartTop + 50, width: 210, height: 56 }, {
      fontSize: 44,
      bold: true,
      color: COLORS.navy,
    });
    addText(slide, `share-label-${index}`, group.metric.label, { left: left + 310, top: chartTop + 112, width: 230, height: 66 }, {
      fontSize: 19,
      bold: true,
      color: COLORS.ink,
    });
    addText(slide, `share-note-${index}`, group.metric.note, { left: left + 310, top: chartTop + 180, width: 220, height: 34 }, {
      fontSize: 16,
      color: COLORS.slate,
    });
  });
  addText(slide, "share-definition", "全国・建設業・2025年確定／COVID-19罹患災害を除外／死亡と死傷は別分母", { left: FRAME_L, top: 555, width: 1080, height: 30 }, {
    fontSize: 16,
    color: COLORS.slate,
  });
}

function buildConstructionTypeBars(slide, data) {
  // The canonical order keeps the requested accident-type classification. The
  // array is reversed only because PowerPoint draws horizontal bars bottom-up.
  const bars = [...data.visual.bars].reverse();
  slide.charts.add("bar", {
    position: { left: 62, top: 228, width: 842, height: 350 },
    categories: bars.map((bar) => bar.label),
    series: [{
      name: "建設業・事故の型別",
      values: bars.map((bar) => bar.value),
      valuesFormatCode: "#,##0",
      fill: COLORS.teal,
      points: bars.map((bar, idx) => ({
        idx,
        fill: bar.label === "墜落・転落"
          ? COLORS.orange
          : bar.label === "その他" ? "#95A4AD" : COLORS.teal,
      })),
    }],
    barOptions: { direction: "bar", grouping: "clustered", gapWidth: 44 },
    hasLegend: false,
    chartFill: "none",
    plotAreaFill: "none",
    chartLine: { style: "solid", fill: "none", width: 0 },
    xAxis: { visible: false, majorGridlines: null },
    yAxis: {
      textStyle: { fill: COLORS.ink, fontSize: 15 },
      line: { style: "solid", fill: COLORS.line, width: 1 },
      majorGridlines: null,
    },
    dataLabels: {
      showValue: true,
      position: "outEnd",
      textStyle: { fill: COLORS.navy, fontSize: 14, bold: true },
    },
  });
  addShape(slide, "construction-type-rule", "rect", { left: 948, top: 254, width: 4, height: 246 }, COLORS.orange);
  addText(slide, "construction-death-label", "墜落・転落死亡", { left: 980, top: 254, width: 220, height: 34 }, {
    fontSize: 20,
    bold: true,
    color: COLORS.navy,
  });
  addText(slide, "construction-death-value", "91人", { left: 980, top: 302, width: 210, height: 72 }, {
    fontSize: 52,
    bold: true,
    color: COLORS.orange,
  });
  addText(slide, "construction-death-share", "214人中 42.5%", { left: 980, top: 382, width: 220, height: 38 }, {
    fontSize: 20,
    bold: true,
    color: COLORS.ink,
  });
  addText(slide, "construction-injury-share", "死傷：13,437人中\n4,343人（32.3%）", { left: 980, top: 448, width: 220, height: 70 }, {
    fontSize: 18,
    color: COLORS.slate,
  });
  addText(slide, "construction-type-definition", "全国・建設業・2025年確定／休業4日以上死傷（死亡を含む）／COVID-19罹患災害を除外", { left: FRAME_L, top: 590, width: 1110, height: 25 }, {
    fontSize: 14,
    color: COLORS.slate,
  });
}

function buildTrend(slide, data) {
  const points = data.visual.points;
  slide.charts.add("line", {
    position: { left: 68, top: 236, width: 820, height: 326 },
    categories: points.map((point) => String(point.year)),
    series: [{
      name: "建設業・墜落転落・休業4日以上死傷",
      values: points.map((point) => point.injuries),
      line: { style: "solid", fill: COLORS.teal, width: 4 },
      marker: { symbol: "circle", size: 7 },
      dataLabelOverrides: [
        { idx: 0, text: "5,184", position: "outEnd", showValue: false, textStyle: { fontSize: 14, fill: COLORS.tealDark, bold: true } },
        { idx: 9, text: "4,343", position: "outEnd", showValue: false, textStyle: { fontSize: 14, fill: COLORS.tealDark, bold: true } },
      ],
    }],
    hasLegend: false,
    chartFill: "none",
    plotAreaFill: "none",
    chartLine: { style: "solid", fill: "none", width: 0 },
    xAxis: {
      textStyle: { fill: COLORS.slate, fontSize: 13 },
      line: { style: "solid", fill: COLORS.line, width: 1 },
      majorGridlines: null,
    },
    yAxis: {
      min: 4000,
      max: 5400,
      majorUnit: 200,
      numberFormatCode: "#,##0",
      textStyle: { fill: COLORS.slate, fontSize: 13 },
      line: { style: "solid", fill: COLORS.line, width: 1 },
      majorGridlines: { style: "solid", fill: "#DFE6E8", width: 1 },
    },
  });
  addText(slide, "trend-unit", "休業4日以上死傷（人）", { left: 75, top: 220, width: 260, height: 22 }, {
    fontSize: 14,
    color: COLORS.slate,
  });
  addShape(slide, "trend-side-rule", "rect", { left: 930, top: 246, width: 4, height: 282 }, COLORS.orange);
  addText(slide, "trend-death-label", "死亡者数", { left: 965, top: 252, width: 200, height: 32 }, {
    fontSize: 22,
    bold: true,
    color: COLORS.navy,
  });
  addText(slide, "trend-death-2016", "2016\n134人", { left: 965, top: 303, width: 190, height: 78 }, {
    fontSize: 28,
    bold: true,
    color: COLORS.slate,
  });
  addText(slide, "trend-death-2025", "2025\n91人", { left: 965, top: 405, width: 190, height: 78 }, {
    fontSize: 28,
    bold: true,
    color: COLORS.orange,
  });
  addText(slide, "trend-warning", "直近：77 → 91人", { left: 965, top: 496, width: 210, height: 34 }, {
    fontSize: 17,
    bold: true,
    color: COLORS.red,
  });
  addText(slide, "trend-definition", "全国・建設業・2016〜2025年確定／単位：人／件数（発生率ではない）", { left: FRAME_L, top: 568, width: 1080, height: 28 }, {
    fontSize: 15,
    color: COLORS.slate,
  });
}

function buildBars(slide, data) {
  // PowerPoint renders horizontal-bar categories from bottom to top. Reversing
  // the source order keeps the largest official counts at the visual top.
  const bars = [...data.visual.bars].reverse();
  slide.charts.add("bar", {
    position: { left: 62, top: 230, width: 1090, height: 374 },
    categories: bars.map((bar) => bar.label),
    series: [{
      name: "墜落・転落",
      values: bars.map((bar) => bar.value),
      valuesFormatCode: "#,##0",
      fill: COLORS.teal,
      points: bars.map((bar, idx) => ({ idx, fill: bar.value >= 3000 ? COLORS.orange : COLORS.teal })),
    }],
    barOptions: { direction: "bar", grouping: "clustered", gapWidth: 36 },
    hasLegend: false,
    chartFill: "none",
    plotAreaFill: "none",
    chartLine: { style: "solid", fill: "none", width: 0 },
    xAxis: { visible: false, majorGridlines: null },
    yAxis: {
      textStyle: { fill: COLORS.ink, fontSize: 15 },
      line: { style: "solid", fill: COLORS.line, width: 1 },
      majorGridlines: null,
    },
    dataLabels: {
      showValue: true,
      position: "outEnd",
      textStyle: { fill: COLORS.navy, fontSize: 14, bold: true },
    },
  });
  addText(slide, "bar-definition", "全国・全産業・2025年確定／休業4日以上死傷（死亡を含む）／COVID-19罹患災害を除外", { left: FRAME_L, top: 600, width: 1110, height: 25 }, {
    fontSize: 14,
    color: COLORS.slate,
  });
}

async function buildImageCase(slide, data) {
  const imagePath = localAsset(data.visual.src);
  const imageFit = data.number >= 7 && data.number <= 9 ? "contain" : "cover";
  await addImage(slide, imagePath, data.visual.alt, { left: 655, top: 232, width: 530, height: 335 }, imageFit);
  addShape(slide, `image-caption-rule-${data.number}`, "rect", { left: 655, top: 581, width: 530, height: 2 }, COLORS.line);
  addText(slide, `image-caption-${data.number}`, "プロジェクト所有の教材用オリジナル画像", { left: 655, top: 588, width: 530, height: 24 }, {
    fontSize: 13,
    color: COLORS.slate,
  });
  const leadText = data.number === 9
    ? "設置・固定・足元・周囲\n製品説明書を確認"
    : (data.body[0] ?? "");
  addText(slide, `image-message-${data.number}`, leadText, { left: FRAME_L, top: 270, width: 520, height: 104 }, {
    fontSize: 28,
    bold: true,
    color: COLORS.tealDark,
  });
  addShape(slide, `image-rule-${data.number}`, "rect", { left: FRAME_L, top: 381, width: 430, height: 4 }, COLORS.orange);
  addText(slide, `image-body-${data.number}`, data.body[1] ?? "", { left: FRAME_L, top: 406, width: 510, height: 96 }, {
    fontSize: 23,
    color: COLORS.ink,
  });
}

function buildChecklist(slide, data) {
  const items = data.visual.items;
  const cols = 2;
  const perCol = Math.ceil(items.length / cols);
  const colW = 510;
  const colGap = 78;
  const top = 234;
  const rowH = items.length > 6 ? 72 : 82;
  items.forEach((item, index) => {
    const col = Math.floor(index / perCol);
    const row = index % perCol;
    const left = FRAME_L + col * (colW + colGap);
    const y = top + row * rowH;
    addShape(slide, `check-dot-${data.number}-${index}`, "ellipse", { left, top: y + 6, width: 32, height: 32 }, COLORS.teal);
    addText(slide, `check-mark-${data.number}-${index}`, "✓", { left, top: y + 5, width: 32, height: 32 }, {
      fontSize: 20,
      bold: true,
      color: COLORS.white,
      alignment: "center",
    });
    addText(slide, `check-item-${data.number}-${index}`, item, { left: left + 48, top: y, width: colW - 48, height: 47 }, {
      fontSize: items.length > 6 ? 19 : 21,
      bold: true,
      color: COLORS.ink,
    });
    addShape(slide, `check-line-${data.number}-${index}`, "rect", { left: left + 48, top: y + 53, width: colW - 48, height: 1 }, COLORS.line);
  });
  addBodyLine(slide, data, 582);
}

async function buildKy(slide, data) {
  const imagePath = localAsset(data.visual.image);
  await addImage(slide, imagePath, data.visual.alt, { left: 68, top: 232, width: 610, height: 346 }, "cover");
  const overlay = addShape(slide, "ky-image-overlay", "rect", { left: 68, top: 232, width: 610, height: 346 }, "#064E4A33");
  overlay.sendToBack();
  const mascot = path.join(PUBLIC_DIR, "mascot/mascot-thinking.webp");
  await addImage(slide, mascot, "Visual KYで考えるチワワのキャラクター", { left: 556, top: 430, width: 120, height: 120 }, "contain", "rounded-full");
  data.visual.prompts.forEach((prompt, index) => {
    const y = 244 + index * 77;
    addText(slide, `ky-no-${index}`, String(index + 1), { left: 730, top: y, width: 42, height: 42 }, {
      fontSize: 24,
      bold: true,
      color: COLORS.orange,
      alignment: "center",
    });
    addText(slide, `ky-prompt-${index}`, prompt, { left: 786, top: y, width: 390, height: 46 }, {
      fontSize: 23,
      bold: true,
      color: COLORS.ink,
    });
    addShape(slide, `ky-line-${index}`, "rect", { left: 786, top: y + 50, width: 390, height: 1 }, COLORS.line);
  });
  addText(slide, "ky-timing", data.body.join("　｜　"), { left: 730, top: 566, width: 446, height: 32 }, {
    fontSize: 16,
    color: COLORS.slate,
  });
}

async function buildSummary(slide, data) {
  slide.background.fill = COLORS.tealDark;
  addShape(slide, "summary-orange-bar", "rect", { left: 0, top: 0, width: 20, height: 720 }, COLORS.orange);
  addText(slide, "summary-kicker", data.kicker, { left: 82, top: 58, width: 400, height: 30 }, {
    fontSize: 20,
    bold: true,
    color: "#BDE8E2",
  });
  addText(slide, "summary-title", data.title, { left: 82, top: 112, width: 860, height: 78 }, {
    fontSize: 48,
    bold: true,
    color: COLORS.white,
  });
  const words = data.visual.summaryItems;
  if (!Array.isArray(words) || words.length !== 3) {
    throw new Error("Summary slide requires exactly three semantic summaryItems");
  }
  words.forEach((word, index) => {
    const top = 250 + index * 104;
    addText(slide, `summary-no-${index}`, String(index + 1).padStart(2, "0"), { left: 88, top, width: 76, height: 52 }, {
      fontSize: 36,
      bold: true,
      color: COLORS.orange,
    });
    addText(slide, `summary-word-${index}`, word, { left: 180, top, width: 500, height: 52 }, {
      fontSize: 30,
      bold: true,
      color: COLORS.white,
    });
  });
  addText(slide, "summary-action", data.body[0], { left: 86, top: 586, width: 700, height: 36 }, {
    fontSize: 22,
    bold: true,
    color: "#E2F4F1",
  });
  addText(slide, "summary-boundary", data.body[1], { left: 86, top: 632, width: 700, height: 28 }, {
    fontSize: 16,
    color: "#A9D9D3",
  });
  addShape(slide, "summary-mascot-disc", "ellipse", { left: 880, top: 248, width: 272, height: 272 }, "#EAF6F4");
  await addImage(slide, localAsset(data.visual.src), data.visual.alt, { left: 880, top: 248, width: 272, height: 272 }, "contain", "rounded-full");
  addText(slide, "summary-slide-no", "20 / 20", { left: 1070, top: 660, width: 120, height: 22 }, {
    fontSize: 14,
    color: "#92CBC4",
    alignment: "right",
  });
}

function addBodyLine(slide, data, top) {
  if (!data.body?.length) return;
  addText(slide, `body-line-${data.number}`, data.body.join("　｜　"), { left: FRAME_L, top, width: 1100, height: 46 }, {
    fontSize: 16,
    color: COLORS.slate,
  });
}

function sourceIdsFor(data) {
  const ids = [];
  for (const claimId of data.claimIds ?? []) {
    const claim = claimMap.get(claimId);
    if (!claim) throw new Error(`Unknown claim ID on slide ${data.number}: ${claimId}`);
    for (const sourceId of claim.sourceIds ?? []) {
      if (!ids.includes(sourceId)) ids.push(sourceId);
    }
  }
  return ids;
}

function addFooter(slide, data) {
  const sourceIds = sourceIdsFor(data);
  const sourceNos = sourceIds.map((id) => sourceMap.get(id)?.sourceNo).filter(Boolean);
  addShape(slide, `footer-rule-${data.number}`, "rect", { left: FRAME_L, top: 638, width: 1120, height: 1 }, COLORS.line);
  addText(slide, `footer-sources-${data.number}`, sourceNos.length ? `出典 S${sourceNos.join("・S")}（詳細はノート）` : "出典：教材内情報", { left: FRAME_L, top: 646, width: 750, height: 26 }, {
    fontSize: 13,
    color: COLORS.slate,
  });
  addText(slide, `footer-page-${data.number}`, `${String(data.number).padStart(2, "0")} / 20`, { left: 1080, top: 646, width: 110, height: 26 }, {
    fontSize: 13,
    bold: true,
    color: COLORS.teal,
    alignment: "right",
  });
}

function addSpeakerNotes(slide, data) {
  const sourceIds = sourceIdsFor(data);
  const sourceLines = sourceIds.length
    ? sourceIds.map((id) => {
        const source = sourceMap.get(id);
        if (!source) throw new Error(`Unknown source ID: ${id}`);
        return `- S${source.sourceNo} ${source.sourceId}: ${source.url}`;
      })
    : ["- 教材ページ: https://www.anzen-ai-portal.jp/training/safety-seminars/fall-prevention"];
  const notes = [
    "ナレーション",
    data.narration,
    "",
    "講師補足",
    ...(data.instructorNotes ?? []).map((note) => `- ${note}`),
    "",
    "主張ID",
    data.claimIds?.length ? data.claimIds.join(", ") : "教材案内（外部事実主張なし）",
    "",
    "[Sources]",
    ...sourceLines,
  ].join("\n");
  slide.speakerNotes.textFrame.setText(notes);
  slide.speakerNotes.setVisible(true);
}
