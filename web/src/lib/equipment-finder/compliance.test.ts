import { describe, expect, it } from "vitest";
import { deriveComplianceBadge, formatRegulations } from "./compliance";

describe("deriveComplianceBadge", () => {
  it("防じん/防毒マスクの spec『国家検定』を最優先で国家検定品と判定", () => {
    expect(deriveComplianceBadge("国家検定 DS2", ["防じんマスクの規格"])).toEqual({
      label: "国家検定品",
      tone: "amber",
    });
    expect(
      deriveComplianceBadge("国家検定 有機ガス用", ["有機則", "防毒マスクの規格"])
    ).toEqual({ label: "国家検定品", tone: "amber" });
  });

  it("検定合格の表記でも国家検定品と判定", () => {
    expect(deriveComplianceBadge("検定合格 RL3", [])).toEqual({
      label: "国家検定品",
      tone: "amber",
    });
  });

  it("保護帽の『労検』を労検合格品と判定", () => {
    expect(
      deriveComplianceBadge("労検 飛来・落下物用＋墜落時保護用", [
        "保護帽の規格（厚労省告示）",
      ])
    ).toEqual({ label: "労検合格品", tone: "amber" });
  });

  it("救命胴衣の『桜マーク 国土交通省型式承認』を型式承認品と判定", () => {
    expect(
      deriveComplianceBadge("桜マーク 国土交通省型式承認", ["国土交通省告示"])
    ).toEqual({ label: "型式承認品", tone: "amber" });
  });

  it("JIS 規格は JIS規格適合（blue）と判定", () => {
    expect(deriveComplianceBadge("JIS T 8101 S種", ["JIS T 8101"])).toEqual({
      label: "JIS規格適合",
      tone: "blue",
    });
    // spec に JIS が無くても regulations 側にあれば拾う
    expect(deriveComplianceBadge("墜落制止距離 1.85m以下", ["JIS T 8165"])).toEqual({
      label: "JIS規格適合",
      tone: "blue",
    });
  });

  it("国家検定とJISが両方ある場合は国家検定を優先", () => {
    expect(
      deriveComplianceBadge("国家検定 DS2 / JIS T 8151", ["JIS T 8151"])
    ).toEqual({ label: "国家検定品", tone: "amber" });
  });

  it("マーカーが何も無ければ null（捏造しない）", () => {
    expect(deriveComplianceBadge("4V出力・ベスト型", ["熱中症予防（厚労省ガイドライン）"])).toBeNull();
    expect(deriveComplianceBadge(undefined, undefined)).toBeNull();
    expect(deriveComplianceBadge("", [])).toBeNull();
  });
});

describe("formatRegulations", () => {
  it("trim・空除去・重複除去して返す", () => {
    expect(
      formatRegulations(["安衛則 第518条", " 安衛則 第518条 ", "", "墜落制止用器具の規格"])
    ).toEqual(["安衛則 第518条", "墜落制止用器具の規格"]);
  });

  it("limit を超えたら切り詰める", () => {
    expect(formatRegulations(["A", "B", "C", "D", "E"], 3)).toEqual(["A", "B", "C"]);
  });

  it("undefined は空配列", () => {
    expect(formatRegulations(undefined)).toEqual([]);
  });
});
