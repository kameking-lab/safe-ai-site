#!/usr/bin/env node
/**
 * 現場ことば版 量産支援: 全文スナップショット（laws-fulltext）から、条ごとの
 * sourceTextHash（lib/plain/text-hash.ts と同一アルゴリズム）と原文本文を出力する。
 *
 * plain-source-digest.mjs は curated コーパス（.ts）用。安衛則の量産は照合先が
 * 原文＝全文スナップショット（JSON）なので、こちらを使う。fidelity v2 の
 * fulltext アンカー（plain-fulltext-anchor.test.ts）が照合する原文と同一の
 * text からハッシュを計算するため、ここで出た hash をそのまま
 * PlainArticle.sourceTextHash に転記すれば「原文一致（fresh）」になる。
 *
 * 使い方:
 *   # 全条
 *   node scripts/plain-fulltext-digest.mjs 347M50002000032
 *   # 条番号レンジ（主番号で from..to、担当シャード範囲だけ抜く）
 *   node scripts/plain-fulltext-digest.mjs 347M50002000032 --from 654 --to 682
 *   # 削除条を除く（既定は含める）
 *   node scripts/plain-fulltext-digest.mjs 347M50002000032 --from 101 --to 151 --live-only
 *
 * 出力: JSON 配列 [{ articleNum, caption, isDeleted, sortKey, hash, chars, text }]
 *   - hash を PlainArticle.sourceTextHash に転記。
 *   - text は原文そのもの（言い換えの元。数値・単位・限度方向・義務主体・参照条・
 *     ただし書・罰則をここから拾って plainText / omissions に保存する）。
 *   - isDeleted:true の条は「削除」条＝plain 不要（書かない）。
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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

const args = process.argv.slice(2);
const lawId = args[0];
if (!lawId) {
  console.error(
    "usage: node scripts/plain-fulltext-digest.mjs <lawId> [--from N] [--to N] [--live-only]"
  );
  process.exit(1);
}
function optNum(name) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? Number(args[i + 1]) : undefined;
}
const from = optNum("--from");
const to = optNum("--to");
const liveOnly = args.includes("--live-only");

const here = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(here, "..", "src", "data", "laws-fulltext", `${lawId}.json`);
const law = JSON.parse(readFileSync(jsonPath, "utf8"));

const out = [];
for (const a of law.articles) {
  const primary = a.sortKey?.[0] ?? 0;
  if (from !== undefined && primary < from) continue;
  if (to !== undefined && primary > to) continue;
  if (liveOnly && a.isDeleted) continue;
  out.push({
    articleNum: a.articleNum,
    caption: a.caption ?? "",
    isDeleted: !!a.isDeleted,
    sortKey: a.sortKey,
    hash: plainSourceHash(a.text),
    chars: a.text.length,
    text: a.text,
  });
}
console.log(JSON.stringify(out, null, 2));
const live = out.filter((o) => !o.isDeleted).length;
console.error(
  `total: ${out.length} 条（うち live=${live} / 削除=${out.length - live}）` +
    (from !== undefined || to !== undefined ? ` [range 第${from ?? "?"}〜第${to ?? "?"}条]` : "")
);
