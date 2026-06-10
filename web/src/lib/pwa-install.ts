/**
 * PWA インストール導線のプラットフォーム判定。
 *
 * iOS Safari は beforeinstallprompt を一切発火しないため、
 * インストール促しをイベント駆動だけにすると iPhone ユーザーには永久に出ない。
 * ここで UA ベースの判定を純関数として切り出し、iOS には
 * 「共有 → ホーム画面に追加」の手動手順を案内できるようにする。
 */

export type InstallGuideKind =
  | "ios-safari" // iOS の Safari: 共有メニューから直接追加できる
  | "ios-other" // iOS の Safari 以外（Chrome/LINE等）: Safariで開く案内が必要な場合あり
  | "none"; // iOS 以外（beforeinstallprompt に任せる）

export interface PlatformInput {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}

/**
 * iOS / iPadOS 端末か。
 * iPadOS 13+ はデスクトップ表示時に UA も platform も Mac を名乗るため、
 * 「MacIntel かつタッチ点あり」を iPad とみなす。
 */
export function isIosDevice(input: PlatformInput): boolean {
  if (/iPhone|iPad|iPod/i.test(input.userAgent)) return true;
  return input.platform === "MacIntel" && input.maxTouchPoints > 1;
}

/**
 * iOS 上のブラウザが Safari 本体かどうか。
 * iOS のサードパーティブラウザ/アプリ内ブラウザは WebKit 強制のため
 * UA に "Safari" を含むことが多く、固有トークンの有無で除外する。
 */
function isIosSafari(userAgent: string): boolean {
  // CriOS=Chrome, FxiOS=Firefox, EdgiOS=Edge, OPT/OPiOS=Opera,
  // Line=LINEアプリ内, FBAN/FBAV=Facebook, Instagram, YJApp=Yahoo!
  if (/CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|Line\/|FBAN|FBAV|Instagram|YJApp/i.test(userAgent)) {
    return false;
  }
  return /Safari/i.test(userAgent);
}

/** iOS 向けに表示すべき案内の種類を判定する。 */
export function detectInstallGuideKind(input: PlatformInput): InstallGuideKind {
  if (!isIosDevice(input)) return "none";
  return isIosSafari(input.userAgent) ? "ios-safari" : "ios-other";
}

/**
 * すでにホーム画面起動（standalone 表示）かどうか。
 * インストール済みなら案内は不要。
 */
export function isStandaloneDisplay(win: Window): boolean {
  try {
    if (win.matchMedia("(display-mode: standalone)").matches) return true;
  } catch {
    /* matchMedia 未対応環境では navigator.standalone のみで判定 */
  }
  // iOS Safari 独自プロパティ（標準には無いため型を絞って参照）
  const nav = win.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}
