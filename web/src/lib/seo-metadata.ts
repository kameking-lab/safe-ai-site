import type { Metadata } from "next";

export const SITE_NAME = "安全AIポータル";
export const SITE_URL = "https://www.anzen-ai-portal.jp";
export const SITE_LOCALE = "ja_JP";

type Override<T> = T extends object ? Partial<T> : T;

type OpenGraphOverride = Override<NonNullable<Metadata["openGraph"]>>;
type TwitterOverride = Override<NonNullable<Metadata["twitter"]>>;

/**
 * Build an openGraph metadata block that preserves the site-wide
 * defaults (type, locale, siteName, url) which Next.js drops when a
 * page exports its own `openGraph` object (shallow replace at the
 * top level of `Metadata`).
 *
 * Pass `path` to populate `og:url`. Anything else in `extra` wins
 * over the defaults.
 */
export function withSiteOpenGraph(
  path: string,
  extra: OpenGraphOverride = {},
): NonNullable<Metadata["openGraph"]> {
  const normalisedPath = path.startsWith("/") ? path : `/${path}`;
  return {
    type: "website",
    locale: SITE_LOCALE,
    siteName: SITE_NAME,
    url: `${SITE_URL}${normalisedPath === "/" ? "" : normalisedPath}`,
    ...extra,
  };
}

/**
 * Build a twitter metadata block that preserves the site-wide
 * defaults (card type) for pages overriding twitter metadata. We
 * intentionally do not set a `site` handle here — the project has
 * no published Twitter account, and a bad handle hurts more than no
 * handle.
 */
export function withSiteTwitter(
  extra: TwitterOverride = {},
): NonNullable<Metadata["twitter"]> {
  return {
    card: "summary_large_image",
    ...extra,
  };
}
