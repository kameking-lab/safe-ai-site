"use client";

import { useEffect, useRef } from "react";
import { useReportWebVitals } from "next/web-vitals";
import {
  OPTIONAL_TRACKING_CONSENT_EVENT,
  OPTIONAL_TRACKING_CONSENT_KEY,
} from "@/lib/analytics-privacy";
import {
  createRumAdapter,
  isRumRouteEligible,
  type RawRumMetric,
} from "@/lib/rum/privacy-adapter";

const SESSION_BUCKET_KEY = "safe-ai:rum-session-bucket:v1";

function readConsent(): boolean {
  try {
    return window.localStorage.getItem(OPTIONAL_TRACKING_CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

function clearBucket() {
  try {
    window.sessionStorage.removeItem(SESSION_BUCKET_KEY);
  } catch {
    // Storage refusal already means no reusable bucket.
  }
}

function getBucket(): string | null {
  try {
    const existing = window.sessionStorage.getItem(SESSION_BUCKET_KEY);
    if (/^rum_[a-f0-9]{24}$/.test(existing ?? "")) return existing;
    if (!window.crypto?.getRandomValues) return null;
    const bytes = new Uint8Array(12);
    window.crypto.getRandomValues(bytes);
    const bucket = `rum_${Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("")}`;
    window.sessionStorage.setItem(SESSION_BUCKET_KEY, bucket);
    return bucket;
  } catch {
    return null;
  }
}

function isSampled(bucket: string, sampleRate: number): boolean {
  const numerator = Number.parseInt(bucket.slice(4, 12), 16);
  return Number.isFinite(numerator) && numerator / 0xffffffff < sampleRate;
}

function deviceClass(): RawRumMetric["deviceClass"] {
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
}

function connectionClass(): RawRumMetric["connectionClass"] {
  const effectiveType = (
    navigator as Navigator & {
      connection?: { effectiveType?: string };
    }
  ).connection?.effectiveType;
  if (effectiveType === "slow-2g" || effectiveType === "2g") return "slow";
  if (effectiveType === "3g") return "medium";
  if (effectiveType === "4g") return "fast";
  return "unknown";
}

function navigationType(value: string): RawRumMetric["navigationType"] {
  if (
    value === "navigate" ||
    value === "reload" ||
    value === "back-forward" ||
    value === "prerender"
  ) {
    return value;
  }
  return "unknown";
}

export function RumWebVitals({
  buildId,
  sampleRate,
}: {
  buildId: string;
  sampleRate: number;
}) {
  const privacySignal =
    typeof navigator === "undefined" ||
      navigator.doNotTrack === "1" ||
      Boolean(
        (navigator as Navigator & { globalPrivacyControl?: boolean })
          .globalPrivacyControl,
      );
  const privacySignalRef = useRef(privacySignal);
  const eligibleRef = useRef(false);
  const adapterRef = useRef(
    createRumAdapter({
      consentGranted: false,
      endpointEnabled: true,
      productionRuntime: true,
      dntOrGpc: privacySignal,
      clearAnonymousBucket: clearBucket,
      transport: async (endpoint, payload) => {
        await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "same-origin",
          keepalive: true,
          cache: "no-store",
        });
      },
    }),
  );

  useEffect(() => {
    if (readConsent() && !privacySignalRef.current) {
      eligibleRef.current = true;
      adapterRef.current.grantConsent();
    } else {
      eligibleRef.current = false;
      adapterRef.current.withdrawConsent();
    }
    const handleConsent = (event: Event) => {
      const next = (event as CustomEvent<"granted" | "denied">).detail;
      if (next === "granted" && !privacySignalRef.current) {
        eligibleRef.current = true;
        adapterRef.current.grantConsent();
      } else {
        eligibleRef.current = false;
        adapterRef.current.withdrawConsent();
      }
    };
    window.addEventListener(OPTIONAL_TRACKING_CONSENT_EVENT, handleConsent);
    return () =>
      window.removeEventListener(OPTIONAL_TRACKING_CONSENT_EVENT, handleConsent);
  }, []);

  useReportWebVitals((metric) => {
    if (!eligibleRef.current) return;
    if (window.location.search || window.location.hash) return;
    if (!isRumRouteEligible(window.location.pathname)) return;
    const bucket = getBucket();
    if (!bucket || !isSampled(bucket, sampleRate)) return;
    void adapterRef.current
      .record({
        pathname: window.location.pathname,
        metric: metric.name,
        value: metric.value,
        rating: metric.rating,
        navigationType: navigationType(metric.navigationType),
        deviceClass: deviceClass(),
        connectionClass: connectionClass(),
        buildId,
        anonymousBucket: bucket,
      })
      .catch(() => {
        // RUM failure must never affect portal behavior or queue a retry.
      });
  });

  return null;
}
