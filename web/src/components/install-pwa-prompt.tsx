"use client";

import { useCallback, useEffect, useState } from "react";
import { getUsageScore } from "@/lib/usage-tracker";
import {
  detectInstallGuideKind,
  isStandaloneDisplay,
  type InstallGuideKind,
} from "@/lib/pwa-install";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt: () => Promise<void>;
}

const STORAGE_KEY = "pwa-install-dismissed-at";
const DISMISS_COOLDOWN_DAYS = 14;
// P0-5: 初回訪問時に PWA インストール促しを出さない。
// KY 1回 = 5pt, ai_chat 1回 = 3pt, page_view = 1pt。
// 「KY/Chatbot/日誌を3回以上使った」をだいたい満たす閾値として 9 を採用
// （例：KY 2回 + chat 0回 / chat 3回 / KY 1回 + chat 2回 ）。
const MIN_ENGAGEMENT_SCORE = 9;

function isDismissedRecently(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    const ts = Number(stored);
    if (!Number.isFinite(ts)) return false;
    const ageDays = (Date.now() - ts) / 86_400_000;
    return ageDays < DISMISS_COOLDOWN_DAYS;
  } catch {
    return false;
  }
}

export function InstallPwaPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  // iOS は beforeinstallprompt が永久に発火しないため、UA判定で手動手順を案内する。
  const [iosGuide, setIosGuide] = useState<InstallGuideKind>("none");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isDismissedRecently()) return;
    if (isStandaloneDisplay(window)) return; // すでにホーム画面起動なら不要

    const kind = detectInstallGuideKind({
      userAgent: window.navigator.userAgent,
      platform: window.navigator.platform,
      maxTouchPoints: window.navigator.maxTouchPoints ?? 0,
    });
    setIosGuide(kind);
    if (kind !== "none" && getUsageScore() >= MIN_ENGAGEMENT_SCORE) {
      setVisible(true);
    }

    const handler = (event: Event) => {
      event.preventDefault();
      const installEvent = event as BeforeInstallPromptEvent;
      setDeferred(installEvent);
      // KY/Chat/日誌の利用が一定以上ある時だけバナー表示。
      // それ未満では `deferred` だけ保持して、後で利用が進んだら表示できるようにする。
      if (getUsageScore() >= MIN_ENGAGEMENT_SCORE) {
        setVisible(true);
      }
    };

    const installedHandler = () => {
      setVisible(false);
      setDeferred(null);
    };

    // 既に beforeinstallprompt が発火済み（または iOS で案内対象）でも、
    // 利用が進めば後から表示できるよう 1分ごとに再判定する。
    const interval = window.setInterval(() => {
      const eligible = deferred !== null || iosGuide !== "none";
      if (eligible && !visible && !isDismissedRecently() && getUsageScore() >= MIN_ENGAGEMENT_SCORE) {
        setVisible(true);
      }
    }, 60_000);

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
      window.clearInterval(interval);
    };
  }, [deferred, iosGuide, visible]);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // localStorage unavailable; cooldown is best-effort
    }
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "dismissed") {
        dismiss();
      } else {
        setVisible(false);
      }
    } catch {
      dismiss();
    } finally {
      setDeferred(null);
    }
  }, [deferred, dismiss]);

  if (!visible) return null;

  // iOS: prompt() が使えないため「共有 → ホーム画面に追加」の手動手順を案内する。
  if (!deferred && iosGuide !== "none") {
    return (
      <div
        role="dialog"
        aria-label="ホーム画面に追加"
        className="fixed inset-x-3 bottom-[calc(var(--mobile-bottom-nav-h,0px)+12px)] z-30 mx-auto max-w-md rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl dark:border-emerald-900 dark:bg-slate-900"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xl text-white">
            ⛑️
          </div>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              ホーム画面に追加できます
            </p>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              アプリのように起動でき、現場でもワンタップで開けます。
            </p>
            {iosGuide === "ios-safari" ? (
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-700 dark:text-slate-300">
                <li>
                  画面下の共有ボタン
                  <span aria-hidden="true" className="mx-1 inline-block rounded border border-slate-300 px-1 text-xs leading-5 dark:border-slate-600">
                    ↑
                  </span>
                  をタップ
                </li>
                <li>「ホーム画面に追加」を選ぶ</li>
                <li>右上の「追加」をタップ</li>
              </ol>
            ) : (
              <p className="mt-2 text-slate-700 dark:text-slate-300">
                共有メニューの「ホーム画面に追加」から追加できます。見つからない場合は、このページを
                Safari で開いて 共有 → 「ホーム画面に追加」を選んでください。
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={dismiss}
                className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                あとで
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="閉じる"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  if (!deferred) return null;

  return (
    // P0-5: モバイル底部ナビ (`MobileBottomNav`) と重ならないよう、
    // CSS変数 --mobile-bottom-nav-h を使った安全余白を確保する（globals.css 側で定義）。
    <div
      role="dialog"
      aria-label="ホーム画面に追加"
      className="fixed inset-x-3 bottom-[calc(var(--mobile-bottom-nav-h,0px)+12px)] z-30 mx-auto max-w-md rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl dark:border-emerald-900 dark:bg-slate-900"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xl text-white">
          ⛑️
        </div>
        <div className="flex-1 text-sm">
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            ホーム画面に追加できます
          </p>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            アプリのように起動でき、オフラインでもKY用紙を確認できます。
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={install}
              className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              追加する
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              あとで
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="閉じる"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          ×
        </button>
      </div>
    </div>
  );
}
