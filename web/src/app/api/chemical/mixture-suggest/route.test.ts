import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("retired mixture AI suggestion route", () => {
  it("returns 410 without reading or forwarding the request body", async () => {
    const json = vi.fn(async () => {
      throw new Error("body must not be read");
    });
    const response = await POST(
      { json } as unknown as Request,
    );
    expect(response.status).toBe(410);
    expect(json).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      reason: "retired_for_safety",
      requiresHumanReview: true,
    });
  });
});
