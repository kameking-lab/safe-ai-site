import type { ReactNode } from "react";
import { permanentRedirect } from "next/navigation";

export default function EmployerLiabilityQuarantineLayout({
  children: _children,
}: {
  children: ReactNode;
}) {
  permanentRedirect("/court-cases");
}
