import { describe, it, expect } from "vitest";
import { buildContextPrefill } from "@/lib/chatbot-context-prefill";

describe("P1-3 文脈プリフィル", () => {
  it("substance を最優先し化学物質の質問文を作る", () => {
    const q = buildContextPrefill({ context: "ky", substance: "トルエン", work: "塗装" });
    expect(q).toContain("トルエン");
    expect(q).toMatch(/特化則|有機則|ばく露/);
  });

  it("context=ky + work でKY向けの質問文を作る", () => {
    const q = buildContextPrefill({ context: "ky", work: "外壁塗装" });
    expect(q).toContain("外壁塗装");
    expect(q).toMatch(/必要な措置|資格|関連条文/);
  });

  it("context=accidents + work で災害防止の質問文を作る", () => {
    const q = buildContextPrefill({ context: "accidents", work: "高所作業" });
    expect(q).toContain("高所作業");
    expect(q).toMatch(/労働災害|防止/);
  });

  it("work のみ（context無し）でも汎用の質問文を作る", () => {
    const q = buildContextPrefill({ work: "玉掛け" });
    expect(q).toContain("玉掛け");
  });

  it("industry で業種向けの質問文を作る", () => {
    const q = buildContextPrefill({ industry: "建設業" });
    expect(q).toContain("建設業");
  });

  it("該当パラメータが無ければ null", () => {
    expect(buildContextPrefill({})).toBeNull();
    expect(buildContextPrefill({ context: "ky" })).toBeNull();
  });

  it("長すぎる入力は60字に切り詰める", () => {
    const long = "あ".repeat(200);
    const q = buildContextPrefill({ work: long });
    expect(q).not.toBeNull();
    expect((q ?? "").includes("あ".repeat(61))).toBe(false);
  });
});
