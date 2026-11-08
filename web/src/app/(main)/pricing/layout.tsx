import type { ReactNode } from "react";
import { permanentRedirect } from "next/navigation";
import { webProSalesReady } from "@/lib/pro-sales";

/**
 * 旧5プランの料金ページは隔離したまま。安全AI Pro（月額980円）の販売設定が
 * そろったときだけ /pricing 配下（料金・購入開始・条件・決済完了）を開く。
 */
export default function PricingLayout({ children }: { children: ReactNode }) {
  if (!webProSalesReady()) permanentRedirect("/services/automation");
  return <>{children}</>;
}
