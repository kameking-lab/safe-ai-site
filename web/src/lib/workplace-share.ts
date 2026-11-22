import { SITE_URL } from "@/lib/seo-metadata";

export type WorkplaceShareKind = "morning" | "accident_news" | "ky" | "chemical_ra";
export const RA_SHARE_METHODS = ["native", "copy", "line"] as const;
export type WorkplaceShareMethod = (typeof RA_SHARE_METHODS)[number] | "x";

export function workplaceShareUrl(path: `/${string}`, anchor?: string): string {
  const url = new URL(SITE_URL);
  url.pathname = path;
  url.searchParams.set("utm_source", "share");
  if (anchor) url.hash = anchor;
  return url.href;
}
