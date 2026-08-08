import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const files = [
  "src/components/cross-tool-links.tsx",
  "src/components/copilot/CopilotNextSteps.tsx",
  "src/components/ky-examples-browser.tsx",
  "src/components/ky-paper/ky-accident-cases.tsx",
  "src/components/ky-paper/ky-paper-view.tsx",
  "src/components/accidents/accident-trend-summary.tsx",
  "src/components/accidents/accident-ai-analyzer.tsx",
  "src/components/home/home-latest-accidents.tsx",
  "src/components/contextual-next-actions.tsx",
  "src/components/flagship-grid.tsx",
  "src/app/(main)/api-docs/page.tsx",
  "src/app/(main)/features/use-cases/page.tsx",
  "src/app/(main)/features/comparison/page.tsx",
  "src/app/(main)/law-hierarchy/page.tsx",
  "src/app/(main)/ky-examples/page.tsx",
  "src/app/(main)/heat-illness-prevention/page.tsx",
  "src/app/(main)/about/news-feed/page.tsx",
  "src/app/(main)/leaflet/LeafletPrintView.tsx",
  "src/components/visual-ky/facilitator-mode.tsx",
  "src/app/(main)/training/visual-ky/[slug]/print/page.tsx",
  "src/app/(main)/for/manager/page.tsx",
  "src/components/home-safety-alert-generator.tsx",
  "src/components/evidence/evidence-card.tsx",
];

describe("利用者向けコピーの内部用語", () => {
  it.each(files)("%s に旧表示文を残さない", (file) => {
    const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    for (const phrase of [
      "syntheticモデル",
      "hash検証済み",
      "全件 synthetic",
      "retrieval参照ID",
      "教育用synthetic",
      "速報由来のpreliminary",
      "synthetic 0件",
      "official / preliminary",
      "KEEP MOVING",
      "MAKE & CONFIRM",
      "SHOW ON SITE",
      "provenance-labelled",
      "RAG問い合わせ",
      "synthetic事例",
      "syntheticは明示",
      "hash検証済みRAGコーパス",
      "syntheticモデルケース",
      "（synthetic・未監修）",
      "synthetic・想定例",
      "学習用のsynthetic事例",
      "RAG型チャットボット",
      "generated-for-this-project",
      "approved-user-owned",
      "stale状態",
      "stale表示",
      "checking、normal、stale、offline、partial",
    ]) {
      expect(source).not.toContain(phrase);
    }
  });
});
