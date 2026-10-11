import { describe, expect, it } from "vitest";
import { verifiedMhlwPublicDocumentUrl, verifiedNiteGhsDocumentUrl } from "./official-source-url";

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

describe("NITE政府版GHSの物質一致", () => {
  it("同じCASの公式参照先だけを使う", () => {
    const url = "https://www.chem-info.nite.go.jp/chem/ghs/m-nite-108-88-3.html";
    expect(verifiedNiteGhsDocumentUrl(url, "108-88-3")).toBe(url);
    expect(verifiedNiteGhsDocumentUrl(url, "67-64-1")).toBeUndefined();
  });
  it.each([
    "https://www.chem-info.nite.go.jp.evil.example/chem/ghs/m-nite-108-88-3.html",
    "http://www.chem-info.nite.go.jp/chem/ghs/m-nite-108-88-3.html",
    "https://user@www.chem-info.nite.go.jp/chem/ghs/m-nite-108-88-3.html",
  ])("偽装した参照先を使わない: %s", (url) => {
    expect(verifiedNiteGhsDocumentUrl(url, "108-88-3")).toBeUndefined();
  });
});
