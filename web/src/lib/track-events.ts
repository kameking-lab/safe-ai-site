// 解析イベント送信（GA4 / gtag）。GA_MEASUREMENT_ID 未設定時は no-op。
//
// 使い方（クライアントコンポーネント）:
//   import { trackAffiliateClick } from "@/lib/track-events";
//   <a onClick={() => trackAffiliateClick({ productId, productName, network: "amazon", url, page: "/equipment-finder" })}>...</a>

declare global {
  interface Window {
    gtag?: (command: string, target: string, params?: Record<string, unknown>) => void;
  }
}

const GA_ID =
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID : undefined;

export type AffiliateNetwork = "amazon" | "rakuten" | "moshimo" | "other";

/** 任意のカスタムイベントを送信。GA未読み込み時は黙ってスキップ。 */
export function trackEvent(action: string, params?: Record<string, unknown>): void {
  if (!GA_ID) return;
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  window.gtag("event", action, params);
}

/** アフィリエイトリンククリックを GA4 に送信。GA未読み込み時は no-op。 */
export function trackAffiliateClick(input: {
  productId: string;
  productName: string;
  network: AffiliateNetwork;
  url: string;
  /** クリック時のページパス（usePathname() などから） */
  page?: string;
}): void {
  trackEvent("affiliate_click", {
    product_id: input.productId,
    product_name: input.productName,
    network: input.network,
    link_url: input.url,
    page_path: input.page ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
    // GA4 推奨パラメータ（電子商取引）
    items: [
      {
        item_id: input.productId,
        item_name: input.productName,
        item_brand: input.network,
      },
    ],
  });
}
