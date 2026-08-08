import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmailSafe } from "./resend-safe";
import { resetAll } from "./circuit-breaker";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));

describe("sendEmailSafe", () => {
  beforeEach(() => {
    resetAll();
    mocks.send.mockReset();
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    vi.restoreAllMocks();
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

  it("passes Reply-To to Resend without logging recipient, subject, or body", async () => {
    process.env.RESEND_API_KEY = "test-only-key";
    mocks.send.mockResolvedValue({ data: { id: "test-id" }, error: null });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await sendEmailSafe({
      tag: "test",
      from: "noreply@example.test",
      to: "recipient@example.test",
      replyTo: "requester@example.test",
      subject: "private subject",
      text: "private body",
    });

    expect(result).toEqual({ delivered: true, id: "test-id" });
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "recipient@example.test",
        replyTo: "requester@example.test",
      })
    );
    const logOutput = [...warn.mock.calls, ...error.mock.calls].flat().join(" ");
    expect(logOutput).not.toContain("recipient@example.test");
    expect(logOutput).not.toContain("requester@example.test");
    expect(logOutput).not.toContain("private subject");
    expect(logOutput).not.toContain("private body");
  });

  it("fails safely when the provider exceeds the timeout", async () => {
    process.env.RESEND_API_KEY = "test-only-key";
    mocks.send.mockImplementation(() => new Promise(() => undefined));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await sendEmailSafe({
      tag: "test-timeout",
      from: "noreply@example.test",
      to: "recipient@example.test",
      subject: "subject",
      text: "body",
      timeoutMs: 1,
    });
    expect(result.delivered).toBe(false);
    if (!result.delivered) expect(result.reason).toBe("send_failed");
  });

  it("blocks header injection before invoking the provider", async () => {
    process.env.RESEND_API_KEY = "test-only-key";
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = await sendEmailSafe({
      tag: "test-header",
      from: "noreply@example.test",
      to: "recipient@example.test",
      replyTo: "requester@example.test\r\nBcc: attacker@example.test",
      subject: "subject",
      text: "body",
    });
    expect(result.delivered).toBe(false);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
