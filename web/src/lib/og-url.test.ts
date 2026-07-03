import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  ogImageUrl,
  clampOgText,
  ogTitleFontSize,
  OG_TITLE_MAX,
  OG_DESC_MAX,
} from "./og-url";
import { SITE_DISPLAY_HOST, SITE_URL } from "./seo-metadata";

// このテストの起点（src/lib）から app/api/og/route.tsx への相対解決
const HERE = dirname(fileURLToPath(import.meta.url));
const OG_ROUTE = resolve(HERE, "../app/api/og/route.tsx");

/** ogImageUrl の返す相対パスを URL としてパースする（クエリ検証用の小道具） */
function parse(url: string): URLSearchParams {
  return new URL(url, "https://example.test").searchParams;
}

describe("ogImageUrl — OGP 画像 URL 生成", () => {
  it("title だけなら /api/og?title=... を返す（desc・lang は付けない）", () => {
    const url = ogImageUrl("現場の安全");
    expect(url.startsWith("/api/og?")).toBe(true);
    const q = parse(url);
    expect(q.get("title")).toBe("現場の安全");
    expect(q.has("desc")).toBe(false);
    expect(q.has("lang")).toBe(false);
  });

  it("desc を渡すと desc パラメータが付く", () => {
    const q = parse(ogImageUrl("見出し", "説明文"));
    expect(q.get("title")).toBe("見出し");
    expect(q.get("desc")).toBe("説明文");
  });

  it("lang='ja' は既定言語のため lang パラメータを付けない（route 側 default=ja と整合）", () => {
    const q = parse(ogImageUrl("見出し", undefined, "ja"));
    expect(q.has("lang")).toBe(false);
  });

  it("lang='en' のときだけ lang=en を付ける", () => {
    const q = parse(ogImageUrl("Heading", "Desc", "en"));
    expect(q.get("lang")).toBe("en");
    expect(q.get("title")).toBe("Heading");
    expect(q.get("desc")).toBe("Desc");
  });

  it("記号・空白を含む title/desc は URL エンコードされ、パース後に原文へ復元される", () => {
    const title = "石綿 & 事前調査 = 必須?";
    const desc = "SDS交付は義務？（安衛法57条の2）";
    const url = ogImageUrl(title, desc);
    // 生の & や ? がクエリ構造を壊さない＝エンコード済みであること
    expect(url).not.toContain("石綿 &");
    const q = parse(url);
    expect(q.get("title")).toBe(title);
    expect(q.get("desc")).toBe(desc);
  });
});

describe("SITE_DISPLAY_HOST — OGP 透かしドメインの単一ソース", () => {
  it("SITE_URL からプロトコル・www.・末尾スラッシュを除いたホスト名になる", () => {
    const expected = SITE_URL
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "");
    expect(SITE_DISPLAY_HOST).toBe(expected);
    // プロトコル・www.・末尾スラッシュ・パスを含まない見せ用ホスト
    expect(SITE_DISPLAY_HOST).not.toMatch(/^https?:\/\//);
    expect(SITE_DISPLAY_HOST).not.toMatch(/^www\./);
    expect(SITE_DISPLAY_HOST.endsWith("/")).toBe(false);
    expect(SITE_DISPLAY_HOST).not.toContain("/");
    expect(SITE_DISPLAY_HOST.length).toBeGreaterThan(0);
  });

  it("現行の本番ドメイン（www 無し）と一致＝挙動不変を固定", () => {
    expect(SITE_DISPLAY_HOST).toBe("anzen-ai-portal.jp");
  });
});

describe("og route — 透かしドメインのハードコード回帰ガード", () => {
  const src = readFileSync(OG_ROUTE, "utf8");

  it("SITE_DISPLAY_HOST を seo-metadata から import している", () => {
    expect(src).toMatch(/import\s*\{[^}]*\bSITE_DISPLAY_HOST\b[^}]*\}\s*from\s*["']@\/lib\/seo-metadata["']/);
    expect(src).toContain("{SITE_DISPLAY_HOST}");
  });

  it("裸のドメインリテラルを直書きしていない（再ドリフト防止）", () => {
    // SITE_URL のホスト名（www除去後）が JSX/文字列に literal で現れないこと
    const bareHost = SITE_URL.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
    expect(src.includes(bareHost)).toBe(false);
  });
});

