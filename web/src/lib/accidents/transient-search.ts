export const ACCIDENT_TRANSIENT_SEARCH_EVENT =
  "anzen-ai:accident-transient-search";

let currentKeyword = "";

export function getTransientAccidentKeyword(): string {
  return currentKeyword;
}

export function clearTransientAccidentKeyword(): void {
  currentKeyword = "";
}

export function setTransientAccidentKeyword(keyword: string): void {
  currentKeyword = keyword.trim();
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(ACCIDENT_TRANSIENT_SEARCH_EVENT, {
      detail: { keyword: currentKeyword },
    }),
  );
}

export function readTransientAccidentKeyword(
  event: Event,
): string | null {
  if (!(event instanceof CustomEvent)) return null;
  const detail = event.detail as { keyword?: unknown } | null;
  return typeof detail?.keyword === "string" ? detail.keyword : null;
}
