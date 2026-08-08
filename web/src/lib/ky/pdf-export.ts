import type {
  KyLocalDraft,
  KySelectedHazard,
  KyWeatherSnapshot,
} from "@/lib/ky/zero-friction-types";
import { formatJmaWarning } from "@/lib/jma/warning-label";
import { isKyDraftContentConfirmable } from "@/lib/ky/zero-friction-types";

const A4_PDF_WIDTH = 595.28;
const A4_PDF_HEIGHT = 841.89;
const CANVAS_WIDTH = 1240;
const CANVAS_HEIGHT = 1754;
const MARGIN_X = 84;
const TOP_Y = 92;
const BOTTOM_Y = 1660;

export type KyPdfBuildResult = {
  bytes: Uint8Array;
  filename: string;
  pageCount: number;
  stateLabel: "確認済み" | "下書き・未確認";
};

type PdfLine = {
  text: string;
  kind: "title" | "heading" | "body" | "small" | "hazard" | "measure";
  indent?: number;
};

type CanvasPage = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  y: number;
};

const encoder = new TextEncoder();

function ascii(value: string): Uint8Array {
  return encoder.encode(value);
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function safeText(value: string | null | undefined, fallback = "未確認"): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function formatJst(iso: string | null | undefined): string {
  if (!iso) return "未確認";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "未確認";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function weatherAvailabilityLabel(weather: KyWeatherSnapshot): string {
  if (weather.manuallyEditedFields.length > 0) {
    const fieldLabels = weather.manuallyEditedFields.map((field) => ({
      weather: "天気",
      temperature: "気温",
      humidity: "湿度",
      wbgt: "WBGT",
    })[field]).join("・");
    if (weather.stale) return `古い情報・手動修正あり（${fieldLabels}）`;
    if (weather.degraded || weather.availability === "degraded") {
      return `一部取得不能・手動修正あり（${fieldLabels}）`;
    }
    return `手動修正あり（${fieldLabels}）`;
  }
  switch (weather.availability) {
    case "live":
      return "公開情報取得済み";
    case "estimated":
      return "推定";
    case "stale":
      return "古い情報";
    case "degraded":
      return "一部取得不能";
    default:
      return weather.manuallyEditedFields.length > 0 ? "手動修正あり" : "未確認";
  }
}

function heatAlertLabel(value: KyWeatherSnapshot["heatAlert"]): string {
  switch (value) {
    case "active":
      return "発表中";
    case "inactive":
      return "発表確認なし（取得時点）";
    case "candidate":
      return "発表候補・未確定";
    default:
      return "未確認";
  }
}

function formatWeather(weather: KyWeatherSnapshot | null): PdfLine[] {
  if (!weather) {
    return [{ text: "気象: 未確認（取得不能を安全とは扱いません）", kind: "body" }];
  }
  const edited = (field: KyWeatherSnapshot["manuallyEditedFields"][number]) =>
    weather.manuallyEditedFields.includes(field) ? "（手動修正）" : "";
  const weatherText = `${safeText(weather.weather)}${edited("weather")}`;
  const temperature =
    weather.temperatureCelsius == null
      ? "気温 未確認"
      : `気温 ${weather.temperatureCelsius.toFixed(1)}℃${edited("temperature")}`;
  const humidity =
    weather.relativeHumidityPercent == null
      ? "湿度 未確認"
      : `湿度 ${Math.round(weather.relativeHumidityPercent)}%${edited("humidity")}`;
  const wbgt =
    weather.wbgtCelsius == null
      ? "WBGT 未確認"
      : `WBGT ${weather.wbgtCelsius.toFixed(1)}℃（${weather.manuallyEditedFields.includes("wbgt") ? "手動修正" : weather.wbgtKind === "estimated" ? "推定" : "未確認"}）`;
  const warnings = weather.warnings.length
    ? weather.warnings
        .map(formatJmaWarning)
        .join("、")
    : weather.warningStatus === "live"
      ? "発表なし（取得時点）"
      : "未確認";
  return [
    {
      text: `気象: ${weatherText} / ${temperature} / ${humidity} / ${wbgt}`,
      kind: "body",
    },
    {
      text: `区分: ${weatherAvailabilityLabel(weather)}　警報・注意報: ${warnings}`,
      kind: "small",
    },
    {
      text: `熱中症警戒アラート: ${heatAlertLabel(weather.heatAlert)}　特別警戒アラート: ${heatAlertLabel(weather.specialHeatAlert)}`,
      kind: "small",
    },
    {
      text: `${weather.targetAt ? `気象対象時刻: ${formatJst(weather.targetAt)}` : weather.targetDate ? `気象対象日: ${weather.targetDate}（日予報・時刻指定なし）` : "気象対象時刻: 未確認"}　気象取得: ${formatJst(weather.fetchedAt)}　WBGT対象: ${formatJst(weather.wbgtTargetAt)}　WBGT取得: ${formatJst(weather.wbgtRetrievedAt)}　提供元: ${weather.providers.join("、") || "未確認"}`,
      kind: "small",
    },
  ];
}

function hazardLines(hazard: KySelectedHazard, index: number): PdfLine[] {
  const origin =
    hazard.origin === "manual"
      ? "手入力"
      : hazard.origin === "handoff"
        ? "引継ぎ候補"
        : "検証済み候補から選択";
  const lines: PdfLine[] = [
    {
      text: `${index + 1}. ${safeText(hazard.title)}（${safeText(hazard.accidentType)} / ${origin}${hazard.edited ? "・編集済み" : ""}）`,
      kind: "hazard",
    },
  ];
  if (hazard.reason.trim()) {
    lines.push({ text: `根拠: ${hazard.reason}`, kind: "small", indent: 1 });
  }
  lines.push({
    text: `候補出典: ${safeText(hazard.sourceLabel)} / ${safeText(hazard.sourceRef)}`,
    kind: "small",
    indent: 1,
  });
  if (hazard.measures.length === 0) {
    lines.push({ text: "対策: 未確認", kind: "measure", indent: 1 });
  } else {
    for (const [measureIndex, measure] of hazard.measures.entries()) {
      const measureOrigin =
        measure.origin === "manual"
          ? "手入力"
          : measure.origin === "handoff"
            ? "引継ぎ候補"
            : measure.origin === "weather"
              ? "気象候補"
              : "検証済み候補";
      lines.push({
        text: `対策${measureIndex + 1}: ${safeText(measure.text)}（${measureOrigin}${measure.edited ? "・編集済み" : ""} / 出典: ${safeText(measure.sourceLabel)}）`,
        kind: "measure",
        indent: 1,
      });
    }
  }
  return lines;
}

export function kyPdfStateLabel(
  draft: Pick<
    KyLocalDraft,
    | "confirmedAt"
    | "reviewerName"
    | "workDescription"
    | "hazards"
    | "handoff"
    | "weather"
    | "locationQuery"
    | "areaLabel"
    | "selectedMembers"
    | "workDate"
    | "workStartTime"
  >,
): "確認済み" | "下書き・未確認" {
  const weather = draft.weather;
  const weatherComplete = Boolean(
    weather &&
      !weather.stale &&
      !weather.degraded &&
      weather.availability !== "stale" &&
      weather.availability !== "degraded" &&
      weather.availability !== "unavailable" &&
      weather.weather?.trim() &&
      weather.temperatureCelsius != null &&
      weather.relativeHumidityPercent != null &&
      weather.wbgtCelsius != null &&
      weather.wbgtKind === "estimated" &&
      weather.warningStatus === "live" &&
      weather.heatAlert !== "unavailable" &&
      weather.specialHeatAlert !== "unavailable",
  );
  return draft.confirmedAt &&
    draft.reviewerName.trim() &&
    draft.workDate.trim() &&
    draft.workStartTime.trim() &&
    (draft.locationQuery.trim() || draft.areaLabel.trim()) &&
    draft.selectedMembers.length > 0 &&
    weatherComplete &&
    isKyDraftContentConfirmable(draft) &&
    (!draft.handoff || Boolean(draft.handoff.reviewedAt))
    ? "確認済み"
    : "下書き・未確認";
}

export function kyPdfFilename(
  draft: Pick<KyLocalDraft, "workDate" | "areaLabel">,
): string {
  const date = /^\d{4}-\d{2}-\d{2}$/u.test(draft.workDate)
    ? draft.workDate.replaceAll("-", "")
    : "日付未確認";
  const area = (draft.areaLabel || "地域未確認")
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/gu, "_")
    .replace(/\s+/gu, "")
    .slice(0, 24);
  return `KY_${date}_${area}.pdf`;
}

export function kyDraftToPdfLines(draft: KyLocalDraft): PdfLine[] {
  const state = kyPdfStateLabel(draft);
  const members = draft.selectedMembers.length
    ? draft.selectedMembers
        .map((member) => `${member.displayName}／${member.role}`)
        .join("、")
    : "未確認";
  return [
    { text: "危険予知活動表（KY）", kind: "title" },
    { text: `作成状態: ${state}`, kind: "heading" },
    {
      text: `作業日: ${safeText(draft.workDate)}　開始: ${safeText(draft.workStartTime)}　作成日時: ${formatJst(draft.createdAt)}`,
      kind: "body",
    },
    {
      text: `場所: ${safeText(draft.locationQuery || draft.areaLabel)}`,
      kind: "body",
    },
    ...(draft.areaLabel && draft.areaLabel !== draft.locationQuery
      ? [{ text: `気象の粗い区域: ${draft.areaLabel}`, kind: "small" as const }]
      : []),
    { text: `メンバー: ${members}`, kind: "body" },
    { text: "作業内容", kind: "heading" },
    ...(draft.workCategory
      ? [{ text: `作業カテゴリ: ${draft.workCategory}`, kind: "small" as const }]
      : []),
    { text: safeText(draft.workDescription), kind: "body" },
    { text: "作成時点の気象", kind: "heading" },
    ...formatWeather(draft.weather),
    { text: "危険と対策", kind: "heading" },
    ...(draft.hazards.length
      ? draft.hazards.flatMap(hazardLines)
      : [{ text: "危険: 未確認", kind: "hazard" as const }]),
    { text: "確認", kind: "heading" },
    { text: `確認者: ${safeText(draft.reviewerName)}`, kind: "body" },
    { text: `確認日時: ${formatJst(draft.confirmedAt)}`, kind: "body" },
    { text: `備考: ${safeText(draft.notes, "なし")}`, kind: "body" },
    { text: "出典・注意", kind: "heading" },
    {
      text: "危険・対策は検証済みライブラリ等から提示した候補を含みます。現場条件を確認した人の判断が正本です。",
      kind: "small",
    },
    {
      text: "気象・WBGTは作成時点の公開情報または推定値で、現場実測値ではありません。取得不能・古い値は判断保留です。",
      kind: "small",
    },
  ];
}

function createCanvasPage(
  stateLabel: ReturnType<typeof kyPdfStateLabel>,
): CanvasPage {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("PDF描画を開始できませんでした。");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.strokeStyle = "#0f766e";
  context.lineWidth = 8;
  context.strokeRect(34, 34, CANVAS_WIDTH - 68, CANVAS_HEIGHT - 68);
  context.fillStyle = "#0f172a";
  context.font = '700 24px "Noto Sans JP", "Yu Gothic", sans-serif';
  context.fillText("安全AIポータル / 端末内で生成", MARGIN_X, 68);
  if (stateLabel === "下書き・未確認") {
    context.save();
    context.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    context.rotate(-Math.PI / 7);
    context.globalAlpha = 0.1;
    context.fillStyle = "#b91c1c";
    context.font = '900 104px "Noto Sans JP", "Yu Gothic", sans-serif';
    context.textAlign = "center";
    context.fillText("下書き・未確認", 0, 0);
    context.restore();
  }
  return { canvas, context, y: TOP_Y };
}

function lineStyle(kind: PdfLine["kind"]): {
  font: string;
  color: string;
  gap: number;
  lineHeight: number;
} {
  switch (kind) {
    case "title":
      return {
        font: '900 52px "Noto Sans JP", "Yu Gothic", sans-serif',
        color: "#064e3b",
        gap: 24,
        lineHeight: 68,
      };
    case "heading":
      return {
        font: '800 31px "Noto Sans JP", "Yu Gothic", sans-serif',
        color: "#115e59",
        gap: 20,
        lineHeight: 45,
      };
    case "hazard":
      return {
        font: '800 29px "Noto Sans JP", "Yu Gothic", sans-serif',
        color: "#7f1d1d",
        gap: 14,
        lineHeight: 43,
      };
    case "measure":
      return {
        font: '600 27px "Noto Sans JP", "Yu Gothic", sans-serif',
        color: "#0f172a",
        gap: 10,
        lineHeight: 40,
      };
    case "small":
      return {
        font: '500 23px "Noto Sans JP", "Yu Gothic", sans-serif',
        color: "#334155",
        gap: 8,
        lineHeight: 34,
      };
    default:
      return {
        font: '500 28px "Noto Sans JP", "Yu Gothic", sans-serif',
        color: "#0f172a",
        gap: 12,
        lineHeight: 42,
      };
  }
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const normalized = text.replace(/\r\n?/gu, "\n");
  const result: string[] = [];
  for (const paragraph of normalized.split("\n")) {
    if (!paragraph) {
      result.push("");
      continue;
    }
    let line = "";
    for (const character of [...paragraph]) {
      const next = line + character;
      if (line && context.measureText(next).width > maxWidth) {
        result.push(line);
        line = character;
      } else {
        line = next;
      }
    }
    if (line) result.push(line);
  }
  return result;
}

function finalizeCanvasPage(page: CanvasPage, pageNumber: number): void {
  page.context.fillStyle = "#475569";
  page.context.font = '500 22px "Noto Sans JP", "Yu Gothic", sans-serif';
  page.context.textAlign = "center";
  page.context.fillText(
    `${pageNumber} ページ`,
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT - 54,
  );
  page.context.textAlign = "left";
}

function renderDraftPages(draft: KyLocalDraft): HTMLCanvasElement[] {
  const stateLabel = kyPdfStateLabel(draft);
  const pages: CanvasPage[] = [createCanvasPage(stateLabel)];
  for (const line of kyDraftToPdfLines(draft)) {
    const style = lineStyle(line.kind);
    let page = pages[pages.length - 1];
    page.context.font = style.font;
    const indent = (line.indent ?? 0) * 34;
    const wrapped = wrapCanvasText(
      page.context,
      line.text,
      CANVAS_WIDTH - MARGIN_X * 2 - indent,
    );
    if (page.y + style.gap + style.lineHeight > BOTTOM_Y) {
      page = createCanvasPage(stateLabel);
      pages.push(page);
      page.context.font = style.font;
    }
    page.y += style.gap;
    page.context.fillStyle = style.color;
    for (const wrappedLine of wrapped) {
      if (page.y + style.lineHeight > BOTTOM_Y) {
        page = createCanvasPage(stateLabel);
        pages.push(page);
        page.context.font = style.font;
        page.context.fillStyle = style.color;
      }
      page.context.fillText(wrappedLine, MARGIN_X + indent, page.y);
      page.y += style.lineHeight;
    }
  }
  pages.forEach((page, index) => finalizeCanvasPage(page, index + 1));
  return pages.map((page) => page.canvas);
}

/**
 * JPEGページを外部ライブラリ・外部通信なしで最小PDFへ格納する。
 * 日本語はcanvasに描画済みなので、PDFフォント依存の文字化けを避けられる。
 */
export function buildPdfFromJpegPages(
  pages: Array<{ bytes: Uint8Array; width: number; height: number }>,
): Uint8Array {
  if (pages.length === 0) throw new Error("PDFページがありません。");
  const maxObject = 2 + pages.length * 3;
  const pageObjectNumbers = pages.map((_, index) => 3 + index * 3);
  const objects = new Map<number, Uint8Array>();
  objects.set(1, ascii("<< /Type /Catalog /Pages 2 0 R >>"));
  objects.set(
    2,
    ascii(
      `<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(" ")}] >>`,
    ),
  );
  pages.forEach((page, index) => {
    const pageObject = 3 + index * 3;
    const imageObject = pageObject + 1;
    const contentObject = pageObject + 2;
    objects.set(
      pageObject,
      ascii(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_PDF_WIDTH} ${A4_PDF_HEIGHT}] /Resources << /XObject << /Im${index + 1} ${imageObject} 0 R >> >> /Contents ${contentObject} 0 R >>`,
      ),
    );
    objects.set(
      imageObject,
      concatBytes([
        ascii(
          `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`,
        ),
        page.bytes,
        ascii("\nendstream"),
      ]),
    );
    const draw = `q\n${A4_PDF_WIDTH} 0 0 ${A4_PDF_HEIGHT} 0 0 cm\n/Im${index + 1} Do\nQ`;
    objects.set(
      contentObject,
      ascii(`<< /Length ${ascii(draw).length} >>\nstream\n${draw}\nendstream`),
    );
  });

  const chunks: Uint8Array[] = [
    concatBytes([
      ascii("%PDF-1.4\n%"),
      new Uint8Array([0xe2, 0xe3, 0xcf, 0xd3]),
      ascii("\n"),
    ]),
  ];
  const offsets = new Array<number>(maxObject + 1).fill(0);
  let cursor = chunks[0].length;
  for (let objectNumber = 1; objectNumber <= maxObject; objectNumber += 1) {
    const body = objects.get(objectNumber);
    if (!body) throw new Error(`PDF object ${objectNumber} is missing.`);
    offsets[objectNumber] = cursor;
    const object = concatBytes([
      ascii(`${objectNumber} 0 obj\n`),
      body,
      ascii("\nendobj\n"),
    ]);
    chunks.push(object);
    cursor += object.length;
  }
  const xrefOffset = cursor;
  const xrefLines = [
    "xref",
    `0 ${maxObject + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${maxObject + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
    "",
  ];
  chunks.push(ascii(xrefLines.join("\n")));
  return concatBytes(chunks);
}

export async function buildKyPdf(draft: KyLocalDraft): Promise<KyPdfBuildResult> {
  if (typeof document === "undefined" || typeof window === "undefined") {
    throw new Error("PDFはブラウザーで生成してください。");
  }
  if ("fonts" in document) {
    await document.fonts.ready.catch(() => undefined);
  }
  const canvases = renderDraftPages(draft);
  const jpegPages = canvases.map((canvas) => ({
    bytes: dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.92)),
    width: canvas.width,
    height: canvas.height,
  }));
  return {
    bytes: buildPdfFromJpegPages(jpegPages),
    filename: kyPdfFilename(draft),
    pageCount: jpegPages.length,
    stateLabel: kyPdfStateLabel(draft),
  };
}

export async function downloadKyPdf(
  draft: KyLocalDraft,
): Promise<KyPdfBuildResult> {
  const result = await buildKyPdf(draft);
  const blob = new Blob([result.bytes.buffer as ArrayBuffer], {
    type: "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.filename;
    anchor.rel = "noopener";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
  }
  return result;
}
