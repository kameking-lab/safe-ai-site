import { afterEach, describe, expect, it } from "vitest";
import { GET, POST } from "./route";

afterEach(() => {
  delete process.env.KY_SIGNAGE_SHARING_ENABLED;
});

describe("KY signage sharing activation boundary", () => {
  it("does not create or resolve short capabilities before distributed protections are attested", async () => {
    const post = await POST(new Request("https://example.test/api/ky/signage", {
      method: "POST",
      body: JSON.stringify({ record: {} }),
    }));
    const get = await GET(new Request("https://example.test/api/ky/signage?code=123456"));

    expect(post.status).toBe(503);
    expect(get.status).toBe(503);
    await expect(post.json()).resolves.toMatchObject({ reason: "sharing_not_operationally_verified" });
    await expect(get.json()).resolves.toMatchObject({ reason: "sharing_not_operationally_verified" });
  });

  it("stays quarantined even if a legacy environment flag is enabled", async () => {
    process.env.KY_SIGNAGE_SHARING_ENABLED = "true";
    const marker = "TEST-SITE-PRIVATE-KY-CONTENT";
    const post = await POST(
      new Request("https://example.test/api/ky/signage", {
        method: "POST",
        body: JSON.stringify({ record: { siteName: marker } }),
      }),
    );
    const get = await GET(
      new Request("https://example.test/api/ky/signage?code=123456"),
    );
    const postBody = await post.json();
    const getBody = await get.json();

    expect(post.status).toBe(503);
    expect(get.status).toBe(503);
    expect(post.headers.get("cache-control")).toContain("no-store");
    expect(get.headers.get("x-feature-status")).toBe("quarantined");
    expect(postBody.reason).toBe("sharing_not_operationally_verified");
    expect(getBody.reason).toBe("sharing_not_operationally_verified");
    expect(JSON.stringify(postBody)).not.toContain(marker);
    expect(postBody).not.toHaveProperty("code");
    expect(getBody).not.toHaveProperty("record");
  });
});