describe("clampOgText — OGP テキストの縦溢れ防止クランプ", () => {
  it("上限以下のテキストはそのまま返す（既存の短いラベルは byte-identical）", () => {
    const t = "現場の安全を、AIで変える。";
    expect(clampOgText(t, OG_TITLE_MAX)).toBe(t);
    // ちょうど上限長も無改変（境界）
    const exact = "あ".repeat(OG_TITLE_MAX);
    expect(clampOgText(exact, OG_TITLE_MAX)).toBe(exact);
    expect(Array.from(clampOgText(exact, OG_TITLE_MAX)).length).toBe(OG_TITLE_MAX);
  });

  it("上限超過は末尾を「…」へ丸め、コードポイント総数は上限を超えない", () => {
    const long = "あ".repeat(OG_TITLE_MAX + 30);
    const out = clampOgText(long, OG_TITLE_MAX);
    expect(out.endsWith("…")).toBe(true);
    expect(Array.from(out).length).toBe(OG_TITLE_MAX);
    // 本文は上限-1字＋省略記号
    expect(out).toBe("あ".repeat(OG_TITLE_MAX - 1) + "…");
  });

  it("コードポイント単位で数え、サロゲートペア（絵文字）を分断しない", () => {
    // 各1コードポイントの絵文字を上限+5個。丸めても壊れた半端サロゲートを残さない。
    const emoji = "🦺".repeat(OG_TITLE_MAX + 5);
    const out = clampOgText(emoji, OG_TITLE_MAX);
    expect(Array.from(out).length).toBe(OG_TITLE_MAX);
    // 末尾の「…」を除いた本文が全て完全な絵文字（U+FFFD 置換文字が出ない）
    expect(out.includes("�")).toBe(false);
    expect(out).toBe("🦺".repeat(OG_TITLE_MAX - 1) + "…");
  });

  it("desc も同じ規約で上限 OG_DESC_MAX に丸まる", () => {
    const long = "説明".repeat(OG_DESC_MAX); // 2字×OG_DESC_MAX = 上限超
    const out = clampOgText(long, OG_DESC_MAX);
    expect(Array.from(out).length).toBe(OG_DESC_MAX);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("ogTitleFontSize — title 長に応じた描画フォントサイズ", () => {
  it("20字以下=52px・21〜36字=40px の既存挙動を保つ", () => {
    expect(ogTitleFontSize(0)).toBe(52);
    expect(ogTitleFontSize(20)).toBe(52);
    expect(ogTitleFontSize(21)).toBe(40);
    expect(ogTitleFontSize(36)).toBe(40);
  });

  it("過長域（37字以上）だけ 32px へ落として縦溢れを防ぐ", () => {
    expect(ogTitleFontSize(37)).toBe(32);
    expect(ogTitleFontSize(OG_TITLE_MAX)).toBe(32);
  });
});

describe("og route — 過長テキストの縦溢れ防止が配線されている", () => {
  const src = readFileSync(OG_ROUTE, "utf8");

  it("title/desc を clampOgText で畳んでから描画している（生の query 値を直描画しない）", () => {
    expect(src).toMatch(/import\s*\{[^}]*\bclampOgText\b[^}]*\}\s*from\s*["']@\/lib\/og-url["']/);
    // title・desc 双方がクランプを通ること
    expect(src).toMatch(/clampOgText\(\s*searchParams\.get\("title"\)[^)]*OG_TITLE_MAX\)/);
    expect(src).toMatch(/clampOgText\(\s*searchParams\.get\("desc"\)[^)]*OG_DESC_MAX\)/);
  });

  it("title フォントサイズは ogTitleFontSize 経由（生の三項ハードコードを撤去）", () => {
    expect(src).toContain("ogTitleFontSize(title.length)");
    // 旧来の 2 段階ハードコード（>20 ? 40 : 52）が残っていないこと
    expect(src).not.toMatch(/title\.length\s*>\s*20\s*\?/);
  });
});
