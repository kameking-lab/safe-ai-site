/**
 * Central allowlist for browser data owned by this application. Keep legacy
 * prefixes so "delete all" also removes data created by older releases.
 */
export const APP_LOCAL_STORAGE_PREFIXES = [
  "safe-ai:",
  "anzen-",
  "anzen_",
  "ky-",
  "meeting-",
  "chemical-ra:",
  "chatbot_",
  "signage",
  "safety-diary",
  "company-profile",
  "company_profile_",
  "language",
  "easy-japanese",
  "furigana",
  "first-visit-",
  "high-contrast",
  "large-font",
  "onboarding",
  "elearning",
  "el-theme-",
  "pwa-install-",
  "a11y-hint-",
] as const;

export function isAppLocalStorageKey(key: string): boolean {
  return APP_LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function collectAppLocalStorageKeys(storage: Storage): string[] {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && isAppLocalStorageKey(key)) keys.push(key);
  }
  return keys.sort();
}
