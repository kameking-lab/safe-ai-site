import { describe, expect, it } from "vitest";
import {
  createCertCandidateResult,
  determineRequiredCerts,
  identifyMissing,
  isStatutory,
} from "./education-cert-engine";
import {
  ALL_CERTS,
  QUARANTINED_CERTS,
} from "@/data/education-rules";
import type { EducationCert } from "@/types/education-cert";

function determine(work: string) {
  return determineRequiredCerts({
    businessTypes: ["manufacturing"],
    works: [work],
  });
}

function ids(work: string): string[] {
  return determine(work).map((result) => result.cert.id);
}

describe("資格判定の fail-closed 境界", () => {
  it("キーワード一致だけでは法定制度候補を required に確定しない", () => {
    const results = determine("最大荷重1t以上のフォークリフトを運転");
    const forklift = results.find(
      (result) => result.cert.id === "st-forklift",
    );

    expect(forklift?.decision).toBe("statutoryCandidate");
    expect(forklift?.priority).toBe("recommended");
    expect(forklift?.conditionState).toBe("satisfied");
    expect(forklift?.humanReviewRequired).toBe(true);
    expect(
      results.some((result) => result.cert.id === "se-36-5-forklift"),
    ).toBe(false);
  });

  it("PF-039: 最大荷重1t未満は特別教育候補だけを残す", () => {
    const results = determine("最大荷重1t未満のフォークリフトを運転");
    expect(
      results.some((result) => result.cert.id === "se-36-5-forklift"),
    ).toBe(true);
    expect(
      results.some((result) => result.cert.id === "st-forklift"),
    ).toBe(false);
  });

  it("積荷0.8tをフォークリフト本体の最大荷重として確定しない", () => {
    const forkliftResults = determine(
      "フォークリフトで0.8tの荷を運ぶ",
    ).filter((result) =>
      ["se-36-5-forklift", "st-forklift"].includes(result.cert.id),
    );

    expect(forkliftResults.map((result) => result.cert.id)).toEqual(
      expect.arrayContaining(["se-36-5-forklift", "st-forklift"]),
    );
    expect(
      forkliftResults.every(
        (result) =>
          result.conditionState === "missing" &&
          result.matchReason.includes("最大荷重"),
      ),
    ).toBe(true);
  });

  it("公道走行は安衛法上の教育だけで充足とせず運転免許確認を要求する", () => {
    const forkliftResults = determine(
      "最大荷重0.8tのフォークリフトで公道を運転",
    ).filter((result) =>
      ["se-36-5-forklift", "st-forklift"].includes(result.cert.id),
    );

    expect(forkliftResults.map((result) => result.cert.id)).toEqual(
      expect.arrayContaining(["se-36-5-forklift", "st-forklift"]),
    );
    expect(
      forkliftResults.every(
        (result) =>
          result.conditionState === "missing" &&
          /公道|運転免許/.test(result.matchReason),
      ),
    ).toBe(true);
  });

  it.each([
    [
      "つり上げ荷重1t未満の玉掛け作業",
      "se-36-19-tamakake",
      "st-tamakake",
    ],
    [
      "つり上げ荷重1t以上の玉掛け作業",
      "st-tamakake",
      "se-36-19-tamakake",
    ],
  ])(
    "玉掛けの明示したつり上げ荷重で制度候補を絞り、無関係なフォークリフトを混ぜない: %s",
    (work, expectedId, excludedId) => {
      const results = determine(work);
      expect(results.map((result) => result.cert.id)).toContain(expectedId);
      expect(results.map((result) => result.cert.id)).not.toContain(excludedId);
      expect(results.map((result) => result.cert.id)).not.toContain(
        "st-forklift",
      );
      expect(results.map((result) => result.cert.id)).not.toContain(
        "se-36-5-forklift",
      );
    },
  );

  it("荷そのものの重量しか分からない玉掛けは両制度候補を保持する", () => {
    const results = determine("1t未満の荷を玉掛けする").filter((result) =>
      ["se-36-19-tamakake", "st-tamakake"].includes(result.cert.id),
    );
    expect(results.map((result) => result.cert.id)).toEqual(
      expect.arrayContaining(["se-36-19-tamakake", "st-tamakake"]),
    );
    expect(
      results.every(
        (result) =>
          result.conditionState === "missing" &&
          result.matchReason.includes("つり上げ荷重"),
      ),
    ).toBe(true);
  });

  it("未確認・非法定・隔離レコードを required にしない", () => {
    const vdt = determine("VDT 情報機器作業").find(
      (result) => result.cert.id === "se-36-vdt",
    );
    expect(vdt?.decision).toBe("related");
    expect(vdt?.priority).toBe("recommended");
    expect(isStatutory(vdt!.cert)).toBe(false);

    expect(QUARANTINED_CERTS.map((cert) => cert.id)).toContain(
      "st-noise-chief",
    );
    expect(ALL_CERTS.map((cert) => cert.id)).not.toContain("st-noise-chief");
    expect(ids("騒音対策")).not.toContain("st-noise-chief");
  });

  it("identifyMissing は条件・根拠が確定した required だけを対象にする", () => {
    const candidate = determine("最大荷重1t以上のフォークリフトを運転");
    expect(identifyMissing([], candidate)).toEqual([]);
  });
});

