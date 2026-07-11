#!/usr/bin/env node
/**
 * チャットボット生成品質eval（Phase 2 実応答版・診断04 T7）。
 *
 * chatbot-phase2-metrics.test.ts:192 で「次タスク」とされたまま未実装だった
 * 実応答evalの実行体。診断04の実機23問（chatbot-genquality.fixture.ts）を
 * 対象環境の /api/chatbot に直叩きし、結論キーフレーズ・根拠条文・範囲外対応を
 * 機械採点する（採点ロジック: chatbot-genquality-scorer.ts）。
 *
 * 走り方（chatbot-eval.ts と同じ設計: 採点ロジックを二重実装しないため
 * vitest（chatbot-genquality-live.test.ts）を起動し、レポートJSONを集計表示する）:
 *
 *   npm run eval:chatbot-gen                        # localhost:3000 を測定
 *   CHATBOT_EVAL_BASE_URL=https://www.anzen-ai-portal.jp npm run eval:chatbot-gen
 *   CHATBOT_GENQUALITY_INPUT=path/to/report.json npm run eval:chatbot-gen  # 再採点
 *   CHATBOT_GENQUALITY_TARGET=0.6 npm run eval:chatbot-gen  # 完全正答率の下限判定つき
 *
 * 注意: 対象環境の Gemini API を23問分消費する。定時実行化はオーナー承認後
 * （CLAUDE.md「新しい外部API/サービスの導入」に準ずる運用変更のため）。
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const isWindows = process.platform === "win32";
const vitestBin = resolve(
  root,
  isWindows ? "node_modules/.bin/vitest.cmd" : "node_modules/.bin/vitest"
);

const outPath = resolve(
  root,
  process.env.CHATBOT_GENQUALITY_OUT || ".genquality/chatbot-genquality-latest.json"
);

console.log(
  `[chatbot-eval-phase2] 実機51問を測定中… (${
    process.env.CHATBOT_GENQUALITY_INPUT
      ? `再採点: ${process.env.CHATBOT_GENQUALITY_INPUT}`
      : process.env.CHATBOT_EVAL_BASE_URL || "http://127.0.0.1:3000"
  })`
);
const proc = spawnSync(vitestBin, ["run", "chatbot-genquality-live", "--reporter=verbose"], {
  cwd: root,
  encoding: "utf8",
  shell: isWindows,
  env: { ...process.env, CHATBOT_GENQUALITY_LIVE: "1", CHATBOT_GENQUALITY_OUT: outPath },
});

if (proc.status !== 0) {
  console.error("[chatbot-eval-phase2] 測定ハーネスが失敗しました:");
  console.error(((proc.stdout ?? "") + (proc.stderr ?? "")).slice(-3000));
  process.exit(1);
}

type Report = {
  generated_at: string;
  base_url: string;
  mode: string;
  summary: {
    scorable: number;
    correct: number;
    partial: number;
    incorrect: number;
    strictAccuracy: number;
    usefulRate: number;
    outOfScope: { total: number; handled: number };
    failureKindCounts: Record<string, number>;
  };
  results: Array<{ id: string; verdict: string; question: string; failures: string[] }>;
};

const report = JSON.parse(readFileSync(outPath, "utf8")) as Report;
const s = report.summary;

console.log(`\n[chatbot-eval-phase2] ${report.base_url} (${report.generated_at})`);
console.log(
  `  完全正答: ${s.correct}/${s.scorable} = ${(s.strictAccuracy * 100).toFixed(1)}%（診断04時点は12/20=60%）`
);
console.log(
  `  概ね有用: ${s.correct + s.partial}/${s.scorable} = ${(s.usefulRate * 100).toFixed(1)}%（同85%） / 範囲外対応 ${s.outOfScope.handled}/${s.outOfScope.total}`
);
const kinds = Object.entries(s.failureKindCounts).filter(([, n]) => n > 0);
if (kinds.length > 0) {
  console.log(`  失敗分類: ${kinds.map(([k, n]) => `${k}=${n}`).join(", ")}`);
}
for (const r of report.results.filter((r) => r.verdict !== "correct")) {
  console.log(`  [${r.verdict === "incorrect" ? "×" : "△"}] ${r.id} ${r.question}`);
  for (const f of r.failures) console.log(`      - ${f}`);
}
console.log(`  レポート: ${outPath}`);

const target = process.env.CHATBOT_GENQUALITY_TARGET
  ? Number(process.env.CHATBOT_GENQUALITY_TARGET)
  : undefined;
if (target !== undefined && s.strictAccuracy < target) {
  console.error(
    `[chatbot-eval-phase2] 完全正答率 ${(s.strictAccuracy * 100).toFixed(1)}% が目標 ${(target * 100).toFixed(0)}% 未達`
  );
  process.exit(2);
}
