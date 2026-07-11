/**
 * `npm run plain:status`（scripts/plain-status.ts）の内部プローブ。
 *
 * vitest 経由で実行するのは、@/ パスエイリアス込みで src の実データを
 * そのまま読むため（chatbot-eval.ts と同じ「テストを一次ソースにする」型）。
 * このテスト自体は集計の健全性のみ検査し、カバレッジ値では fail しない
 * （未生成が多くても CI は緑。fidelity 違反は plain-fidelity.test.ts が担当）。
 *
 * 環境変数 PLAIN_STATUS_JSON にパスが入っていれば集計JSONを書き出す。
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { buildPlainCoverage } from "./coverage";

describe("plain カバレッジ集計", () => {
  it("全対象法令が egovLawId とコーパス条文を持ち、幽霊エントリが無い", () => {
    const coverage = buildPlainCoverage();
    for (const c of coverage) {
      expect(c.egovLawId, `${c.lawShort} の egovLawId 未解決`).not.toBe("");
      expect(c.total, `${c.lawShort} のコーパス条文 0（対象定義ミス）`).toBeGreaterThan(0);
      expect(c.orphans, `${c.lawShort} に幽霊 plain エントリ`).toEqual([]);
    }

    const out = process.env.PLAIN_STATUS_JSON;
    if (out) {
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), coverage }, null, 2));
    }
  });
});
