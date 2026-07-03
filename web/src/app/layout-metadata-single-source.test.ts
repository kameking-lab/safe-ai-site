import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SITE_URL,
  SITE_NAME,
  SITE_LOCALE,
  SITE_ALTERNATE_LOCALES,
} from "@/lib/seo-metadata";

/**
 * 柱C-3 / S DRY 回帰テスト:
 * ルート layout.tsx の metadata が出力する絶対URLオリジン（metadataBase・サイトルート
 * canonical）と locale/siteName を、seo-metadata.ts の単一ソースへ集約した状態を固定する。
 *
 * 旧状態: sitemap/robots/og-image/json-ld/page-json-ld は既に SITE_URL 集約済みだったが、
 * ルート layout.tsx の `metadataBase` と `alternates.canonical` だけが
 * `https://www.anzen-ai-portal.jp` をドメイン直書きしていた（locale="ja_JP" /
 * alternateLocale=["en_US"] / siteName="安全AIポータル" も同様の直書き）。
 * ここは全ページの og:url/canonical 解決の基点かつサイトルート canonical という最重要箇所で、
 * SITE_URL を別ドメインへ替えても追従しない構造上の穴だった。
 *
 * 各定数は従来の直書き値と同値のため、metadata 出力は byte-identical。本テストは
 * (1) ドメイン直書きが layout.tsx から消えたこと（再発の機械封止）と
 * (2) 単一ソースの定数値が従来リテラルと同値であること（byte-identical の担保）を守る。
 */
const readSrc = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");
const bareDomain = SITE_URL.replace(/^https?:\/\//, "");

describe("ルート layout.tsx metadata のドメイン/ロケール単一ソース化（柱C-3 / S DRY）", () => {
  const src = readSrc("src/app/layout.tsx");

  it("layout.tsx はドメイン直書きを持たず SITE_URL を import する", () => {
    // metadata 内のオリジン直書き（コメント含む）は一切残さない＝SITE_URL 経由のみ。
    expect(src).not.toContain(bareDomain);
    expect(src).toContain("@/lib/seo-metadata");
    expect(src).toContain("new URL(SITE_URL)");
    expect(src).toContain("canonical: SITE_URL");
  });

  it("locale/alternateLocale/siteName も直書きせず単一ソース定数を使う", () => {
    expect(src).toContain("locale: SITE_LOCALE");
    expect(src).toContain("alternateLocale: [...SITE_ALTERNATE_LOCALES]");
    expect(src).toContain("siteName: SITE_NAME");
    // 旧直書きリテラルが残っていないこと（byte-identical 集約の副産物）。
    expect(src).not.toContain('locale: "ja_JP"');
    expect(src).not.toContain('siteName: "安全AIポータル"');
  });

  it("単一ソース定数は従来の直書き値と同値＝出力は byte-identical", () => {
    // これらが変わると layout.tsx の出力も変わるため、byte-identical の前提を固定する。
    expect(SITE_URL).toBe("https://www.anzen-ai-portal.jp");
    expect(SITE_NAME).toBe("安全AIポータル");
    expect(SITE_LOCALE).toBe("ja_JP");
    expect([...SITE_ALTERNATE_LOCALES]).toEqual(["en_US"]);
  });
});
