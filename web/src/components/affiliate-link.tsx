"use client";

import type { ReactNode } from "react";
import { trackAffiliateClick, type AffiliateNetwork } from "@/lib/track-events";

/**
 * サーバーコンポーネントから使えるアフィリエイトリンクラッパー。
 * クリック時に GA4 へ affiliate_click イベントを送信する（GA未設定時は no-op）。
 */
export function AffiliateLink({
  href,
  productId,
  productName,
  network,
  page,
  className,
  children,
  ariaLabel,
}: {
  href: string;
  productId: string;
  productName: string;
  network: AffiliateNetwork;
  page?: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={className}
      aria-label={ariaLabel}
      onClick={() => {
        trackAffiliateClick({ productId, productName, network, url: href, page });
      }}
    >
      {children}
    </a>
  );
}
