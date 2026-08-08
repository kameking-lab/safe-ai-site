import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { __resetAutomationConsultRateLimitForTests } from "@/lib/automation-consult/rate-limit";
import { __resetAutomationConsultIdempotencyForTests } from "@/lib/automation-consult/idempotency";

const mocks = vi.hoisted(() => ({
  deliverAutomationConsultEmails: vi.fn(),
  getAutomationConsultAvailability: vi.fn(),
}));

vi.mock("@/lib/automation-consult/availability", () => ({
  getAutomationConsultAvailability: mocks.getAutomationConsultAvailability,
}));

vi.mock("@/lib/automation-consult/email", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/automation-consult/email")>();
  return {
    ...original,
    deliverAutomationConsultEmails: mocks.deliverAutomationConsultEmails,
  };
});

const validBody = {
  consultationType: "automation",
  name: "安全 太郎",
  email: "requester@example.test",
  organization: "",
  currentProblem: "毎週のCSV集計に時間がかかっています。",
  desiredSupport: "集計と定型レポート作成を自動化したいです。",
  currentTools: "",
  timing: "within-3-months",
  budget: "",
  deliveryPreference: "online",
  privacyConsent: true,
  website: "",
  sourcePage: "/services/automation",
};

const DEFAULT_KEY = `${Date.now().toString(36)}.request-1234567890`;
function testKey(suffix: string) {
  return `${Date.now().toString(36)}.request-123456789${suffix}`;
}

