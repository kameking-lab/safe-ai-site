import { describe, expect, it } from "vitest";
import { automationConsultationTypes } from "./schema";
import {
  AUTOMATION_CONSULT_PREFILL_QUERY_KEY,
  parseAutomationConsultationTypePrefill,
} from "./prefill";

describe("parseAutomationConsultationTypePrefill", () => {
  it.each(automationConsultationTypes)(
    "既存allowlistの%sだけを返す",
    (consultationType) => {
      expect(
        parseAutomationConsultationTypePrefill(
          `${AUTOMATION_CONSULT_PREFILL_QUERY_KEY}=${consultationType}`,
        ),
      ).toBe(consultationType);
      expect(
        parseAutomationConsultationTypePrefill(
          new URLSearchParams({
            [AUTOMATION_CONSULT_PREFILL_QUERY_KEY]: consultationType,
          }),
        ),
      ).toBe(consultationType);
    },
  );

  it.each([
    null,
    undefined,
    "",
    "consultationType=heat-illness",
    "consultationType=Training",
    "consultationType=%20training%20",
    "type=training",
    "https://example.test/?consultationType=training",
  ])("欠落・未知・非正規値をfail-closedで拒否する: %s", (query) => {
    expect(parseAutomationConsultationTypePrefill(query)).toBeNull();
  });

  it("重複値や他のquery keyが混在した場合はprefillしない", () => {
    expect(
      parseAutomationConsultationTypePrefill(
        "consultationType=training&consultationType=signage",
      ),
    ).toBeNull();
    expect(
      parseAutomationConsultationTypePrefill(
        "consultationType=training&utm_source=heat-special",
      ),
    ).toBe("training");
    expect(
      parseAutomationConsultationTypePrefill(
        "consultationType=training&utm_source=heat-special&utm_medium=cta&utm_campaign=summer",
      ),
    ).toBe("training");
  });

  it.each([
    ["currentProblem", "現場名を含む相談本文"],
    ["desiredSupport", "健康情報を整理したい"],
    ["name", "個人名"],
    ["email", "person@example.invalid"],
    ["organization", "会社名"],
    ["healthInformation", "症状や病歴"],
  ])(
    "%sをURLからフォーム初期値へ取り込まない",
    (field, value) => {
      const params = new URLSearchParams({
        consultationType: "safety-efficiency",
        [field]: value,
      });
      expect(parseAutomationConsultationTypePrefill(params)).toBeNull();
    },
  );

  it("入力URLSearchParamsを変更しない純関数である", () => {
    const params = new URLSearchParams({
      consultationType: "training-materials",
    });
    const before = params.toString();

    expect(parseAutomationConsultationTypePrefill(params)).toBe(
      "training-materials",
    );
    expect(params.toString()).toBe(before);
  });
});
