import { beforeEach, describe, expect, it, vi } from "vitest";
import { __resetAutomationConsultIdempotencyForTests } from "@/lib/automation-consult/idempotency";
import { __resetAutomationConsultRateLimitForTests } from "@/lib/automation-consult/rate-limit";
import { INQUIRY_MAX_BODY_BYTES } from "@/lib/inquiry/schema";

const sendEmailSafeMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/external/resend-safe", () => ({
  sendEmailSafe: sendEmailSafeMock,
}));

import { POST } from "./route";

const HASH_SECRET = "test-inquiry-state-secret-1234567890abcdef";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "",
    email: "",
    industry: "",
    category: "data-error",
    subject: "出典URLの訂正提案",
    message: "対象ページと確認した一次資料URLを記載します。",
    privacyConsent: true,
    website: "",
    ...overrides,
  };
}

function key() {
  return `${Date.now().toString(36)}.inquiry-request-1234567890`;
}

function request(
  body: unknown,
  options: {
    key?: string | null;
    origin?: string | null;
    contentLength?: string;
  } = {},
) {
  const headers = new Headers({
    "content-type": "application/json",
    "x-forwarded-for": "192.0.2.30",
  });
  if (options.origin !== null) {
    headers.set("origin", options.origin ?? "http://localhost");
  }
  if (options.key !== null) {
    headers.set("idempotency-key", options.key ?? key());
  }
  if (options.contentLength) {
    headers.set("content-length", options.contentLength);
  }
  return new Request("http://localhost/api/inquiry", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("AUTOMATION_CONSULT_STATE_HASH_SECRET", HASH_SECRET);
  vi.stubEnv("INQUIRY_INBOX", "quality@example.invalid");
  vi.stubEnv("NOTIFY_FROM", "安全AIポータル <noreply@example.invalid>");
  vi.stubEnv("RESEND_API_KEY", "test-key");
  __resetAutomationConsultIdempotencyForTests();
  __resetAutomationConsultRateLimitForTests();
  sendEmailSafeMock.mockReset();
  sendEmailSafeMock.mockResolvedValue({ delivered: true, id: "mail-1" });
});

describe("POST /api/inquiry", () => {
  it("fails closed when the same-origin signal is absent", async () => {
    const response = await POST(request(validBody(), { origin: null }));
    expect(response.status).toBe(403);
    expect(sendEmailSafeMock).not.toHaveBeenCalled();
  });

  it("rejects a declared body above the byte limit before delivery", async () => {
    const response = await POST(
      request(validBody(), {
        contentLength: String(INQUIRY_MAX_BODY_BYTES + 1),
      }),
    );
    expect(response.status).toBe(413);
    expect(sendEmailSafeMock).not.toHaveBeenCalled();
  });

  it("requires explicit privacy consent and bounded fields", async () => {
    const noConsent = await POST(
      request(validBody({ privacyConsent: false })),
    );
    expect(noConsent.status).toBe(400);

    const tooLong = await POST(
      request(validBody({ subject: "長".repeat(161) })),
    );
    expect(tooLong.status).toBe(400);
    expect(sendEmailSafeMock).not.toHaveBeenCalled();
  });

  it("requires a fresh, well-formed idempotency key", async () => {
    const response = await POST(request(validBody(), { key: null }));
    expect(response.status).toBe(400);
    expect(sendEmailSafeMock).not.toHaveBeenCalled();
  });

  it("fails closed when the HMAC secret is unavailable", async () => {
    vi.stubEnv("AUTOMATION_CONSULT_STATE_HASH_SECRET", "");
    const response = await POST(request(validBody()));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "shared_state_unavailable" },
    });
    expect(sendEmailSafeMock).not.toHaveBeenCalled();
  });

  it("fails closed when server-only delivery addresses are absent", async () => {
    vi.stubEnv("INQUIRY_INBOX", "");
    const response = await POST(request(validBody()));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "delivery_not_configured" },
    });
    expect(sendEmailSafeMock).not.toHaveBeenCalled();
  });

  it("delivers once and replays a completed request without a duplicate email", async () => {
    const requestKey = key();
    const first = await POST(request(validBody(), { key: requestKey }));
    const replay = await POST(request(validBody(), { key: requestKey }));

    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    const firstBody = await first.json();
    expect(firstBody).toMatchObject({ ok: true });
    expect(await replay.json()).toEqual(firstBody);
    expect(sendEmailSafeMock).toHaveBeenCalledTimes(1);
    expect(sendEmailSafeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: `inquiry.${requestKey}`,
        subject: expect.stringMatching(
          /^\[安全AIポータル\]\[ご意見\] INQ-/,
        ),
      }),
    );
  });

  it("rejects changed content under the same idempotency key", async () => {
    const requestKey = key();
    expect(
      (await POST(request(validBody(), { key: requestKey }))).status,
    ).toBe(200);
    const conflict = await POST(
      request(validBody({ message: "異なる訂正内容です。" }), {
        key: requestKey,
      }),
    );
    expect(conflict.status).toBe(409);
    expect(sendEmailSafeMock).toHaveBeenCalledTimes(1);
  });
});
