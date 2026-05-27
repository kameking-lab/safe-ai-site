import { describe, expect, it } from "vitest";
import { pickEducationAccidents } from "@/lib/accidents/education-pick";
import type { AccidentCase } from "@/lib/types/domain";

const mk = (id: string, sev: AccidentCase["severity"], type: string, cat = "建設業"): AccidentCase => ({
  id, title: `事故${id}`, occurredOn: "2025-01-01",
  type: type as AccidentCase["type"], workCategory: cat as AccidentCase["workCategory"],
  severity: sev, summary: "", mainCauses: [], preventionPoints: [`対策${id}`],
});

const CASES: AccidentCase[] = [
  mk("a", "軽傷", "転倒"),
  mk("b", "死亡", "墜落・転落"),
  mk("c", "重傷", "はさまれ・巻き込まれ"),
  mk("d", "死亡", "墜落・転落"),
  mk("e", "中等傷", "感電"),
];

describe("pickEducationAccidents", () => {
  it("重大度優先で選択（死亡が先頭）", () => {
    const r = pickEducationAccidents(CASES, { count: 3, seed: 1 });
    expect(r[0].severity).toBe("死亡");
    expect(r).toHaveLength(3);
  });

  it("事故型の多様性（同型重複を避ける）", () => {
    const r = pickEducationAccidents(CASES, { count: 3, seed: 1 });
    const types = r.map((x) => x.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it("業種で絞れる（製造業指定で不足なら全体補完）", () => {
    const r = pickEducationAccidents(CASES, { category: "製造業", count: 2 });
    expect(r).toHaveLength(2); // 製造業0件→全体から補完
  });

  it("seed違いで順序が変わりうる・同seedは安定", () => {
    const r1 = pickEducationAccidents(CASES, { count: 3, seed: 5 });
    const r2 = pickEducationAccidents(CASES, { count: 3, seed: 5 });
    expect(r1.map((x) => x.id)).toEqual(r2.map((x) => x.id));
  });

  it("preventionPoint を含む", () => {
    const r = pickEducationAccidents(CASES, { count: 1, seed: 0 });
    expect(r[0].preventionPoint).toMatch(/対策/);
  });
});
