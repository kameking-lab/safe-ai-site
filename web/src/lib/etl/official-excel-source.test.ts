import { describe, expect, it } from "vitest";
import { resolveOfficialMhlwExcelUrl } from "./official-excel-source";

describe("resolveOfficialMhlwExcelUrl", () => {
  it("厚労省information配下の想定ファイルだけを許可する", () => {
    expect(resolveOfficialMhlwExcelUrl("r8_07_sibou_bunseki.xlsx")).toBe(
      "https://anzeninfo.mhlw.go.jp/information/r8_07_sibou_bunseki.xlsx",
    );
    expect(resolveOfficialMhlwExcelUrl("/information/r8_07_sisyou_bunseki.xlsx?tracking=1")).toBe(
      "https://anzeninfo.mhlw.go.jp/information/r8_07_sisyou_bunseki.xlsx",
    );
    expect(
      resolveOfficialMhlwExcelUrl(
        "information/r8_07_sibou_bunseki.xlsx",
      ),
    ).toBe(
      "https://anzeninfo.mhlw.go.jp/information/r8_07_sibou_bunseki.xlsx",
    );
  });

  it.each([
    "https://example.com/information/r8_07_sibou_bunseki.xlsx",
    "http://anzeninfo.mhlw.go.jp/information/r8_07_sibou_bunseki.xlsx",
    "https://anzeninfo.mhlw.go.jp/other/r8_07_sibou_bunseki.xlsx",
    "https://anzeninfo.mhlw.go.jp/information/not-expected.xlsx",
  ])("外部・HTTP・範囲外URLを拒否する: %s", (url) => {
    expect(resolveOfficialMhlwExcelUrl(url)).toBeNull();
  });
});
