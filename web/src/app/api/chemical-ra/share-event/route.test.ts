import { expect, it, vi } from "vitest";
import { POST } from "./route";

it("同一オリジンの許可済み共有方式だけを固定のログ項目に記録する", () => {
  const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const request = (site: string, method: string) =>
    new Request("https://example.test/api/chemical-ra/share-event", {
      method: "POST",
      headers: { "Sec-Fetch-Site": site, "X-Share-Method": method, Referer: "https://example.test/chemical-ra?name=private" },
    });
  try {
    expect(POST(request("cross-site", "line")).status).toBe(403);
    expect(POST(request("same-origin", "private input")).status).toBe(400);
    expect(POST(request("same-origin", "line")).status).toBe(204);
    expect(write.mock.calls).toEqual([[`${JSON.stringify({ event: "workplace_share", content_kind: "chemical_ra", method: "line" })}\n`]]);
  } finally {
    write.mockRestore();
  }
});
