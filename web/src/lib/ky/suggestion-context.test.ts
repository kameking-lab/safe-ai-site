import { describe, expect, it } from "vitest";
import { buildKySuggestionPromptContext, parseKySuggestionContext } from "./suggestion-context";

const scenarios = [
  ["建設", "鉄骨建方", "3階南側", "8人", "晴れ・32℃", "移動式クレーン", "搬入経路を変更"],
  ["製造", "プレス金型交換", "第2工場", "3人", "屋内・高温", "油圧プレス", "夜勤へ引継ぎ"],
  ["運輸", "荷台から荷下ろし", "配送センター", "2人", "雨", "フォークリフト", "仮置場を変更"],
  ["設備", "受変電設備点検", "電気室", "4人", "屋内", "高圧受電盤", "停電範囲を変更"],
  ["化学", "有機溶剤で洗浄", "局所排気ブース", "2人", "屋内・28℃", "洗浄槽", "代替溶剤へ変更"],
] as const;

describe("KY suggestion context gold scenarios", () => {
  it.each(scenarios)("%s: required context remains visible in the prompt", (_kind, workContent, workLocation, peopleCount, weather, equipment, changes) => {
    const parsed = parseKySuggestionContext({
      workContent,
      context: {
        workLocation,
        equipment,
        heavyEquipment: "なし",
        plannedPeopleCount: peopleCount,
        weather,
        simultaneousWork: "なし",
        changes,
        newEntrants: "なし",
        nightWork: "なし",
        chemicals: _kind === "化学" ? "有機溶剤" : "なし",
        heatStress: "WBGTを確認",
      },
    });
    expect(parsed.missing).toEqual([]);
    expect(parsed.context).not.toBeNull();
    const prompt = buildKySuggestionPromptContext(parsed.context!);
    expect(prompt).toContain(`作業: ${workContent}`);
    expect(prompt).toContain(`場所: ${workLocation}`);
    expect(prompt).toContain(`設備・機械: ${equipment}`);
    expect(prompt).toContain(`変更点: ${changes}`);
    expect(prompt).toContain("重機: なし");
    expect(prompt).toContain(`人数: ${peopleCount}`);
    expect(prompt).toContain("同時作業: なし");
    expect(prompt).toContain("新規入場者: なし");
    expect(prompt).toContain("夜間作業: なし");
    expect(prompt).toContain("熱中症条件: WBGTを確認");
  });

  it("PF-004: authoritative contextの未確認条件をすべてfail-closedで示す", () => {
    const parsed = parseKySuggestionContext({
      workContent: "高所作業",
      context: {
        workLocation: "",
        equipment: "",
        heavyEquipment: "",
        plannedPeopleCount: "",
        weather: "晴れ",
        simultaneousWork: "",
        changes: "",
        newEntrants: "",
        nightWork: "",
        chemicals: "",
        heatStress: "",
      },
    });
    expect(parsed.context).toBeNull();
    expect(parsed.missing).toEqual([
      "場所",
      "設備・機械",
      "重機",
      "人数",
      "同時作業",
      "変更点",
      "新規入場者",
      "夜間作業",
      "化学物質",
      "熱中症条件",
    ]);
  });

  it("normalizes control characters and bounds values", () => {
    const parsed = parseKySuggestionContext({
      workContent: `掘削\u0000${"作".repeat(500)}`,
      context: {
        workLocation: "北側\n構内",
        equipment: "バックホウ",
        heavyEquipment: "バックホウ",
        plannedPeopleCount: "3人",
        weather: "曇り",
        simultaneousWork: "なし",
        changes: "なし",
        newEntrants: "なし",
        nightWork: "なし",
        chemicals: "なし",
        heatStress: "WBGTを確認",
      },
    });
    expect(parsed.context?.workContent).not.toContain("\u0000");
    expect(parsed.context?.workContent.length).toBeLessThanOrEqual(300);
    expect(parsed.context?.workLocation).toBe("北側 構内");
  });

  it("PF-004: legacy flat fields are normalized into the same 11-field context", () => {
    const parsed = parseKySuggestionContext({
      workContent: "資材運搬",
      workLocation: "構内",
      equipment: "台車",
      heavyEquipment: "なし",
      peopleCount: "2人",
      weather: "晴れ",
      simultaneousWork: "なし",
      changes: "なし",
      newEntrants: "なし",
      nightWork: "なし",
      chemicals: "なし",
      heatStress: "WBGTを確認",
    });
    expect(parsed.missing).toEqual([]);
    expect(parsed.context?.plannedPeopleCount).toBe("2人");
  });
});
