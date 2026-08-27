import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("quarantined safety image pilot download", () => {
  it("returns 410 without a downloadable asset", async () => {
    const response = await GET();
    expect(response.status).toBe(410);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(response.headers.get("content-disposition")).toBeNull();
  });
});
