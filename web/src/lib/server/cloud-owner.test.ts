import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
import { auth } from "@/auth";
import { getCloudOwnerId, readBoundedJson } from "./cloud-owner";

const mockAuth = vi.mocked(auth);

describe("authenticated cloud owner", () => {
  beforeEach(() => mockAuth.mockReset());

  it("未認証はownerを発行しない", async () => {
    mockAuth.mockResolvedValue(null as never);
    await expect(getCloudOwnerId()).resolves.toBeNull();
  });

  it("認証user idから安定した非可逆ownerを作り、生IDを含めない", async () => {
    mockAuth.mockResolvedValue({ user: { id: "synthetic-user-123" } } as never);
    const first = await getCloudOwnerId();
    const second = await getCloudOwnerId();
    expect(first).toBe(second);
    expect(first).toMatch(/^user_[A-Za-z0-9_-]{43}$/);
    expect(first).not.toContain("synthetic-user-123");
  });

  it("宣言サイズと実サイズの両方で過大JSONを拒否する", async () => {
    const declared = new Request("https://example.test", {
      method: "POST",
      headers: { "content-length": "100" },
      body: "{}",
    });
    await expect(readBoundedJson(declared, 10)).resolves.toEqual({ ok: false, reason: "payload_too_large" });

    const actual = new Request("https://example.test", { method: "POST", body: JSON.stringify({ value: "x".repeat(20) }) });
    await expect(readBoundedJson(actual, 10)).resolves.toEqual({ ok: false, reason: "payload_too_large" });
  });
});
