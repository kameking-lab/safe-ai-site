import { describe, expect, it } from "vitest";
import {
  DEFAULT_APPROVAL,
  normalizeApproval,
  isKyLocked,
  submitKy,
  approveKy,
  rejectKy,
} from "@/lib/ky/approval";

const T = new Date("2026-05-25T00:00:00Z");

describe("approval 状態遷移", () => {
  it("提出: draft → submitted（ロック）＋履歴", () => {
    const a = submitKy(DEFAULT_APPROVAL, "山田職長", T);
    expect(a.status).toBe("submitted");
    expect(isKyLocked(a)).toBe(true);
    expect(a.history).toHaveLength(1);
    expect(a.history[0]).toMatchObject({ action: "submit", by: "山田職長" });
  });

  it("承認: submitted → approved（ロック）", () => {
    const a = approveKy(submitKy(DEFAULT_APPROVAL, "山田", T), "元請佐藤", T, "問題なし");
    expect(a.status).toBe("approved");
    expect(isKyLocked(a)).toBe(true);
    expect(a.history.at(-1)).toMatchObject({ action: "approve", by: "元請佐藤", comment: "問題なし" });
  });

  it("差し戻し: submitted → rejected（編集可に戻る）", () => {
    const a = rejectKy(submitKy(DEFAULT_APPROVAL, "山田", T), "元請佐藤", T, "対策不足");
    expect(a.status).toBe("rejected");
    expect(isKyLocked(a)).toBe(false);
    expect(a.history.at(-1)).toMatchObject({ action: "reject", comment: "対策不足" });
  });

  it("承認後も差し戻しで編集可に戻せる", () => {
    const approved = approveKy(submitKy(DEFAULT_APPROVAL, "山田", T), "佐藤", T);
    const back = rejectKy(approved, "佐藤", T);
    expect(back.status).toBe("rejected");
    expect(isKyLocked(back)).toBe(false);
  });

  it("不正遷移は無視（draft を直接 approve しない）", () => {
    expect(approveKy(DEFAULT_APPROVAL, "x", T).status).toBe("draft");
    expect(rejectKy(DEFAULT_APPROVAL, "x", T).status).toBe("draft");
  });

  it("rejected から再提出できる", () => {
    const rejected = rejectKy(submitKy(DEFAULT_APPROVAL, "山田", T), "佐藤", T);
    const resubmit = submitKy(rejected, "山田", T);
    expect(resubmit.status).toBe("submitted");
    expect(resubmit.history).toHaveLength(3);
  });

  it("normalizeApproval は壊れた入力を既定化", () => {
    expect(normalizeApproval(null)).toEqual(DEFAULT_APPROVAL);
    expect(normalizeApproval({ status: "bogus", history: "x" })).toEqual(DEFAULT_APPROVAL);
    const n = normalizeApproval({ status: "approved", history: [{ action: "approve", by: "A", at: "t" }, { bad: 1 }] });
    expect(n.status).toBe("approved");
    expect(n.history).toHaveLength(1);
  });
});
