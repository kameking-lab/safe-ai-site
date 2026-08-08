import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(file: string): string {
  return readFileSync(resolve(process.cwd(), file), "utf8");
}

const routes = [
  "src/app/(main)/education/page.tsx",
  "src/app/(main)/e-learning/page.tsx",
] as const;

describe("教育ページのservice-first表示", () => {
  it.each(routes)("%s はnoindexを維持し、利用できる操作を先に示す", (file) => {
    const page = source(file);
    const firstView = page.slice(page.indexOf("<header>"), page.indexOf("<UsageNotesLink"));

    expect(page).toContain("index: false");
    expect(page).toContain('href="/training/visual-ky"');
    expect(page).toContain('href="/education-certification/finder"');
    expect(page).toContain("mhlw.go.jp");
    expect(firstView.match(/data-primary-action=/g)).toHaveLength(1);
    expect(firstView.match(/data-secondary-action=/g)).toHaveLength(2);
    expect(firstView).toContain("data-page-description");
    expect(firstView).not.toMatch(/data-warning-card|role="alert"|bg-amber/);
  });

  it.each(routes)("%s は停止理由・評価方法・重複免責を主領域に出さない", (file) => {
    const page = source(file);

    expect(page).not.toMatch(/品質ゲート|allowlist|外部レビュー|再公開条件|停止理由/);
    expect(page).not.toContain("正式な法定教育");
    expect(page.match(/<UsageNotesLink/g)).toHaveLength(1);
  });
});
