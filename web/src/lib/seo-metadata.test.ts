import { describe, expect, it } from "vitest";
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_URL,
  SITE_NAME,
  SITE_URL,
  withSiteAlternates,
  withSiteOpenGraph,
  withSiteTwitter,
} from "./seo-metadata";

describe("withSiteAlternates", () => {
  it("trailing-slash を付けず絶対 canonical を組む", () => {
    expect(withSiteAlternates("/bcp").canonical).toBe(`${SITE_URL}/bcp`);
  });

  it("ルート '/' は SITE_URL そのまま（末尾スラッシュ無し）", () => {
    expect(withSiteAlternates("/").canonical).toBe(SITE_URL);
  });

  it("先頭スラッシュ無しのパスも正規化する", () => {
    expect(withSiteAlternates("insurance").canonical).toBe(`${SITE_URL}/insurance`);
  });

  it("ja / en / x-default を同一 canonical に向ける（単一URL多言語）", () => {
    const alt = withSiteAlternates("/faq");
    const canonical = `${SITE_URL}/faq`;
    expect(alt.languages).toEqual({
      ja: canonical,
      en: canonical,
      "x-default": canonical,
    });
  });
});

describe("withSiteOpenGraph", () => {
  it("サイト共通の既定値（type/locale/siteName/url）を敷く", () => {
    const og = withSiteOpenGraph("/bcp") as Record<string, unknown>;
    expect(og.type).toBe("website");
    expect(og.locale).toBe("ja_JP");
    expect(og.siteName).toBe(SITE_NAME);
    expect(og.url).toBe(`${SITE_URL}/bcp`);
    expect(og.alternateLocale).toEqual(["en_US"]);
  });

  it("画像未指定でも /api/og フォールバックを残す（openGraph 浅マージで og:image が消える退行の防止）", () => {
    const og = withSiteOpenGraph("/bcp", { title: "X", description: "Y" });
    expect(og.images).toEqual([DEFAULT_OG_IMAGE]);
  });

  it("ページ独自の画像は既定フォールバックに優先する", () => {
    const custom = [{ url: "https://example.com/custom.png" }];
    const og = withSiteOpenGraph("/x", { images: custom });
    expect(og.images).toBe(custom);
  });

  it("extra の title/description は既定値より優先される", () => {
    const og = withSiteOpenGraph("/x", { title: "固有タイトル" });
    expect(og.title).toBe("固有タイトル");
  });

  it("ルート '/' の og:url は末尾スラッシュを付けない", () => {
    expect(withSiteOpenGraph("/").url).toBe(SITE_URL);
  });
});

describe("withSiteTwitter", () => {
  it("summary_large_image カードと画像フォールバックを既定にする", () => {
    const tw = withSiteTwitter() as Record<string, unknown>;
    expect(tw.card).toBe("summary_large_image");
    expect(tw.images).toEqual([DEFAULT_OG_IMAGE_URL]);
  });

  it("ページ独自画像は既定フォールバックに優先する", () => {
    const tw = withSiteTwitter({ images: ["https://example.com/t.png"] });
    expect(tw.images).toEqual(["https://example.com/t.png"]);
  });
});

describe("DEFAULT_OG_IMAGE", () => {
  it("1200x630 の /api/og を指す", () => {
    expect(DEFAULT_OG_IMAGE_URL).toBe(`${SITE_URL}/api/og`);
    expect(DEFAULT_OG_IMAGE.width).toBe(1200);
    expect(DEFAULT_OG_IMAGE.height).toBe(630);
    expect(DEFAULT_OG_IMAGE.url).toBe(DEFAULT_OG_IMAGE_URL);
  });
});
