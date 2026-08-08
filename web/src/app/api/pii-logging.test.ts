import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as contactPost } from "./contact/route";
import { POST as inquiryPost } from "./inquiry/route";
import { POST as feedbackPost } from "./feedback/route";
import { POST as subscribePost } from "./notify/subscribe/route";

const PII_MARKER = "audit.person+private@example.invalid";

function request(path: string, body: unknown, ip: string) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("PII-safe application logging", () => {
  it("never writes contact, inquiry, feedback or subscriber values to console logs", async () => {
    vi.stubEnv("INQUIRY_INBOX", "");
    vi.stubEnv("FEEDBACK_INBOX", "");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_AUDIENCE_ID", "");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await contactPost(
      request("/api/contact", {
        company: `会社${PII_MARKER}`,
        name: PII_MARKER,
        email: PII_MARKER,
        message: `本文${PII_MARKER}`,
        category: "other",
        budget: "unknown",
        contactMethod: "email",
        features: [],
      }, "192.0.2.10"),
    );
    await inquiryPost(
      request("/api/inquiry", {
        name: PII_MARKER,
        email: PII_MARKER,
        category: "other",
        subject: `件名${PII_MARKER}`,
        message: `本文${PII_MARKER}`,
      }, "192.0.2.11"),
    );
    await feedbackPost(
      request("/api/feedback", {
        articleSlug: `audit-${PII_MARKER}`,
        errorType: "other",
        description: `説明${PII_MARKER}`,
        email: PII_MARKER,
      }, "192.0.2.12"),
    );
    await subscribePost(
      request("/api/notify/subscribe", {
        email: PII_MARKER,
        name: PII_MARKER,
        prefecture: "監査県",
      }, "192.0.2.13"),
    );

    const logText = [...info.mock.calls, ...warn.mock.calls, ...error.mock.calls]
      .flat()
      .map(String)
      .join("\n");
    expect(logText).not.toContain(PII_MARKER);
    expect(logText).not.toContain("監査県");
    expect(logText).not.toContain("会社audit");
  });
});
