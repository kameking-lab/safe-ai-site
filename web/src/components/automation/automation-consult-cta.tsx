"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { trackAutomationEvent } from "@/lib/automation-consult/analytics";
import type { AutomationAnalyticsPage } from "@/lib/automation-consult/analytics";
import type { AutomationConsultationType } from "@/lib/automation-consult/prefill";

const SERVICE_PATH = "/services/automation";

export type AutomationCtaPosition =
  | "hero"
  | "after_pricing"
  | "final"
  | "home"
  | "home_primary"
  | "home_pricing"
  | "home_examples"
  | "home_training"
  | "home_hero"
  | "global_nav"
  | "mobile_nav"
  | "footer"
  | "features"
  | "safety_ai"
  | "ky"
  | "safety_diary"
  | "chemical_ra"
  | "signage"
  | "chatbot"
  | "annual_plan"
  | "education"
  | "heat_hub"
  | "heat_slides"
  | "heat_elearning";

const CTA_PAGE_BY_POSITION: Record<
  AutomationCtaPosition,
  AutomationAnalyticsPage
> = {
  hero: SERVICE_PATH,
  after_pricing: SERVICE_PATH,
  final: SERVICE_PATH,
  home: "/",
  home_primary: "/",
  home_pricing: "/",
  home_examples: "/",
  home_training: "/",
  home_hero: "/",
  global_nav: "sitewide",
  mobile_nav: "sitewide",
  footer: "sitewide",
  features: "sitewide",
  safety_ai: "sitewide",
  ky: "sitewide",
  safety_diary: "sitewide",
  chemical_ra: "sitewide",
  signage: "sitewide",
  chatbot: "sitewide",
  annual_plan: "sitewide",
  education: "sitewide",
  heat_hub: "sitewide",
  heat_slides: "sitewide",
  heat_elearning: "sitewide",
};

type AutomationConsultCtaProps = {
  children: React.ReactNode;
  position: AutomationCtaPosition;
  href?: string;
  className?: string;
  title?: string;
  consultationType?: AutomationConsultationType;
  budgetBand?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  "data-app-shell-nav-href"?: string;
  "data-nav-active"?: "true" | "false";
  "data-primary-action"?: string;
};

/**
 * 業務相談へのCTA。計測値は固定の大分類だけに限定し、表示文言やURLの
 * クエリ、入力内容、受付番号はイベントへ渡さない。
 */
export function AutomationConsultCta({
  children,
  position,
  href = `${SERVICE_PATH}#consult-form`,
  className = "",
  title,
  consultationType,
  budgetBand,
  onClick,
  "data-app-shell-nav-href": appShellNavHref,
  "data-nav-active": navActive,
  "data-primary-action": primaryAction,
}: AutomationConsultCtaProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={(event) => {
        trackAutomationEvent("automation_cta_click", {
          // 任意URLやクエリは読まず、コードで固定した粗い導線区分だけを送る。
          page: CTA_PAGE_BY_POSITION[position],
          cta_position: position,
          ...(consultationType ? { consultation_type: consultationType } : {}),
          ...(budgetBand ? { budget_band: budgetBand } : {}),
          success: true,
        });
        onClick?.(event);
      }}
      className={`inline-flex min-h-[44px] max-w-full items-center justify-center rounded-xl px-5 py-3 text-center text-sm font-bold whitespace-normal [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 ${className}`}
      title={title}
      data-app-shell-nav-href={appShellNavHref}
      data-nav-active={navActive}
      data-primary-action={primaryAction}
    >
      {children}
    </Link>
  );
}

type AutomationAnalyticsMarkerProps = {
  event:
    | "automation_service_view"
    | "automation_pricing_view"
    | "automation_form_unavailable";
};

/**
 * セクションが実際に画面へ入った時だけ、一度だけ閲覧イベントを送る。
 * マーカーは支援技術とレイアウトから除外する。
 */
export function AutomationAnalyticsMarker({ event }: AutomationAnalyticsMarkerProps) {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        trackAutomationEvent(event, { page: SERVICE_PATH, success: true });
        observer.disconnect();
      },
      { threshold: 0.25 },
    );
    observer.observe(marker);
    return () => observer.disconnect();
  }, [event]);

  return <span ref={markerRef} aria-hidden="true" className="absolute h-px w-px overflow-hidden" />;
}

export function AutomationExampleDetails({
  exampleId,
  id,
  className,
  children,
}: {
  exampleId: string;
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  const trackedRef = useRef(false);
  return (
    <details
      id={id}
      className={className}
      onToggle={(event) => {
        if (!event.currentTarget.open || trackedRef.current) return;
        trackedRef.current = true;
        trackAutomationEvent("automation_example_select", {
          page: SERVICE_PATH,
          example_id: exampleId,
          success: true,
        });
      }}
    >
      {children}
    </details>
  );
}
