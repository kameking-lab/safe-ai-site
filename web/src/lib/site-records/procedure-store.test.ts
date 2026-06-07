import { describe, it, expect } from "vitest";
import {
  defaultSteps,
  emptyStep,
  summarizeProcedure,
  procedureToCsv,
  type WorkProcedure,
} from "./procedure-store";

describe("defaultSteps / emptyStep", () => {
  it("指定数の空ステップを生成（既定3）", () => {
    expect(defaultSteps()).toHaveLength(3);
    expect(defaultSteps(5)).toHaveLength(5);
    const s = emptyStep();
    expect(s.step).toBe("");
    expect(s.id).toBeTruthy();
  });
});

function make(): WorkProcedure {
  return {
    id: "p1",
    title: "移動式クレーンによる鉄骨建方",
    site: "○○現場",
    author: "職長 山田",
    date: "2026-07-10",
    equipment: "25tラフター、玉掛用具",
    qualifications: "移動式クレーン運転士、玉掛技能講習",
    steps: [
      { id: "s1", step: "作業開始前点検", hazard: "始業前点検不足", measure: "点検表で確認" },
      { id: "s2", step: "玉掛け", hazard: "吊り荷の落下", measure: "正しい玉掛け・退避, 合図徹底" },
    ],
    notes: "強風時中止",
    savedAt: "2026-07-10T00:00:00.000Z",
  };
}

describe("summarizeProcedure", () => {
  it("ステップ数を集計", () => {
    const s = summarizeProcedure(make());
    expect(s.stepCount).toBe(2);
    expect(s.title).toContain("鉄骨建方");
  });
});

describe("procedureToCsv", () => {
  it("ヘッダー＋No付きステップ行、カンマはクォート", () => {
    const csv = procedureToCsv(make());
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(3); // header + 2
    expect(lines[0]).toContain("危険・急所");
    expect(lines[1]).toContain("1,作業開始前点検");
    expect(csv).toContain('"正しい玉掛け・退避, 合図徹底"');
  });
});
