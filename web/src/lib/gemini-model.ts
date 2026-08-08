/**
 * Production Gemini model policy.
 *
 * Pin the current GA Flash model instead of the hot-swapped
 * `gemini-flash-latest` alias so safety-sensitive behavior cannot change
 * without a reviewed source change and regression run.
 */
export const GEMINI_FLASH_MODEL = "gemini-3.6-flash" as const;
