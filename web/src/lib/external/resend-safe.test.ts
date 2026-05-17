import { describe, it, expect, beforeEach } from "vitest";
import { sendEmailSafe } from "./resend-safe";
import { resetAll } from "./circuit-breaker";

const ORIGINAL_KEY = process.env.RESEND_API_KEY;

describe("sendEmailSafe", () => {
  beforeEach(() => {
    resetAll();
  });

  it("returns not_configured when RESEND_API_KEY is unset", async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendEmailSafe({
      tag: "test",
      from: "noreply@example.com",
      to: "user@example.com",
      subject: "hi",
      text: "hello",
    });
    expect(result.delivered).toBe(false);
    if (!result.delivered) {
      expect(result.reason).toBe("not_configured");
    }
  });

  it("restores env after test", () => {
    if (ORIGINAL_KEY !== undefined) process.env.RESEND_API_KEY = ORIGINAL_KEY;
    else delete process.env.RESEND_API_KEY;
  });
});
