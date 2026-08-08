import { describe, expect, it } from "vitest";
import {
  applyPresetToRecord,
  resolvePresetId,
  applyKyDeepLink,
} from "@/lib/ky/deep-link-prefill";
import { unconfirmedKyCandidateIndexes } from "@/lib/ky/risk-source";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import type { KyIndustryPreset } from "@/data/mock/ky-industry-presets";

const base = () => normalizeKyInstructionRecord({});
const fakePreset = {
  id: "x",
  label: "建設",
  workExamples: ["鉄骨建方"],
  risks: [{ hazard: "墜落", reduction: "親綱使用" }],
} as unknown as KyIndustryPreset;

describe("applyPresetToRecord", () => {
  it("作業内容[0]と危険行にプリセットを反映", () => {
    const r = applyPresetToRecord(base(), fakePreset);
    expect(r.workRows[0].workDetail).toBe("鉄骨建方");
    expect(r.riskRows[1].hazard).toBe("墜落");
    expect(r.riskRows[1].reduction).toBe("親綱使用");
    // 先頭の危険行(上記)は触らない
    expect(r.riskRows[0].hazard).toBe(base().riskRows[0].hazard);
  });
});

describe("resolvePresetId", () => {
  it("preset > template の優先", () => {
    expect(resolvePresetId(new URLSearchParams("preset=ladder&template=foo"))).toBe("ladder");
    expect(resolvePresetId(new URLSearchParams("template=foo"))).toBe("foo");
  });
  it("該当なしは null", () => {
    expect(resolvePresetId(new URLSearchParams(""))).toBeNull();
  });
});

describe("applyKyDeepLink", () => {
  it("reviewedビジュアルKYTを人手確認必須の候補として取り込む", () => {
    const res = applyKyDeepLink(
      new URLSearchParams("import=visual-kyt&scenario=vkyt-001"),
      base(),
    );
    expect(res.changed).toBe(true);
    expect(res.record.workRows[0].workDetail).toContain("足場");
    expect(res.record.riskRows[1].candidateSource).toMatchObject({
      kind: "rule",
      grounded: true,
      requiresHumanReview: true,
    });
    expect(unconfirmedKyCandidateIndexes(res.record)).toContain(1);
    expect(res.notice).toContain("自動確定されていません");
    expect(res.notice).toContain("人が確認");
  });

  it("不明なビジュアルKYT IDはfail-closedで取り込まない", () => {
    const current = base();
    const res = applyKyDeepLink(
      new URLSearchParams("import=visual-kyt&scenario=vkyt-999"),
      current,
    );
    expect(res.changed).toBe(false);
    expect(res.record).toBe(current);
    expect(res.notice).toContain("読み込めません");
  });

  it("隔離済みrisk-predictionの任意payloadを取り込まない", () => {
    const payload = encodeURIComponent(JSON.stringify({ workContent: "解体作業" }));
    const res = applyKyDeepLink(new URLSearchParams(`import=risk-prediction&payload=${payload}`), base());
    expect(res.changed).toBe(false);
    expect(res.record.workRows[0].workDetail).toBe("");
    expect(res.record.riskRows.every((row) => !row.candidateSource)).toBe(true);
    expect(res.notice).toContain("停止");
  });
  it("meeting-recordの旧URL自由文payloadはfail-closedで取り込まない", () => {
    const payload = encodeURIComponent(
      JSON.stringify({ workContent: "解体作業", risks: [{ hazard: "飛来", reduction: "立入禁止" }] }),
    );
    const res = applyKyDeepLink(new URLSearchParams(`import=meeting-record&payload=${payload}`), base());
    expect(res.changed).toBe(false);
    expect(res.record.workRows[0].workDetail).toBe("");
    expect(res.record.riskRows.every((row) => !row.candidateSource)).toBe(true);
    expect(res.notice).toContain("URL取込は停止");
  });
  it("該当パラメータ無しは changed=false・記録そのまま", () => {
    const cur = base();
    const res = applyKyDeepLink(new URLSearchParams(""), cur);
    expect(res.changed).toBe(false);
    expect(res.record).toBe(cur);
    expect(res.notice).toBeNull();
  });
  it("fromAccident はURLの自由文qを表示・取込しない", () => {
    const res = applyKyDeepLink(new URLSearchParams("fromAccident=123&q=足場崩壊"), base());
    expect(res.changed).toBe(true);
    expect(res.notice).toContain("公開事故ID");
    expect(res.notice).not.toContain("足場崩壊");
  });
  it("熱中症topicは記録を自動確定せず確認項目だけを案内する", () => {
    const current = base();
    const res = applyKyDeepLink(
      new URLSearchParams("topic=heat-illness"),
      current,
    );
    expect(res.changed).toBe(true);
    expect(res.record).toBe(current);
    expect(res.notice).toContain("現場実測WBGTまたは推定情報の区分");
    expect(res.notice).toContain("入力候補は自動確定していません");
  });
});
