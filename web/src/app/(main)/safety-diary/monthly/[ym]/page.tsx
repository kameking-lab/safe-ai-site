import { permanentRedirect } from "next/navigation";
import {
  buildLegacyEditorHref,
  type LegacyEditorPageProps,
} from "@/lib/meeting/editor-route";

// Phase 12: 旧「職長日誌」月次は廃止。打合せ書へ一本化。
export default async function Page({ searchParams }: LegacyEditorPageProps) {
  permanentRedirect(await buildLegacyEditorHref(searchParams));
}
