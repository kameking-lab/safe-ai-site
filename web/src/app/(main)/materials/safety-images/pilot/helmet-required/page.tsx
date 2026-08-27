import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: true, nocache: true },
};

export default function UnpublishedSafetyImagePilotPage(): never {
  notFound();
}
