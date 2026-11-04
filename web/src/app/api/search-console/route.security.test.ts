import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/server/admin-access", () => ({ hasAdminPageAccess: mocks.admin }));
vi.mock("@/lib/stats/search-console-client", () => ({ fetchSearchConsole: mocks.fetch }));
import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VERCEL_ENV", "production");
  mocks.admin.mockResolvedValue(false);
  mocks.fetch.mockResolvedValue({ source: "gsc", queries: [{ query: "PRIVATE-QUERY-MARKER" }] });
});
afterEach(() => vi.unstubAllEnvs());
const request = () => new Request("https://example.test/api/search-console?period=7d");

describe("SEC3-H5 Search Console administrative boundary", () => {
  it("denies anonymous and ordinary members before invoking OAuth or returning analytics", async () => {
    const response = await GET(request());
    expect(response.status).toBe(404);
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(JSON.stringify(await response.json())).not.toContain("PRIVATE-QUERY-MARKER");
  });
  it("returns private no-store analytics only for an allowlisted administrator", async () => {
    mocks.admin.mockResolvedValue(true);
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.fetch).toHaveBeenCalledWith("7d");
  });
  it("blocks preview credentials even if the administrative check were to succeed", async () => {
    vi.stubEnv("VERCEL_ENV", "preview"); mocks.admin.mockResolvedValue(true);
    expect((await GET(request())).status).toBe(404);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("fails closed on session lookup errors", async () => {
    mocks.admin.mockRejectedValue(new Error("synthetic auth failure"));
    expect((await GET(request())).status).toBe(404);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
