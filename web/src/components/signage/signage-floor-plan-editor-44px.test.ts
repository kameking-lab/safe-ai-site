import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * signage-floor-plan-editor.tsx（サイネージ/図面ピン配置エディタ）の44pxタップ標的 回帰ガード（2026-07-03）。
 * サイネージ本体（/signage）で最も高頻度に表示されるフラグシップroute配下だが、
 * 兄弟コンポーネント（pin-manager.tsx等）は既に是正済みの一方、本ファイルのみ従来の一括是正から漏れていた。
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

function selfClosingBlock(source: string, tagStart: string, anchor: string, fromIndex = 0): string {
  const anchorIndex = source.indexOf(anchor, fromIndex);
  if (anchorIndex === -1) throw new Error(`anchor not found: ${anchor}`);
  const tagIndex = source.lastIndexOf(tagStart, anchorIndex);
  if (tagIndex === -1 || tagIndex < fromIndex) {
    throw new Error(`tag not found before anchor: ${anchor}`);
  }
  const closeIndex = source.indexOf("/>", anchorIndex);
  if (closeIndex === -1) throw new Error(`self-closing tag end not found after anchor: ${anchor}`);
  return source.slice(tagIndex, closeIndex);
}

describe("signage-floor-plan-editor.tsx の主要操作が44pxタップ標的を満たす", () => {
  const SOURCE = readSource("src/components/signage/signage-floor-plan-editor.tsx");
  const JSX_START = SOURCE.indexOf("return (");

  it("「自社図面アップロード」トリガー(label)", () => {
    expect(elementBlock(SOURCE, "<label", "自社図面アップロード")).toMatch(/min-h-\[44px\]/);
  });

  it("「ピン配置モード」トグルボタン", () => {
    expect(elementBlock(SOURCE, "<button", "ピン配置中（クリック）")).toMatch(/min-h-\[44px\]/);
  });

  it("ピン種別セレクト(select)", () => {
    expect(elementBlock(SOURCE, "<select", "危険箇所（赤）")).toMatch(/min-h-\[44px\]/);
  });

  it("ラベル入力欄(input)", () => {
    expect(selfClosingBlock(SOURCE, "<input", 'placeholder="ラベル')).toMatch(/min-h-\[44px\]/);
  });

  it("「全削除」ボタン", () => {
    expect(elementBlock(SOURCE, "<button", "全削除", JSX_START)).toMatch(/min-h-\[44px\]/);
  });

  it("「アップロード解除」ボタン", () => {
    expect(elementBlock(SOURCE, "<button", "アップロード解除")).toMatch(/min-h-\[44px\]/);
  });
});
