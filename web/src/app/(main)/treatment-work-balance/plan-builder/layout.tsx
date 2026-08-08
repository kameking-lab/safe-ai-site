import type { ReactNode } from "react";
import { permanentRedirect } from "next/navigation";

export default function TreatmentWorkPlanBuilderQuarantineLayout({
  children: _children,
}: {
  children: ReactNode;
}) {
  permanentRedirect("/treatment-work-balance");
}
