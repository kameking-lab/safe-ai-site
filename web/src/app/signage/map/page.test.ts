import { describe, expect, it } from "vitest";
import { metadata } from "./page";

describe("/signage/map metadata", () => {
  it("canonical を明示する", () => {
    expect(metadata.alternates?.canonical).toBe("/signage/map");
  });

  it("openGraph に固有タイトル・OGP画像・siteName を含む（サイト共通デフォルト継承）", () => {
    const og = metadata.openGraph as Record<string, unknown>;
    expect(og.title).toContain("サイネージ地図");
    expect(og.siteName).toBeTruthy();
    expect(JSON.stringify(og.images)).toContain("/api/og");
  });

  it("twitter カードを summary_large_image で設定", () => {
    expect(metadata.twitter?.card).toBe("summary_large_image");
  });
});