describe("一般クレーンの5t・操作方式境界", () => {
  it("一般の5t以上クレーンを床上操作式技能講習に一般化しない", () => {
    const results = determine("つり上げ荷重5t以上の天井クレーンを運転");
    const resultIds = results.map((result) => result.cert.id);

    expect(resultIds).toContain("lic-crane-derrick");
    expect(resultIds).not.toContain("st-crane-5t");
    expect(resultIds).not.toContain("se-36-15-crane-under5t");
    expect(
      results.find((result) => result.cert.id === "lic-crane-derrick")
        ?.conditionState,
    ).toBe("missing");
  });

  it("5t以上かつ運転者が荷とともに移動する床上操作式だけ技能講習候補にする", () => {
    const results = determine(
      "つり上げ荷重5t以上の床上操作式クレーンを、運転者が荷の移動とともに移動して運転",
    );
    const resultIds = results.map((result) => result.cert.id);

    expect(resultIds).toContain("st-crane-5t");
    expect(resultIds).toContain("lic-crane-derrick");
    expect(resultIds).not.toContain("se-36-15-crane-under5t");
    expect(
      results.find((result) => result.cert.id === "st-crane-5t")
        ?.conditionState,
    ).toBe("satisfied");
    expect(results.every((result) => result.priority !== "required")).toBe(
      true,
    );
  });

  it("床上運転式は床上操作式技能講習の対象にしない", () => {
    expect(ids("つり上げ荷重5t以上の床上運転式クレーンを運転")).toEqual(
      expect.arrayContaining(["lic-crane-derrick"]),
    );
    expect(
      ids("つり上げ荷重5t以上の床上運転式クレーンを運転"),
    ).not.toContain("st-crane-5t");
  });

  it("無線操作式は2026-07-24時点で床上操作式技能講習の対象にしない", () => {
    const resultIds = ids(
      "つり上げ荷重5t以上の天井クレーンを床上から無線操作",
    );
    expect(resultIds).toContain("lic-crane-derrick");
    expect(resultIds).not.toContain("st-crane-5t");
    expect(
      ALL_CERTS.some((cert) =>
        cert.name.includes("床上無線運転式クレーン等限定免許"),
      ),
    ).toBe(false);
  });

  it("5t未満は特別教育候補に分岐する", () => {
    const resultIds = ids("つり上げ荷重4.9tの天井クレーンを運転");
    expect(resultIds).toContain("se-36-15-crane-under5t");
    expect(resultIds).not.toContain("st-crane-5t");
    expect(resultIds).not.toContain("lic-crane-derrick");
  });

  it("能力不明では資格不要とせず、免許と特別教育を未確定候補にする", () => {
    const results = determine("天井クレーンを運転");
    const resultIds = results.map((result) => result.cert.id);
    expect(resultIds).toContain("lic-crane-derrick");
    expect(resultIds).toContain("se-36-15-crane-under5t");
    expect(resultIds).not.toContain("st-crane-5t");
    expect(results.every((result) => result.conditionState === "missing")).toBe(
      true,
    );
  });
});

describe("移動式クレーンの能力境界", () => {
  it.each([
    ["0.9t", "se-36-16-mobile-crane"],
    ["4.9t", "st-mobile-crane"],
    ["5t", "lic-mobile-crane"],
  ])("%s を正しい能力帯だけに分岐する", (capacity, expectedId) => {
    const resultIds = ids(`つり上げ荷重${capacity}の移動式クレーンを運転`);
    expect(resultIds).toContain(expectedId);
    expect(
      resultIds.filter((id) =>
        [
          "se-36-16-mobile-crane",
          "st-mobile-crane",
          "lic-mobile-crane",
        ].includes(id),
      ),
    ).toEqual([expectedId]);
  });
});

describe("required 互換フィールドの閉じた条件", () => {
  const baseCert: EducationCert = {
    id: "test-verified",
    name: "テスト用法定教育",
    certType: "special_education",
    targetWork: "テスト作業",
    relatedLaw: "テスト法令",
    duration: "確認済み時間",
    workCategories: ["general"],
    keywords: ["テスト"],
    legalStatus: "statutorySpecialEducation",
    sourceVerification: "humanVerified",
    sourceCheckedAt: "2026-07-24",
    primarySources: [
      {
        title: "テスト一次資料",
        url: "https://example.invalid/official",
      },
    ],
  };

  it("人手確認済み一次資料・条件充足・明示確認が全てそろう場合だけ required", () => {
    expect(
      createCertCandidateResult(
        baseCert,
        "テスト条件",
        "satisfied",
        true,
      ).priority,
    ).toBe("required");
    expect(
      createCertCandidateResult(
        baseCert,
        "テスト条件",
        "satisfied",
        false,
      ).priority,
    ).toBe("recommended");
    expect(
      createCertCandidateResult(
        { ...baseCert, sourceVerification: "sourceLocated" },
        "テスト条件",
        "satisfied",
        true,
      ).priority,
    ).toBe("recommended");
  });
});
