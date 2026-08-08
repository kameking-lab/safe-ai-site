'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  hasOptionalTrackingConsent,
  hasPrivacySignalOptOut,
  isOptionalTrackingUrl,
  sanitizedAnalyticsLocation,
  sanitizeAnalyticsParams,
} from '@/lib/analytics-privacy';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export function trackEvent(action: string, params?: Record<string, unknown>) {
  if (
    !GA_ID ||
    typeof window === 'undefined' ||
    !window.gtag ||
    !hasOptionalTrackingConsent() ||
    hasPrivacySignalOptOut() ||
    !isOptionalTrackingUrl(window.location.href)
  ) return;
  window.gtag('event', action, sanitizeAnalyticsParams(params));
}

function PageviewTracker({ ready }: { ready: boolean }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!ready || !GA_ID || typeof window === 'undefined' || !window.gtag || !hasOptionalTrackingConsent() || hasPrivacySignalOptOut()) return;
    const location = sanitizedAnalyticsLocation(window.location.href);
    if (!location) return;
    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    window.gtag('event', 'page_view', { ...location, send_to: GA_ID });
  }, [pathname, ready]);

  return null;
}

export default function Analytics({ nonce }: { nonce?: string }) {
  const [ready, setReady] = useState(false);
  if (!GA_ID) return null;

  return (
    <>
      <Script
        nonce={nonce}
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="lazyOnload"
      />
      <Script
        nonce={nonce}
        id="gtag-init"
        strategy="lazyOnload"
        onReady={() => setReady(true)}
      >
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('consent','default',{'analytics_storage':'denied','ad_storage':'denied','ad_user_data':'denied','ad_personalization':'denied'});gtag('set',{'allow_google_signals':false,'allow_ad_personalization_signals':false});gtag('config','${GA_ID}',{'send_page_view':false,'anonymize_ip':true,'allow_google_signals':false,'allow_ad_personalization_signals':false});`}
      </Script>
      <PageviewTracker ready={ready} />
    </>
  );
}
