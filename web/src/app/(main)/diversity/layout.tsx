import type { ReactNode } from "react";
import { permanentRedirect } from "next/navigation";

export default function DiversityQuarantineLayout({
  children: _children,
}: {
  children: ReactNode;
}) {
  permanentRedirect("/guides");
}
