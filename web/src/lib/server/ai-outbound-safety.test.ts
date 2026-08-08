import { describe, expect, it, vi } from "vitest";
import {
  inspectAiOutbound,
  logAiOutboundFailure,
} from "@/lib/server/ai-outbound-safety";

const base = {
  purpose: "test",
  consent: true,
  contextPolicy: "approved-server-corpus" as const,
};

describe("inspectAiOutbound", () => {
  it("同意なしをfail-closedにする", () => {
    expect(inspectAiOutbound({ ...base, consent: false, texts: ["匿名の作業"] })).toMatchObject({
      allowed: false,
      reason: "consent_required",
      status: 428,
    });
  });

  it("同意がなくても緊急・PIIを先に分類し、単なる同意不足へ矮小化しない", () => {
    expect(
      inspectAiOutbound({
        ...base,
        consent: false,
        texts: ["意識がなく呼吸していない"],
      }),
    ).toMatchObject({ allowed: false, reason: "emergency", status: 422 });
    expect(
      inspectAiOutbound({
        ...base,
        consent: false,
        texts: ["連絡先は090-1234-5678です"],
      }),
    ).toMatchObject({ allowed: false, reason: "sensitive_data", status: 422 });
  });

  it.each([
    ["意識がなく呼吸していない", "emergency"],
    ["連絡先は090-1234-5678です", "sensitive_data"],
    ["担当は佐藤です", "sensitive_data"],
    ["佐藤が作業します", "sensitive_data"],
    ["山田太郎が足場で作業します", "sensitive_data"],
    ["山田太郎です。足場の手すり高さは？", "sensitive_data"],
    ["小野太郎です。足場の手すり高さは？", "sensitive_data"],
    [
      "作業指揮者は小野太郎です。フォークリフトの速度も教えて",
      "sensitive_data",
    ],
    ["私は妊娠しています。高所作業の制限は？", "sensitive_data"],
    ["会社名: 株式会社安全工業", "confidential_data"],
    ["霞ヶ関ビル改修工事の手順を整理して", "confidential_data"],
    ["取引先は安全建設です", "confidential_data"],
  ])("%s をモデル送信前に遮断する", (text, reason) => {
    expect(inspectAiOutbound({ ...base, texts: [text] })).toMatchObject({
      allowed: false,
      reason,
    });
  });

  it("履歴を含む全テキストを再検査する", () => {
    expect(
      inspectAiOutbound({ ...base, texts: ["匿名の質問", "メール: worker@example.com"] })
    ).toMatchObject({ allowed: false, reason: "sensitive_data" });
  });

  it("長さ超過・不明な値・未検査バイナリを遮断する", () => {
    expect(inspectAiOutbound({ ...base, texts: ["a".repeat(50)], maxChars: 20 })).toMatchObject({
      reason: "input_too_large",
    });
    expect(inspectAiOutbound({ ...base, texts: [{}] })).toMatchObject({ reason: "invalid_input" });
    expect(
      inspectAiOutbound({ ...base, texts: [], hasUninspectableBinary: true })
    ).toMatchObject({ reason: "uninspectable_binary" });
  });

  it("匿名化済みの短い入力だけを許可する", () => {
    expect(inspectAiOutbound({ ...base, texts: ["作業者Aが屋外で塗装する"] })).toMatchObject({
      allowed: true,
    });
  });
});

describe("logAiOutboundFailure", () => {
  it("例外本文をログへ出さない", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logAiOutboundFailure("test", new Error("worker@example.com confidential"));
    expect(JSON.stringify(spy.mock.calls)).not.toContain("worker@example.com");
    expect(JSON.stringify(spy.mock.calls)).not.toContain("confidential");
    spy.mockRestore();
  });
});
