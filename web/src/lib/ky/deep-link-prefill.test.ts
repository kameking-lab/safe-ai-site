import { describe, expect, it } from "vitest";
import {
  applyPresetToRecord,
  resolvePresetId,
  applyRiskPredictionPayload,
  applyKyDeepLink,
} from "@/lib/ky/deep-link-prefill";
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

describe("applyRiskPredictionPayload", () => {
  it("payload無しでも安全（noticeのみ）", () => {
    const { record, notice } = applyRiskPredictionPayload(base(), null);
    expect(record.workRows[0].workDetail).toBe("");
    expect(notice).toContain("AIリスク予測");
  });
  it("payloadから作業内容・危険を取り込む", () => {
    const payload = encodeURIComponent(JSON.stringify({ workContent: "外壁塗装", risks: [{ hazard: "有機溶剤", reduction: "換気" }] }));
    const { record } = applyRiskPredictionPayload(base(), payload);
    expect(record.workRows[0].workDetail).toBe("外壁塗装");
    expect(record.riskRows[1].hazard).toBe("有機溶剤");
    expect(record.riskRows[1].reduction).toBe("換気");
  });
  it("壊れたpayloadは安全に握りつぶす", () => {
    const { record, notice } = applyRiskPredictionPayload(base(), "%%%not-json%%%");
    expect(record.workRows[0].workDetail).toBe("");
    expect(notice).toContain("失敗");
  });
});

describe("applyKyDeepLink", () => {
  it("import=risk-prediction&payload を適用し changed=true", () => {
    const payload = encodeURIComponent(JSON.stringify({ workContent: "解体作業" }));
    const res = applyKyDeepLink(new URLSearchParams(`import=risk-prediction&payload=${payload}`), base());
    expect(res.changed).toBe(true);
    expect(res.record.workRows[0].workDetail).toBe("解体作業");
    expect(res.notice).toBeTruthy();
  });
  it("該当パラメータ無しは changed=false・記録そのまま", () => {
    const cur = base();
    const res = applyKyDeepLink(new URLSearchParams(""), cur);
    expect(res.changed).toBe(false);
    expect(res.record).toBe(cur);
    expect(res.notice).toBeNull();
  });
  it("fromAccident は notice を出す", () => {
    const res = applyKyDeepLink(new URLSearchParams("fromAccident=123&q=足場崩壊"), base());
    expect(res.changed).toBe(true);
    expect(res.notice).toContain("足場崩壊");
  });
});
