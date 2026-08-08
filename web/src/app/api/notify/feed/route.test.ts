import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jma/fetch-jma-runtime", () => ({
  getJmaWarningsRuntime: vi.fn(),
}));
vi.mock("@/lib/news-hub", () => ({
  buildNewsHubItems: vi.fn(() => []),
}));

import { getJmaWarningsRuntime } from "@/lib/jma/fetch-jma-runtime";
import { GET } from "./route";

const mockWarnings = vi.mocked(getJmaWarningsRuntime);

beforeEach(() => {
  mockWarnings.mockReset();
});

function request() {
  return new NextRequest("https://example.test/api/notify/feed?pref=JP-13");
}

describe("GET /api/notify/feed weather provenance", () => {
  it("marks a stale fallback degraded and emits no current weather item", async () => {
    mockWarnings.mockResolvedValue({
      fetchedAt: "2026-07-13T00:00:00.000Z",
      quality: { status: "fallback", attempted: 1, succeeded: 0, failed: 1 },
      byIso: {
        "JP-13": {
          level: "warning",
          entries: [
            {
              sourceCode: "130000",
              level: "warning",
              headline: "過去の大雨警報",
              reportDatetime: "2026-05-28T00:00:00.000Z",
              publishingOffice: "気象庁",
              warnings: [],
            },
          ],
        },
      },
    });

    const response = await GET(request());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.weatherSource).toMatchObject({
      status: "degraded",
      fetchedAt: "2026-07-13T00:00:00.000Z",
    });
    expect(body.items.filter((item: { category: string }) => item.category === "weather")).toEqual([]);
  });

  it("keeps a fresh selected-region warning when another region caused degraded quality", async () => {
    const fetchedAt = new Date().toISOString();
    mockWarnings.mockResolvedValue({
      fetchedAt: "2026-07-13T00:00:00.000Z",
      quality: { status: "degraded", attempted: 47, succeeded: 46, failed: 1 },
      byIso: {
        "JP-13": {
          level: "warning",
          sourceStatus: "live",
          sourceFetchedAt: fetchedAt,
          entries: [
            {
              sourceCode: "130000",
              level: "warning",
              headline: "東京都に大雨警報",
              reportDatetime: fetchedAt,
              publishingOffice: "気象庁",
              warnings: [],
            },
          ],
        },
      },
    });

    const response = await GET(request());
    const body = await response.json();
    expect(body.weatherSource.status).toBe("live");
    expect(body.items).toEqual([
      expect.objectContaining({ category: "weather", severity: "warning" }),
    ]);
  });
});
