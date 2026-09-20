import { permanentRedirect } from "next/navigation";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function LegacyAccidentNewsPrintPage() {
  permanentRedirect("/fatal-accidents/print");
}
