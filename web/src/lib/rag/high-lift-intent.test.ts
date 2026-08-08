import { describe, expect, it } from "vitest";
import { detectHighLiftQueryIntent } from "./high-lift-intent";

describe("detectHighLiftQueryIntent", () => {
  it.each([
    "高所作業車の作業床における安全帯使用等の条文は？",
    "高作車の作業床でフルハーネスは必要？",
    "こうしょ作業車で墜落制止用器具を使う根拠は？",
  ])("作業床上の墜落防止を資格質問へ変えない: %s", (query) => {
    expect(detectHighLiftQueryIntent(query)).toMatchObject({
      hasHighLiftContext: true,
      fallProtection: true,
    });
  });

  it.each([
    "高所作業車は特別教育いる？",
    "高作車を運転する資格は？",
    "こうしょ作業車を操作するには何が必要？",
  ])("運転資格・教育の意図を保つ: %s", (query) => {
    expect(detectHighLiftQueryIntent(query)).toMatchObject({
      hasHighLiftContext: true,
      qualification: true,
      fallProtection: false,
    });
  });

  it("短いfollow-upでも直前の高所作業車文脈を利用する", () => {
    expect(
      detectHighLiftQueryIntent(
        "安全帯は？",
        "高所作業車についてです。安全帯は？",
      ),
    ).toEqual({
      hasHighLiftContext: true,
      qualification: false,
      fallProtection: true,
    });
  });
});
