"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type DocumentItem = {
  id: string;
  title: string;
  memo: string;
  dataUrl: string;
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

export function SignageTodayDocuments() {
  // lazy initializer でクライアント側のみ localStorage から初期値を読む
  const [items, setItems] = useState<DocumentItem[]>(loadStoredItems);
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputEmptyRef = useRef<HTMLInputElement>(null);
  // 初回マウント後のみ保存（SSRハイドレーションで上書きしない）
  const savedOnceRef = useRef(false);

  // items が変化したら localStorage に保存
  useEffect(() => {
    // 初回はlazy initializerで読み込んだ値そのままなので保存をスキップ
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
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const goNext = useCallback(() => {
    setCurrent((c) => (c + 1) % items.length);
  }, [items.length]);

  const goPrev = useCallback(() => {
    setCurrent((c) => (c - 1 + items.length) % items.length);
  }, [items.length]);

  const processFiles = useCallback(
    async (files: FileList) => {
      const remaining = MAX_ITEMS - items.length;
      if (remaining <= 0) return;
      const toProcess = Array.from(files).slice(0, remaining);
      const newItems: DocumentItem[] = [];
      for (const file of toProcess) {
        try {
          const dataUrl = await readFileAsDataUrl(file);
          newItems.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            title: file.name.replace(/\.[^/.]+$/, ""),
            memo: "",
            dataUrl,
          });
        } catch {
          /* 変換失敗はスキップ */
        }
      }
      setItems((prev) => [...prev, ...newItems].slice(0, MAX_ITEMS));
      setCurrent((c) => (items.length === 0 ? 0 : c));
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

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setCurrent((c) => Math.max(0, Math.min(c, items.length - 2)));
  };

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
        <div className="flex items-center gap-2">
          {items.length < MAX_ITEMS && items.length > 0 && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 sm:text-sm"
              >
                ＋ 画像を追加
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
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
              今日の資料をクリア
            </button>
          )}
        </div>
      </div>

      {/* 画像なし：案内表示 */}
      {items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-600 py-10">
          <p className="text-base font-semibold text-slate-300 sm:text-xl">
            今日の作業資料を登録してください
          </p>
          <p className="text-xs text-slate-400 sm:text-sm">
            図面・写真・資料などの画像ファイルをアップロードできます（最大{MAX_ITEMS}枚）
          </p>
          <button
            onClick={() => fileInputEmptyRef.current?.click()}
            className="mt-2 rounded-xl bg-emerald-700 px-8 py-3 text-sm font-bold text-white hover:bg-emerald-600 sm:text-base"
          >
            ＋ 画像を選択
          </button>
          <input
            ref={fileInputEmptyRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
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
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  {items.length}/{MAX_ITEMS}枚
                </p>
                <button
                  onClick={() => handleRemove(currentItem.id)}
                  className="rounded px-2 py-1 text-xs text-rose-400 hover:bg-rose-950/40 hover:text-rose-300"
                >
                  この資料を削除
                </button>
              </div>
            </div>
          )}

          {/* サムネイル一覧 */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {items.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setCurrent(idx)}
                aria-label={`資料 ${idx + 1}: ${item.title || "無題"}`}
                className={`shrink-0 overflow-hidden rounded-lg border-2 transition ${
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
                />
              </button>
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
