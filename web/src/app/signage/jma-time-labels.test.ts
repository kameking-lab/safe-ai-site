import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("signage JMA source-time labels", () => {
  it("shows source, acquisition time and report target time separately", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/signage/page.tsx"),
      "utf8",
    );
    expect(source).toContain("jmaSourceFetchedAt");
    expect(source).toContain("jmaReportTime");
    expect(source).toContain("気象庁（出典）／取得:");
    expect(source).toContain("発表対象時刻:");
    expect(source).not.toContain("気象庁データ時刻:");
  });
});
