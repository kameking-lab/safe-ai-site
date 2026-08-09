import rawRegistry from "./source-registry.json";
import type { SafetySourceRecord } from "./types";

export const SAFETY_SOURCE_REGISTRY = rawRegistry as SafetySourceRecord[];

export function findSafetySource(sourceId: string): SafetySourceRecord | undefined {
  return SAFETY_SOURCE_REGISTRY.find((source) => source.sourceId === sourceId);
}

export function getSafetySourceLink(sourceId: string): string | null {
  const source = findSafetySource(sourceId);
  return source?.sourcePdfUrl ?? source?.sourceUrl ?? null;
}
