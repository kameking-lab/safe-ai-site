import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 共有部品 FavoriteButton・CopyCitationButton の未着手44pxタップ標的 回帰ガード（2026-07-04）。
 * 両部品とも compact(アイコンのみ h-7 w-7≈28px)・normal(px-3 py-1 text-[11px]≈24-28px)
 * いずれも44px未満だった。/accidents/[id]・/circulars・法令検索結果の3箇所で使われる
 * 「お気に入り」「引用をコピー」ボタンが対象。JSX側の実サイズは docs/third-party-reviews/scripts
 * の実ブラウザ無読テストで検証する。
 */

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("favorite-button.tsx が44pxタップ標的を満たす", () => {
  const SOURCE = readSource("src/components/favorites/favorite-button.tsx");

  it("compact variant(アイコンのみ)がmin-h-[44px] min-w-[44px]を含む", () => {
    const compactStart = SOURCE.indexOf('variant === "compact"');
    const compactEnd = SOURCE.indexOf("</button>", compactStart);
    const block = SOURCE.slice(compactStart, compactEnd);
    expect(block).toMatch(/min-h-\[44px\]/);
    expect(block).toMatch(/min-w-\[44px\]/);
  });

  it("normal variant(アイコン+ラベル)がmin-h-[44px]を含む", () => {
    const compactEnd = SOURCE.indexOf("</button>", SOURCE.indexOf('variant === "compact"'));
    const normalBlock = SOURCE.slice(compactEnd);
    expect(normalBlock).toMatch(/min-h-\[44px\]/);
  });
});

describe("copy-citation-button.tsx が44pxタップ標的を満たす", () => {
  const SOURCE = readSource("src/components/favorites/copy-citation-button.tsx");

  it("compact variant(アイコンのみ)がmin-h-[44px] min-w-[44px]を含む", () => {
    const compactStart = SOURCE.indexOf('variant === "compact"');
    const compactEnd = SOURCE.indexOf("</button>", compactStart);
    const block = SOURCE.slice(compactStart, compactEnd);
    expect(block).toMatch(/min-h-\[44px\]/);
    expect(block).toMatch(/min-w-\[44px\]/);
  });

  it("normal variant(アイコン+ラベル)がmin-h-[44px]を含む", () => {
    const compactEnd = SOURCE.indexOf("</button>", SOURCE.indexOf('variant === "compact"'));
    const normalBlock = SOURCE.slice(compactEnd);
    expect(normalBlock).toMatch(/min-h-\[44px\]/);
  });
});
