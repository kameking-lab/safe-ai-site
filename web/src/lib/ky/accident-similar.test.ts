import { describe, expect, it } from "vitest";
import {
  accidentCaseToRiskDraft,
  findSimilarAccidentCasesForKy,
  severityToKyScale,
} from "@/lib/ky/accident-similar";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import type { AccidentCase } from "@/lib/types/domain";

function mockCase(overrides: Partial<AccidentCase> = {}): AccidentCase {
  return {
    id: "unverified-case",
    title: "足場からの墜落",
    occurredOn: "2024-01-01",
    type: "墜落",
    workCategory: "建設業",
    severity: "重傷",
    summary: "足場作業中の事例",
    mainCauses: ["原因候補"],
    preventionPoints: ["対策候補"],
    ...overrides,
  };
}

describe("KY accident evidence quarantine", () => {
  it("未照合・synthetic・IDだけmhlwの事例は類似候補へ出さない", () => {
    const cases = [
      mockCase(),
      mockCase({ id: "synthetic", provenance: "synthetic" }),
      mockCase({ id: "mhlw", provenance: "mhlw" }),
    ];
    expect(findSimilarAccidentCasesForKy("足場組立", cases)).toEqual([]);
  });

  it("一次資料照合済み事故は具体的な作業語一致時だけ返す", () => {
    const dataset = getAccidentCasesDataset();
    const hits = findSimilarAccidentCasesForKy("足場組立", dataset);

    expect(hits.map((hit) => hit.case.id)).toEqual(["mhlw-100620"]);
    expect(findSimilarAccidentCasesForKy("フォークリフト荷役", dataset)).toEqual([]);

    const draft = accidentCaseToRiskDraft(hits[0]!.case);
    expect(draft.source.kind).toBe("officialAccident");
    expect(draft.source.referenceUrl).toBe(
      "https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx?joho_no=100620",
    );
  });

  it("隔離レコードをKY下書きへ直接変換しようとしても停止する", () => {
    expect(() => accidentCaseToRiskDraft(mockCase())).toThrow(
      /quarantined/,
    );
  });
});

describe("severityToKyScale", () => {
  it("表示用の純粋な重症度変換は維持する", () => {
    expect(severityToKyScale("死亡")).toBe(3);
    expect(severityToKyScale("重傷")).toBe(3);
    expect(severityToKyScale("中等傷")).toBe(2);
    expect(severityToKyScale("軽傷")).toBe(1);
  });
});
