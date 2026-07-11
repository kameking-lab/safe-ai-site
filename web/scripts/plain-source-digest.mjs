#!/usr/bin/env node
/**
 * 現場ことば版 執筆支援: コーパス法令ファイルから条ごとの
 * sourceTextHash（lib/plain/text-hash.ts と同一アルゴリズム）を出力する。
 *
 * 使い方:
 *   node scripts/plain-source-digest.mjs src/data/laws/sankketsu-kisoku.ts
 *
 * 出力: JSON 配列 [{ articleNum, articleTitle, hash, chars }]
 * 執筆者はこの hash を PlainArticle.sourceTextHash に転記する
 * （転記ミスは stale 扱いになり UI 非表示＋カバレッジで露見する）。
 *
 * 注: コーパスは「articleNum/articleTitle/text がこの順で並ぶオブジェクト
 * リテラルの配列」という規約で書かれているため、TS を実行せず正規表現で
 * 抽出する（Node からの TS import 制約の回避）。規約から外れた場合は
 * 件数が合わないので気づける。
 */
import { readFileSync } from "node:fs";

function fnv1a32(text, seed) {
  let hash = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

function plainSourceHash(text) {
  const a = fnv1a32(text, 0x811c9dc5);
  const b = fnv1a32(text, 0x01000193);
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/plain-source-digest.mjs <corpus .ts file>");
  process.exit(1);
}

const src = readFileSync(file, "utf8");
// articleNum → (articleTitle) → text の並び規約を前提に抽出
const re =
  /articleNum:\s*"((?:[^"\\]|\\.)*)"\s*,\s*(?:articleTitle:\s*"((?:[^"\\]|\\.)*)"\s*,\s*)?text:\s*"((?:[^"\\]|\\.)*)"/g;

const unescape = (s) => s.replace(/\\(["\\nrt])/g, (_, c) => ({ '"': '"', "\\": "\\", n: "\n", r: "\r", t: "\t" })[c]);

const out = [];
let m;
while ((m = re.exec(src)) !== null) {
  const text = unescape(m[3]);
  out.push({
    articleNum: unescape(m[1]),
    articleTitle: m[2] ? unescape(m[2]) : "",
    hash: plainSourceHash(text),
    chars: text.length,
  });
}
console.log(JSON.stringify(out, null, 2));
console.error(`total: ${out.length} articles`);
