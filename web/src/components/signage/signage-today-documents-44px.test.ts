import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * signage-today-documents.tsx（今日の作業資料パネル）の44pxタップ標的 回帰ガード（2026-07-03）。
 * 従来の44px一括是正の対象から漏れていた（他のsignage系コンポーネントは既に是正済み）。
 * JSX側の実サイズは docs/third-party-reviews/scripts の実ブラウザ無読テストで検証する。
 */

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function elementBlock(source: string, tagStart: string, label: string, fromIndex = 0): string {
  const labelIndex = source.indexOf(label, fromIndex);
  if (labelIndex === -1) throw new Error(`label not found: ${label}`);
  const tagIndex = source.lastIndexOf(tagStart, labelIndex);
  if (tagIndex === -1 || tagIndex < fromIndex) {
    throw new Error(`tag not found before label: ${label}`);
  }
  return source.slice(tagIndex, labelIndex);
}

describe("signage-today-documents.tsx の主要操作が44pxタップ標的を満たす", () => {
  const SOURCE = readSource("src/components/signage/signage-today-documents.tsx");

  it("「＋ 資料を追加」ボタン", () => {
    expect(elementBlock(SOURCE, "<button", "＋ 資料を追加")).toMatch(/min-h-\[44px\]/);
  });

  it("「一括クリア」ボタン", () => {
    expect(elementBlock(SOURCE, "<button", "一括クリア")).toMatch(/min-h-\[44px\]/);
  });

  it("カルーセル上の「✕ 削除」ボタン", () => {
    expect(elementBlock(SOURCE, "<button", "✕ 削除")).toMatch(/min-h-\[44px\]/);
  });

  it("タイトル編集input", () => {
    const block = SOURCE.match(/<input[\s\S]{0,400}?タイトル（例：3階躯体図面）[\s\S]{0,400}?\/>/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/min-h-\[44px\]/);
  });

  it("サムネイル一覧の個別削除ボタン（✕バッジ）", () => {
    const block = SOURCE.match(/aria-label=\{`資料 \$\{idx \+ 1\} を削除`\}[\s\S]{0,500}?<\/button>/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/min-h-\[44px\]/);
    expect(block![0]).toMatch(/min-w-\[44px\]/);
  });
});
