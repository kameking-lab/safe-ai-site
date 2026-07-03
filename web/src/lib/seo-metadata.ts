import type { Metadata } from "next";

export const SITE_NAME = "安全AIポータル";
export const SITE_URL = "https://www.anzen-ai-portal.jp";
/**
 * 表示用のドメイン（プロトコル・`www.`・末尾スラッシュを除いたホスト名）。
 *
 * OGP 画像（`/api/og`）の透かしなど「見せるドメイン」に使う。値は {@link SITE_URL}
 * 由来の単一ソースで、`SITE_URL` を別ドメインへ替えても自動追従する（旧実装は
 * og route が `"anzen-ai-portal.jp"` をリテラル直書きし、`SITE_URL` 変更時に
 * OGP 透かしだけ旧ドメインへ無言ドリフトする穴だった）。
 */
export const SITE_DISPLAY_HOST = SITE_URL
  .replace(/^https?:\/\//, "")
  .replace(/^www\./, "")
  .replace(/\/+$/, "");
export const SITE_LOCALE = "ja_JP";
export const SITE_ALTERNATE_LOCALES = ["en_US"] as const;

/**
 * サイト共通の OGP 画像（動的生成 `/api/og`、1200x630）。
 *
 * ルート layout.tsx は同じ画像を openGraph/twitter に敷いているが、Next.js の
 * metadata は openGraph オブジェクトを**浅くマージ（丸ごと置換）**する
 * （generate-metadata.md「All openGraph fields are replaced」）。そのため
 * ページが独自の `openGraph` を export すると、ルートの `images` ごと消えて
 * og:image が欠落する（実測: /bcp・/insurance 等）。
 * 下記の {@link withSiteOpenGraph} / {@link withSiteTwitter} は、この画像を
 * 既定値として再付与し、ページ側で画像を渡さなくてもフォールバックが残るようにする。
 */
export const DEFAULT_OG_IMAGE_URL = `${SITE_URL}/api/og`;
export const DEFAULT_OG_IMAGE = {
  url: DEFAULT_OG_IMAGE_URL,
  width: 1200,
  height: 630,
  alt: "安全AIポータル — 現場の安全を、AIで変える。",
} as const;

type Override<T> = T extends object ? Partial<T> : T;

type OpenGraphOverride = Override<NonNullable<Metadata["openGraph"]>>;
type TwitterOverride = Override<NonNullable<Metadata["twitter"]>>;

/**
 * Build the `alternates` block with canonical + hreflang language map.
 * Pass the relative path (`/foo`) — both languages and x-default point
 * at the same canonical URL because the site uses client-side language
 * switching with no URL prefix; this is the form Google accepts for
 * single-URL multilingual content.
 */
export function withSiteAlternates(
  path: string,
): NonNullable<Metadata["alternates"]> {
  const normalisedPath = path.startsWith("/") ? path : `/${path}`;
  const canonical = `${SITE_URL}${normalisedPath === "/" ? "" : normalisedPath}`;
  return {
    canonical,
    languages: {
      ja: canonical,
      en: canonical,
      "x-default": canonical,
    },
  };
}

/**
 * Build an openGraph metadata block that preserves the site-wide
 * defaults (type, locale, siteName, url) which Next.js drops when a
 * page exports its own `openGraph` object (shallow replace at the
 * top level of `Metadata`).
 *
 * Pass `path` to populate `og:url`. Anything else in `extra` wins
 * over the defaults — including `images`, so a page that has a bespoke
 * OG image can still pass its own; otherwise it inherits the site-wide
 * `/api/og` fallback ({@link DEFAULT_OG_IMAGE}).
 */
export function withSiteOpenGraph(
  path: string,
  extra: OpenGraphOverride = {},
): NonNullable<Metadata["openGraph"]> {
  const normalisedPath = path.startsWith("/") ? path : `/${path}`;
  return {
    type: "website",
    locale: SITE_LOCALE,
    alternateLocale: [...SITE_ALTERNATE_LOCALES],
    siteName: SITE_NAME,
    url: `${SITE_URL}${normalisedPath === "/" ? "" : normalisedPath}`,
    images: [DEFAULT_OG_IMAGE],
    ...extra,
  };
}

/**
 * Build a twitter metadata block that preserves the site-wide
 * defaults (card type) for pages overriding twitter metadata. We
 * intentionally do not set a `site` handle here — the project has
 * no published Twitter account, and a bad handle hurts more than no
 * handle.
 *
 * Defaults the card image to the site-wide `/api/og` fallback so a page
 * overriding `twitter` does not blank out its preview thumbnail; pass
 * `images` in `extra` to override.
 */
export function withSiteTwitter(
  extra: TwitterOverride = {},
): NonNullable<Metadata["twitter"]> {
  return {
    card: "summary_large_image",
    images: [DEFAULT_OG_IMAGE_URL],
    ...extra,
  };
}
