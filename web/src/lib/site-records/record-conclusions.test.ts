import { describe, expect, it } from "vitest";
import {
  committeeConclusion,
  countInductionRemaining,
  inductionConclusion,
  inspectionConclusion,
  monthlyConclusion,
  nearMissConclusion,
  patrolConclusion,
} from "./record-conclusions";

// 色の文法（赤=停止級/黄=要対応/緑=良好/青=案内）が件数に対して崩れないことを固定する。

describe("patrolConclusion", () => {
  it("期日超過が1件でもあれば赤・デカ数字は超過件数", () => {
    const c = patrolConclusion(5, 2);
    expect(c.tone).toBe("danger");
    expect(c.value).toBe(2);
    expect(c.title).toBe("期日超過");
    expect(c.action?.href).toBe("#open-findings");
  });
  it("超過なし・未是正ありは黄・デカ数字は未是正件数", () => {
    const c = patrolConclusion(3, 0);
    expect(c.tone).toBe("warning");
    expect(c.value).toBe(3);
    expect(c.title).toBe("未是正");
  });
  it("未是正ゼロは緑（数字なし）", () => {
    const c = patrolConclusion(0, 0);
    expect(c.tone).toBe("safe");
    expect(c.value).toBeUndefined();
    expect(c.title).toBe("未是正なし");
  });
});

describe("nearMissConclusion", () => {
  it("重大×未対策があれば赤", () => {
    const c = nearMissConclusion(10, 4, 2);
    expect(c.tone).toBe("danger");
    expect(c.value).toBe(2);
    expect(c.title).toBe("重大未対策");
  });
  it("軽微の未対策のみは黄", () => {
    const c = nearMissConclusion(10, 4, 0);
    expect(c.tone).toBe("warning");
    expect(c.value).toBe(4);
    expect(c.title).toBe("対応中");
  });
  it("報告ゼロは青の案内（緑にしない＝報告ゼロは『安全』ではない）", () => {
    const c = nearMissConclusion(0, 0, 0);
    expect(c.tone).toBe("info");
    expect(c.title).toBe("報告なし");
  });
  it("全件対策済は緑", () => {
    const c = nearMissConclusion(7, 0, 0);
    expect(c.tone).toBe("safe");
    expect(c.title).toBe("全件対策済");
  });
});

describe("inspectionConclusion", () => {
  it("使用不可が1件でもあれば赤", () => {
    const c = inspectionConclusion(8, 1);
    expect(c.tone).toBe("danger");
    expect(c.value).toBe(1);
    expect(c.title).toBe("使用不可");
    expect(c.action?.href).toBe("#saved-inspections");
  });
  it("記録ゼロは青の案内", () => {
    expect(inspectionConclusion(0, 0).tone).toBe("info");
  });
  it("全機使用可は緑", () => {
    const c = inspectionConclusion(8, 0);
    expect(c.tone).toBe("safe");
    expect(c.title).toBe("使用不可なし");
  });
});

describe("committeeConclusion", () => {
  it("今月開催済は緑", () => {
    expect(committeeConclusion(true).tone).toBe("safe");
  });
  it("今月未開催は黄＋安衛則23条の根拠", () => {
    const c = committeeConclusion(false);
    expect(c.tone).toBe("warning");
    expect(c.title).toBe("今月未開催");
    expect(c.description).toContain("安衛則23条");
  });
});

describe("countInductionRemaining / inductionConclusion", () => {
  const items = [{ checked: true }, { checked: false }, { checked: false }];
  it("氏名・未チェック項目・確認2つを合算する", () => {
    expect(
      countInductionRemaining({ workerName: "", items, confirmedWorker: false, confirmedEducator: false }),
    ).toBe(5);
    expect(
      countInductionRemaining({ workerName: "新人 太郎", items, confirmedWorker: true, confirmedEducator: false }),
    ).toBe(3);
  });
  it("空白だけの氏名は未記入と数える", () => {
    expect(
      countInductionRemaining({ workerName: "  ", items: [], confirmedWorker: true, confirmedEducator: true }),
    ).toBe(1);
  });
  it("のこりありは青の記入のこり・ゼロで緑の完了", () => {
    expect(inductionConclusion(3)).toMatchObject({ tone: "info", value: 3, title: "記入のこり" });
    expect(inductionConclusion(0)).toMatchObject({ tone: "safe", title: "記入完了" });
  });
});

describe("monthlyConclusion", () => {
  it("記録なしは無彩の案内", () => {
    const c = monthlyConclusion({ hasAny: false, patrolOpen: 0, nearMissOpen: 0, inspectionUnusable: 0, committeeHeld: false });
    expect(c.tone).toBe("neutral");
    expect(c.title).toBe("記録なし");
  });
  it("使用不可を含む要対応は赤・合計件数", () => {
    const c = monthlyConclusion({ hasAny: true, patrolOpen: 2, nearMissOpen: 1, inspectionUnusable: 1, committeeHeld: true });
    expect(c.tone).toBe("danger");
    expect(c.value).toBe(4);
    expect(c.title).toBe("要対応");
  });
  it("使用不可なしの要対応は黄", () => {
    const c = monthlyConclusion({ hasAny: true, patrolOpen: 2, nearMissOpen: 0, inspectionUnusable: 0, committeeHeld: true });
    expect(c.tone).toBe("warning");
    expect(c.value).toBe(2);
  });
  it("要対応ゼロでも委員会未開催なら黄＋委員会への動線", () => {
    const c = monthlyConclusion({ hasAny: true, patrolOpen: 0, nearMissOpen: 0, inspectionUnusable: 0, committeeHeld: false });
    expect(c.tone).toBe("warning");
    expect(c.title).toBe("委員会未開催");
    expect(c.action?.href).toBe("/site-records/committee");
  });
  it("すべて良好なら緑", () => {
    const c = monthlyConclusion({ hasAny: true, patrolOpen: 0, nearMissOpen: 0, inspectionUnusable: 0, committeeHeld: true });
    expect(c.tone).toBe("safe");
    expect(c.title).toBe("当月良好");
  });
});
