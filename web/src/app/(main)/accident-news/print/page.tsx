import { permanentRedirect } from "next/navigation";
import { buildLegacyFatalAccidentsPrintRedirect } from "@/lib/accident-news/legacy-route";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function LegacyAccidentNewsPrintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  permanentRedirect(
    buildLegacyFatalAccidentsPrintRedirect(await searchParams),
  );
}
