export const PRESERVE_NAVIGATION_SCROLL = "anzen-ai:before-client-navigation";

/** Save the current section before a form starts a Next.js client transition. */
export function preserveNavigationScroll(): void {
  window.dispatchEvent(new Event(PRESERVE_NAVIGATION_SCROLL));
}
