import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("KY・工程書のモバイル固定保存バー", () => {
  const targets = [
    "src/components/ky-paper/ky-paper-view.tsx",
    "src/components/meeting/meeting-paper-view.tsx",
  ];

  it.each(targets)(
    "%s は320pxで状態文を縦書き状に圧縮せず、44px操作を保つ",
    (target) => {
      const text = source(target);
      const barStart = text.indexOf("const bottomActionBar =");
      const barEnd = text.indexOf("const actionsSheet =", barStart);
      const bar = text.slice(barStart, barEnd);

      expect(barStart).toBeGreaterThanOrEqual(0);
      expect(bar).toContain("truncate whitespace-nowrap");
      expect(bar).not.toContain("pr-16");
      expect(bar.match(/min-h-\[44px\]/g)?.length).toBeGreaterThanOrEqual(2);
      expect(bar).toContain("min-w-[44px]");
    },
  );

  it("KYは狭幅でも未同期・失敗状態を文字で表示する", () => {
    const text = source("src/components/ky-paper/ky-paper-view.tsx");
    const barStart = text.indexOf("const bottomActionBar =");
    const barEnd = text.indexOf("const actionsSheet =", barStart);
    const bar = text.slice(barStart, barEnd);

    expect(text).toContain('syncStatus === "offline"');
    expect(text).toContain('? "オフライン"');
    expect(text).toContain('syncStatus === "pending"');
    expect(text).toContain('? "未同期"');
    expect(text).toContain('syncStatus === "failed"');
    expect(text).toContain('? "同期失敗"');
    expect(bar).toContain("sm:hidden");
    expect(bar).toContain("mobileSyncLabel");
  });
});
