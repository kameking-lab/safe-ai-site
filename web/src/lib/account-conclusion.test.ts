import { describe, expect, it } from "vitest";
import { computeAccountConclusion } from "./account-conclusion";

describe("computeAccountConclusion", () => {
  it("支払い遅延は赤で単一の次アクションを示す", () => {
    const c = computeAccountConclusion({ planName: "standard", status: "past_due", periodEndLabel: null });
    expect(c.tone).toBe("danger");
    expect(c.title).toBe("支払い遅延");
    expect(c.description).toContain("プラン管理");
  });

  it("未払いは赤", () => {
    const c = computeAccountConclusion({ planName: "pro", status: "unpaid", periodEndLabel: null });
    expect(c.tone).toBe("danger");
    expect(c.title).toBe("未払いあり");
  });

  it("解約済みは黄・期限ラベルありなら利用可能期限を明示", () => {
    const c = computeAccountConclusion({ planName: "standard", status: "canceled", periodEndLabel: "2026年8月1日" });
    expect(c.tone).toBe("warning");
    expect(c.title).toBe("解約済み");
    expect(c.description).toContain("2026年8月1日");
  });

  it("解約済みで期限ラベルが無い場合もフォールバック文言を出す", () => {
    const c = computeAccountConclusion({ planName: "standard", status: "canceled", periodEndLabel: null });
    expect(c.tone).toBe("warning");
    expect(c.description).toBe("請求期間の終了後、フリープランに移行します。");
  });

  it("フリープランかつ正常時は青", () => {
    const c = computeAccountConclusion({ planName: "free", status: "active", periodEndLabel: null });
    expect(c.tone).toBe("info");
    expect(c.title).toBe("フリープラン");
  });

  it("有料プラン利用中は緑・次回更新日を出す", () => {
    const c = computeAccountConclusion({ planName: "pro", status: "active", periodEndLabel: "2026年8月1日" });
    expect(c.tone).toBe("safe");
    expect(c.title).toBe("利用中");
    expect(c.description).toContain("次回更新日");
  });

  it("有料プラン利用中で期限ラベルが無ければ補足なし", () => {
    const c = computeAccountConclusion({ planName: "pro", status: "active", periodEndLabel: null });
    expect(c.tone).toBe("safe");
    expect(c.description).toBeUndefined();
  });

  it("支払い遅延は解約状態より優先される（同時に起きえない想定だが優先順位を固定）", () => {
    const c = computeAccountConclusion({ planName: "standard", status: "past_due", periodEndLabel: "2026年8月1日" });
    expect(c.tone).toBe("danger");
  });

  it("プラン照会が失敗した場合はneutralで「確認できません」を示し、フリープラン断定を回避する", () => {
    const c = computeAccountConclusion({
      planName: "free",
      status: "active",
      periodEndLabel: null,
      lookupFailed: true,
    });
    expect(c.tone).toBe("neutral");
    expect(c.title).toBe("プラン情報を確認できません");
  });

  it("照会失敗は他のどの状態よりも優先される", () => {
    const c = computeAccountConclusion({
      planName: "pro",
      status: "past_due",
      periodEndLabel: null,
      lookupFailed: true,
    });
    expect(c.tone).toBe("neutral");
    expect(c.title).toBe("プラン情報を確認できません");
  });
});
