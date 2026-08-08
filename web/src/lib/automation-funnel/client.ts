"use client";

import { useEffect } from "react";
import {
  hasOptionalTrackingConsent,
  OPTIONAL_TRACKING_CONSENT_EVENT,
} from "@/lib/analytics-privacy";
import {
  createAutomationFunnelAdapter,
  type RawAutomationFunnelEvent,
} from "./privacy-adapter";

const SESSION_BUCKET_KEY = "safe-ai:automation-funnel-session-bucket:v1";
const SESSION_CTA_KEY = "safe-ai:automation-funnel-cta-position:v1";
const SAFE_CTA = /^[a-z][a-z0-9_]{0,39}$/;

function clearBucket() {
  try {
    window.sessionStorage.removeItem(SESSION_BUCKET_KEY);
    window.sessionStorage.removeItem(SESSION_CTA_KEY);
  } catch {
    // A storage refusal is equivalent to having no reusable bucket.
  }
}

function ctaPosition(event: string, supplied?: string): string | undefined {
  try {
    if (
      event === "automation_cta_click" &&
      supplied &&
      SAFE_CTA.test(supplied)
    ) {
      window.sessionStorage.setItem(SESSION_CTA_KEY, supplied);
      return supplied;
    }
    if (supplied && SAFE_CTA.test(supplied)) return supplied;
    const stored = window.sessionStorage.getItem(SESSION_CTA_KEY) ?? "";
    return SAFE_CTA.test(stored) ? stored : undefined;
  } catch {
    return supplied && SAFE_CTA.test(supplied) ? supplied : undefined;
  }
}

function getBucket(): string | null {
  try {
    const existing = window.sessionStorage.getItem(SESSION_BUCKET_KEY);
    if (/^af_[a-f0-9]{24}$/.test(existing ?? "")) return existing;
    if (!window.crypto?.getRandomValues) return null;
    const bytes = new Uint8Array(12);
    window.crypto.getRandomValues(bytes);
    const bucket = `af_${Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("")}`;
    window.sessionStorage.setItem(SESSION_BUCKET_KEY, bucket);
    return bucket;
  } catch {
    return null;
  }
}

function deviceClass(): RawAutomationFunnelEvent["deviceClass"] {
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
}

function privacySignalPresent(): boolean {
  return (
    navigator.doNotTrack === "1" ||
    Boolean(
      (navigator as Navigator & { globalPrivacyControl?: boolean })
        .globalPrivacyControl,
    )
  );
}

/**
 * Clears both session identifiers as soon as optional consent is withdrawn.
 * This boundary is mounted independently from event calls so a later
 * re-consent can never reuse a bucket created before withdrawal.
 */
export function AutomationFunnelConsentBoundary() {
  useEffect(() => {
    if (!hasOptionalTrackingConsent()) clearBucket();
    const handleConsent = (event: Event) => {
      const next = (event as CustomEvent<"granted" | "denied">).detail;
      if (next !== "granted") clearBucket();
    };
    window.addEventListener(OPTIONAL_TRACKING_CONSENT_EVENT, handleConsent);
    return () =>
      window.removeEventListener(
        OPTIONAL_TRACKING_CONSENT_EVENT,
        handleConsent,
      );
  }, []);
  return null;
}

/**
 * Fire-and-forget, production-canonical-only collection. It never reads or
 * serializes search, hash, referrer, form fields, URL, IP, or user agent.
 */
export function queueAutomationFunnelEvent(
  event: string,
  params: {
    cta_position?: string;
    consultation_type?: string;
    budget_band?: string;
  } = {},
): void {
  if (
    typeof window === "undefined" ||
    window.location.hostname !== "www.anzen-ai-portal.jp" ||
    !hasOptionalTrackingConsent() ||
    privacySignalPresent()
  ) {
    clearBucket();
    return;
  }
  const bucket = getBucket();
  if (!bucket) return;

  const adapter = createAutomationFunnelAdapter({
    // hasOptionalTrackingConsent() already performed the guarded storage read.
    consentGranted: true,
    productionRuntime: true,
    dntOrGpc: false,
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
  });

  void adapter
    .record({
      event,
      pathname: window.location.pathname,
      ctaPosition: ctaPosition(event, params.cta_position),
      consultationCategory: params.consultation_type,
      budgetBucket: params.budget_band,
      deviceClass: deviceClass(),
      anonymousBucket: bucket,
    })
    .catch(() => {
      // Funnel measurement must never affect consultation UX or retry later.
    });
}
