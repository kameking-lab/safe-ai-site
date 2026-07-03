import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { PageJsonLd } from "./page-json-ld";
import { SITE_NAME, SITE_URL } from "@/lib/seo-metadata";

/**
 * 柱C-4 補完 — PageJsonLd（汎用 WebPage + BreadcrumbList + 可視パンくず）回帰テスト。
 *
 * #530 で json-ld.tsx はサイトURL/名を seo-metadata.ts の単一ソースへ集約したが、
 * 本 sibling ヘルパーはドメイン文字列を直書きしたまま取り残されていた。SITE_URL 変更時に
 * WebPage @id / breadcrumb URL が旧ドメインへ無言ドリフトする穴を、
 *  (1) 出力 JSON-LD の絶対URLが SITE_URL 由来であること
 *  (2) ソースにドメイン直書きリテラルが無いこと（ハードコード回帰ガード）
 * の2軸で固定する。
 */

/** レンダリング結果から ld+json スクリプトの JSON 配列を取り出す。 */
function extractJsonLd(container: HTMLElement): Record<string, unknown>[] {
  const script = container.querySelector<HTMLScriptElement>(
    'script[type="application/ld+json"]'
  );
  expect(script).not.toBeNull();
  const parsed = JSON.parse(script!.textContent ?? "");
  return Array.isArray(parsed) ? parsed : [parsed];
}

describe("PageJsonLd — サイトURL単一ソース化と絶対URL整合", () => {
  it("既定パンくず（ホーム→ページ名）が SITE_URL 由来の絶対URLを出力する", () => {
    const { container } = render(
      <PageJsonLd name="料金プラン" description="料金の説明" path="/pricing" />
    );
    const [webPage, breadcrumb] = extractJsonLd(container);

    expect(webPage["@type"]).toBe("WebPage");
    expect(webPage.url).toBe(`${SITE_URL}/pricing`);

    expect(breadcrumb["@type"]).toBe("BreadcrumbList");
    const items = breadcrumb.itemListElement as { position: number; name: string; item: string }[];
    expect(items).toHaveLength(2);
    // 先頭はホーム＝サイトルート、次はページ自身
    expect(items[0].item).toBe(SITE_URL);
    expect(items[1].item).toBe(`${SITE_URL}/pricing`);
    expect(items[1].name).toBe("料金プラン");
    // position は 1 始まりの連番
    expect(items.map((i) => i.position)).toEqual([1, 2]);
  });

  it("明示パンくずをそのまま採用し、全 item が SITE_URL 由来になる", () => {
    const { container } = render(
      <PageJsonLd
        name="投資減税"
        description="石綿の説明"
        path="/asbestos-management/qualifications"
        breadcrumbs={[
          { name: "ホーム", url: SITE_URL },
          { name: "石綿対応支援", url: `${SITE_URL}/asbestos-management` },
          { name: "資格", url: `${SITE_URL}/asbestos-management/qualifications` },
        ]}
      />
    );
    const [, breadcrumb] = extractJsonLd(container);
    const items = breadcrumb.itemListElement as { position: number; item: string }[];
    expect(items).toHaveLength(3);
    expect(items.every((i) => (i.item as string).startsWith(SITE_URL))).toBe(true);
    expect(items[2].item).toBe(`${SITE_URL}/asbestos-management/qualifications`);
  });

  it("keywords / contributor が WebPage スキーマへ伝播する", () => {
    const { container } = render(
      <PageJsonLd
        name="安全用語集"
        description="用語の説明"
        path="/glossary"
        keywords={["安全", "衛生"]}
        contributor
      />
    );
    const [webPage] = extractJsonLd(container);
    expect(webPage.keywords).toBe("安全, 衛生");
    // 監修者は contributor（Person）として付与される
    const contributor = webPage.contributor as { "@type": string; name: string } | undefined;
    expect(contributor?.["@type"]).toBe("Person");
    // isPartOf のサイト名も単一ソース由来
    const isPartOf = webPage.isPartOf as { name: string; url: string };
    expect(isPartOf.name).toBe(SITE_NAME);
    expect(isPartOf.url).toBe(SITE_URL);
  });

  it("可視パンくず <nav> を1つ描画する（JSON-LD と対のユーザー向け表示）", () => {
    const { container } = render(
      <PageJsonLd name="料金プラン" description="料金の説明" path="/pricing" />
    );
    expect(container.querySelectorAll('nav[aria-label="パンくずリスト"]')).toHaveLength(1);
  });

  it("ソースにドメイン直書きリテラルが無い＝ハードコード回帰ガード", () => {
    // vitest は web/ を cwd に実行する（RUN 表示のルート）。
    const src = readFileSync(
      resolve(process.cwd(), "src/components/page-json-ld.tsx"),
      "utf8"
    );
    const bareDomain = SITE_URL.replace(/^https?:\/\//, "");
    // コメント含めドメイン文字列を一切埋め込まない（SITE_URL import 経由のみ）。
    expect(src).not.toContain(bareDomain);
    expect(src).toContain('from "@/lib/seo-metadata"');
  });
});
