"use client";

import { useState, useEffect, useRef, useCallback } from "react";
// pdfjs-distはクライアントサイドのみ動的インポート（SSRではDOMMatrixが未定義のため）

type DocumentItem = {
  id: string;
  title: string;
  memo: string;
  dataUrl: string;
  type: "image" | "pdf";
};

const STORAGE_KEY = "signage-today-documents";
const MAX_ITEMS = 10;

/** localStorage からアイテムを読み込む（SSR時は空配列を返す） */
function loadStoredItems(): DocumentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as unknown;
      if (Array.isArray(parsed)) return parsed as DocumentItem[];
    }
  } catch {
    /* 読み込み失敗は無視 */
  }
  return [];
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** PDFの全ページをcanvasでレンダリングしてBase64 dataURLの配列を返す */
async function renderPdfPages(file: File): Promise<string[]> {
  // 動的インポートでSSRを回避
  const pdfjsLib = await import("pdfjs-dist");
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, viewport }).promise;
    images.push(canvas.toDataURL("image/jpeg", 0.85));
  }
  return images;
}

export function SignageTodayDocuments() {
  const [items, setItems] = useState<DocumentItem[]>(loadStoredItems);
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  // ドラッグ&ドロップ
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragSrcRef = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 初回マウント後のみ保存（SSRハイドレーションで上書きしない）
  const savedOnceRef = useRef(false);

  // items が変化したら localStorage に保存
  useEffect(() => {
    if (!savedOnceRef.current) {
      savedOnceRef.current = true;
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* 容量超過等は無視 */
    }
  }, [items]);

  // フルスクリーン状態の同期
  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  // 警告メッセージを3秒後に自動クリア
  useEffect(() => {
    if (!warningMsg) return;
    const t = setTimeout(() => setWarningMsg(null), 3000);
    return () => clearTimeout(t);
  }, [warningMsg]);

  const goNext = useCallback(() => {
    setCurrent((c) => (c + 1) % items.length);
  }, [items.length]);

  const goPrev = useCallback(() => {
    setCurrent((c) => (c - 1 + items.length) % items.length);
  }, [items.length]);

  const processFiles = useCallback(
    async (files: FileList) => {
      const remaining = MAX_ITEMS - items.length;
      if (remaining <= 0) {
        setWarningMsg(`上限（${MAX_ITEMS}枚）に達しています`);
        return;
      }
      const newItems: DocumentItem[] = [];
      let truncated = false;

      for (const file of Array.from(files)) {
        if (newItems.length >= remaining) {
          truncated = true;
          break;
        }
        try {
          if (file.type === "application/pdf") {
            const pages = await renderPdfPages(file);
            const baseName = file.name.replace(/\.[^/.]+$/, "");
            for (let i = 0; i < pages.length; i++) {
              if (newItems.length >= remaining) {
                truncated = true;
                break;
              }
              newItems.push({
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                title: pages.length === 1 ? baseName : `${baseName}（${i + 1}/${pages.length}ページ）`,
                memo: "",
                dataUrl: pages[i],
                type: "pdf",
              });
            }
          } else {
            const dataUrl = await readFileAsDataUrl(file);
            newItems.push({
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              title: file.name.replace(/\.[^/.]+$/, ""),
              memo: "",
              dataUrl,
              type: "image",
            });
          }
        } catch {
          /* 変換失敗はスキップ */
        }
      }

      if (truncated) {
        setWarningMsg(`上限（${MAX_ITEMS}枚）のため、一部の資料が追加されませんでした`);
      }

      const wasEmpty = items.length === 0;
      setItems((prev) => [...prev, ...newItems].slice(0, MAX_ITEMS));
      if (wasEmpty && newItems.length > 0) setCurrent(0);
    },
    [items.length],
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        await processFiles(e.target.files);
        e.target.value = "";
      }
    },
    [processFiles],
  );

  const handleClearAll = () => {
    setItems([]);
    setCurrent(0);
  };

  const handleRemove = useCallback((id: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((item) => item.id === id);
      const next = prev.filter((item) => item.id !== id);
      setCurrent((c) => {
        if (next.length === 0) return 0;
        if (idx < c) return c - 1;
        return Math.min(c, next.length - 1);
      });
      return next;
    });
  }, []);

  const handleUpdateItem = (id: string, field: "title" | "memo", value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* フルスクリーン非対応環境では無視 */
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || items.length <= 1) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  };

  // ── Drag & Drop ──────────────────────────────────────────
  const handleDragStart = (idx: number) => {
    dragSrcRef.current = idx;
    setDraggingIdx(idx);
  };

  const handleDragOver = (idx: number) => {
    setDragOverIdx(idx);
  };

  const handleDrop = (dropIdx: number) => {
    const srcIdx = dragSrcRef.current;
    if (srcIdx === null || srcIdx === dropIdx) {
      setDraggingIdx(null);
      setDragOverIdx(null);
      dragSrcRef.current = null;
      return;
    }
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(srcIdx, 1);
      next.splice(dropIdx, 0, moved);
      setCurrent((c) => {
        if (c === srcIdx) return dropIdx;
        if (srcIdx < c && dropIdx >= c) return c - 1;
        if (srcIdx > c && dropIdx <= c) return c + 1;
        return c;
      });
      return next;
    });
    setDraggingIdx(null);
    setDragOverIdx(null);
    dragSrcRef.current = null;
  };

  const handleDragEnd = () => {
    setDraggingIdx(null);
    setDragOverIdx(null);
    dragSrcRef.current = null;
  };
  // ─────────────────────────────────────────────────────────

  const atLimit = items.length >= MAX_ITEMS;
  const currentItem = items[current] ?? null;

  return (
    // suppressHydrationWarning: サーバー(空)とクライアント(localStorage)で初期値が異なるため
    <section
      className="shrink-0 rounded-xl border border-slate-600 bg-slate-950/80 p-3 sm:rounded-2xl sm:p-4"
      suppressHydrationWarning
    >
      {/* ヘッダー */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold tracking-wide text-slate-100 sm:text-base lg:text-xl">
          今日の作業資料
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {atLimit ? (
            <span className="text-xs font-semibold text-amber-400">
              上限（{MAX_ITEMS}枚）に達しています
            </span>
          ) : (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 sm:text-sm"
              >
                ＋ 資料を追加
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </>
          )}
          {items.length > 0 && (
            <button
              onClick={handleClearAll}
              className="rounded-lg border border-rose-600/60 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-950/50 sm:text-sm"
            >
              一括クリア
            </button>
          )}
        </div>
      </div>

      {/* 警告メッセージ */}
      {warningMsg && (
        <p className="mt-2 rounded-lg bg-amber-950/60 px-3 py-2 text-xs text-amber-300">
          {warningMsg}
        </p>
      )}

      {/* 資料なし：案内表示 */}
      {items.length === 0 ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-600 py-10 hover:border-slate-400"
        >
          <p className="text-base font-semibold text-slate-300 sm:text-xl">
            今日の作業資料を登録してください
          </p>
          <p className="text-xs text-slate-400 sm:text-sm">
            図面・写真・PDF などをアップロードできます（最大{MAX_ITEMS}枚）
          </p>
          <span className="mt-2 rounded-xl bg-emerald-700 px-8 py-3 text-sm font-bold text-white hover:bg-emerald-600 sm:text-base">
            ＋ 資料を選択
          </span>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {/* カルーセル本体 */}
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-xl bg-black"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {currentItem && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentItem.dataUrl}
                alt={currentItem.title || `資料 ${current + 1}`}
                className="mx-auto max-h-[50vh] w-full object-contain"
              />
            )}

            {/* カルーセル上の個別削除ボタン */}
            {currentItem && (
              <button
                onClick={() => handleRemove(currentItem.id)}
                aria-label="この資料を削除"
                className="absolute left-2 top-2 z-10 rounded-lg bg-rose-900/80 px-2 py-1 text-xs font-bold text-rose-200 hover:bg-rose-800 active:bg-rose-700"
              >
                ✕ 削除
              </button>
            )}

            {/* 前へ / 次へ ボタン */}
            {items.length > 1 && (
              <>
                <button
                  onClick={goPrev}
                  aria-label="前の資料"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 text-white hover:bg-black/80 active:bg-black/90 sm:p-4"
                >
                  <svg
                    aria-hidden="true"
                    className="h-7 w-7 sm:h-9 sm:w-9"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={goNext}
                  aria-label="次の資料"
                  className="absolute right-12 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-3 text-white hover:bg-black/80 active:bg-black/90 sm:p-4"
                >
                  <svg
                    aria-hidden="true"
                    className="h-7 w-7 sm:h-9 sm:w-9"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* インジケーター */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-base font-bold text-white sm:text-lg">
              {current + 1} / {items.length}
            </div>

            {/* 全画面ボタン */}
            <button
              onClick={handleFullscreen}
              aria-label={isFullscreen ? "全画面を終了" : "全画面表示"}
              className="absolute right-2 top-2 rounded-lg bg-black/60 p-2.5 text-white hover:bg-black/80"
            >
              {isFullscreen ? (
                <svg
                  aria-hidden="true"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 9L4 4m0 0v4m0-4h4M15 9l5-5m0 0v4m0-4h-4M9 15l-5 5m0 0v-4m0 4h4M15 15l5 5m0 0v-4m0 4h-4"
                  />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* タイトル・メモ編集 */}
          {currentItem && (
            <div className="flex flex-col gap-2 rounded-lg bg-slate-800/60 p-3 sm:p-4">
              <input
                type="text"
                value={currentItem.title}
                onChange={(e) => handleUpdateItem(currentItem.id, "title", e.target.value)}
                placeholder="タイトル（例：3階躯体図面）"
                className="w-full rounded-lg bg-slate-700 px-3 py-2 text-base font-bold text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-xl"
              />
              <textarea
                value={currentItem.memo}
                onChange={(e) => handleUpdateItem(currentItem.id, "memo", e.target.value)}
                placeholder="メモ（例：本日の作業手順）"
                rows={2}
                className="w-full resize-none rounded-lg bg-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-base"
              />
              <p className="text-xs text-slate-400">
                {items.length}/{MAX_ITEMS}枚 ・ サムネイルをドラッグして並び替え
              </p>
            </div>
          )}

          {/* サムネイル一覧（D&D + 個別削除） */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {items.map((item, idx) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => {
                  e.preventDefault();
                  handleDragOver(idx);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(idx);
                }}
                onDragEnd={handleDragEnd}
                className={`relative shrink-0 cursor-grab transition-all active:cursor-grabbing ${
                  draggingIdx === idx ? "opacity-40" : ""
                } ${dragOverIdx === idx && draggingIdx !== idx ? "scale-105 ring-2 ring-emerald-400" : ""}`}
              >
                {/* サムネイル（クリックで選択） */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setCurrent(idx)}
                  onKeyDown={(e) => e.key === "Enter" && setCurrent(idx)}
                  aria-label={`資料 ${idx + 1}: ${item.title || "無題"}`}
                  className={`overflow-hidden rounded-lg border-2 transition ${
                    idx === current
                      ? "border-emerald-400 opacity-100"
                      : "border-slate-600 opacity-60 hover:border-slate-400 hover:opacity-80"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.dataUrl}
                    alt={item.title || `資料 ${idx + 1}`}
                    className="h-14 w-20 object-cover sm:h-16 sm:w-24"
                    draggable={false}
                  />
                  {/* PDFアイコン */}
                  {item.type === "pdf" && (
                    <div className="absolute bottom-0 left-0 rounded-tr bg-rose-900/90 px-1 py-0.5">
                      <span className="text-[9px] font-bold leading-none text-rose-200">PDF</span>
                    </div>
                  )}
                </div>
                {/* 個別削除ボタン（右上の×） */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(item.id);
                  }}
                  aria-label={`資料 ${idx + 1} を削除`}
                  className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-rose-700 text-[11px] font-bold text-white shadow hover:bg-rose-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 注意書き */}
      <p className="mt-3 text-[9px] text-slate-500 sm:text-[10px]">
        データはこの端末のブラウザにのみ保存されます。他の端末やユーザーには共有されません。
      </p>
    </section>
  );
}
