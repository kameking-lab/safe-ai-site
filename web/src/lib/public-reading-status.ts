/** Outline-only reading pages stay unpublished until their editorial content is complete. */
export const UNFINISHED_PUBLIC_READING_PATHS = [
  "/laws/bcp",
  "/laws/gig-work",
  "/laws/freelance-rosai",
] as const;

export function isUnfinishedPublicReadingPath(pathname: string): boolean {
  return UNFINISHED_PUBLIC_READING_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
