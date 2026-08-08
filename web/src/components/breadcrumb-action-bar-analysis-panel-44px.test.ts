import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 共通パンくず(breadcrumb.tsx)・事故アクションバー(accidents/action-bar.tsx)・
 * 事故分析パネル2種の未着手44pxタップ標的 回帰ガード（2026-07-03）。
 * JSX側の実サイズは docs/third-party-reviews/scripts の実ブラウザ無読テストで検証する。
 */

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

/** タグ開始位置からラベル文字列までの範囲（開始タグのclassName属性を含む）を取り出す */
function elementBlock(source: string, tagStart: string, label: string, fromIndex = 0): string {
  const labelIndex = source.indexOf(label, fromIndex);
  if (labelIndex === -1) throw new Error(`label not found: ${label}`);
  const tagIndex = source.lastIndexOf(tagStart, labelIndex);
  if (tagIndex === -1 || tagIndex < fromIndex) {
    throw new Error(`tag not found before label: ${label}`);
  }
  return source.slice(tagIndex, labelIndex);
}

describe("breadcrumb.tsx の各リンクが44pxタップ標的を満たす", () => {
  const SOURCE = readSource("src/components/breadcrumb.tsx");

  it("ホームアイコンLinkがmin-h-[44px]を含む", () => {
    expect(elementBlock(SOURCE, "<Link", "aria-label=\"ホーム\"")).toMatch(/min-h-\[44px\]/);
  });

  it("パンくず項目Linkがmin-h-[44px]を含む", () => {
    const firstLinkEnd = SOURCE.indexOf("</Link>") + "</Link>".length;
    const secondLinkStart = SOURCE.indexOf("<Link", firstLinkEnd);
    const secondLinkEnd = SOURCE.indexOf("</Link>", secondLinkStart);
    expect(secondLinkStart).toBeGreaterThan(-1);
    expect(SOURCE.slice(secondLinkStart, secondLinkEnd)).toMatch(/min-h-\[44px\]/);
  });
});

describe("accidents/action-bar.tsx の公開中2リンクが44pxタップ標的を満たす", () => {
  const SOURCE = readSource("src/components/accidents/action-bar.tsx");
  const returnStart = SOURCE.indexOf("return (");
  const cases: Array<[string, string]> = [
    ["<KyHandoffLink", "この事故を参考にKYを作る"],
    ["<Link", "空のKYを作る"],
    ["<Link", "法令検索を開く"],
  ];

  it.each(cases)("%s %s", (tag, label) => {
    expect(elementBlock(SOURCE, tag, label, returnStart)).toMatch(/min-h-\[44px\]/);
  });

  it("公開時はKY分岐のどちらかと法令検索だけを表示する", () => {
    const renderedSource = SOURCE.slice(returnStart);
    expect(renderedSource.match(/<KyHandoffLink\b/g)).toHaveLength(1);
    expect(renderedSource.match(/<Link\b/g)).toHaveLength(2);
    expect(SOURCE).toContain("isAccidentEligibleForOperationalEvidence");
    expect(renderedSource).toContain("eligibleForHandoff ? (");
    expect(renderedSource).toContain("この事故を参考にKYを作る");
    expect(renderedSource).toContain("空のKYを作る");
    expect(renderedSource).toContain("法令検索を開く");
    expect(renderedSource).not.toContain("問われる責任");
    expect(renderedSource).not.toContain("必要保護具を見る");
    expect(renderedSource).not.toContain("関連裁判例");
    expect(renderedSource).not.toContain(
      "事故類型だけでは対策や適用法令を決められません",
    );
  });
});

describe("accident-analysis-panel.tsx の2要素が44pxタップ標的を満たす", () => {
  const SOURCE = readSource("src/components/accident-analysis-panel.tsx");

  it("「このデータについて」アコーディオンボタンがmin-h-[44px]を含む", () => {
    expect(elementBlock(SOURCE, "<button", "このデータについて")).toMatch(/min-h-\[44px\]/);
  });

  it("CSVエクスポートボタンがmin-h-[44px]を含む", () => {
    expect(elementBlock(SOURCE, "<button", "CSVエクスポート")).toMatch(/min-h-\[44px\]/);
  });
});

describe("mhlw-accident-analysis-panel.tsx の2要素が44pxタップ標的を満たす", () => {
  const SOURCE = readSource("src/components/mhlw-accident-analysis-panel.tsx");

  it("「このデータについて」アコーディオンボタンがmin-h-[44px]を含む", () => {
    expect(elementBlock(SOURCE, "<button", "このデータについて")).toMatch(/min-h-\[44px\]/);
  });

  it("集計CSVボタンがmin-h-[44px]を含む", () => {
    expect(elementBlock(SOURCE, "<button", "集計CSV")).toMatch(/min-h-\[44px\]/);
  });
});
