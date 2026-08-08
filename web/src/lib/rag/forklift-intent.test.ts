import { describe, expect, it } from "vitest";
import { detectForkliftQueryIntent } from "./forklift-intent";

describe("detectForkliftQueryIntent", () => {
  it.each([
    ["フォークリフトのスピードは誰が決める？", "speed"],
    ["フォークのスピード決めなきゃダメ？", "speed"],
    ["フォークリフ卜の年次点険は？", "annualInspection"],
    ["フォークリフトの年1回の点検は？", "annualInspection"],
    ["フォークリフトの用途外使用は禁止？", "offPurposeUse"],
    ["フォークリフト作業の作業指揮者は？", "workLeader"],
    ["フォークリフト1.5トンを運転したい", "qualification"],
  ] as const)("口語・誤字を元質問の意図として保つ: %s", (query, key) => {
    const intent = detectForkliftQueryIntent(query, `${query} フォークリフト`);
    expect(intent.hasForkliftContext).toBe(true);
    expect(intent[key]).toBe(true);
  });

  it("展開語だけの技能講習を資格意図として扱わない", () => {
    const intent = detectForkliftQueryIntent(
      "フォークリフトの速度は？",
      "フォークリフトの速度は？ 技能講習 特別教育",
    );
    expect(intent.speed).toBe(true);
    expect(intent.qualification).toBe(false);
  });

  it.each([
    ["フォークリフトの毎月の自主検査は必要？", "monthlyInspection"],
    ["フォークリフトの月例検査は？", "monthlyInspection"],
    ["フォークリフトの月1回の定期自主検査は？", "monthlyInspection"],
    ["フォークリフトの年1回の定期自主検査は？", "annualInspection"],
    ["フォークリフトの定期点検は？", "genericInspection"],
    ["フォークリフトの指揮する人は必要？", "workLeader"],
  ] as const)("月次・年次・一般点検と指揮者口語を区別する: %s", (query, key) => {
    const intent = detectForkliftQueryIntent(query);
    expect(intent[key]).toBe(true);
    expect(intent.qualification).toBe(false);
    if (key === "monthlyInspection") expect(intent.annualInspection).toBe(false);
  });
});
