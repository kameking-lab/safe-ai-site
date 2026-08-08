import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/app/(main)/education-certification/page.tsx"),
  "utf8",
);

describe("/education-certification compact task entry", () => {
  it("資格検索を説明や一覧より先に置く", () => {
    const headerStart = source.indexOf("<header>");
    const primaryStart = source.indexOf('data-primary-action="true"');
    const listStart = source.indexOf('id="certification-types"');

    expect(headerStart).toBeGreaterThanOrEqual(0);
    expect(source).toContain(">作業から資格を確認</h1>");
    expect(source).toContain('href="/education-certification/finder"');
    expect(primaryStart).toBeGreaterThan(headerStart);
    expect(listStart).toBeGreaterThan(primaryStart);
    expect(source).not.toContain("<TaskPageIntro");
    expect(source).not.toContain("<ConclusionCard");
  });

  it("制度別一覧を折りたたみ、注意事項を一か所へ案内する", () => {
    expect(source).toContain('id="certification-types"');
    expect(source).toContain('summary="制度の違いと公式確認"');
    expect(source).toContain("<UsageNotesLink");
    expect(source).not.toContain("検証状態");
    expect(source.match(/<UsageNotesLink/g)).toHaveLength(1);
    expect(source).not.toContain("本データは参考情報です");
  });

  it("ファーストビューの操作量と説明量を制限する", () => {
    const header = source.slice(source.indexOf("<header>"), source.indexOf("</header>"));
    expect(header.match(/data-primary-action=/g)).toHaveLength(1);
    expect(header.match(/data-secondary-action=/g) ?? []).toHaveLength(0);
    expect(header).toContain("data-page-description");
    expect(header).not.toMatch(/data-warning-card|role="alert"|bg-amber/);
  });

  it("資格カードは講習時間と公式原文を短く示す", () => {
    expect(source).toContain("講習時間:");
    expect(source).toContain("公式原文");
    expect(source).not.toContain("要原典確認");
    expect(source).not.toContain("出典候補を公式サイトで確認");
    expect(source).not.toContain("人手確認待ち");
  });
});
