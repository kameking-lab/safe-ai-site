/**
 * Module-scoped in-memory cache for Vercel usage snapshots.
 *
 * Why module-scope: Next.js keeps each serverless function instance warm for
 * minutes, so a per-module Map is "free" and avoids a request to the Vercel
 * API on every dashboard reload. We deliberately do NOT use unstable_cache
 * here because the dashboard is admin-only and the freshness vs. cost
 * trade-off is different from product pages.
 *
 * TTL is set to 1 hour because Vercel's usage aggregation itself updates on
 * roughly that cadence — a tighter TTL just burns API quota without giving
 * the user fresher numbers.
 */

import type { UsageSnapshot } from "./types";

interface CacheEntry {
  snapshot: UsageSnapshot;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export const DEFAULT_TTL_MS = 60 * 60 * 1000;

export function getCached(key: string, now: number = Date.now()): UsageSnapshot | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) return null;
  return entry.snapshot;
}

export function getStale(key: string): UsageSnapshot | null {
  return cache.get(key)?.snapshot ?? null;
}

export function setCached(
  key: string,
  snapshot: UsageSnapshot,
  ttlMs: number = DEFAULT_TTL_MS,
  now: number = Date.now()
): void {
  cache.set(key, { snapshot, expiresAt: now + ttlMs });
}

export function clearCache(): void {
  cache.clear();
}
