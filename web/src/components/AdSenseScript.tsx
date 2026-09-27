"use client";

import { useEffect } from "react";
import { configuredAdsensePublisherId } from '@/lib/adsense-account';
import { isAdEligibleUrl } from '@/lib/analytics-privacy';

const PUB_ID = configuredAdsensePublisherId(process.env.NEXT_PUBLIC_ADSENSE_PUB_ID);

export default function AdSenseScript({ nonce }: { nonce?: string }) {
  useEffect(() => {
    if (!PUB_ID || !isAdEligibleUrl(window.location.href)) return;
    if (document.getElementById("adsense-init")) return;

    // Insert synchronously with consent. A deferred Next Script callback can
    // inject after navigation to a route where ads are forbidden.
    const script = document.createElement("script");
    script.id = "adsense-init";
    script.async = true;
    script.crossOrigin = "anonymous";
    if (nonce) script.nonce = nonce;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUB_ID}`;
    document.head.appendChild(script);
  }, [nonce]);

  return null;
}
