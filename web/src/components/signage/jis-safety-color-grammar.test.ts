import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * サイネージ柱0（ビジュアルファースト）の無読テスト用回帰ガード。
 *
 * JIS安全色の文法では「注意＝黄」は黒地黒文字で示す。明るい注意黄
 * (Tailwind の amber-300/400/500) に白文字を乗せると遠目で潰れ
 * (amber-500 #f59e0b × 白 ≈ 2.1:1 で WCAG 不適合)、現場のTVを数メートル
 * 先から見たときに数字・ラベルが読めなくなる。結論ストリップ
 * (SignageConclusionStrip) は amber → text-amber-950 で統一済みのため、
 * サイネージ配下の全コンポーネントを同じ文法に揃える。
 *
 * 暗い黄(amber-600以上)は白文字でも十分なコントラストが出るため対象外。
 */

const SIGNAGE_DIR = resolve(process.cwd(), "src/components/signage");

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".tsx"))
    .map((e) => resolve(dir, e.name));
}

// 単一の className 文字列の中で 明るい注意黄背景 と 白文字 が同居していないか。
// 文字列リテラル境界（" ' `）で分割して評価するので、
// `cond ? "bg-rose-600 text-white" : "bg-amber-500 text-amber-950"` のように
// 三項の別々の枝に分かれている場合は誤検知しない。
const BRIGHT_AMBER_BG = /bg-amber-[345]00/;
const WHITE_TEXT = /text-white/;

describe("サイネージ JIS安全色の文法: 注意黄は黒系文字", () => {
  const files = tsxFiles(SIGNAGE_DIR);

  it("対象コンポーネントを少なくとも1つ走査している", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const name = file.split(/[\\/]/).pop() ?? file;
    it(`${name}: 明るい注意黄(amber-300/400/500)に白文字を乗せていない`, () => {
      const chunks = readFileSync(file, "utf8").split(/["'`]/);
      const offenders = chunks.filter(
        (chunk) => BRIGHT_AMBER_BG.test(chunk) && WHITE_TEXT.test(chunk),
      );
      expect(
        offenders.map((o) => o.trim()),
        "明るい注意黄背景には text-amber-950 等の黒系文字を使ってください",
      ).toEqual([]);
    });
  }
});
