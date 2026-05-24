/**
 * P0-010 (usability-audit-day2-2026-05-24):
 * KY → 安全衛生日誌 ワンクリック転記の loadLatestKyForDiary のテスト。
 */

import { describe, expect, test, beforeEach } from "vitest";
import { loadLatestKyForDiary } from "./from-ky";

const KY_STORAGE_KEY = "safe-ai:ky-instruction-record:v1";

beforeEach(() => {
  if (typeof window !== "undefined") {
    window.localStorage.clear();
  }
});

describe("loadLatestKyForDiary", () => {
  test("KY 未保存時は null を返す", () => {
    expect(loadLatestKyForDiary()).toBeNull();
  });

  test("不正 JSON は null を返す (例外を出さない)", () => {
    window.localStorage.setItem(KY_STORAGE_KEY, "not-json");
    expect(loadLatestKyForDiary()).toBeNull();
  });

  test("最小限の KY データから workContent/kyResult を抽出", () => {
    window.localStorage.setItem(
      KY_STORAGE_KEY,
      JSON.stringify({
        workDateYear: "2026",
        workDateMonth: "5",
        workDateDay: "24",
        coop1Name: "サンプル建設",
        coop2Name: "",
        coop3Name: "",
        workRows: [
          { workPlace: "3F足場", workDetail: "支柱組立", machinery: "", fireMark: "", heightMark: "", ppeNote: "", safetyInstruction: "", responsible: "", primeSign: "" },
          { workPlace: "", workDetail: "手すり点検", machinery: "", fireMark: "", heightMark: "", ppeNote: "", safetyInstruction: "", responsible: "", primeSign: "" },
        ],
        riskRows: [
          { targetLabel: "", hazard: "墜落", qualNo: "", likelihood: 2, severity: 3, reduction: "フルハーネス着用", reLikelihood: 1, reSeverity: 3, reducedBelow2: "", primeSign: "" },
          { targetLabel: "", hazard: "", qualNo: "", likelihood: 1, severity: 1, reduction: "", reLikelihood: 1, reSeverity: 1, reducedBelow2: "", primeSign: "" },
        ],
        participants: [],
      }),
    );
    const payload = loadLatestKyForDiary();
    expect(payload).not.toBeNull();
    expect(payload?.workContent).toContain("【3F足場】支柱組立");
    expect(payload?.workContent).toContain("手すり点検");
    expect(payload?.kyResult).toContain("墜落");
    expect(payload?.kyResult).toContain("フルハーネス");
    expect(payload?.siteName).toBe("サンプル建設");
    expect(payload?.meta.workDate).toBe("2026-05-24");
    expect(payload?.meta.workDetail).toBe("支柱組立");
  });

  test("workRows/riskRows が全て空 → siteName のみあれば payload 返す", () => {
    window.localStorage.setItem(
      KY_STORAGE_KEY,
      JSON.stringify({
        coop1Name: "X 工務店",
        workRows: [],
        riskRows: [],
      }),
    );
    const payload = loadLatestKyForDiary();
    expect(payload?.siteName).toBe("X 工務店");
    expect(payload?.workContent).toBe("");
    expect(payload?.kyResult).toBe("");
  });

  test("workDateYear なしなら meta.workDate は null", () => {
    window.localStorage.setItem(
      KY_STORAGE_KEY,
      JSON.stringify({
        coop1Name: "テスト",
        workRows: [{ workPlace: "", workDetail: "作業", machinery: "", fireMark: "", heightMark: "", ppeNote: "", safetyInstruction: "", responsible: "", primeSign: "" }],
        riskRows: [],
      }),
    );
    const payload = loadLatestKyForDiary();
    expect(payload?.meta.workDate).toBeNull();
  });
});
