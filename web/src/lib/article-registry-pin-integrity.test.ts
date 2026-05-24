/**
 * PIN-構造化DB 整合性チェック。
 *
 * PINNED_TOPICS で参照される全 (law, articleNum) が allLawArticles 内に
 * 実在することを検証する。 PIN 追加時に typo / 抜け漏れがあると、
 * applyPinnedTopics() がランタイムで silent fail（found === undefined → skip）
 * するため、ビルド／テストの時点で検出する仕組みを用意する。
 *
 * 注意: PIN は law（正式名）で照合され、構造化レジストリは lawShort で
 * インデックスされるため、ここでは allLawArticles を直接走査する。
 */
import { describe, it, expect } from "vitest";
import { PINNED_TOPICS } from "@/lib/rag-search";
import { allLawArticles } from "@/data/laws";

describe("PIN integrity: every PINNED_TOPICS reference exists in allLawArticles", () => {
  const articleSet = new Set(
    allLawArticles.map((a) => `${a.law}|${a.articleNum}`)
  );

  const missing: { law: string; articleNum: string; triggers: string[] }[] = [];
  for (const topic of PINNED_TOPICS) {
    for (const pin of topic.pins) {
      const key = `${pin.law}|${pin.articleNum}`;
      if (!articleSet.has(key)) {
        missing.push({
          law: pin.law,
          articleNum: pin.articleNum,
          triggers: topic.triggers.slice(0, 3),
        });
      }
    }
  }

  it("reports zero missing pin references", () => {
    if (missing.length > 0) {
      // 失敗時に追跡しやすいよう、欠落リストを expect メッセージ的に展開
      const report = missing
        .map(
          (m) =>
            `  - ${m.law} ${m.articleNum}  (triggers: ${m.triggers.join(", ")})`
        )
        .join("\n");
      throw new Error(
        `PIN integrity failure: ${missing.length} pin(s) not found in allLawArticles\n${report}`
      );
    }
    expect(missing).toEqual([]);
  });
});
