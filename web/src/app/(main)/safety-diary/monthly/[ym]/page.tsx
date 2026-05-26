import { permanentRedirect } from "next/navigation";

// Phase 12: 旧「職長日誌」月次は廃止。打合せ書へ一本化。
export default function Page() {
  permanentRedirect("/safety-diary");
}
