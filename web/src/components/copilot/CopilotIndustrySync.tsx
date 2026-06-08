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

// 区切り文字: 関心事ラベルに現れない制御文字。配列⇔文字列キーの安全な往復に使う。
const SEP = "\u0001";

export function CopilotIndustrySync({ industry, source, concerns }: CopilotIndustrySyncProps) {
  const copilot = useOptionalCopilot();
  // Depend on the *stable* callbacks + primitive values, never the whole
  // copilot value: setIndustry/recordVisit/addConcerns each bump updatedAt,
  // re-memoizing the context value, so a `[copilot]` dep re-fires forever
  // ("Maximum update depth exceeded"). concerns is an array prop that may be a
  // fresh reference each render — collapse it to a stable string key.
  const setIndustry = copilot?.setIndustry;
  const recordVisit = copilot?.recordVisit;
  const addConcerns = copilot?.addConcerns;
  const concernsKey = concerns && concerns.length > 0 ? concerns.join(SEP) : "";
  useEffect(() => {
    if (!setIndustry || !recordVisit) return;
    setIndustry(industry);
    recordVisit(source);
    if (concernsKey) addConcerns?.(concernsKey.split(SEP));
    // Re-run if the industry or concern list changes (rare, but defensive).
  }, [setIndustry, recordVisit, addConcerns, industry, source, concernsKey]);
  return null;
}
