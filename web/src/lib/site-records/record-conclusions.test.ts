import { describe, expect, it } from "vitest";
import {
  calendarConclusion,
  committeeConclusion,
  countIncidentRemaining,
  countInductionRemaining,
  countProcedureRemaining,
  incidentConclusion,
  inductionConclusion,
  inspectionConclusion,
  monthlyConclusion,
  nearMissConclusion,
  patrolConclusion,
  procedureConclusion,
  qualificationsConclusion,
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

describe("countProcedureRemaining / procedureConclusion（手順書・記入のこり文法）", () => {
  const step = (s: string, h: string, m: string) => ({ step: s, hazard: h, measure: m });
  it("初期状態（作業名なし・全行空）は『作業名＋手順1行』の2項目", () => {
    expect(countProcedureRemaining({ title: "", steps: [step("", "", ""), step("", "", "")] })).toBe(2);
  });
  it("全欄空の行は未使用として数えない（書きかけ行の空欄だけ数える）", () => {
    expect(
      countProcedureRemaining({
        title: "鉄骨建方",
        steps: [step("玉掛け", "つり荷落下", ""), step("", "", "")],
      }),
    ).toBe(1);
  });
  it("空白だけの作業名・欄は未記入と数える", () => {
    expect(countProcedureRemaining({ title: "  ", steps: [step("吊り上げ", " ", "立入禁止")] })).toBe(2);
  });
  it("作業名と書きかけ行が全部埋まればゼロ", () => {
    expect(
      countProcedureRemaining({ title: "鉄骨建方", steps: [step("玉掛け", "つり荷落下", "立入禁止")] }),
    ).toBe(0);
  });
  it("のこりありは青の記入のこり・ゼロで緑の完了", () => {
    expect(procedureConclusion(2)).toMatchObject({ tone: "info", value: 2, title: "記入のこり" });
    expect(procedureConclusion(0)).toMatchObject({ tone: "safe", title: "記入完了" });
  });
});

describe("countIncidentRemaining / incidentConclusion（死傷病報告・記入のこり文法）", () => {
  const empty = {
    bizType: "",
    siteName: "",
    siteAddress: "",
    workerCount: "",
    victimName: "",
    victimSexAge: "",
    victimJob: "",
    victimExperience: "",
    occurredAt: "",
    place: "",
    injuryName: "",
    absenceDays: "",
    situation: "",
  };
  const full = {
    bizType: "建設業",
    siteName: "○○新築工事",
    siteAddress: "○○市",
    workerCount: "25",
    victimName: "被災 太郎",
    victimSexAge: "男・34",
    victimJob: "鉄筋工",
    victimExperience: "5年",
    occurredAt: "2026-06-01 10:30",
    place: "3F開口部",
    injuryName: "右足関節骨折",
    absenceDays: "30",
    situation: "開口部付近で作業中に墜落した。",
  };
  it("空の下書きは13欄すべてが記入のこり（備考は任意で数えない）", () => {
    expect(countIncidentRemaining(empty)).toBe(13);
  });
  it("空白だけの欄は未記入と数える", () => {
    expect(countIncidentRemaining({ ...full, situation: "  " })).toBe(1);
  });
  it("全欄が揃えばゼロ", () => {
    expect(countIncidentRemaining(full)).toBe(0);
  });
  it("のこりありは青・ゼロで緑の『下書き完了』（完了しても提出ではない＝電子申請を案内）", () => {
    expect(incidentConclusion(13)).toMatchObject({ tone: "info", value: 13, title: "記入のこり" });
    const done = incidentConclusion(0);
    expect(done).toMatchObject({ tone: "safe", title: "下書き完了" });
    expect(done.description).toContain("電子申請");
  });
});

describe("qualificationsConclusion（資格管理簿・現況カード）", () => {
  it("登録ゼロは青の案内（デカ数字なし）", () => {
    const c = qualificationsConclusion(0, 0);
    expect(c.tone).toBe("info");
    expect(c.title).toBe("登録なし");
    expect(c.value).toBeUndefined();
  });
  it("登録ありは『登録N名』＋資格M種＋逆引きへの動線", () => {
    const c = qualificationsConclusion(8, 5);
    expect(c.tone).toBe("info");
    expect(c.value).toBe(8);
    expect(c.unit).toBe("名");
    expect(c.title).toBe("登録済");
    expect(c.description).toContain("5種");
    expect(c.action?.href).toBe("#qual-lookup");
  });
});

describe("calendarConclusion（安全カレンダー・今月のこり）", () => {
  it("未消し込みありは青『今月のこりN件』＋今月の項目への動線", () => {
    const c = calendarConclusion({ total: 4, remaining: 3 });
    expect(c.tone).toBe("info");
    expect(c.value).toBe(3);
    expect(c.title).toBe("今月のこり");
    expect(c.action?.href).toBe("#this-month");
  });
  it("全件消し込みで緑『今月完了』", () => {
    expect(calendarConclusion({ total: 4, remaining: 0 })).toMatchObject({ tone: "safe", title: "今月完了" });
  });
  it("項目ゼロの月は無彩の案内（防御的・現データでは発生しない）", () => {
    expect(calendarConclusion({ total: 0, remaining: 0 }).tone).toBe("neutral");
  });
});
