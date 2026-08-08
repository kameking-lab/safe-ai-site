import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("法改正の収録要点表示", () => {
  it("固定収録データをAI生成と誤表示しない", () => {
    const listSource = readFileSync(
      resolve(process.cwd(), "src/components/law-revision-list.tsx"),
      "utf8",
    );
    const panelSource = readFileSync(
      resolve(process.cwd(), "src/components/summary-panel.tsx"),
      "utf8",
    );
    const serviceSource = readFileSync(
      resolve(process.cwd(), "src/lib/services/summary-service.ts"),
      "utf8",
    );

    expect(serviceSource).toContain("summaryMockByRevisionId");
    expect(listSource).not.toContain("AIで要約");
    expect(panelSource).not.toContain("AI要約");
    expect(listSource).toContain("収録要点を見る");
    expect(panelSource).toContain("収録要点");
  });
});
