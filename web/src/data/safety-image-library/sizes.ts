export const SAFETY_SIGN_OUTPUT_SIZES = [
  { id: "a4-portrait", label: "A4縦", widthMm: 210, heightMm: 297, group: "A判" },
  { id: "a4-landscape", label: "A4横", widthMm: 297, heightMm: 210, group: "A判" },
  { id: "a3-portrait", label: "A3縦", widthMm: 297, heightMm: 420, group: "A判" },
  { id: "a3-landscape", label: "A3横", widthMm: 420, heightMm: 297, group: "A判" },
  { id: "flat-450x600", label: "平板縦型 450×600mm", widthMm: 450, heightMm: 600, group: "市場サイズ" },
  { id: "flat-450x300", label: "平板 450×300mm", widthMm: 450, heightMm: 300, group: "市場サイズ" },
  { id: "flat-600x450", label: "平板 600×450mm", widthMm: 600, heightMm: 450, group: "市場サイズ" },
  { id: "flat-550x450", label: "平板 550×450mm", widthMm: 550, heightMm: 450, group: "市場サイズ" },
  { id: "flat-900x600", label: "平板 900×600mm", widthMm: 900, heightMm: 600, group: "市場サイズ" },
  { id: "banner-450x1800", label: "垂れ幕 450×1800mm", widthMm: 450, heightMm: 1800, group: "市場サイズ" },
  { id: "stand-550x1400", label: "立看板 550×1400mm", widthMm: 550, heightMm: 1400, group: "市場サイズ" },
  { id: "square-450", label: "正方形 450×450mm", widthMm: 450, heightMm: 450, group: "市場サイズ" },
  { id: "report-landscape", label: "報告書用横長", widthMm: 297, heightMm: 167, group: "資料用" },
] as const;

export type SafetySignOutputSize = (typeof SAFETY_SIGN_OUTPUT_SIZES)[number]["id"];

export const SAFETY_SIGN_OUTPUT_SIZE_BY_ID = new Map(
  SAFETY_SIGN_OUTPUT_SIZES.map((size) => [size.id, size]),
);

export function getSafetySignOutputSize(id: string) {
  return SAFETY_SIGN_OUTPUT_SIZE_BY_ID.get(id as SafetySignOutputSize);
}

export function outputSizePixels(sizeId: SafetySignOutputSize, dpi = 300) {
  const size = SAFETY_SIGN_OUTPUT_SIZE_BY_ID.get(sizeId);
  if (!size) throw new Error(`Unknown safety sign output size: ${sizeId}`);
  return {
    width: Math.round((size.widthMm / 25.4) * dpi),
    height: Math.round((size.heightMm / 25.4) * dpi),
  };
}

export function outputSizePoints(sizeId: SafetySignOutputSize) {
  const size = SAFETY_SIGN_OUTPUT_SIZE_BY_ID.get(sizeId);
  if (!size) throw new Error(`Unknown safety sign output size: ${sizeId}`);
  return {
    width: (size.widthMm / 25.4) * 72,
    height: (size.heightMm / 25.4) * 72,
  };
}

export function defaultOutputSize(
  recommendedSize: string,
  orientation: "portrait" | "landscape" | "square",
): SafetySignOutputSize {
  if (/450\s*[×x]\s*1800/u.test(recommendedSize)) return "banner-450x1800";
  if (/450\s*[×x]\s*600/u.test(recommendedSize)) return "flat-450x600";
  if (/1400\s*[×x]\s*550|550\s*[×x]\s*1400/u.test(recommendedSize)) return "stand-550x1400";
  if (/900\s*[×x]\s*600/u.test(recommendedSize)) return "flat-900x600";
  if (/600\s*[×x]\s*450/u.test(recommendedSize)) return "flat-600x450";
  if (/550\s*[×x]\s*450/u.test(recommendedSize)) return "flat-550x450";
  if (/450\s*[×x]\s*450/u.test(recommendedSize) || orientation === "square") return "square-450";
  if (/450\s*[×x]\s*300/u.test(recommendedSize)) return "flat-450x300";
  return orientation === "portrait" ? "a4-portrait" : "a4-landscape";
}
