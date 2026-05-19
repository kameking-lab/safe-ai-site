"use client";

/**
 * Client-only effect component that syncs the canonical industry slug of
 * the current page into the Copilot SafetyContext. Used by /accidents-reports
 * detail pages so subsequent visits to /chatbot or /strategy/plan-generator
 * remember the industry the user looked at.
 */
import { useEffect } from "react";
import { useOptionalCopilot } from "@/components/copilot/CopilotProvider";
import type { IndustrySlug } from "@/lib/industry-slugs";

interface CopilotIndustrySyncProps {
  industry: IndustrySlug;
  source: "accidents-reports" | "plan-generator";
  /** Concern label(s) to merge in (e.g. the report's top accident type). */
  concerns?: string[];
}

export function CopilotIndustrySync({ industry, source, concerns }: CopilotIndustrySyncProps) {
  const copilot = useOptionalCopilot();
  useEffect(() => {
    if (!copilot) return;
    copilot.setIndustry(industry);
    copilot.recordVisit(source);
    if (concerns && concerns.length > 0) copilot.addConcerns(concerns);
    // Re-run if the industry or concern list changes (rare, but defensive).
  }, [copilot, industry, source, concerns]);
  return null;
}
