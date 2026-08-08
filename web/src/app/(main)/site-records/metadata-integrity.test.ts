import { describe, expect, it } from "vitest";

import { metadata } from "./page";

describe("/site-records metadata", () => {
  it("非公開のWBGT・暑熱順化ツールを検索表示で約束しない", () => {
    const text = `${metadata.title ?? ""} ${metadata.description ?? ""}`;

    expect(text).not.toContain("WBGT日次記録");
    expect(text).not.toContain("暑熱順化計画");
    expect(text).toContain("公開中");
    expect(text).toContain("管理者確認");
  });
});
