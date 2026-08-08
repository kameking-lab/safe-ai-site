import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: null,
}));

describe("POST /api/stripe/portal safety boundary", () => {
  it(
    "fails closed with no-store when paid mode is disabled",
    async () => {
      const { POST } = await import("./route");
      const previous = process.env.NEXT_PUBLIC_PAID_MODE;
      delete process.env.NEXT_PUBLIC_PAID_MODE;
      try {
        const response = await POST();
        const body = await response.json();

        expect(response.status).toBe(503);
        expect(response.headers.get("cache-control")).toContain("no-store");
        expect(body).toEqual({
          error: "決済機能は現在ご利用いただけません。",
        });
      } finally {
        if (previous === undefined) delete process.env.NEXT_PUBLIC_PAID_MODE;
        else process.env.NEXT_PUBLIC_PAID_MODE = previous;
      }
    },
    15_000,
  );

  it("does not return caught provider exception messages", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/api/stripe/portal/route.ts"),
      "utf8",
    );
    expect(source).toContain("isPaidModeReady()");
    expect(source).toContain("privateJson(");
    expect(source).not.toMatch(/err(?:or)?\.message/);
  });
});
