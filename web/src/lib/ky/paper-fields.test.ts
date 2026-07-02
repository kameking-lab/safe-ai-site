import { describe, expect, it } from "vitest";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import {
  KY_HEADER_FIELDS,
  KY_HEADER_FIELD_ORDER,
  emptyKyHeaderFieldKeys,
  isKyPaperFieldKey,
} from "./paper-fields";

describe("F1: KYヘッダー欄フィールドマップ", () => {
  it("6欄が定義され、next連鎖が現場名→…→元請会社で一筆書きになっている", () => {
    expect(KY_HEADER_FIELD_ORDER).toHaveLength(6);
    // next を辿ると全欄を一度ずつ通る（記入順の「次の欄へ」送りの整合）
    const visited: string[] = [];
    let key: string | undefined = "siteName";
    while (key) {
      expect(visited).not.toContain(key); // 循環しない
      visited.push(key);
      key = KY_HEADER_FIELDS[key as keyof typeof KY_HEADER_FIELDS].next;
    }
    expect(visited).toEqual([...KY_HEADER_FIELD_ORDER]);
  });

  it("isEmpty が記入状態を正しく判定する", () => {
    const empty = normalizeKyInstructionRecord({});
    empty.workDateYear = "";
    const keys = emptyKyHeaderFieldKeys(empty);
    expect(keys.has("siteName")).toBe(true);
    expect(keys.has("workDate")).toBe(true);

    const filled = normalizeKyInstructionRecord({
      siteName: "A現場",
      projectName: "B工区",
      foremanName: "山田",
      coop1Name: "C建設",
      weather: "晴れ",
    });
    filled.workDateYear = "2026";
    filled.workDateMonth = "7";
    filled.workDateDay = "2";
    expect(emptyKyHeaderFieldKeys(filled).size).toBe(0);
  });

  it("気温だけ入っていれば天気・気温欄は記入済み扱い", () => {
    const r = normalizeKyInstructionRecord({ temperature: "30" });
    expect(KY_HEADER_FIELDS.weatherTemp.isEmpty(r)).toBe(false);
  });

  it("isKyPaperFieldKey 型ガード", () => {
    expect(isKyPaperFieldKey("siteName")).toBe(true);
    expect(isKyPaperFieldKey("risk.0.hazard")).toBe(false);
  });
});
