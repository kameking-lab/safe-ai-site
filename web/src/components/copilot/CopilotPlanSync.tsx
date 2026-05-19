"use client";

/**
 * Client-only effect component that registers a generated plan into the
 * Copilot SafetyContext on the preview route, so subsequent visits to
 * /chatbot and /accidents-reports can show "計画書を再表示" and the
 * step-nav can mark plan generation as complete.
 */
import { useEffect } from "react";
import { useOptionalCopilot } from "@/components/copilot/CopilotProvider";
import type { CopilotPlanSnapshot, CopilotScale } from "@/lib/copilot/types";
import type { IndustrySlug } from "@/lib/industry-slugs";

interface CopilotPlanSyncProps {
  industry?: IndustrySlug;
  scale?: CopilotScale;
  fiscalYear: number;
  templateId: string;
  href: string;
  organizationName?: string;
}

export function CopilotPlanSync(props: CopilotPlanSyncProps) {
  const copilot = useOptionalCopilot();
  useEffect(() => {
    if (!copilot) return;
    const snapshot: CopilotPlanSnapshot = {
      industry: props.industry,
      scale: props.scale,
      fiscalYear: props.fiscalYear,
      templateId: props.templateId,
      href: props.href,
      organizationName: props.organizationName,
    };
    copilot.recordPlan(snapshot);
    // We intentionally only re-run when the key fields change.
  }, [
    copilot,
    props.industry,
    props.scale,
    props.fiscalYear,
    props.templateId,
    props.href,
    props.organizationName,
  ]);
  return null;
}
