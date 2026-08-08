import { describe, expect, it } from "vitest";

import { BASE_TERMS } from "./page";

describe("glossary WBGT source", () => {
  it("廃止前の誤通達番号を使わず現行ガイドラインへ案内する", () => {
    const wbgt = BASE_TERMS.find((term) => term.term === "WBGT");

    expect(wbgt).toBeDefined();
    expect(wbgt?.definition).toContain("基発0318第1号");
    expect(wbgt?.definition).not.toContain("基発0618第1号");
    expect(wbgt?.source?.url).toBe(
      "https://www.mhlw.go.jp/web/t_doc?dataId=00tc9896&dataType=1&pageNo=1",
    );
  });
});
