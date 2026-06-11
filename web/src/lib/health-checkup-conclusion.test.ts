import { describe, expect, it } from "vitest";
import {
  computeCheckupConclusion,
  type CheckupCounts,
} from "./health-checkup-conclusion";

function counts(partial: Partial<CheckupCounts>): CheckupCounts {
  return { overdue: 0, "due-soon": 0, unrecorded: 0, ok: 0, ...partial };
}

describe("computeCheckupConclusion（色の優先順位の固定）", () => {
  it("該当健診0件 → 無彩（色を使わない）", () => {
    const c = computeCheckupConclusion(counts({}), 0);
    expect(c.tone).toBe("neutral");
    expect(c.title).toBe("該当健診なし");
    expect(c.showTrackerAction).toBe(false);
  });

  it("随時実施のみ（定期管理対象0件） → 青の案内", () => {
    const c = computeCheckupConclusion(counts({}), 2);
    expect(c.tone).toBe("info");
    expect(c.title).toBe("随時実施のみ");
    expect(c.value).toBe(2);
    expect(c.showTrackerAction).toBe(false);
  });

  it("期限超過があれば他の状態より優先して赤", () => {
    const c = computeCheckupConclusion(
      counts({ overdue: 2, "due-soon": 3, unrecorded: 1, ok: 4 }),
      10,
    );
    expect(c.tone).toBe("danger");
    expect(c.title).toBe("期限超過");
    expect(c.value).toBe(2);
    expect(c.showTrackerAction).toBe(true);
  });

  it("超過なし・期限間近あり → 黄", () => {
    const c = computeCheckupConclusion(counts({ "due-soon": 1, ok: 5 }), 6);
    expect(c.tone).toBe("warning");
    expect(c.title).toBe("期限間近");
    expect(c.value).toBe(1);
  });

  it("未記録あり → 青「記録のこり」（未記録を緑にしない＝偽安心防止）", () => {
    const c = computeCheckupConclusion(counts({ unrecorded: 5, ok: 1 }), 6);
    expect(c.tone).toBe("info");
    expect(c.title).toBe("記録のこり");
    expect(c.value).toBe(5);
  });

  it("全件記録済み・期限内 → 緑", () => {
    const c = computeCheckupConclusion(counts({ ok: 6 }), 6);
    expect(c.tone).toBe("safe");
    expect(c.title).toBe("期限内");
    expect(c.value).toBe(6);
  });
});
