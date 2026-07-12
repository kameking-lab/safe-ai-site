#!/usr/bin/env node
/**
 * fidelity v2 の全512条一括再監査。
 * 生成日ラチェットを外して "全 plain × 全 v2 検査" を回し、違反を JSON で吐く。
 *
 * 使い方:
 *   node scripts/plain-v2-audit.mjs > docs/plain-v2-audit-2026-07-13.json
 *
 * 出力: { totals: {...}, byLaw: {...}, entries: [{lawId, articleNum, kinds:[...], messages:[...]}, ...] }
 * BACKLOG-plain-v2-rewrite で執筆キューに積むための土台。
 *
 * 実装: vitest 経由で回すのが本筋だが、CI と混同しないよう別プロセスで動く
 * ため、tsx で TypeScript を直接評価する。
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runnerPath = path.join(__dirname, "_plain-v2-audit-runner.mts");

const script = `
import { LAW_NAVI_ENTRIES } from "@/lib/law-navi/permalink";
import { checkFidelity, FIDELITY_V2_SINCE } from "@/lib/plain/fidelity";
import { plainSourceHash } from "@/lib/plain/text-hash";
import { allPlainArticles } from "@/data/plain/index";

const CORPUS_BY_KEY = new Map(
  LAW_NAVI_ENTRIES.map((e) => [\`\${e.egovLawId}|\${e.article.articleNum}\`, e.article])
);

const entries: any[] = [];
const kindCounts: Record<string, number> = {};
const byLaw: Record<string, { total: number; violated: number; kinds: Record<string, number> }> = {};

for (const p of allPlainArticles) {
  const article = CORPUS_BY_KEY.get(\`\${p.egovLawId}|\${p.articleNum}\`);
  if (!article) continue;
  const stale = plainSourceHash(article.text) !== p.sourceTextHash;
  byLaw[p.egovLawId] ??= { total: 0, violated: 0, kinds: {} };
  byLaw[p.egovLawId].total++;
  if (stale) continue;
  // v2 検査を強制するため、内部の isV2 がオンになる generatedAt を仮に渡す
  const forcedV2 = { ...p, generatedAt: FIDELITY_V2_SINCE };
  const violations = checkFidelity(article, forcedV2);
  if (violations.length === 0) continue;
  byLaw[p.egovLawId].violated++;
  const kinds = violations.map((v) => v.kind);
  for (const k of kinds) {
    kindCounts[k] = (kindCounts[k] ?? 0) + 1;
    byLaw[p.egovLawId].kinds[k] = (byLaw[p.egovLawId].kinds[k] ?? 0) + 1;
  }
  entries.push({
    egovLawId: p.egovLawId,
    articleNum: p.articleNum,
    generatedAt: p.generatedAt,
    kinds,
    messages: violations.map((v) => v.message),
  });
}

const totals = {
  totalPlain: allPlainArticles.length,
  totalViolated: entries.length,
  kindCounts,
};
console.log(JSON.stringify({ totals, byLaw, entries }, null, 2));
`;

writeFileSync(runnerPath, script);
try {
  execSync(`npx tsx ${runnerPath}`, { stdio: "inherit" });
} finally {
  // 常設スクリプトではないので runner を残さない
  try {
    execSync(`rm -f ${runnerPath}`);
  } catch {}
}
