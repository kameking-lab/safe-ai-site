import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/contact/automation-email/draft", () => {
  it("redirects a POST to a fixed mailto generated from server-only recipients", () => {
    vi.stubEnv(
      "AUTOMATION_CONSULT_RECIPIENTS",
      "audit@outlook.com,primary@gmail.com",
    );
    const response = POST();
    expect(response.status).toBe(303);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-robots-tag")).toBe(
      "noindex, nofollow, noarchive",
    );

    const location = response.headers.get("location") ?? "";
    const [address, query] = location.slice("mailto:".length).split("?");
    const params = new URLSearchParams(query);
    expect(decodeURIComponent(address)).toBe("primary@gmail.com");
    expect(params.get("bcc")).toBe("audit@outlook.com");
    expect(params.get("subject")).toBe(
      "安全AIポータル｜業務自動化・講習の相談",
    );
    expect(params.get("body")).toContain("【困っていること】");
  });

  it("does not accept a GET query or consultation body", () => {
    const response = GET();
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("uses the fixed PPE selection template for the whitelisted type", () => {
    vi.stubEnv(
      "AUTOMATION_CONSULT_RECIPIENTS",
      "audit@outlook.com,primary@gmail.com",
    );
    const response = POST(
      new Request(
        "https://www.anzen-ai-portal.jp/contact/automation-email/draft?type=ppe-selection",
        { method: "POST" },
      ),
    );
    expect(response.status).toBe(303);
    const location = response.headers.get("location") ?? "";
    const params = new URLSearchParams(location.split("?")[1]);
    expect(params.get("subject")).toBe("安全AIポータル｜保護具選定の相談");
    expect(params.get("body")).toContain("【危険有害要因】");
    expect(params.get("body")).not.toContain("【予算目安】");
  });

  it("rejects an unknown consultation type", () => {
    const response = POST(
      new Request(
        "https://www.anzen-ai-portal.jp/contact/automation-email/draft?type=other",
        { method: "POST" },
      ),
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("location")).toBeNull();
  });

  it("fails closed without safe server-only recipients", () => {
    vi.stubEnv("AUTOMATION_CONSULT_RECIPIENTS", "");
    const response = POST();
    expect(response.status).toBe(503);
    expect(response.headers.get("location")).toBeNull();
  });
});
