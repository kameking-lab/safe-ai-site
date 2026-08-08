import "server-only";

import { isPreviewSafetyMode } from "@/lib/server/deployment-safety";

/**
 * Clientのsession lookupは、Preview安全モードでは常に無効にする。
 * productionでも認証に必要な3値が揃う場合だけ有効化し、未構成endpointへの
 * 404や不要なFunction invocationを全main routeから排除する。
 *
 * 呼出し側へ渡すのはbooleanだけで、資格情報の値はserialize・logしない。
 */
export function clientAuthSessionLookupAllowed(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(
    !isPreviewSafetyMode(env) &&
      env.AUTH_SECRET?.trim() &&
      env.AUTH_GOOGLE_ID?.trim() &&
      env.AUTH_GOOGLE_SECRET?.trim(),
  );
}
