"use client";

/**
 * F1（KY用紙 直接操作UI・方式確立）: 用紙キャンバスのステージ。
 *
 * - ビューポート（overflow:hidden・touch-action:none）の中に用紙を
 *   `translate(x,y) scale(s)` で描画。ページ自体は伸びない＝
 *   「縮小しても全体が見えない」既存の transform:scale 余白問題を根治する。
 * - 初期表示は全体フィット。ピンチ/ホイール/ボタンの3系統ズーム＋ドラッグでパン。
 * - 印刷には一切関与しない（印刷は従来どおり hidden print:block の KyPrintSheet）。
 */

import type { ReactNode } from "react";
import { useZoomPan } from "@/lib/ui/use-zoom-pan";

export function PaperStage({
  children,
  heightClassName = "h-[calc(100dvh-160px)]",
  label = "用紙キャンバス",
}: {
  children: ReactNode;
  /** ステージの高さ（上下バー分を差し引いた 100dvh 計算をページ側で調整） */
  heightClassName?: string;
  label?: string;
}) {
  const zp = useZoomPan({ minScale: 0.15, maxScale: 2.5, fitPadding: 12 });
  const pct = Math.round(zp.transform.scale * 100);

  return (
    <div className={`relative w-full overflow-hidden bg-slate-200 ${heightClassName}`}>
      <div
        ref={zp.viewportRef}
        role="application"
        aria-label={label}
        data-testid="paper-stage-viewport"
        className="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
        {...zp.handlers}
      >
        <div
          ref={zp.contentRef}
          data-testid="paper-stage-content"
          className="absolute left-0 top-0 shadow-xl"
          style={{
            transform: `translate(${zp.transform.x}px, ${zp.transform.y}px) scale(${zp.transform.scale})`,
            transformOrigin: "0 0",
            visibility: zp.ready ? "visible" : "hidden",
            // KyPrintSheet は width:186mm（≒703px）。max-width:100% がビューポート幅に
            // 巻き込まれて縮まないよう、実寸で固定してから transform で見た目を変える。
            width: "max-content",
          }}
        >
          {children}
        </div>
      </div>

      {/* ズーム操作（右下・44pxタップ標的） */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full border border-slate-300 bg-white/95 p-1 shadow-lg backdrop-blur">
        <button
          type="button"
          aria-label="縮小"
          onClick={zp.zoomOut}
          className="min-h-[44px] min-w-[44px] rounded-full text-lg font-bold text-slate-700 hover:bg-slate-100"
        >
          －
        </button>
        <button
          type="button"
          aria-label="等倍にする"
          data-testid="paper-stage-scale"
          onClick={() => zp.setScale(1)}
          className="min-h-[44px] min-w-[3.5rem] rounded-full px-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          {pct}%
        </button>
        <button
          type="button"
          aria-label="拡大"
          onClick={zp.zoomIn}
          className="min-h-[44px] min-w-[44px] rounded-full text-lg font-bold text-slate-700 hover:bg-slate-100"
        >
          ＋
        </button>
        <button
          type="button"
          aria-label="全体を表示"
          onClick={zp.fit}
          className="min-h-[44px] rounded-full px-3 text-xs font-bold text-sky-700 hover:bg-sky-50"
        >
          ⛶ 全体
        </button>
      </div>
    </div>
  );
}
