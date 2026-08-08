import type { ReactNode } from "react";
import { permanentRedirect } from "next/navigation";

export default function MentalHealthManagementQuarantineLayout({
  children: _children,
}: {
  children: ReactNode;
}) {
  permanentRedirect(
    "https://www.mhlw.go.jp/bunya/roudoukijun/anzeneisei12/",
  );
}
