import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * サイネージ地図(/signage/map)配下の未着手44pxタップ標的 回帰ガード（2026-07-03）。
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

describe("earthquake-alert-modal.tsx の「閉じる」ボタンが44pxタップ標的を満たす", () => {
  it("min-h-[44px]を含む", () => {
    const SOURCE = readSource("src/components/signage-map/earthquake-alert-modal.tsx");
    expect(elementBlock(SOURCE, "<button", "閉じる")).toMatch(/min-h-\[44px\]/);
  });
});

describe("pin-manager.tsx の操作4要素が44pxタップ標的を満たす", () => {
  const SOURCE = readSource("src/components/signage-map/pin-manager.tsx");
  const cases: Array<[string, string]> = [
    ["<button", "クリア"],
    ["<button", "ピンを追加"],
    ["<button", "削除"],
  ];

  it.each(cases)("%s %s", (tag, label) => {
    expect(elementBlock(SOURCE, tag, label)).toMatch(/min-h-\[44px\]/);
  });

  it("ラベル・通知メール入力欄がmin-h-[44px]を含む", () => {
    const inputBlocks = SOURCE.split("<input").slice(1);
    expect(inputBlocks.length).toBeGreaterThanOrEqual(2);
    for (const block of inputBlocks) {
      expect(block).toMatch(/min-h-\[44px\]/);
    }
  });

  it("ピン選択ボタン(onFocus)がmin-h-[44px]を含む", () => {
    expect(elementBlock(SOURCE, "<button", "{p.label}")).toMatch(/min-h-\[44px\]/);
  });
});

describe("signage-map-client.tsx の操作5要素が44pxタップ標的を満たす", () => {
  const SOURCE = readSource("src/components/signage-map/signage-map-client.tsx");
  const cases: Array<[string, string]> = [
    ["<button", "☰ パネルを開く"],
    ["<button", "✕ 閉じる"],
    ["<Link", "← 朝礼ダッシュボードへ"],
    ["<button", "現在のURLをコピー"],
  ];

  it.each(cases)("%s %s", (tag, label) => {
    expect(elementBlock(SOURCE, tag, label)).toMatch(/min-h-\[44px\]/);
  });

  it("フルスクリーン表示リンクがmin-h-[44px]を含む", () => {
    const fromIndex = SOURCE.indexOf("現在のURLをコピー");
    expect(elementBlock(SOURCE, "<Link", "フルスクリーン表示 →", fromIndex)).toMatch(/min-h-\[44px\]/);
  });
});

describe("signage-map-leaflet.tsx のピン削除ボタンが44pxタップ標的を満たす", () => {
  it("min-h-[44px]を含む", () => {
    const SOURCE = readSource("src/components/signage-map/signage-map-leaflet.tsx");
    expect(elementBlock(SOURCE, "<button", "このピンを削除")).toMatch(/min-h-\[44px\]/);
  });
});
