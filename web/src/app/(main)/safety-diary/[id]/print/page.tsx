// F-010 B縮小: 印刷ページはアーカイブ。LMS拡張時に再設計予定。
// localStorage データはクライアント側で保持されているため破壊なし。
import { permanentRedirect } from "next/navigation";
import {
  buildLegacyEditorHref,
  type LegacyEditorPageProps,
} from "@/lib/meeting/editor-route";

export default async function SafetyDiaryPrintPage({ searchParams }: LegacyEditorPageProps) {
  permanentRedirect(await buildLegacyEditorHref(searchParams));
}
