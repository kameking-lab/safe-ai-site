import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * accident-ai-analyzer.tsx（/accidents AI事故分析パネル）の44pxタップ標的 回帰ガード（2026-07-03）。
 * 従来の44px一括是正の対象から漏れていたコンポーネント。
 * JSX側の実サイズは docs/third-party-reviews/scripts の実ブラウザ無読テストで検証する。
 */

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

/** アンカー文字列の直後の一定範囲（同じ開始タグ内のclassNameを含む想定）を取り出す */
function forwardWindow(source: string, anchor: string, windowChars = 250): string {
  const anchorIndex = source.indexOf(anchor);
  if (anchorIndex === -1) throw new Error(`anchor not found: ${anchor}`);
  return source.slice(anchorIndex, anchorIndex + windowChars);
}

describe("accident-ai-analyzer.tsx の主要操作が44pxタップ標的を満たす", () => {
  const SOURCE = readSource("src/components/accidents/accident-ai-analyzer.tsx");

  it("表示言語 select", () => {
    expect(forwardWindow(SOURCE, 'aria-label="表示言語 / Display language"')).toMatch(
      /min-h-\[44px\]/,
    );
  });

  it("業種 select", () => {
    expect(forwardWindow(SOURCE, 'aria-label="業種"')).toMatch(/min-h-\[44px\]/);
  });

  it("作業内容 input（aria-label={L.workContent}）", () => {
    expect(forwardWindow(SOURCE, "aria-label={L.workContent}")).toMatch(/min-h-\[44px\]/);
  });

  it("分析実行ボタン（onAnalyze）", () => {
    expect(forwardWindow(SOURCE, "onClick={() => void onAnalyze()}")).toMatch(/min-h-\[44px\]/);
  });

  it("関連事例へのLink", () => {
    expect(forwardWindow(SOURCE, "href={`/accidents/${c.id}`}")).toMatch(/min-h-\[44px\]/);
  });
});
