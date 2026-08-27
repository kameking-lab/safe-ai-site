import { describe, expect, it } from "vitest";
import { GET, HEAD, POST } from "./route";

describe("quarantined safety image download route", () => {
  it.each([
    ["GET", GET],
    ["HEAD", HEAD],
    ["POST", POST],
  ] as const)("returns 410 for %s while the library is rebuilt", async (_method, handler) => {
    const response = await handler();
    expect(response.status).toBe(410);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(response.headers.get("content-disposition")).toBeNull();
  });
});
