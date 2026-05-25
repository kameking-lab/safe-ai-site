import { describe, expect, it } from "vitest";
import { generateSignageCode, isValidSignageCode, SIGNAGE_CODE_TTL_MS } from "@/lib/ky/signage-code";

describe("signage-code", () => {
  it("6桁ゼロ埋めのコードを生成する", () => {
    expect(generateSignageCode(() => 0)).toBe("000000");
    expect(generateSignageCode(() => 0.123456)).toBe("123456");
    expect(generateSignageCode(() => 0.000005)).toBe("000005");
  });

  it("rand が上限付近でも6桁に収まる", () => {
    expect(generateSignageCode(() => 0.999999)).toBe("999999");
    expect(generateSignageCode(() => 0.9999999)).toBe("999999");
  });

  it("既定の Math.random でも常に6桁", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateSignageCode()).toMatch(/^\d{6}$/);
    }
  });

  it("isValidSignageCode は6桁数字のみ true", () => {
    expect(isValidSignageCode("123456")).toBe(true);
    expect(isValidSignageCode("12345")).toBe(false);
    expect(isValidSignageCode("1234567")).toBe(false);
    expect(isValidSignageCode("12a456")).toBe(false);
    expect(isValidSignageCode("")).toBe(false);
  });

  it("TTL は24時間", () => {
    expect(SIGNAGE_CODE_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });
});
