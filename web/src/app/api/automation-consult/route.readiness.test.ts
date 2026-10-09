import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
vi.mock("@/lib/prisma", () => ({ prisma: null }));
const delivery = vi.hoisted(() => vi.fn());
vi.mock("@/lib/automation-consult/email", async (original) => ({ ...await original<typeof import("@/lib/automation-consult/email")>(), deliverAutomationConsultEmails: delivery }));
const keys = ["AUTOMATION_CONSULT_PUBLIC_STATUS", "AUTOMATION_CONSULT_RECIPIENTS", "RESEND_API_KEY", "AUTOMATION_CONSULT_FROM", "NOTIFY_FROM", "AUTOMATION_CONSULT_STATE_BACKEND", "AUTOMATION_CONSULT_STATE_HASH_SECRET", "AUTOMATION_CONSULT_FROM_VERIFIED", "AUTOMATION_CONSULT_BOUNCE_COMPLAINT_POLICY_ACK", "AUTOMATION_CONSULT_STATE_VERIFIED", "AUTOMATION_CONSULT_DELIVERY_VERIFIED", "AUTOMATION_CONSULT_RETENTION_DAYS", "AUTOMATION_CONSULT_RETENTION_POLICY_ACK", "AUTOMATION_CONSULT_ADMIN_REVIEW_PATH_VERIFIED", "DATABASE_URL", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];
beforeEach(() => {
  for (const key of keys) vi.stubEnv(key, "");
  vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("SAFE_AI_STAGING_MODE", "false");
  delivery.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
function request(origin = "https://example.test", contentType = "application/json") {
  return new Request("https://example.test/api/automation-consult", { method: "POST", headers: { origin, "content-type": contentType, "x-forwarded-for": "192.0.2.99" }, body: '{"email":"private-person@example.test","currentProblem":"private-body-sentinel"}' });
}
describe("private intake-unavailable diagnostics", () => {
  it("logs only fixed readiness enums after JSON/origin checks and before any body read; public 503 has no codes", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const req = request();
    const bodyRead = vi.fn(() => { throw new Error("BODY_MUST_NOT_BE_READ"); });
    Object.defineProperty(req, "body", { get: bodyRead });
    const response = await POST(req);
    expect(response.status).toBe(503);
    expect(bodyRead).not.toHaveBeenCalled(); expect(delivery).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toBe("[automation-consult:readiness:v1]");
    expect(warn.mock.calls[0]?.[1]).toContain("common_resend_key_missing");
    const publicResponse = JSON.stringify({ body: await response.json(), headers: [...response.headers.entries()] });
    expect(JSON.parse(publicResponse).body).toEqual({ ok: false, error: { code: "intake_unavailable", message: "Webフォームは利用できません。個人情報は送信されていません。メール相談をご利用ください。" } });
    expect(publicResponse).not.toContain("readiness"); expect(publicResponse).not.toContain("common_resend_key_missing");
    const logs = JSON.stringify(warn.mock.calls);
    for (const value of ["private-person@example.test", "private-body-sentinel", "192.0.2.99", "https://example.test", "BODY_MUST_NOT_BE_READ"]) expect(logs).not.toContain(value);
  });
  it("does not log for rejected origin/content type or preview dry-run", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect((await POST(request("https://attacker.test"))).status).toBe(403);
    expect((await POST(request("https://example.test", "text/plain"))).status).toBe(415);
    vi.stubEnv("VERCEL_ENV", "preview");
    // Invalid input returns ordinary validation failure in dry-run, not readiness diagnostics.
    expect((await POST(request())).status).toBe(400);
    expect(warn).not.toHaveBeenCalled(); expect(delivery).not.toHaveBeenCalled();
  });
});
