import { describe, it, expect } from "vitest";
import { computeStatsLiveness } from "./liveness";

// 捏造防止の中核: 実データ源が live のときだけ live=true。未接続(mock)時は anyLive=false で
// サンプル数値を出さず空状態にする、という UI 分岐を守る回帰ガード。
describe("computeStatsLiveness", () => {
  it("全て未接続(mock)なら anyLive=false（=サンプルを出さず空状態にする）", () => {
    const r = computeStatsLiveness({ source: "mock" }, { source: "mock" }, { source: "mock" });
    expect(r).toEqual({ ga4Live: false, gscLive: false, paLive: false, anyLive: false });
  });

  it("null / undefined でも anyLive=false（読み込み前・取得失敗）", () => {
    expect(computeStatsLiveness(null, null, null).anyLive).toBe(false);
    expect(computeStatsLiveness(undefined, undefined, undefined).anyLive).toBe(false);
  });

  it("GA4 が ga4 なら ga4Live=true・anyLive=true", () => {
    const r = computeStatsLiveness({ source: "ga4" }, { source: "mock" }, { source: "mock" });
    expect(r.ga4Live).toBe(true);
    expect(r.anyLive).toBe(true);
  });

  it("GSC が gsc なら gscLive=true・anyLive=true（GA4 未接続でも）", () => {
    const r = computeStatsLiveness({ source: "mock" }, { source: "gsc" }, { source: "mock" });
    expect(r.gscLive).toBe(true);
    expect(r.ga4Live).toBe(false);
    expect(r.anyLive).toBe(true);
  });

  it("Page Analytics が ga4 なら paLive=true・anyLive=true", () => {
    const r = computeStatsLiveness({ source: "mock" }, { source: "mock" }, { source: "ga4" });
    expect(r.paLive).toBe(true);
    expect(r.anyLive).toBe(true);
  });

  it("GSC の source が ga4(誤値)では gscLive にならない（gsc 固有判定）", () => {
    const r = computeStatsLiveness({ source: "mock" }, { source: "ga4" as unknown as "gsc" }, { source: "mock" });
    expect(r.gscLive).toBe(false);
  });
});
