/**
 * 法令ナビ 分野インデックスの候補列挙スクリプト（二層生成のレイヤ1）。
 *
 * 使い方:
 *   node --experimental-strip-types scripts/law-navi-topic-scan.mjs <走査語> [走査語...]
 *   例: npx tsx scripts/law-navi-topic-scan.mjs フォークリフト 車両系荷役運搬機械
 *
 * 出力: 走査語が keywords / articleTitle / text に現れる curated 条文と、
 * タイトルに現れる通達（mhlwNotices）の候補一覧（LawNaviTopic 追記用の下書き）。
 * ここで出た候補を**そのまま採録しない**こと。人手レビューで採否を判断し、
 * data/law-navi/topics.ts の reviewNote に判断根拠を書き残す（二層生成のレイヤ2）。
 * 参照整合は topics-integrity.test.ts が機械固定する。
 */
import { allLawArticles, mhlwLawArticles } from "../src/data/laws/index.ts";
import { mhlwNotices } from "../src/data/mhlw-notices.ts";

const terms = process.argv.slice(2);
if (terms.length === 0) {
  console.error("usage: npx tsx scripts/law-navi-topic-scan.mjs <走査語> [走査語...]");
  process.exit(1);
}

const mhlwSet = new Set(mhlwLawArticles);
const curated = allLawArticles.filter((a) => !mhlwSet.has(a));

const hitReason = (a, term) => {
  if (a.keywords?.some((k) => k.includes(term))) return "keywords";
  if ((a.articleTitle ?? "").includes(term)) return "title";
  if ((a.text ?? "").includes(term)) return "text";
  return null;
};

console.log(`# topic-scan 候補（走査語: ${terms.join(" / ")}）`);
console.log(`## 条文候補（curated ${curated.length}条から）`);
const seen = new Set();
for (const a of curated) {
  for (const term of terms) {
    const reason = hitReason(a, term);
    if (!reason) continue;
    const key = `${a.law}|${a.articleNum}`;
    if (seen.has(key)) break;
    seen.add(key);
    console.log(
      `  { lawShort: "${a.lawShort}", articleNum: "${a.articleNum}", role: "TODO(${a.articleTitle})" }, // hit=${reason}:${term}`
    );
    break;
  }
}

console.log(`## 通達候補（mhlwNotices ${mhlwNotices.length}件から・タイトル一致）`);
for (const n of mhlwNotices) {
  const t = terms.find((term) => n.title.includes(term));
  if (!t) continue;
  console.log(`  "${n.id}", // ${n.docType} ${n.title.slice(0, 60)}`);
}
console.log("## ↑候補はレビュー必須（廃止・旧版・別機械の混入に注意）。採否理由を reviewNote へ。");
