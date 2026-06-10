import { describe, it, expect } from "vitest";
import {
  detectInstallGuideKind,
  isIosDevice,
  isStandaloneDisplay,
  type PlatformInput,
} from "./pwa-install";

const UA = {
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.80 Mobile/15E148 Safari/604.1",
  iphoneLine:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.8.0",
  ipadSafari:
    "Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  // iPadOS 13+ デスクトップ表示: UA は Mac を名乗る
  ipadDesktopMode:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
  windowsChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
} as const;

function input(userAgent: string, platform = "iPhone", maxTouchPoints = 5): PlatformInput {
  return { userAgent, platform, maxTouchPoints };
}

describe("isIosDevice", () => {
  it("iPhone/iPad/iPod の UA を iOS と判定", () => {
    expect(isIosDevice(input(UA.iphoneSafari))).toBe(true);
    expect(isIosDevice(input(UA.ipadSafari, "iPad"))).toBe(true);
  });

  it("iPadOS 13+ デスクトップ表示（MacIntel + タッチあり）を iPad と判定", () => {
    expect(isIosDevice(input(UA.ipadDesktopMode, "MacIntel", 5))).toBe(true);
  });

  it("本物の Mac（MacIntel + タッチなし）は iOS としない", () => {
    expect(isIosDevice(input(UA.macSafari, "MacIntel", 0))).toBe(false);
  });

  it("Android / Windows は iOS としない", () => {
    expect(isIosDevice(input(UA.androidChrome, "Linux armv8l"))).toBe(false);
    expect(isIosDevice(input(UA.windowsChrome, "Win32", 0))).toBe(false);
  });
});

describe("detectInstallGuideKind", () => {
  it("iPhone Safari → ios-safari（共有メニュー直案内）", () => {
    expect(detectInstallGuideKind(input(UA.iphoneSafari))).toBe("ios-safari");
    expect(detectInstallGuideKind(input(UA.ipadSafari, "iPad"))).toBe("ios-safari");
  });

  it("iPhone の Chrome / LINE アプリ内 → ios-other（Safari誘導込み案内）", () => {
    expect(detectInstallGuideKind(input(UA.iphoneChrome))).toBe("ios-other");
    expect(detectInstallGuideKind(input(UA.iphoneLine))).toBe("ios-other");
  });

  it("Android / Windows / Mac → none（beforeinstallprompt に任せる）", () => {
    expect(detectInstallGuideKind(input(UA.androidChrome, "Linux armv8l"))).toBe("none");
    expect(detectInstallGuideKind(input(UA.windowsChrome, "Win32", 0))).toBe("none");
    expect(detectInstallGuideKind(input(UA.macSafari, "MacIntel", 0))).toBe("none");
  });
});

describe("isStandaloneDisplay", () => {
  function fakeWindow(opts: { matches?: boolean; standalone?: boolean; throwMatchMedia?: boolean }): Window {
    return {
      matchMedia: (query: string) => {
        if (opts.throwMatchMedia) throw new TypeError("matchMedia is not a function");
        return { matches: opts.matches ?? false, media: query } as MediaQueryList;
      },
      navigator: { standalone: opts.standalone } as unknown as Navigator,
    } as unknown as Window;
  }

  it("display-mode: standalone なら true", () => {
    expect(isStandaloneDisplay(fakeWindow({ matches: true }))).toBe(true);
  });

  it("iOS Safari の navigator.standalone === true なら true", () => {
    expect(isStandaloneDisplay(fakeWindow({ matches: false, standalone: true }))).toBe(true);
  });

  it("どちらも該当しなければ false（matchMedia 例外時も落ちない）", () => {
    expect(isStandaloneDisplay(fakeWindow({ matches: false }))).toBe(false);
    expect(isStandaloneDisplay(fakeWindow({ throwMatchMedia: true }))).toBe(false);
  });
});
