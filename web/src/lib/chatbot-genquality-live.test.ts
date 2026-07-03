/**
 * 生成品質evalの実機測定ハーネス（診断04 T7の「chatbot-eval-phase2」実行体）。
 *
 * Gemini実応答（またはRAG degraded応答）を /api/chatbot へ直叩きし、
 * chatbot-genquality-scorer で機械採点してレポートJSONを書き出す。
 * 本番APIとGeminiクォータを消費するため、CIの `npm run test` では
 * 環境変数ゲートで全skipされる（常設回帰は chatbot-genquality.test.ts が担当）。
 *
 * 実行方法（推奨: scripts/chatbot-eval-phase2.ts 経由 = npm run eval:chatbot-gen）:
 *   CHATBOT_GENQUALITY_LIVE=1 npx vitest run chatbot-genquality-live
 *
 * 環境変数:
 *   CHATBOT_GENQUALITY_LIVE=1     … 実行ゲート（未設定ならskip）
 *   CHATBOT_EVAL_BASE_URL         … 対象環境（default http://127.0.0.1:3000）
 *   CHATBOT_GENQUALITY_INPUT      … 過去レポートJSONを再採点（fetchなし・注入実証用）
 *   CHATBOT_GENQUALITY_OUT        … レポート出力先（default .genquality/chatbot-genquality-latest.json）
 */

import { describe, it, expect } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  scoreGenQuality,
  summarizeScores,
  type GenQualityResponse,
  type GenQualityScore,
  type GenQualitySummary,
} from "@/lib/chatbot-genquality-scorer";
import { GEN_QUALITY_CASES, type GenQualityCase } from "@/lib/chatbot-genquality.fixture";

const LIVE = process.env.CHATBOT_GENQUALITY_LIVE === "1";
const BASE_URL = process.env.CHATBOT_EVAL_BASE_URL || "http://127.0.0.1:3000";
const INPUT = process.env.CHATBOT_GENQUALITY_INPUT;
const OUT = resolve(
  process.env.CHATBOT_GENQUALITY_OUT || ".genquality/chatbot-genquality-latest.json"
);
const INTERVAL_MS = 4000; // 診断04の本番プローブと同じレート（レート制限対策）

export type GenQualityRunResult = {
  id: string;
  category: GenQualityCase["category"];
  diagVerdict: GenQualityCase["diagVerdict"];
  question: string;
  httpStatus: number;
  verdict: GenQualityScore["verdict"];
  checks: GenQualityScore["checks"];
  failures: string[];
  confidence?: string;
  confidenceScore?: number;
  /** 再採点（CHATBOT_GENQUALITY_INPUT）と注入実証のため生応答を保持する */
  response: GenQualityResponse;
};

export type GenQualityReport = {
  generated_at: string;
  base_url: string;
  mode: "live" | "rescore";
  summary: GenQualitySummary;
  results: GenQualityRunResult[];
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function probeOne(tc: GenQualityCase): Promise<{ status: number; resp: GenQualityResponse }> {
  const res = await fetch(`${BASE_URL}/api/chatbot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: tc.question }),
  });
  const body = (await res.json()) as GenQualityResponse;
  return {
    status: res.status,
    resp: {
      answer: body.answer ?? "",
      confidence: body.confidence,
      confidenceScore: body.confidenceScore,
      source_type: body.source_type,
      sources: (body.sources ?? []).map((s) => ({ law: s.law, article: s.article })),
      citations: (body.citations ?? []).map((c) => ({
        lawShort: c.lawShort,
        articleNum: c.articleNum,
      })),
      scopeWarnings: body.scopeWarnings,
    },
  };
}

describe.runIf(LIVE)("生成品質eval 実機測定（診断04の23問）", () => {
  it(
    `23問を採点しレポートを出力する（${INPUT ? "再採点" : BASE_URL}）`,
    { timeout: 20 * 60 * 1000 },
    async () => {
      const results: GenQualityRunResult[] = [];

      if (INPUT) {
        // 再採点モード: 過去の生応答を採点し直す（採点器の変更検証・誤答注入実証用）
        const prev = JSON.parse(readFileSync(resolve(INPUT), "utf8")) as GenQualityReport;
        for (const tc of GEN_QUALITY_CASES) {
          const prevResult = prev.results.find((r) => r.id === tc.id);
          if (!prevResult) throw new Error(`入力レポートに ${tc.id} がない: ${INPUT}`);
          const score = scoreGenQuality(tc, prevResult.response);
          results.push({ ...prevResult, verdict: score.verdict, checks: score.checks, failures: score.failures });
        }
      } else {
        for (const tc of GEN_QUALITY_CASES) {
          let status = 0;
          let resp: GenQualityResponse = { answer: "" };
          try {
            ({ status, resp } = await probeOne(tc));
          } catch (err) {
            console.error(
              `[genquality] ${tc.id} fetch失敗: ${err instanceof Error ? err.message : String(err)}`
            );
          }
          const score = scoreGenQuality(tc, resp);
          results.push({
            id: tc.id,
            category: tc.category,
            diagVerdict: tc.diagVerdict,
            question: tc.question,
            httpStatus: status,
            verdict: score.verdict,
            checks: score.checks,
            failures: score.failures,
            confidence: resp.confidence,
            confidenceScore: resp.confidenceScore,
            response: resp,
          });
          // 測定ハーネスとしての進捗ログ（1問あたり最大30秒程度かかる）
          console.log(
            `[genquality] ${tc.id} ${score.verdict}${score.failures.length > 0 ? ` (${score.failures.join(" / ")})` : ""}`
          );
          await sleep(INTERVAL_MS);
        }
      }

      // failureKinds 込みの集計は生応答から採点し直して得る（レポートには残さない中間値）
      const rescored = GEN_QUALITY_CASES.map((tc) => {
        const r = results.find((x) => x.id === tc.id)!;
        return scoreGenQuality(tc, r.response);
      });

      const report: GenQualityReport = {
        generated_at: new Date().toISOString(),
        base_url: INPUT ? `rescore:${INPUT}` : BASE_URL,
        mode: INPUT ? "rescore" : "live",
        summary: summarizeScores(GEN_QUALITY_CASES, rescored),
        results,
      };

      mkdirSync(dirname(OUT), { recursive: true });
      writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n", "utf8");

      const s = report.summary;
      console.log(
        `\n[genquality] 完全正答 ${s.correct}/${s.scorable} = ${(s.strictAccuracy * 100).toFixed(1)}% / ` +
          `概ね有用 ${s.correct + s.partial}/${s.scorable} = ${(s.usefulRate * 100).toFixed(1)}% / ` +
          `範囲外対応 ${s.outOfScope.handled}/${s.outOfScope.total} → ${OUT}`
      );

      // 測定ハーネスの成立条件のみをassert（正答率の閾値はscripts側で判定）
      if (!INPUT) {
        const httpFailures = results.filter((r) => r.httpStatus !== 200);
        expect(
          httpFailures.map((r) => `${r.id}:${r.httpStatus}`),
          "HTTP異常（0=fetch失敗）があった質問"
        ).toEqual([]);
      }
      expect(results.length).toBe(GEN_QUALITY_CASES.length);
    }
  );
});
