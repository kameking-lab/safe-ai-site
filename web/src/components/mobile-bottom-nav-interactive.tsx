"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type MobileBottomNavInteractiveProps = {
  primaryItemsSlot: ReactNode;
  moreItemsSlot: ReactNode;
  moreButtonIconSlot: ReactNode;
  closeIconSlot: ReactNode;
};

/**
 * 下部ナビでclient stateが必要な「もっと」シートだけを担当する。
 * 通常リンクとアイコンは親Server Componentからslotとして受け取る。
 */
export function MobileBottomNavInteractive({
  primaryItemsSlot,
  moreItemsSlot,
  moreButtonIconSlot,
  closeIconSlot,
}: MobileBottomNavInteractiveProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const closeMore = useCallback((restoreFocus = true) => {
    if (restoreFocus) moreButtonRef.current?.focus();
    setMoreOpen(false);
  }, []);

  useEffect(() => {
    if (!moreOpen) return;
    closeButtonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMore();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeMore, moreOpen]);

  return (
    <>
      <nav
        aria-label="モバイル ボトムナビゲーション"
        aria-hidden={moreOpen || undefined}
        data-mobile-nav="bottom"
        className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 w-full min-w-0 overflow-hidden border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-slate-700 dark:bg-slate-900/95 dark:supports-[backdrop-filter]:bg-slate-900/80"
      >
        <ul className="mx-auto flex w-full min-w-0 max-w-md items-stretch justify-between overflow-hidden px-1">
          {primaryItemsSlot}
          <li className="min-w-0 flex-1">
            <button
              ref={moreButtonRef}
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              aria-controls={moreOpen ? "mobile-bottom-nav-more" : undefined}
              className="tap-target flex w-full min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-medium leading-tight text-slate-600 dark:text-slate-300"
            >
              {moreButtonIconSlot}
              <span className="block w-full truncate text-center">もっと</span>
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen ? (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => closeMore()}
          />
          <div
            ref={dialogRef}
            id="mobile-bottom-nav-more"
            role="dialog"
            aria-modal="true"
            aria-label="その他の機能"
            onClick={(event) => {
              if ((event.target as Element).closest("a[href]")) {
                closeMore(false);
              }
            }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-slate-200 bg-white p-4 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mx-auto flex max-w-md flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  その他の機能
                </p>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => closeMore()}
                  aria-label="閉じる"
                  className="tap-target inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {closeIconSlot}
                </button>
              </div>
              <ul className="grid grid-cols-3 gap-2">{moreItemsSlot}</ul>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
