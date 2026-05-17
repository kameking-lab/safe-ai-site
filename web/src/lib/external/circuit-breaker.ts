/**
 * Process-local circuit breaker for external dependencies.
 *
 * States:
 *   CLOSED    — all calls pass through; failures are counted.
 *   OPEN      — all calls fail-fast with CircuitOpenError until cooldown expires.
 *   HALF_OPEN — a single trial call is allowed; success closes, failure re-opens.
 *
 * Scope is per Node process; on serverless deployments the breaker is best-effort
 * and resets on cold start. Pair with a longer-lived cache when stronger guarantees
 * are needed.
 */
export type CircuitState = "closed" | "open" | "half_open";

export type CircuitOptions = {
  /** Consecutive failures before opening. Default 5. */
  failureThreshold?: number;
  /** Cooldown in ms before transitioning OPEN → HALF_OPEN. Default 60_000. */
  cooldownMs?: number;
};

export type CircuitSnapshot = {
  name: string;
  state: CircuitState;
  consecutiveFailures: number;
  totalFailures: number;
  totalSuccesses: number;
  lastFailureAt: number | null;
  lastSuccessAt: number | null;
  lastErrorMessage: string | null;
  openedAt: number | null;
};

export class CircuitOpenError extends Error {
  readonly retryAfterMs: number;
  constructor(name: string, retryAfterMs: number) {
    super(`Circuit ${name} is open (retry after ${Math.ceil(retryAfterMs / 1000)}s)`);
    this.name = "CircuitOpenError";
    this.retryAfterMs = retryAfterMs;
  }
}

type CircuitEntry = {
  state: CircuitState;
  consecutiveFailures: number;
  totalFailures: number;
  totalSuccesses: number;
  lastFailureAt: number | null;
  lastSuccessAt: number | null;
  lastErrorMessage: string | null;
  openedAt: number | null;
  options: Required<CircuitOptions>;
};

const DEFAULTS: Required<CircuitOptions> = {
  failureThreshold: 5,
  cooldownMs: 60_000,
};

const breakers = new Map<string, CircuitEntry>();

function ensureBreaker(name: string, options?: CircuitOptions): CircuitEntry {
  const existing = breakers.get(name);
  if (existing) {
    if (options) {
      existing.options = { ...existing.options, ...options };
    }
    return existing;
  }
  const entry: CircuitEntry = {
    state: "closed",
    consecutiveFailures: 0,
    totalFailures: 0,
    totalSuccesses: 0,
    lastFailureAt: null,
    lastSuccessAt: null,
    lastErrorMessage: null,
    openedAt: null,
    options: { ...DEFAULTS, ...(options ?? {}) },
  };
  breakers.set(name, entry);
  return entry;
}

function maybeTransitionToHalfOpen(entry: CircuitEntry, now: number) {
  if (entry.state !== "open" || entry.openedAt === null) return;
  if (now - entry.openedAt >= entry.options.cooldownMs) {
    entry.state = "half_open";
  }
}

export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  options?: CircuitOptions
): Promise<T> {
  const entry = ensureBreaker(name, options);
  const now = Date.now();
  maybeTransitionToHalfOpen(entry, now);

  if (entry.state === "open" && entry.openedAt !== null) {
    const retryAfter = entry.options.cooldownMs - (now - entry.openedAt);
    throw new CircuitOpenError(name, Math.max(0, retryAfter));
  }

  try {
    const result = await fn();
    recordSuccess(name);
    return result;
  } catch (err) {
    recordFailure(name, err);
    throw err;
  }
}

export function recordSuccess(name: string): void {
  const entry = breakers.get(name);
  if (!entry) return;
  entry.consecutiveFailures = 0;
  entry.totalSuccesses += 1;
  entry.lastSuccessAt = Date.now();
  entry.lastErrorMessage = null;
  entry.state = "closed";
  entry.openedAt = null;
}

export function recordFailure(name: string, err: unknown): void {
  const entry = ensureBreaker(name);
  entry.consecutiveFailures += 1;
  entry.totalFailures += 1;
  entry.lastFailureAt = Date.now();
  entry.lastErrorMessage = err instanceof Error ? err.message : String(err);
  if (entry.consecutiveFailures >= entry.options.failureThreshold) {
    entry.state = "open";
    entry.openedAt = Date.now();
  } else if (entry.state === "half_open") {
    entry.state = "open";
    entry.openedAt = Date.now();
  }
}

export function getSnapshot(name: string): CircuitSnapshot | null {
  const entry = breakers.get(name);
  if (!entry) return null;
  return {
    name,
    state: entry.state,
    consecutiveFailures: entry.consecutiveFailures,
    totalFailures: entry.totalFailures,
    totalSuccesses: entry.totalSuccesses,
    lastFailureAt: entry.lastFailureAt,
    lastSuccessAt: entry.lastSuccessAt,
    lastErrorMessage: entry.lastErrorMessage,
    openedAt: entry.openedAt,
  };
}

export function getAllSnapshots(): CircuitSnapshot[] {
  return Array.from(breakers.keys())
    .map((name) => getSnapshot(name))
    .filter((s): s is CircuitSnapshot => s !== null);
}

export function reset(name: string): void {
  breakers.delete(name);
}

export function resetAll(): void {
  breakers.clear();
}