function request(
  body: unknown = validBody,
  options?: {
    key?: string | null;
    origin?: string | null;
    ip?: string;
    contentType?: string;
  }
) {
  const headers = new Headers({
    "content-type": options?.contentType ?? "application/json",
    "x-forwarded-for": options?.ip ?? "192.0.2.10",
  });
  const origin = options?.origin === undefined ? "https://example.test" : options.origin;
  if (origin) headers.set("origin", origin);
  const key =
    options?.key === undefined ? DEFAULT_KEY : options.key;
  if (key) headers.set("idempotency-key", key);

  return new Request("https://example.test/api/automation-consult", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/automation-consult", () => {
  beforeEach(() => {
    vi.stubEnv(
      "AUTOMATION_CONSULT_STATE_HASH_SECRET",
      "test-only-automation-consult-state-secret-0123456789",
    );
    __resetAutomationConsultRateLimitForTests();
    __resetAutomationConsultIdempotencyForTests();
    mocks.deliverAutomationConsultEmails.mockReset();
    mocks.deliverAutomationConsultEmails.mockResolvedValue({ delivered: true });
    mocks.getAutomationConsultAvailability.mockReset();
    mocks.getAutomationConsultAvailability.mockReturnValue({
      status: "available",
      accepting: true,
      webFormEnabled: true,
      contactMode: "web_form",
      intakeMode: "email",
      retentionDays: 30,
      label: "受付中",
      message: "test",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects requests without same-origin JSON protection", async () => {
    expect((await POST(request(validBody, { origin: null }))).status).toBe(403);
    expect(
      (await POST(request(validBody, { origin: "https://attacker.test" }))).status
    ).toBe(403);
    expect(
      (await POST(request(validBody, { contentType: "text/plain" }))).status
    ).toBe(415);
    expect(mocks.deliverAutomationConsultEmails).not.toHaveBeenCalled();
  });

  it("PF-010-AUTOMATION-PREBODY-FAIL-CLOSED: 受付不能時はPII処理・配送前に固定503を返す", async () => {
    mocks.getAutomationConsultAvailability.mockReturnValue({
      status: "mail_available",
      accepting: true,
      webFormEnabled: false,
      contactMode: "mail_client",
      intakeMode: null,
      retentionDays: null,
      label: "メール相談受付中",
      message: "test",
    });
    const response = await POST(request());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "intake_unavailable" },
    });
    expect(mocks.deliverAutomationConsultEmails).not.toHaveBeenCalled();
  });

  it("returns field-associated validation errors and blocks header injection", async () => {
    const response = await POST(
      request({ ...validBody, email: "user@example.test\r\nBcc: bad@example.test" })
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "validation_error",
        fieldErrors: { email: expect.any(Array) },
      },
    });
    expect(mocks.deliverAutomationConsultEmails).not.toHaveBeenCalled();
  });

  it("blocks the honeypot without sending email", async () => {
    const response = await POST(request({ ...validBody, website: "https://bot.test" }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "invalid_submission" },
    });
    expect(mocks.deliverAutomationConsultEmails).not.toHaveBeenCalled();
  });

  it("requires a safe idempotency key", async () => {
    expect((await POST(request(validBody, { key: null }))).status).toBe(400);
    expect((await POST(request(validBody, { key: "short" }))).status).toBe(400);
    expect(mocks.deliverAutomationConsultEmails).not.toHaveBeenCalled();
  });

  it("fails closed before delivery when the body-fingerprint secret is absent", async () => {
    vi.stubEnv("AUTOMATION_CONSULT_STATE_HASH_SECRET", "");
    const response = await POST(request());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "shared_state_unavailable" },
    });
    expect(mocks.deliverAutomationConsultEmails).not.toHaveBeenCalled();
  });

  it("sends once and safely replays a duplicate success", async () => {
    const first = await POST(request());
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as {
      ok: true;
      referenceId: string;
      receivedAt: string;
    };
    expect(firstBody.ok).toBe(true);
    expect(firstBody.referenceId).toMatch(/^AC-\d{8}-[A-F0-9]{12}$/);

    const replay = await POST(request());
    expect(replay.status).toBe(200);
    await expect(replay.json()).resolves.toEqual(firstBody);
    expect(mocks.deliverAutomationConsultEmails).toHaveBeenCalledTimes(1);
  });

  it("preview validates and plans all three messages without sending or exposing recipients", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("AUTOMATION_CONSULT_STATE_HASH_SECRET", "");
    const first = await POST(request());
    expect(first.status).toBe(200);
    expect(first.headers.get("x-safe-ai-preview-mode")).toBe("dry-run");
    const firstBody = (await first.json()) as Record<string, unknown>;
    expect(firstBody).toMatchObject({
      ok: true,
      deliveryMode: "dry-run",
    });
    const serialized = JSON.stringify(firstBody);
    expect(serialized).not.toContain("owner");
    expect(serialized).not.toContain(validBody.email);
    expect(serialized).not.toContain(validBody.currentProblem);
    expect(serialized).not.toContain("recipient");

    const replay = await POST(request());
    expect(replay.status).toBe(200);
    await expect(replay.json()).resolves.toEqual(firstBody);
    expect(mocks.deliverAutomationConsultEmails).not.toHaveBeenCalled();
  });

  it("production cannot enable dry-run from body input", async () => {
    const response = await POST(request({ ...validBody, dryRun: true }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "validation_error" },
    });
    expect(mocks.deliverAutomationConsultEmails).not.toHaveBeenCalled();
  });

  it("rejects reuse of an idempotency key for changed content", async () => {
    expect((await POST(request())).status).toBe(200);
    const response = await POST(
      request({ ...validBody, currentProblem: "別の安全な相談内容を入力しています。" })
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "idempotency_conflict" },
    });
    expect(mocks.deliverAutomationConsultEmails).toHaveBeenCalledTimes(1);
  });

  it("rate limits before a sixth distinct delivery", async () => {
    for (let index = 0; index < 5; index += 1) {
      const response = await POST(
        request(validBody, { key: testKey(String(index)) })
      );
      expect(response.status).toBe(200);
    }
    const limited = await POST(
      request(validBody, { key: testKey("X") })
    );
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBeTruthy();
    expect(mocks.deliverAutomationConsultEmails).toHaveBeenCalledTimes(5);
  });

  it("fails closed for unconfigured or failed delivery and permits a retry", async () => {
    mocks.deliverAutomationConsultEmails
      .mockResolvedValueOnce({ delivered: false, reason: "not_configured" })
      .mockResolvedValueOnce({ delivered: true });
    const failed = await POST(request());
    expect(failed.status).toBe(503);
    await expect(failed.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "delivery_not_configured" },
    });

    const retry = await POST(request());
    expect(retry.status).toBe(200);
    expect(mocks.deliverAutomationConsultEmails).toHaveBeenCalledTimes(2);
    const firstAttempt = mocks.deliverAutomationConsultEmails.mock.calls[0]?.[0];
    const retryAttempt = mocks.deliverAutomationConsultEmails.mock.calls[1]?.[0];
    expect(retryAttempt?.referenceId).toBe(firstAttempt?.referenceId);
    expect(retryAttempt?.submissionStartedAtJst).toBe(firstAttempt?.submissionStartedAtJst);
    expect(retryAttempt?.idempotencyKey).toBe(firstAttempt?.idempotencyKey);
  });

  it("does not log the request body or email address", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await POST(request());
    const logOutput = [...info.mock.calls, ...warn.mock.calls, ...error.mock.calls]
      .flat()
      .join(" ");
    expect(logOutput).not.toContain(validBody.email);
    expect(logOutput).not.toContain(validBody.currentProblem);
    info.mockRestore();
    warn.mockRestore();
    error.mockRestore();
  });
});
