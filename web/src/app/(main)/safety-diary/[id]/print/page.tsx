// F-010 B縮小: 印刷ページはアーカイブ。LMS拡張時に再設計予定。
// localStorage データはクライアント側で保持されているため破壊なし。
import { permanentRedirect } from "next/navigation";

export default async function SafetyDiaryPrintPage() {
  permanentRedirect("/safety-diary");
}
