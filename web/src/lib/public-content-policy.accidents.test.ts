import { describe, expect, it } from "vitest";
import { isPublicRouteAvailable } from "./public-content-policy";
import {
  hasApprovedPublicContentRevalidation,
  PUBLIC_CONTENT_REVALIDATION_RECORDS,
  PUBLIC_REVALIDATION_REQUIRED_PATHS,
} from "./public-content-revalidation";

describe("事故分析の公開再検証境界", () => {
  it("再検証必須ルートは承認記録と一次資料・自動検査の両方を持つ", () => {
    expect(PUBLIC_REVALIDATION_REQUIRED_PATHS).toContain(
      "/accidents-analytics",
    );
    const record = PUBLIC_CONTENT_REVALIDATION_RECORDS["/accidents-analytics"];

    expect(record?.decision).toBe("approved-for-publication");
    expect(record?.limitations).toEqual(
      expect.arrayContaining([
        expect.stringContaining("発生率ではない"),
        expect.stringContaining("既知件数"),
      ]),
    );
    expect(record?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "primary-source",
          locator: expect.stringMatching(
            /^https:\/\/(?:www\.)?(?:mhlw\.go\.jp|anzeninfo\.mhlw\.go\.jp)\//u,
          ),
        }),
        expect.objectContaining({ kind: "automated-check" }),
      ]),
    );
    expect(hasApprovedPublicContentRevalidation("/accidents-analytics")).toBe(
      true,
    );
    expect(isPublicRouteAvailable("/accidents-analytics")).toBe(true);
  });

  it("記録のないパスを承認済みとは扱わない", () => {
    expect(hasApprovedPublicContentRevalidation("/unreviewed-example")).toBe(
      false,
    );
  });
});
