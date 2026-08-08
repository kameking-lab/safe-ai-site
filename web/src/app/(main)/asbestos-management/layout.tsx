import type { ReactNode } from "react";
import { permanentRedirect } from "next/navigation";

export default function AsbestosManagementQuarantineLayout({
  children: _children,
}: {
  children: ReactNode;
}) {
  // Keep the destination on the fixed official host and explicitly clear any
  // fragment supplied on the quarantined local URL.
  permanentRedirect("https://www.ishiwata.mhlw.go.jp/#");
}
