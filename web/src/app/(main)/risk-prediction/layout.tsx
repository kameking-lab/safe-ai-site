import { permanentRedirect } from "next/navigation";

export default function RiskPredictionQuarantineLayout({
  children: _children,
}: Readonly<{ children: React.ReactNode }>) {
  permanentRedirect("/risk");
}
