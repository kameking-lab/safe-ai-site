import { permanentRedirect } from "next/navigation";

// Phase 12: 旧「職長日誌」詳細入力は廃止。打合せ書へ一本化。
export default function Page() {
  permanentRedirect("/safety-diary");
}
