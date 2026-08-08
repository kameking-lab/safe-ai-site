import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import mainPageMetrics from "@/data/chatbot-eval-results.json";
import freshPageMetrics from "@/data/chatbot-eval-fresh-results.json";

type RawMetrics = {
  main: { precision5: number; mrr: number };
  fresh: { precision5: number; mrr: number };
};

describe("PF-028 public retrieval quality metrics", () => {
  it("keeps public precision and MRR equal to the raw audit snapshot", () => {
    const raw = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "../docs/rag-metrics-latest.json"),
        "utf8",
      ),
    ) as RawMetrics;

    expect(mainPageMetrics.precision5).toBe(raw.main.precision5);
    expect(mainPageMetrics.mrr).toBe(raw.main.mrr);
    expect(freshPageMetrics.precision5).toBe(raw.fresh.precision5);
    expect(freshPageMetrics.mrr).toBe(raw.fresh.mrr);
    expect(mainPageMetrics.correct).toBe(
      mainPageMetrics.retrieval_correct + mainPageMetrics.safe_hold_correct,
    );
    expect(mainPageMetrics.accuracy).toBe(
      mainPageMetrics.correct / mainPageMetrics.total,
    );
    expect(freshPageMetrics.correct).toBe(
      freshPageMetrics.retrieval_correct + freshPageMetrics.safe_hold_correct,
    );
    expect(freshPageMetrics.accuracy).toBe(
      freshPageMetrics.correct / freshPageMetrics.total,
    );
  });

  it("labels the published gate as retrieval-only rather than an overall pass", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/app/(main)/about/chatbot-eval/page.tsx",
      ),
      "utf8",
    );

    expect(source).toContain("検索到達ゲート");
    expect(source).toContain("低いPrecisionを打ち消す総合PASSではありません");
  });
});
