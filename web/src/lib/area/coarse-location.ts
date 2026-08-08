import {
  officialAreaCandidateByPrefectureIso,
  type OfficialAreaCandidate,
} from "@/lib/area/official-area-resolver";

export const HOME_COARSE_AREA_COOKIE = "safe-ai-coarse-area-v1";

export type HomeLocationSource =
  | "previous"
  | "browser-granted"
  | "ip-coarse"
  | "selected"
  | "national";

export type VercelCoarseLocationInput = {
  country: string | null;
  countryRegion: string | null;
};

function normalizeJapanesePrefectureIso(
  countryRegion: string | null,
): string | null {
  const normalized = countryRegion?.trim().toUpperCase() ?? "";
  const region = normalized.startsWith("JP-")
    ? normalized.slice(3)
    : normalized;
  if (!/^\d{1,2}$/.test(region)) return null;
  const number = Number(region);
  return number >= 1 && number <= 47
    ? `JP-${String(number).padStart(2, "0")}`
    : null;
}

export function resolveVercelCoarseArea({
  country,
  countryRegion,
}: VercelCoarseLocationInput): OfficialAreaCandidate | null {
  if (country?.trim().toUpperCase() !== "JP") return null;
  const prefectureIso = normalizeJapanesePrefectureIso(countryRegion);
  return prefectureIso
    ? officialAreaCandidateByPrefectureIso(prefectureIso)
    : null;
}
