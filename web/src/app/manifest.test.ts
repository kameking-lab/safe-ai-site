import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import manifest from "./manifest";

/**
 * PWA マニフェスト回帰テスト。
 *
 * 主眼はショートカット（ホーム画面ロングタップのクイックアクション）が
 * すべて**実在ルート**を指すことの固定＝幽霊ショートカット防止。ショートカット URL は
 * リンク切れになっても PWA インストール時にしか露見せず気づきにくいため、
 * page.tsx の実在をビルド外でも機械突合しておく（sitemap の孤立ページ突合と同方針）。
 *
 * 注: /search は noindex（クエリ毎の薄い重複ページのため）だが、ショートカットは
 * インストール済みユーザー向けの導線でありクローラ向けの indexability とは無関係のため
 * 収載してよい。ここでは「実在するか」だけを検証し「indexable か」は問わない。
 */
describe("manifest.ts（PWA ショートカット実在ガード）", () => {
  const m = manifest();

  /** URL パス（クエリ/ハッシュ除去）に対応する page.tsx が app ルートに実在するか。 */
  function routeExists(urlPath: string): boolean {
    const clean = urlPath.replace(/[?#].*$/, "").replace(/^\/+|\/+$/g, "");
    // ルート "/" はトップページ、それ以外は (main) 配下 → app 直下の順で探す。
    const candidates = clean === ""
      ? ["src/app/(main)/page.tsx", "src/app/page.tsx"]
      : [
          `src/app/(main)/${clean}/page.tsx`,
          `src/app/${clean}/page.tsx`,
        ];
    return candidates.some((rel) => existsSync(resolve(process.cwd(), rel)));
  }

  it("shortcuts が存在し、必須フィールドを備える", () => {
    expect(Array.isArray(m.shortcuts)).toBe(true);
    expect(m.shortcuts!.length).toBeGreaterThanOrEqual(3);
    for (const s of m.shortcuts!) {
      expect(s.name).toBeTruthy();
      expect(s.url).toMatch(/^\//); // 内部絶対パス
    }
  });

  it("全ショートカット URL が実在ルート（page.tsx）へ解決する＝幽霊ショートカット0", () => {
    for (const s of m.shortcuts!) {
      expect(routeExists(s.url), `ショートカット「${s.name}」の ${s.url} が実在しない`).toBe(true);
    }
  });

  it("ショートカット URL に重複がない", () => {
    const urls = m.shortcuts!.map((s) => s.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("発見性の入口（横断検索 /search・AI質問 /chatbot）をショートカットに含む", () => {
    const urls = new Set(m.shortcuts!.map((s) => s.url));
    expect(urls.has("/search")).toBe(true);
    expect(urls.has("/chatbot")).toBe(true);
  });

  it("start_url もアプリ内の実在ルートを指す", () => {
    expect(m.start_url).toBeTruthy();
    expect(routeExists(m.start_url!)).toBe(true);
  });
});

/**
 * PWA メディア資産（icons / screenshots）の実在ガード＝幽霊資産防止。
 *
 * ショートカット URL と同型の穴が manifest の静的メディア参照にも存在する＝
 * icon / screenshot の `src` は public/ 配下の実ファイルを指すが、他班が public/ の
 * 画像をリネーム・削除しても manifest.ts の参照は文字列のまま残り、リンク切れは
 * PWA インストール時にしか露見しない（気づきにくい）。特に **192px と 512px の icon が
 * 揃っていることは Chrome のインストール可能性（beforeinstallprompt）の必須要件**で、
 * 512 が消えるとアプリが丸ごとインストール不可になるのに CI では無検知だった。
 * ここで src → public/ の実ファイルを機械突合し、発見性の要（ホーム画面設置）を守る。
 */
describe("manifest.ts（メディア資産 実在ガード）", () => {
  const m = manifest();

  /** manifest の絶対 src（"/foo.png"）を public/ 配下の実ファイルへ解決できるか。 */
  function publicAssetExists(src: string): boolean {
    const rel = src.replace(/^\/+/, "");
    return existsSync(resolve(process.cwd(), "public", rel));
  }

  it("全 icon の src が public/ の実ファイルへ解決する＝幽霊アイコン0", () => {
    expect(Array.isArray(m.icons)).toBe(true);
    expect(m.icons!.length).toBeGreaterThan(0);
    for (const icon of m.icons!) {
      expect(
        publicAssetExists(icon.src),
        `icon「${icon.src}」(${icon.sizes ?? "?"}) の実ファイルが public/ に無い`,
      ).toBe(true);
    }
  });

  it("インストール可能性の必須要件＝192px と 512px の png icon が実在する", () => {
    // Chrome の PWA インストール要件: 192 と 512 の maskable/any icon が最低1枚ずつ必要。
    for (const size of ["192x192", "512x512"]) {
      const match = m.icons!.find(
        (icon) => icon.sizes === size && icon.type === "image/png" && publicAssetExists(icon.src),
      );
      expect(match, `${size} の実在する png icon が manifest に無い`).toBeTruthy();
    }
  });

  it("全 screenshot の src が public/ の実ファイルへ解決する＝幽霊スクショ0", () => {
    expect(Array.isArray(m.screenshots)).toBe(true);
    expect(m.screenshots!.length).toBeGreaterThan(0);
    for (const shot of m.screenshots!) {
      expect(
        publicAssetExists(shot.src),
        `screenshot「${shot.src}」(${shot.form_factor ?? "?"}) の実ファイルが public/ に無い`,
      ).toBe(true);
    }
  });

  it("リッチなインストール UI 用に wide / narrow 両 form_factor の screenshot を備える", () => {
    // Chrome (wide) と Android (narrow) で別々のプレビューが要る。片方欠けると
    // その面のリッチインストールカードが出ず素の URL 表示に落ちる。
    const formFactors = new Set(m.screenshots!.map((s) => s.form_factor));
    expect(formFactors.has("wide")).toBe(true);
    expect(formFactors.has("narrow")).toBe(true);
  });
});
