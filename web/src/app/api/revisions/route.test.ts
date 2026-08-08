import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /api/revisions trust boundaries", () => {
  it("production ignores request-controlled ingest URL and allowlist", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_REVISIONS_INGEST_SOURCE", "sample");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET(
      new NextRequest(
        "https://example.test/api/revisions?ingestSource=real&realSourceUrl=https%3A%2F%2Fevil.example%2Fdata.json&realSourceAllowHosts=evil.example"
      )
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-revisions-ingest-source")).toBe(
      "egov-structured",
    );
    expect(response.headers.get("x-revisions-verification-state")).toBe(
      "machine-validated-human-review-pending",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("a request cannot extend the server allowlist outside production either", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("REVISIONS_REAL_SOURCE_ALLOW_HOSTS", "official.example");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET(
      new NextRequest(
        "https://example.test/api/revisions?ingestSource=real&realSourceUrl=https%3A%2F%2Fevil.example%2Fdata.json&realSourceAllowHosts=evil.example"
      )
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-revisions-ingest-source")).toBe(
      "egov-structured",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
