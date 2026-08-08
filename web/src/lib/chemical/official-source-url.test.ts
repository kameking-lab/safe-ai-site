import { describe, expect, it } from "vitest";
import { verifiedMhlwPublicDocumentUrl } from "./official-source-url";

describe("verifiedMhlwPublicDocumentUrl", () => {
  it("accepts only HTTPS URLs on the MHLW host boundary", () => {
    expect(
      verifiedMhlwPublicDocumentUrl(
        "https://anzeninfo.mhlw.go.jp/user/anzen/kag/pdf/noudo/example.pdf",
      ),
    ).toBe(
      "https://anzeninfo.mhlw.go.jp/user/anzen/kag/pdf/noudo/example.pdf",
    );
    expect(
      verifiedMhlwPublicDocumentUrl(
        "https://www.mhlw.go.jp/content/example.pdf",
      ),
    ).toBe("https://www.mhlw.go.jp/content/example.pdf");
  });

  it.each([
    "http://www.mhlw.go.jp/example.pdf",
    "https://mhlw.go.jp.evil.example/example.pdf",
    "javascript:alert(1)",
    "not-a-url",
  ])("rejects an untrusted source: %s", (candidate) => {
    expect(verifiedMhlwPublicDocumentUrl(candidate)).toBeUndefined();
  });
});
