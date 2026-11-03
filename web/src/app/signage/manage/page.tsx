import type { Metadata } from "next";
import { getSignageFleetSnapshot } from "@/lib/signage/fleet-snapshot";
import { SignageFleetView } from "./fleet-view";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "サイネージ多拠点管理",
  description:
    "認証済み端末の接続、heartbeat、配信版、acknowledgement、段階配信、rollbackを組織・拠点別に確認します。",
  robots: { index: false, follow: false, noarchive: true },
  alternates: { canonical: null as unknown as string },
};

export default async function SignageFleetPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const query=await searchParams;
  return <SignageFleetView {...await getSignageFleetSnapshot(query.organization)}/>;
}
