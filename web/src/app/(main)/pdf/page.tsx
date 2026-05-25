import { permanentRedirect } from "next/navigation";

// Phase 7: KY用紙のPDF出力は /ky/paper の「印刷 / PDF」に一本化したため、
// 旧 /pdf は /ky/paper へ恒久リダイレクトする。
export default function PdfPage() {
  permanentRedirect("/ky/paper");
}
