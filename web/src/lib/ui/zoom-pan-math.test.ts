import { describe, expect, it } from "vitest";
import {
  clamp,
  clampPan,
  fitTransform,
  pointerDistance,
  pointerMidpoint,
  zoomAtPoint,
  zoomToRect,
} from "./zoom-pan-math";

const VIEWPORT = { width: 1000, height: 600 };
const PAPER = { width: 703, height: 1000 }; // A4縦186mm相当の用紙

describe("fitTransform（初期表示＝全体フィット）", () => {
  it("縦長の用紙が高さ基準で丸ごと収まり、中央寄せされる", () => {
    const t = fitTransform(VIEWPORT, PAPER, { padding: 12 });
    // 高さが律速: (600-24)/1000 = 0.576
    expect(t.scale).toBeCloseTo(0.576, 3);
    // 用紙の右端がビューポート内
    expect(t.x + PAPER.width * t.scale).toBeLessThanOrEqual(VIEWPORT.width);
    expect(t.y + PAPER.height * t.scale).toBeLessThanOrEqual(VIEWPORT.height);
    // 中央寄せ
    expect(t.x).toBeCloseTo((VIEWPORT.width - PAPER.width * t.scale) / 2, 3);
  });

  it("スマホ縦(390x700相当)でも用紙全体が収まる", () => {
    const vp = { width: 390, height: 700 };
    const t = fitTransform(vp, PAPER, { padding: 8 });
    expect(PAPER.width * t.scale).toBeLessThanOrEqual(vp.width);
    expect(PAPER.height * t.scale).toBeLessThanOrEqual(vp.height);
  });

  it("用紙がビューポートより小さくても等倍(maxScale)を超えて引き伸ばさない", () => {
    const t = fitTransform({ width: 3000, height: 3000 }, PAPER);
    expect(t.scale).toBe(1);
  });
});

describe("zoomAtPoint（アンカー固定ズーム）", () => {
  it("アンカー直下のコンテンツ点がズーム後も同じビューポート座標に留まる", () => {
    const t0 = { x: 40, y: 20, scale: 0.6 };
    const anchor = { x: 500, y: 300 };
    // アンカー直下のコンテンツ座標
    const cx = (anchor.x - t0.x) / t0.scale;
    const cy = (anchor.y - t0.y) / t0.scale;
    const t1 = zoomAtPoint(t0, 1.2, anchor, { minScale: 0.2, maxScale: 3 });
    expect(cx * t1.scale + t1.x).toBeCloseTo(anchor.x, 6);
    expect(cy * t1.scale + t1.y).toBeCloseTo(anchor.y, 6);
    expect(t1.scale).toBe(1.2);
  });

  it("min/maxでクランプされる", () => {
    const t0 = { x: 0, y: 0, scale: 1 };
    expect(zoomAtPoint(t0, 99, { x: 0, y: 0 }, { minScale: 0.3, maxScale: 2.5 }).scale).toBe(2.5);
    expect(zoomAtPoint(t0, 0.01, { x: 0, y: 0 }, { minScale: 0.3, maxScale: 2.5 }).scale).toBe(0.3);
  });

  it("倍率が変わらないときは同一transformを返す（無駄な再描画を出さない）", () => {
    const t0 = { x: 5, y: 6, scale: 2.5 };
    expect(zoomAtPoint(t0, 3, { x: 100, y: 100 }, { minScale: 0.3, maxScale: 2.5 })).toBe(t0);
  });
});

describe("clampPan（迷子防止）", () => {
  it("収まっている軸は中央寄せへ戻す", () => {
    const t = clampPan({ x: -500, y: 10, scale: 0.5 }, VIEWPORT, PAPER);
    // 0.5倍: w=351.5 → 中央 (1000-351.5)/2
    expect(t.x).toBeCloseTo((1000 - 703 * 0.5) / 2, 3);
  });

  it("はみ出している軸は端合わせの範囲でクランプ", () => {
    // 2倍: h=2000 > 600。y は [600-2000, 0] = [-1400, 0]
    expect(clampPan({ x: 0, y: 100, scale: 2 }, VIEWPORT, PAPER).y).toBe(0);
    expect(clampPan({ x: 0, y: -9999, scale: 2 }, VIEWPORT, PAPER).y).toBe(-1400);
    expect(clampPan({ x: 0, y: -700, scale: 2 }, VIEWPORT, PAPER).y).toBe(-700);
  });
});

describe("pinchユーティリティ", () => {
  it("距離と中点", () => {
    expect(pointerDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(pointerMidpoint({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 });
  });
});

describe("zoomToRect（セルへズーム）", () => {
  it("矩形の中心がビューポート中央に来る", () => {
    const rect = { x: 100, y: 200, width: 200, height: 50 };
    const t = zoomToRect(rect, VIEWPORT, 1.2, { minScale: 0.2, maxScale: 3 });
    const cx = (rect.x + rect.width / 2) * t.scale + t.x;
    const cy = (rect.y + rect.height / 2) * t.scale + t.y;
    expect(cx).toBeCloseTo(VIEWPORT.width / 2, 6);
    expect(cy).toBeCloseTo(VIEWPORT.height / 2, 6);
  });
});

describe("clamp", () => {
  it("範囲内はそのまま・範囲外は端", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});
