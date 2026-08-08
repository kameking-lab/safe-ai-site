"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";

const EDITABLE_SELECTOR = [
  "[data-primary-focus]",
  "input:not([type='hidden']):not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "[contenteditable='true']",
].join(",");

const FALLBACK_FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function isVisible(element: HTMLElement): boolean {
  if (element.hidden || element.closest("[hidden],[aria-hidden='true']")) {
    return false;
  }
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden";
}

function focusPrimaryControl(hash: string, attempts = 0): void {
  let id: string;
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    return;
  }
  const target = document.getElementById(id);
  if (!target) {
    if (attempts < 12) {
      window.setTimeout(() => focusPrimaryControl(hash, attempts + 1), 50);
    }
    return;
  }

  const preferred = target.matches("[data-primary-focus]")
    ? target
    : target.querySelector<HTMLElement>("[data-primary-focus]");
  const targetAsControl = target.matches(EDITABLE_SELECTOR)
    ? target
    : null;
  const editable =
    preferred ??
    targetAsControl ??
    [...target.querySelectorAll<HTMLElement>(EDITABLE_SELECTOR)].find(isVisible);
  const fallback = [...target.querySelectorAll<HTMLElement>(
    FALLBACK_FOCUSABLE_SELECTOR,
  )].find(isVisible);
  const control = (editable ?? fallback) as HTMLElement | undefined;

  if (!control) {
    if (attempts < 12) {
      window.setTimeout(() => focusPrimaryControl(hash, attempts + 1), 50);
    }
    target.scrollIntoView({ block: "start", behavior: "auto" });
    return;
  }

  control.focus({ preventScroll: true });
  control.scrollIntoView({ block: "center", behavior: "auto" });
}

export function FocusTargetAnchor({
  href,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: `#${string}` }) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    if (window.location.hash !== href) {
      window.history.pushState(window.history.state, "", href);
    }
    focusPrimaryControl(href);
  };

  return <a {...props} href={href} onClick={handleClick} />;
}
