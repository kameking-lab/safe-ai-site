"use client";

import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

const LazyOptionalThirdPartyScripts = lazy(() =>
  import("@/components/OptionalThirdPartyScripts").then((module) => ({
    default: module.OptionalThirdPartyScripts,
  })),
);
const LazyRumWebVitals = lazy(() =>
  import("@/components/rum-web-vitals").then((module) => ({
    default: module.RumWebVitals,
  })),
);
const LazyAutomationFunnelConsentBoundary = lazy(() =>
  import("@/lib/automation-funnel/client").then((module) => ({
    default: module.AutomationFunnelConsentBoundary,
  })),
);
const LazyServiceWorkerRegistrar = lazy(() =>
  import("@/components/service-worker-registrar").then((module) => ({
    default: module.ServiceWorkerRegistrar,
  })),
);
const LazyInstallPwaPrompt = lazy(() =>
  import("@/components/install-pwa-prompt").then((module) => ({
    default: module.InstallPwaPrompt,
  })),
);

type DeferredGlobalEnhancementsProps = {
  analyticsEnabled: boolean;
  adsEnabled: boolean;
  rumReady: boolean;
  rumBuildId: string;
  rumSampleRate: number;
  previewSafetyMode: boolean;
  nonce?: string;
};

const LOAD_DELAY_MS = 10_000;

function subscribeToNetworkState(onStoreChange: () => void) {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getOfflineSnapshot() {
  return !navigator.onLine;
}

/**
 * Non-critical global behavior starts after first paint. Web Vitals observers
 * use buffered entries, while consent gates remain fail-closed before mount.
 * This keeps PWA, RUM and optional scripts out of the LCP dependency graph.
 */
export function DeferredGlobalEnhancements({
  analyticsEnabled,
  adsEnabled,
  rumReady,
  rumBuildId,
  rumSampleRate,
  previewSafetyMode,
  nonce,
}: DeferredGlobalEnhancementsProps) {
  const [ready, setReady] = useState(false);
  const isOffline = useSyncExternalStore(
    subscribeToNetworkState,
    getOfflineSnapshot,
    () => false,
  );

  useEffect(() => {
    const trackDelegatedAutomationCta = (event: MouseEvent) => {
      const origin = event.target;
      if (!(origin instanceof Element)) return;
      const link = origin.closest<HTMLAnchorElement>(
        "a[data-automation-cta-position]",
      );
      const position = link?.dataset.automationCtaPosition;
      if (!position || !/^[a-z0-9][a-z0-9_-]{0,39}$/.test(position)) return;
      void import("@/lib/automation-consult/analytics").then(
        ({ trackAutomationEvent }) => {
          trackAutomationEvent("automation_cta_click", {
            page: "sitewide",
            cta_position: position,
            success: true,
          });
        },
      );
    };
    document.addEventListener("click", trackDelegatedAutomationCta);
    return () =>
      document.removeEventListener("click", trackDelegatedAutomationCta);
  }, []);

  useEffect(() => {
    let idleId: number | undefined;
    const timerId = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(() => setReady(true), {
          timeout: 1_500,
        });
      } else {
        setReady(true);
      }
    }, LOAD_DELAY_MS);
    return () => {
      window.clearTimeout(timerId);
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, []);

  return (
    <>
      {isOffline ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          オフラインモード
        </div>
      ) : null}
      {ready ? (
        <Suspense fallback={null}>
          {analyticsEnabled || adsEnabled || rumReady ? (
            <LazyOptionalThirdPartyScripts
              analyticsEnabled={analyticsEnabled}
              adsEnabled={adsEnabled}
              rumEnabled={rumReady}
              nonce={nonce}
            />
          ) : null}
          {rumReady ? (
            <LazyRumWebVitals
              buildId={rumBuildId}
              sampleRate={rumSampleRate}
            />
          ) : null}
          {previewSafetyMode ? null : (
            <>
              <LazyAutomationFunnelConsentBoundary />
              <LazyServiceWorkerRegistrar enabled showNetworkStatus={false} />
              <LazyInstallPwaPrompt />
            </>
          )}
        </Suspense>
      ) : null}
    </>
  );
}
