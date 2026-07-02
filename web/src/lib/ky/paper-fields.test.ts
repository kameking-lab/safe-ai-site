import { describe, expect, it } from "vitest";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import {
  KY_PAPER_FIELDS,
  KY_PAPER_FIELD_ORDER,
  emptyKyPaperFieldKeys,
  isKyPaperFieldKey,
  getKyPaperFieldDef,
  nextKyPaperFieldKey,
  riskFieldKey,
  parseRiskFieldKey,
  type KyPaperFieldKey,
} from "./paper-fields";

describe("F1/O10: KY用紙フィールドマップ", () => {
  it("11の静的欄が定義され、workDetail の次は危険行(risk.0.hazard)につながる", () => {
    expect(KY_PAPER_FIELD_ORDER).toHaveLength(11);
    expect(KY_PAPER_FIELDS.workDetail.next).toBe("risk.0.hazard");
  });

  it("next連鎖: 現場名→…→本日の作業内容→危険行(既定5行×3部位)→…→指差呼称で一筆書きになっている", () => {
    const record = normalizeKyInstructionRecord({});
    expect(record.riskRows).toHaveLength(5);
    const visited: string[] = [];
    let key: KyPaperFieldKey | undefined = "siteName";
    while (key) {
      expect(visited).not.toContain(key); // 循環しない
      visited.push(key);
      key = nextKyPaperFieldKey(key, record);
    }
    const expected = [
      ...KY_PAPER_FIELD_ORDER.slice(0, KY_PAPER_FIELD_ORDER.indexOf("teamGoal")),
      ...Array.from({ length: 5 }, (_, i) => [
        riskFieldKey(i, "hazard"),
        riskFieldKey(i, "eval"),
        riskFieldKey(i, "reduction"),
      ]).flat(),
      ...KY_PAPER_FIELD_ORDER.slice(KY_PAPER_FIELD_ORDER.indexOf("teamGoal")),
    ];
    expect(visited).toEqual(expected);
  });

  it("危険行キーの組み立て・分解が往復する", () => {
    expect(riskFieldKey(0, "hazard")).toBe("risk.0.hazard");
    expect(riskFieldKey(3, "reduction")).toBe("risk.3.reduction");
    expect(parseRiskFieldKey("risk.2.eval")).toEqual({ index: 2, part: "eval" });
    expect(parseRiskFieldKey("siteName")).toBeNull();
  });

  it("危険行が最終行なら次は teamGoal へ折り返す（追加行にも追従）", () => {
    const record = normalizeKyInstructionRecord({});
    expect(nextKyPaperFieldKey(riskFieldKey(4, "reduction"), record)).toBe("teamGoal");
    const withExtra = { ...record, riskRows: [...record.riskRows, record.riskRows[0]] };
    expect(nextKyPaperFieldKey(riskFieldKey(4, "reduction"), withExtra)).toBe("risk.5.hazard");
    expect(nextKyPaperFieldKey(riskFieldKey(5, "reduction"), withExtra)).toBe("teamGoal");
  });

  it("危険行の get/set は riskRows[index] を対象にイミュータブル更新する", () => {
    const r = normalizeKyInstructionRecord({});
    const hazardDef = getKyPaperFieldDef("risk.1.hazard");
    expect(hazardDef.get?.(r)).toBe("");
    const patch = hazardDef.set?.(r, "墜落の危険");
    expect(patch?.riskRows?.[1]?.hazard).toBe("墜落の危険");
    expect(r.riskRows[1]?.hazard ?? "").toBe(""); // イミュータブル
    expect(patch?.riskRows?.[0]?.hazard).toBe(""); // 他行は不変
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
    expect(keys.has("participants")).toBe(true);

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
    // 危険行(既定5行)も全行 hazard/reduction を埋める（riskEvalは既定値ありで常に記入済み扱い）
    filled.riskRows = filled.riskRows.map((row) => ({ ...row, hazard: "危険あり", reduction: "対策あり" }));
    filled.participants = [{ name: "山田太郎", qualNo: "", preWork: "", onExit: "" }];
    expect(emptyKyPaperFieldKeys(filled).size).toBe(0);
  });

  it("参加者(participants)は氏名が1件でもあれば記入済み扱い", () => {
    const r = normalizeKyInstructionRecord({});
    expect(KY_PAPER_FIELDS.participants.isEmpty(r)).toBe(true);
    const withOne = { ...r, participants: [{ name: "山田太郎", qualNo: "", preWork: "", onExit: "" }] };
    expect(KY_PAPER_FIELDS.participants.isEmpty(withOne)).toBe(false);
    expect(nextKyPaperFieldKey("pointingCall", r)).toBe("participants");
    expect(nextKyPaperFieldKey("participants", r)).toBeUndefined();
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

  it("isKyPaperFieldKey 型ガード（O10続き: 危険行キーにも対応）", () => {
    expect(isKyPaperFieldKey("siteName")).toBe(true);
    expect(isKyPaperFieldKey("workDetail")).toBe(true);
    expect(isKyPaperFieldKey("risk.0.hazard")).toBe(true);
    expect(isKyPaperFieldKey("risk.12.reduction")).toBe(true);
    expect(isKyPaperFieldKey("risk.0.unknown")).toBe(false);
    expect(isKyPaperFieldKey("risk.x.hazard")).toBe(false);
    expect(isKyPaperFieldKey("notAField")).toBe(false);
  });

  it("危険行の可能性・重大性(riskEval)は既定値を持つため常に記入済み扱い", () => {
    const r = normalizeKyInstructionRecord({});
    expect(getKyPaperFieldDef("risk.0.eval").isEmpty(r)).toBe(false);
  });

  it("emptyKyPaperFieldKeys は行数ぶんの危険行キーを含む（追加行にも追従）", () => {
    const r = normalizeKyInstructionRecord({});
    const keys = emptyKyPaperFieldKeys(r);
    expect(keys.has("risk.0.hazard")).toBe(true);
    expect(keys.has("risk.4.reduction")).toBe(true);
    expect(keys.has("risk.5.hazard")).toBe(false); // 既定は5行のみ
    const extended = { ...r, riskRows: [...r.riskRows, r.riskRows[0]] };
    expect(emptyKyPaperFieldKeys(extended).has("risk.5.hazard")).toBe(true);
  });
});
