"use client";

import { useEffect, useMemo, useState } from "react";
import { regenerateFromTemplateId } from "@/lib/safety-plan-generator";
import {
  consumeSafetyPlanHandoff,
  type SafetyPlanHandoff,
} from "@/lib/transient-navigation-handoff";
import { PlanDocument } from "./plan-document";

export function TransientPlanPreview({
  templateId,
  fallback,
}: {
  templateId: string;
  fallback: SafetyPlanHandoff;
}) {
  const [input, setInput] = useState(fallback);

  useEffect(() => {
    const transient = consumeSafetyPlanHandoff(templateId);
    if (!transient) return;
    const frame = window.requestAnimationFrame(() => setInput(transient));
    return () => window.cancelAnimationFrame(frame);
  }, [templateId]);

  const result = useMemo(
    () =>
      regenerateFromTemplateId({
        templateId,
        fiscalYear: input.fiscalYear,
        organizationName: input.organizationName,
        focusAreas: input.focusAreas,
        customGoals: [],
        notes: input.notes,
        specialWork: input.specialWork,
        hasOverseasAssignment: input.hasOverseasAssignment,
        overworkPriority: input.overworkPriority,
      }),
    [input, templateId],
  );

  if (!result.ok) return null;
  return <PlanDocument plan={result.plan} />;
}
