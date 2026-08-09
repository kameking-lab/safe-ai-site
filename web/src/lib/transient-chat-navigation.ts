const TRANSIENT_CHAT_NAVIGATION_MAX_AGE_MS = 15_000;
let armedUntil = 0;

/** Arms a short-lived, module-private capability. It carries no user data. */
export function beginTransientChatNavigation(): void {
  armedUntil = Date.now() + TRANSIENT_CHAT_NAVIGATION_MAX_AGE_MS;
}

/** Consumes the capability exactly once. The caller separately validates URL. */
export function consumeTransientChatNavigation(): boolean {
  const valid = armedUntil >= Date.now();
  armedUntil = 0;
  return valid;
}

export function __resetTransientChatNavigationForTests(): void {
  armedUntil = 0;
}
