"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Analytics from "@/components/Analytics";
import AdSenseScript from "@/components/AdSenseScript";
import {
  hasPrivacySignalOptOut,
  isOptionalTrackingPath,
  isOptionalTrackingUrl,
  OPTIONAL_TRACKING_CONSENT_KEY,
  OPTIONAL_TRACKING_CONSENT_EVENT,
} from "@/lib/analytics-privacy";
import { removeGoogleOptionalCookies } from "@/lib/google-cookie-privacy";
import { consumeTransientChatNavigation } from "@/lib/transient-chat-navigation";

type Consent = "granted" | "denied" | null;

function denyGoogleProcessing() {
  window.gtag?.("consent", "update", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  removeGoogleOptionalCookies();
}

export function OptionalThirdPartyScripts({
  analyticsEnabled,
  adsEnabled,
  rumEnabled = false,
  nonce,
}: {
  analyticsEnabled: boolean;
  adsEnabled: boolean;
  rumEnabled?: boolean;
  nonce?: string;
}) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent>(null);
  const [editing, setEditing] = useState(false);
  const configured = analyticsEnabled || adsEnabled || rumEnabled;
  const committedTransientChatNavigationRef = useRef(false);

  useEffect(() => {
    if (!configured) return;
    // SSR初期描画はnullで固定し、hydration後のフレームで端末設定を同期する。
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(OPTIONAL_TRACKING_CONSENT_KEY);
        setConsent(stored === "granted" ? "granted" : stored === "denied" ? "denied" : null);
      } catch {
        setConsent("denied");
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [configured]);

  // Googleタグ読込後のSPA遷移は、コンポーネントのunmountだけでは履歴計測を
  // 止められない。機微URLへの同一オリジン遷移をタグより先に捕捉し、consentを
  // deniedへ更新してからフルドキュメント遷移へ切り替える。
  useEffect(() => {
    if (!configured) return;
    const shouldIsolate = (value: string | URL | null | undefined) => {
      if (value == null) return false;
      try {
        const target = new URL(String(value), window.location.href);
        return target.origin === window.location.origin && !isOptionalTrackingUrl(target);
      } catch {
        return true;
      }
    };
    const isolate = (value: string | URL) => {
      const target = new URL(String(value), window.location.href);
      denyGoogleProcessing();
      window.location.assign(target.href);
    };
    const isExactChatbotUrl = (value: string | URL | null | undefined) => {
      if (value == null) return false;
      try {
        const target = new URL(String(value), window.location.href);
        return (
          target.origin === window.location.origin &&
          target.pathname === "/chatbot" &&
          target.search === "" &&
          target.hash === ""
        );
      } catch {
        return false;
      }
    };
    const onClick = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      const anchor = element?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || !shouldIsolate(anchor.href)) return;
      if (
        anchor.hasAttribute("data-transient-chat-handoff") &&
        isExactChatbotUrl(anchor.href) &&
        event.button === 0 &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey &&
        !anchor.download &&
        (!anchor.target || anchor.target === "_self")
      ) {
        // Let React stage the question and emit the data-free authorization
        // event. Deny optional processing before any route transition.
        denyGoogleProcessing();
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      isolate(anchor.href);
    };
    document.addEventListener("click", onClick, true);

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);
    const guardedPushState: History["pushState"] = (data, unused, url) => {
      if (
        isExactChatbotUrl(url) &&
        consumeTransientChatNavigation()
      ) {
        denyGoogleProcessing();
        committedTransientChatNavigationRef.current = true;
        originalPushState(data, unused, url);
        return;
      }
      if (shouldIsolate(url)) {
        isolate(url as string | URL);
        return;
      }
      originalPushState(data, unused, url);
    };
    const guardedReplaceState: History["replaceState"] = (data, unused, url) => {
      if (
        isExactChatbotUrl(url) &&
        consumeTransientChatNavigation()
      ) {
        denyGoogleProcessing();
        committedTransientChatNavigationRef.current = true;
        originalReplaceState(data, unused, url);
        return;
      }
      if (shouldIsolate(url)) {
        isolate(url as string | URL);
        return;
      }
      originalReplaceState(data, unused, url);
    };
    window.history.pushState = guardedPushState;
    window.history.replaceState = guardedReplaceState;
    const onPopState = () => {
      if (!isOptionalTrackingUrl(window.location.href)) {
        denyGoogleProcessing();
        window.location.replace(window.location.href);
      }
    };
    window.addEventListener("popstate", onPopState, true);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState, true);
      if (window.history.pushState === guardedPushState) window.history.pushState = originalPushState;
      if (window.history.replaceState === guardedReplaceState) window.history.replaceState = originalReplaceState;
    };
  }, [configured]);

  useEffect(() => {
    if (!configured || isOptionalTrackingUrl(window.location.href)) return;
    if (
      pathname === "/chatbot" &&
      committedTransientChatNavigationRef.current
    ) {
      committedTransientChatNavigationRef.current = false;
      denyGoogleProcessing();
      return;
    }
    committedTransientChatNavigationRef.current = false;
    const tagWasLoaded = Boolean(
      window.gtag ||
      document.querySelector('script[src*="googletagmanager.com"],script[src*="googlesyndication.com"]'),
    );
    denyGoogleProcessing();
    if (tagWasLoaded) window.location.replace(window.location.href);
  }, [configured, pathname]);

  function choose(next: Exclude<Consent, null>) {
    try {
      window.localStorage.setItem(OPTIONAL_TRACKING_CONSENT_KEY, next);
    } catch {
      // Storage denial is treated as no consent.
      next = "denied";
    }
    window.dispatchEvent(
      new CustomEvent(OPTIONAL_TRACKING_CONSENT_EVENT, { detail: next }),
    );
    if (next === "denied") {
      denyGoogleProcessing();
    }
    setConsent(next);
    setEditing(false);
  }

  if (!configured) return null;
  const trackingPath = isOptionalTrackingPath(pathname);
  const showChoice = consent === null || editing;
  const allowScripts = consent === "granted" &&
    !hasPrivacySignalOptOut() &&
    trackingPath &&
    (typeof window === "undefined" || isOptionalTrackingUrl(window.location.href));

  return (
    <>
      {allowScripts && analyticsEnabled ? <Analytics nonce={nonce} /> : null}
      {allowScripts && adsEnabled ? <AdSenseScript nonce={nonce} /> : null}
      {trackingPath && showChoice ? (
        <section
          aria-label="任意Cookieの設定"
          className="fixed inset-x-3 z-[100] mx-auto max-w-2xl rounded-xl border border-slate-300 bg-white p-4 shadow-xl [bottom:calc(var(--mobile-bottom-nav-h,0px)+env(safe-area-inset-bottom,0px)+12px)]"
        >
          <p className="text-sm font-bold text-slate-900">分析・広告Cookieの設定</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            必須機能以外のアクセス解析・広告・匿名Web Vitals計測は、許可するまで動作しません。検索語や入力内容は送信しません。
            詳細は <a href="/privacy" className="underline">プライバシーポリシー</a> をご確認ください。
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => choose("denied")}
              className="min-h-[44px] rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              拒否する
            </button>
            <button
              type="button"
              onClick={() => choose("granted")}
              className="min-h-[44px] rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              許可する
            </button>
          </div>
        </section>
      ) : trackingPath ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="fixed left-2 z-[90] min-h-[44px] rounded-lg border border-slate-300 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 [bottom:calc(var(--mobile-bottom-nav-h,0px)+env(safe-area-inset-bottom,0px)+12px)]"
        >
          Cookie設定
        </button>
      ) : null}
    </>
  );
}
