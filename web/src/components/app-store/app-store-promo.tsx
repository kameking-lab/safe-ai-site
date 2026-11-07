import { appStoreLive } from "@/lib/app-store";
import { AppStorePromoClient } from "./app-store-promo-client";
import type { AppStorePromoVariant } from "./app-store-promo-view";

/**
 * 「App Storeでもどうぞ」の小さな案内。フラグ OFF・iOS アプリ同梱ビルドではクライアント JS ごと出さない。
 * Capacitor 上での最終的な非表示判定はクライアント側（AppStorePromoClient）で行う。
 */
export function AppStorePromo({ variant, className }: { variant: AppStorePromoVariant; className?: string }) {
  if (!appStoreLive()) return null;
  return <AppStorePromoClient variant={variant} className={className} />;
}
