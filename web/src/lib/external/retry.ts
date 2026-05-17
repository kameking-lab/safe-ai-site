/**
 * Lightweight retry helper with exponential backoff and jitter.
 *
 * Intended for transient errors against external services. Treat 4xx as
 * non-retryable by default (caller can pass `shouldRetry` to override).
 */
export type RetryOptions = {
  /** Maximum number of attempts (including the first). Default 2. */
  maxAttempts?: number;
  /** Base delay between attempts in ms. Default 250. */
  baseDelayMs?: number;
  /** Cap on per-attempt delay. Default 2000. */
  maxDelayMs?: number;
  /** Predicate that returns false to stop retrying. */
  shouldRetry?: (err: unknown) => boolean;
};

const DEFAULTS: Required<Omit<RetryOptions, "shouldRetry">> = {
  maxAttempts: 2,
  baseDelayMs: 250,
  maxDelayMs: 2000,
};

function defaultShouldRetry(err: unknown): boolean {
  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  // Don't retry on validation / auth / not-found style errors.
  if (/\b(400|401|403|404)\b/.test(message)) return false;
  if (message.includes("invalid_json") || message.includes("validation")) return false;
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  const cfg = { ...DEFAULTS, ...(options ?? {}) };
  const shouldRetry = options?.shouldRetry ?? defaultShouldRetry;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= cfg.maxAttempts || !shouldRetry(err)) {
        throw err;
      }
      const expDelay = cfg.baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.random() * cfg.baseDelayMs;
      const delay = Math.min(cfg.maxDelayMs, expDelay + jitter);
      await sleep(delay);
    }
  }
  throw lastErr;
}
