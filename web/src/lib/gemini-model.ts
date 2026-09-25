/**
 * Production Gemini model policy.
 *
 * Pin the current GA Flash model instead of the hot-swapped
 * `gemini-flash-latest` alias so safety-sensitive behavior cannot change
 * without a reviewed source change and regression run.
 */
export const GEMINI_FLASH_MODEL = "gemini-3.8-flash" as const;

// Chat responses are evidence-only, and calculator routing is validated by
// deterministic code. Keep those latency-sensitive requests at low thinking
// effort; KY hazard proposals retain the model's medium default.
export const GEMINI_FAST_THINKING_CONFIG = { thinkingLevel: "low" } as const;
