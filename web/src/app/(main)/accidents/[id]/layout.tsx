import type { ReactNode } from "react";

// The root layout reads a per-request CSP nonce. Keep quarantined detail URLs
// request-bound as well so Vercel never attempts a static not-found render that
// turns the dynamic nonce access into DYNAMIC_SERVER_USAGE.
export const dynamic = "force-dynamic";

/**
 * 個別ページ側で、一次資料と照合済みの公式事例だけを fail-open する。
 * それ以外の旧ローカル個票は page.tsx の provenance 境界で 404 のまま維持する。
 */
export default function AccidentDetailQuarantineLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
