import { describe, expect, it } from "vitest";
import { proStartHref, safeReturnPath } from "./pro-start";
import { allowedSignInCallback } from "./auth-callback";

describe("Pro の購入入口と戻り先", () => {
  it("サイト内の相対パスだけを戻り先にする", () => {
    expect(safeReturnPath("/chatbot")).toBe("/chatbot");
    expect(safeReturnPath("/laws?q=足場")).toBe("/laws?q=%E8%B6%B3%E5%A0%B4");
    for (const bad of ["https://evil.example", "//evil.example", String.raw`/\evil.example`, "/api/x", "/auth/signin", "/pricing/start", "chatbot", 1, null]) {
      expect(safeReturnPath(bad)).toBeNull();
    }
  });
  it("購入入口のリンクはログイン後の戻り先として許可される形になる", () => {
    expect(proStartHref("/chatbot")).toBe("/pricing/start?returnTo=%2Fchatbot");
    expect(allowedSignInCallback(proStartHref("/chatbot"))).toBe("/pricing/start?returnTo=%2Fchatbot");
    expect(allowedSignInCallback(proStartHref("https://evil.example"))).toBe("/pricing/start");
    expect(allowedSignInCallback("/account")).toBeNull();
  });
});
