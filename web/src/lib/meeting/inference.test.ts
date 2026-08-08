import { describe, expect, it } from "vitest";
import {
  estimateQualifications,
  inferChecklist,
  inferChecklistCandidates,
} from "@/lib/meeting/inference";
import { buildDefaultChecklist } from "@/lib/meeting/schema";

describe("estimateQualifications", () => {
  it("足場・高所 → フルハーネス／足場主任者", () => {
    const q = estimateQualifications("外壁足場の組立");
    expect(q.some((x) => x.includes("フルハーネス"))).toBe(true);
    expect(q.some((x) => x.includes("足場の組立て等作業主任者"))).toBe(true);
  });
  it("掘削 → 掘削主任者・車両系", () => {
    const q = estimateQualifications("バックホウで掘削");
    expect(q.some((x) => x.includes("土止め支保工"))).toBe(true);
    expect(q.some((x) => x.includes("車両系建設機械"))).toBe(true);
  });
  it("該当なしは空", () => {
    expect(estimateQualifications("書類整理")).toEqual([]);
  });
});

describe("inferChecklist", () => {
  it("掘削作業では掘削・機械・一般を確認候補にする", () => {
    const keys = inferChecklistCandidates(
      buildDefaultChecklist(),
      "バックホウで掘削、土留"
    );
    expect(keys).toEqual(expect.arrayContaining(["excavation", "machine", "general"]));
    expect(keys).not.toContain("crane");
  });

  it("候補抽出だけでは未確認をokへ変えず、user設定も保持する", () => {
    const base = buildDefaultChecklist();
    const ex = base.find((c) => c.key === "excavation")!;
    ex.items[0].status = "ng";
    const cl = inferChecklist(base, "掘削");
    const after = cl.find((c) => c.key === "excavation")!;
    expect(after.items[0].status).toBe("ng");
    expect(after.items.slice(1).every((item) => item.status === "unreviewed")).toBe(true);
    expect(cl).not.toBe(base);
  });

  it("作業条件が空なら確認候補を作らない", () => {
    expect(inferChecklistCandidates(buildDefaultChecklist(), "  ")).toEqual([]);
  });
});
