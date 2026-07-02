import { describe, expect, it } from "vitest";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import {
  KY_PAPER_FIELDS,
  KY_PAPER_FIELD_ORDER,
  emptyKyPaperFieldKeys,
  isKyPaperFieldKey,
} from "./paper-fields";

describe("F1/O10: KY用紙フィールドマップ", () => {
  it("10欄が定義され、next連鎖が現場名→…→指差呼称で一筆書きになっている", () => {
    expect(KY_PAPER_FIELD_ORDER).toHaveLength(10);
    // next を辿ると全欄を一度ずつ通る（記入順の「次の欄へ」送りの整合）
    const visited: string[] = [];
    let key: string | undefined = "siteName";
    while (key) {
      expect(visited).not.toContain(key); // 循環しない
      visited.push(key);
      key = KY_PAPER_FIELDS[key as keyof typeof KY_PAPER_FIELDS].next;
    }
    expect(visited).toEqual([...KY_PAPER_FIELD_ORDER]);
  });

  it("isEmpty が記入状態を正しく判定する", () => {
    const empty = normalizeKyInstructionRecord({});
    empty.workDateYear = "";
    const keys = emptyKyPaperFieldKeys(empty);
    expect(keys.has("siteName")).toBe(true);
    expect(keys.has("workDate")).toBe(true);
    expect(keys.has("workDetail")).toBe(true);
    expect(keys.has("teamGoal")).toBe(true);
    expect(keys.has("priorityItems")).toBe(true);
    expect(keys.has("pointingCall")).toBe(true);

    const filled = normalizeKyInstructionRecord({
      siteName: "A現場",
      projectName: "B工区",
      foremanName: "山田",
      coop1Name: "C建設",
      weather: "晴れ",
      teamGoal: "高所では親綱を使おう",
      priorityItems: "足場点検",
      pointingCall: "足元 ヨシ！",
    });
    filled.workDateYear = "2026";
    filled.workDateMonth = "7";
    filled.workDateDay = "2";
    filled.workRows = [{ ...filled.workRows[0], workDetail: "3F鉄骨建方" }];
    expect(emptyKyPaperFieldKeys(filled).size).toBe(0);
  });

  it("気温だけ入っていれば天気・気温欄は記入済み扱い", () => {
    const r = normalizeKyInstructionRecord({ temperature: "30" });
    expect(KY_PAPER_FIELDS.weatherTemp.isEmpty(r)).toBe(false);
  });

  it("workDetail の get/set は workRows[0] を対象にイミュータブル更新する", () => {
    const r = normalizeKyInstructionRecord({});
    expect(KY_PAPER_FIELDS.workDetail.get?.(r)).toBe("");
    const patch = KY_PAPER_FIELDS.workDetail.set?.(r, "配管更新工事");
    expect(patch?.workRows?.[0]?.workDetail).toBe("配管更新工事");
    // イミュータブル: 元のrecordは変化しない
    expect(r.workRows[0]?.workDetail ?? "").toBe("");
  });

  it("isKyPaperFieldKey 型ガード", () => {
    expect(isKyPaperFieldKey("siteName")).toBe(true);
    expect(isKyPaperFieldKey("workDetail")).toBe(true);
    expect(isKyPaperFieldKey("risk.0.hazard")).toBe(false);
  });
});
