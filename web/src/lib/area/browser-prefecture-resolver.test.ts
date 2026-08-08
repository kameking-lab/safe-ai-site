import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resolveBrowserPrefectureIso,
  resolvePrefectureIsoFromGeoJson,
} from "./browser-prefecture-resolver";

const collection = {
  type: "FeatureCollection",
  features: [
    {
      properties: { iso_3166_2: "JP-13" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [139, 35],
            [140, 35],
            [140, 36],
            [139, 36],
            [139, 35],
          ],
        ],
      },
    },
    {
      properties: { iso_3166_2: "JP-27" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [135, 34],
              [136, 34],
              [136, 35],
              [135, 35],
              [135, 34],
            ],
          ],
        ],
      },
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolvePrefectureIsoFromGeoJson", () => {
  it("returns only the coarse prefecture ID for polygons and multipolygons", () => {
    expect(resolvePrefectureIsoFromGeoJson(collection, 139.7, 35.7)).toBe(
      "JP-13",
    );
    expect(resolvePrefectureIsoFromGeoJson(collection, 135.5, 34.5)).toBe(
      "JP-27",
    );
  });

  it("rejects coordinates outside Japan, invalid geometry, and unknown points", () => {
    expect(resolvePrefectureIsoFromGeoJson(collection, 0, 0)).toBeNull();
    expect(resolvePrefectureIsoFromGeoJson({}, 139.7, 35.7)).toBeNull();
    expect(resolvePrefectureIsoFromGeoJson(collection, 142, 43)).toBeNull();
  });
});

describe("resolveBrowserPrefectureIso", () => {
  it("loads the same-origin boundary without sending coordinates", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(collection), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveBrowserPrefectureIso(139.7, 35.7)).resolves.toBe(
      "JP-13",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/geo/japan-prefectures-ne10m.json",
      expect.objectContaining({
        cache: "force-cache",
        credentials: "same-origin",
      }),
    );
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("139.7");
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("35.7");
  });

  it("fails closed when the boundary asset is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 503 })),
    );
    await expect(resolveBrowserPrefectureIso(139.7, 35.7)).resolves.toBeNull();
  });
});
