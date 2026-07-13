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

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Maximize2 } from "lucide-react";
import { useZoomPan } from "@/lib/ui/use-zoom-pan";

/** O10（第四弾・zoom-to-cell）: 親から用紙キャンバスの特定セルへズーム誘導するための操作口。 */
export type PaperStageHandle = {
  /** data-field-key が一致するセルへズーム＋パン。要素が見つからなければ何もしない。 */
  focusField: (fieldKey: string) => void;
};

export const PaperStage = forwardRef<
  PaperStageHandle,
  {
    children: ReactNode;
    /** JS計算前・計算失敗時のフォールバック高さ（親の上下バー等が変わっても実測値が優先される） */
    heightClassName?: string;
    label?: string;
  }
>(function PaperStage({ children, heightClassName = "h-[calc(100dvh-160px)]", label = "用紙キャンバス" }, ref) {
  const { setViewportEl, setContentEl, transform, ready, zoomIn, zoomOut, fit, setScale, focusRect, handlers } = useZoomPan({
    minScale: 0.15,
    maxScale: 2.5,
    fitPadding: 12,
  });
  const pct = Math.round(transform.scale * 100);
  const contentElRef = useRef<HTMLDivElement | null>(null);
  const setContentElBoth = (el: HTMLDivElement | null) => {
    contentElRef.current = el;
    setContentEl(el);
  };

  // 「初期表示で用紙全体が1画面に収まる」を保証するため、ステージの高さは
  // CSSの100dvh固定オフセットではなく実測で決める＝上に積まれるバー
  // （サイト共通ヘッダー/サブナビ＋当画面のコンパクトバー＋通知バー等、他班所有分も含む）
  // が何pxでもズレなく追従する。親の padding-bottom（モバイルボトムナビ等の余白）も実測して二重確保しない。
  // 実測は実ビューポートのリサイズ（回転・ウィンドウ変更）にのみ追従する＝ズーム操作中の
  // サブピクセルなbody変動まで拾うとuseZoomPanのinteracted後は再フィットされず
  // ステージ枠だけ動いてズレるため、ResizeObserverではなくmount+window resizeに限定。
  // FAB_CLEARANCE_PX: 全画面共通の共有FAB（他班所有・fixed bottom-right）は
  // ブレークポイントに関わらず常に出るため、親の padding-bottom だけでは
  // ステージ右下のズーム操作クラスタ（bottom-3・44px）と重なりうる。
  // 座標を握らずに済むよう十分な余白を追加で確保する（重なり回避の緩衝）。
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [stageHeightPx, setStageHeightPx] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const FAB_CLEARANCE_PX = 72;
    const recompute = () => {
      const top = el.getBoundingClientRect().top;
      const parent = el.parentElement;
      const paddingBottom = parent ? parseFloat(getComputedStyle(parent).paddingBottom || "0") : 0;
      const available = window.innerHeight - top - Math.max(paddingBottom, FAB_CLEARANCE_PX);
      setStageHeightPx(Math.max(320, available));
    };
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      focusField: (fieldKey) => {
        const content = contentElRef.current;
        if (!content) return;
        const el = content.querySelector<HTMLElement>(`[data-field-key="${fieldKey}"]`);
        if (!el) return;
        // getBoundingClientRect は現在の transform 適用後（見た目）の座標なので、
        // 現在の scale で割り戻してコンテンツ座標（focusRect が期待する単位）に変換する。
        const contentBox = content.getBoundingClientRect();
        const elBox = el.getBoundingClientRect();
        const scale = transform.scale || 1;
        focusRect({
          x: (elBox.left - contentBox.left) / scale,
          y: (elBox.top - contentBox.top) / scale,
          width: elBox.width / scale,
          height: elBox.height / scale,
        });
      },
    }),
    [focusRect, transform.scale]
  );

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full overflow-hidden bg-slate-200 ${stageHeightPx === null ? heightClassName : ""}`}
      style={stageHeightPx !== null ? { height: `${stageHeightPx}px` } : undefined}
    >
      <div
        ref={setViewportEl}
        role="application"
        aria-label={label}
        data-testid="paper-stage-viewport"
        className="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
        {...handlers}
      >
        <div
          ref={setContentElBoth}
          data-testid="paper-stage-content"
          className="absolute left-0 top-0 shadow-xl"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: "0 0",
            visibility: ready ? "visible" : "hidden",
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
          onClick={zoomOut}
          className="min-h-[44px] min-w-[44px] rounded-full text-lg font-bold text-slate-700 hover:bg-slate-100"
        >
          －
        </button>
        <button
          type="button"
          aria-label="等倍にする"
          data-testid="paper-stage-scale"
          onClick={() => setScale(1)}
          className="min-h-[44px] min-w-[3.5rem] rounded-full px-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          {pct}%
        </button>
        <button
          type="button"
          aria-label="拡大"
          onClick={zoomIn}
          className="min-h-[44px] min-w-[44px] rounded-full text-lg font-bold text-slate-700 hover:bg-slate-100"
        >
          ＋
        </button>
        <button
          type="button"
          aria-label="全体を表示"
          onClick={fit}
          className="min-h-[44px] rounded-full px-3 text-xs font-bold text-sky-700 hover:bg-sky-50"
        >
          <Maximize2 className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />全体
        </button>
      </div>
    </div>
  );
});
