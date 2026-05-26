import { permanentRedirect } from "next/navigation";

// Phase 12: 旧「職長日誌」入力は廃止。打合せ書（用紙ファースト）へ一本化。
export default function Page() {
  permanentRedirect("/safety-diary");
}
