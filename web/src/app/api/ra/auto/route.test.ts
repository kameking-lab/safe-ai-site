import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/ra/auto", () => {
  it("fails closed instead of returning an unvalidated exposure ratio", async () => {
    const response = await POST(
      new Request("http://localhost/api/ra/auto", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productName: "合成テスト製品",
          ventilation: "local",
          amount: "small",
          durationHours: 1,
        }),
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.error.code).toBe("ASSESSMENT_UNAVAILABLE");
    expect(json.ra).toBeUndefined();
    expect(JSON.stringify(json)).not.toContain("exposureRatio");
  });
});
