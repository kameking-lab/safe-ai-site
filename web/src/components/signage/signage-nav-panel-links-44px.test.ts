import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * サイネージ ヘッダーナビ・パネル副リンクの44pxタップ標的 回帰ガード（2026-07-03）。
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

describe("signage-header.tsx のナビ5リンクが44pxタップ標的を満たす", () => {
  const SOURCE = readSource("src/components/signage/signage-header.tsx");
  const labels = [
    "ポータルへ戻る",
    "法改正一覧へ",
    "KY用紙へ",
    "記録キットへ",
    "通知設定へ",
  ];

  it.each(labels)("%s", (label) => {
    expect(elementBlock(SOURCE, "<Link", label)).toMatch(/min-h-\[44px\]/);
  });
});

describe("signage-morning-script.tsx の操作ボタン3個が44pxタップ標的を満たす", () => {
  const SOURCE = readSource("src/components/signage/signage-morning-script.tsx");
  // JSXの出現順に検索する（"コピー"は先頭のalert文言にも登場するため、
  // ボタン群の開始位置以降からのみ探す）
  const buttonsStart = SOURCE.indexOf("<div className=\"flex gap-1\">");
  const labels = ["再生成", "コピー", "読み上げ"];
  let cursor = buttonsStart;

  it.each(labels)("%s", (label) => {
    const block = elementBlock(SOURCE, "<button", label, cursor);
    cursor = SOURCE.indexOf(label, cursor) + label.length;
    expect(block).toMatch(/min-h-\[44px\]/);
  });
});

describe("signage-risk-prediction.tsx の「詳細予測 →」リンクが44pxタップ標的を満たす", () => {
  it("min-h-[44px]を含む", () => {
    const SOURCE = readSource("src/components/signage/signage-risk-prediction.tsx");
    expect(elementBlock(SOURCE, "<a", "詳細予測 →")).toMatch(/min-h-\[44px\]/);
  });
});

describe("signage-site-safety.tsx の「記録キット →」リンクが44pxタップ標的を満たす", () => {
  it("min-h-[44px]を含む", () => {
    const SOURCE = readSource("src/components/signage/signage-site-safety.tsx");
    expect(elementBlock(SOURCE, "<a", "記録キット →")).toMatch(/min-h-\[44px\]/);
  });
});
