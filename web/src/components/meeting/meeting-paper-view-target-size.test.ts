import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src", "components", "meeting", "meeting-paper-view.tsx"),
  "utf8",
);

describe("安全工程打合せ書の主要タップ標的", () => {
  it("既知の主要操作と共通入力を44px以上に固定する", () => {
    expect(source).not.toContain('className="min-h-[28px]');
    expect(source).toContain(
      'const inp = "min-h-[44px] rounded border border-slate-300',
    );
    expect(source).toMatch(
      /aria-label=\{label\} className="min-h-\[44px\] min-w-\[44px\]/,
    );
    expect(source).toMatch(
      /handleZoomToNextEmpty[\s\S]{0,300}?min-h-\[44px\][\s\S]{0,200}?のこり\{remaining\}項目/,
    );
    expect(
      (
        source.match(
          /href="\/safety-diary\/list" className="inline-flex min-h-\[44px\]/g,
        ) ?? []
      ).length,
    ).toBeGreaterThanOrEqual(2);
    expect(source).toMatch(
      /toggleCanvasMode\(false\)[\s\S]{0,250}?min-h-\[44px\][\s\S]{0,200}?アクセシブル入力/,
    );
    expect(source).toMatch(
      /toggleCanvasMode\(true\)[\s\S]{0,250}?min-h-\[44px\][\s\S]{0,250}?用紙プレビュー（任意）/,
    );
    expect(
      (source.match(/handleCopyLatest[\s\S]{0,250}?min-h-\[(?:44|48)px\]/g) ?? [])
        .length,
    ).toBeGreaterThanOrEqual(2);
  });
});
