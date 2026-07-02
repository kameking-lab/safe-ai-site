/**
 * F1（KY用紙 直接操作UI・方式確立）: ズーム/パンの純関数コア。
 *
 * PaperStage の transform は「translate(x, y) → scale(s)」の順で適用する前提
 * （CSS: `transform: translate(Xpx, Ypx) scale(S)`、transform-origin は 0 0）。
 * コンテンツ座標 c はビューポート座標 v = c * s + (x, y) に写る。
 * このモジュールは React 非依存の計算のみ（vitest で完全にテスト可能にするため）。
 */

export type ZoomPanTransform = {
  /** ビューポート左上を原点とした平行移動（px） */
  x: number;
  y: number;
  /** 拡大率（1 = 実寸） */
  scale: number;
};

export type Size = { width: number; height: number };

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * コンテンツ全体がビューポートに収まる transform（初期表示＝全体フィット）。
 * 拡大方向にはフィットしない（小さい用紙を無理に引き伸ばさない）ため maxScale で頭打ち。
 */
export function fitTransform(
  viewport: Size,
  content: Size,
  options?: { padding?: number; maxScale?: number }
): ZoomPanTransform {
  const padding = options?.padding ?? 12;
  const maxScale = options?.maxScale ?? 1;
  const availW = Math.max(1, viewport.width - padding * 2);
  const availH = Math.max(1, viewport.height - padding * 2);
  const scale = Math.min(maxScale, availW / Math.max(1, content.width), availH / Math.max(1, content.height));
  // 中央寄せ
  const x = (viewport.width - content.width * scale) / 2;
  const y = (viewport.height - content.height * scale) / 2;
  return { x, y, scale };
}

/**
 * アンカー点（ビューポート座標）を動かさずに倍率だけ変える。
 * ホイール＝カーソル位置、ピンチ＝2本指の中点、ボタン＝ビューポート中央 を渡す。
 */
export function zoomAtPoint(
  current: ZoomPanTransform,
  nextScaleRaw: number,
  anchor: { x: number; y: number },
  bounds: { minScale: number; maxScale: number }
): ZoomPanTransform {
  const nextScale = clamp(nextScaleRaw, bounds.minScale, bounds.maxScale);
  if (nextScale === current.scale) return current;
  const ratio = nextScale / current.scale;
  return {
    scale: nextScale,
    // アンカー直下のコンテンツ点を固定: v = c*s + t が不変になる t' を解く
    x: anchor.x - (anchor.x - current.x) * ratio,
    y: anchor.y - (anchor.y - current.y) * ratio,
  };
}

/**
 * パンの可動域クランプ（画面外へ投げ捨てて迷子になる事故を防ぐ）。
 * 収まっている軸は中央寄せ、はみ出している軸は端合わせの範囲内で自由。
 */
export function clampPan(t: ZoomPanTransform, viewport: Size, content: Size): ZoomPanTransform {
  const w = content.width * t.scale;
  const h = content.height * t.scale;
  let { x, y } = t;
  if (w <= viewport.width) {
    // 横がビューポートに収まる間は中央固定（左右に迷子にならない）
    x = (viewport.width - w) / 2;
  } else {
    // はみ出している間は「左端≦0 かつ 右端≧ビューポート幅」の範囲で自由にパン
    x = clamp(t.x, viewport.width - w, 0);
  }
  if (h <= viewport.height) {
    y = (viewport.height - h) / 2;
  } else {
    y = clamp(t.y, viewport.height - h, 0);
  }
  return { ...t, x, y };
}

/** 2ポインタ間の距離（ピンチ倍率の分母/分子） */
export function pointerDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** 2ポインタの中点（ピンチのアンカー） */
export function pointerMidpoint(a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * コンテンツ上の矩形（コンテンツ座標）を、指定倍率でビューポート中央に据える transform。
 * ダブルタップ/「のこりN」→セルへズームで使用。
 */
export function zoomToRect(
  rect: { x: number; y: number; width: number; height: number },
  viewport: Size,
  targetScale: number,
  bounds: { minScale: number; maxScale: number }
): ZoomPanTransform {
  const scale = clamp(targetScale, bounds.minScale, bounds.maxScale);
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  return {
    scale,
    x: viewport.width / 2 - cx * scale,
    y: viewport.height / 2 - cy * scale,
  };
}
