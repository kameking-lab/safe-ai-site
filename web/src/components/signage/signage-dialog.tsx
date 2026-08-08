"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type SignageDialogProps = {
  labelledBy: string;
  onClose: () => void;
  children: React.ReactNode;
  panelClassName?: string;
  returnFocusSelector?: string;
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * サイネージ共通ダイアログ。
 * 初期フォーカス、Tab循環、Escape、背景inert、終了後のフォーカス復帰を
 * 一か所で保証する。body直下へportalし、背景だけを確実にinertにする。
 */
export function SignageDialog({
  labelledBy,
  onClose,
  children,
  panelClassName = "max-w-2xl",
  returnFocusSelector,
}: SignageDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const overlay = overlayRef.current;
    const background = [...document.body.children]
      .filter((element) => element !== overlay)
      .map((element) => ({
        element: element as HTMLElement,
        inert: (element as HTMLElement).inert,
        ariaHidden: element.getAttribute("aria-hidden"),
      }));

    closeRef.current?.focus();
    for (const item of background) {
      item.element.inert = true;
      item.element.setAttribute("aria-hidden", "true");
    }

    return () => {
      for (const item of background) {
        item.element.inert = item.inert;
        if (item.ariaHidden === null) {
          item.element.removeAttribute("aria-hidden");
        } else {
          item.element.setAttribute("aria-hidden", item.ariaHidden);
        }
      }
      const fallback = returnFocusSelector
        ? document.querySelector<HTMLElement>(returnFocusSelector)
        : null;
      const target =
        previousFocus?.isConnected && !previousFocus.inert
          ? previousFocus
          : fallback;
      target?.focus();
    };
  }, [returnFocusSelector]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = [
      ...(panelRef.current?.querySelectorAll<HTMLElement>(
        FOCUSABLE_SELECTOR,
      ) ?? []),
    ].filter(
      (element) =>
        element.getAttribute("aria-hidden") !== "true" &&
        !element.hidden &&
        getComputedStyle(element).display !== "none" &&
        getComputedStyle(element).visibility !== "hidden",
    );
    if (focusable.length === 0) {
      event.preventDefault();
      closeRef.current?.focus();
      return;
    }
    const first = focusable[0]!;
    const last = focusable.at(-1)!;
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !panelRef.current?.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={`relative w-full rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl sm:p-10 ${panelClassName}`}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex min-h-[44px] items-center rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
          aria-label="閉じる"
        >
          <X
            className="mr-1 inline h-3.5 w-3.5 align-[-2px]"
            aria-hidden="true"
          />
          閉じる
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
