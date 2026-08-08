type Position = readonly [longitude: number, latitude: number];
type Ring = Position[];
type PolygonCoordinates = Ring[];
type MultiPolygonCoordinates = PolygonCoordinates[];

type PrefectureFeature = {
  properties?: { iso_3166_2?: unknown };
  geometry?: {
    type?: unknown;
    coordinates?: unknown;
  };
};

type PrefectureFeatureCollection = {
  type?: unknown;
  features?: unknown;
};

function isPosition(value: unknown): value is Position {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

function isRing(value: unknown): value is Ring {
  return Array.isArray(value) && value.length >= 3 && value.every(isPosition);
}

function isPolygonCoordinates(value: unknown): value is PolygonCoordinates {
  return Array.isArray(value) && value.length > 0 && value.every(isRing);
}

function pointInRing(
  longitude: number,
  latitude: number,
  ring: Ring,
): boolean {
  let inside = false;
  for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current++) {
    const [currentLng, currentLat] = ring[current]!;
    const [previousLng, previousLat] = ring[previous]!;
    const crosses =
      currentLat > latitude !== previousLat > latitude &&
      longitude <
        ((previousLng - currentLng) * (latitude - currentLat)) /
          (previousLat - currentLat) +
          currentLng;
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInPolygon(
  longitude: number,
  latitude: number,
  polygon: PolygonCoordinates,
): boolean {
  const [outer, ...holes] = polygon;
  return Boolean(
    outer &&
      pointInRing(longitude, latitude, outer) &&
      !holes.some((hole) => pointInRing(longitude, latitude, hole)),
  );
}

function featureContainsPoint(
  feature: PrefectureFeature,
  longitude: number,
  latitude: number,
): boolean {
  const geometry = feature.geometry;
  if (geometry?.type === "Polygon" && isPolygonCoordinates(geometry.coordinates)) {
    return pointInPolygon(longitude, latitude, geometry.coordinates);
  }
  if (
    geometry?.type === "MultiPolygon" &&
    Array.isArray(geometry.coordinates) &&
    geometry.coordinates.every(isPolygonCoordinates)
  ) {
    return (geometry.coordinates as MultiPolygonCoordinates).some((polygon) =>
      pointInPolygon(longitude, latitude, polygon),
    );
  }
  return false;
}

export function resolvePrefectureIsoFromGeoJson(
  payload: unknown,
  longitude: number,
  latitude: number,
): string | null {
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < 120 ||
    longitude > 155 ||
    latitude < 20 ||
    latitude > 48
  ) {
    return null;
  }
  const collection = payload as PrefectureFeatureCollection;
  if (!Array.isArray(collection?.features)) return null;
  for (const unknownFeature of collection.features) {
    if (!unknownFeature || typeof unknownFeature !== "object") continue;
    const feature = unknownFeature as PrefectureFeature;
    if (!featureContainsPoint(feature, longitude, latitude)) continue;
    const iso = feature.properties?.iso_3166_2;
    return typeof iso === "string" && /^JP-\d{2}$/.test(iso) ? iso : null;
  }
  return null;
}

export async function resolveBrowserPrefectureIso(
  longitude: number,
  latitude: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const response = await fetch("/geo/japan-prefectures-ne10m.json", {
    cache: "force-cache",
    credentials: "same-origin",
    signal,
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as unknown;
  return resolvePrefectureIsoFromGeoJson(payload, longitude, latitude);
}
