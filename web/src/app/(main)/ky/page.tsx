import { permanentRedirect } from "next/navigation";

// Phase 7: KY入力を /ky/paper（用紙ファースト）に一本化。
// 旧 /ky は恒久リダイレクト。SEO・被リンクは /ky/paper に集約する。
export default function KyPage() {
  permanentRedirect("/ky/paper");
}
