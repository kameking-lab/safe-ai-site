/**
 * App Store（iOS アプリ）への小さな案内の単一情報源。
 *
 * Web ではフッターの公式バッジと Safari の Smart App Banner を表示する。
 *
 * iOS アプリでは出さない:
 * - iOS アプリは Web の画面を `NEXT_PUBLIC_ANZEN_NATIVE=true` で静的書き出しして同梱する。
 *   この値が true のビルドでは常に OFF（サーバー側で null を返し、クライアント JS も入らない）。
 * - 念のため、描画時に Capacitor のネイティブ環境（window.Capacitor.isNativePlatform()）でも非表示にする。
 */
const APP_ID = "6831079439";

export const APP_STORE = {
  appId: APP_ID,
  url: `https://apps.apple.com/jp/app/id${APP_ID}`,
} as const;

/** iOS アプリ同梱用のビルドか（mobile/next.config.ts が NEXT_PUBLIC_ANZEN_NATIVE=true を埋め込む）。 */
export function isAnzenNativeBuild(): boolean {
  return process.env.NEXT_PUBLIC_ANZEN_NATIVE === "true";
}

/** Web の案内を出すビルドか。iOS アプリ同梱ビルドでは出さない。 */
export function appStoreLive(): boolean {
  return !isAnzenNativeBuild();
}

/** Next.js Metadata の `itunes`（<meta name="apple-itunes-app">）。OFF のときは undefined。 */
export function appStoreItunesMetadata(): { appId: string } | undefined {
  return appStoreLive() ? { appId: APP_STORE.appId } : undefined;
}

interface CapacitorWindow {
  Capacitor?: { isNativePlatform?: () => boolean };
}

/** Capacitor の iOS アプリ内で動いているか。サーバーでは false。 */
export function isNativeApp(target: unknown = currentWindow()): boolean {
  return Boolean((target as CapacitorWindow | undefined)?.Capacitor?.isNativePlatform?.());
}

/** Web の訪問者に案内を出すか。 */
export function shouldShowAppStorePromo(target: unknown = currentWindow()): boolean {
  return appStoreLive() && !isNativeApp(target);
}

function currentWindow(): unknown {
  return typeof window === "undefined" ? undefined : window;
}
