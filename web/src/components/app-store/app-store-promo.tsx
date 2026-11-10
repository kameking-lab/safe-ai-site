import { appStoreLive } from "@/lib/app-store";
import { AppStorePromoClient } from "./app-store-promo-client";

/**
 * フッターの公式バッジ。iOS アプリ同梱ビルドではクライアント JS ごと出さない。
 * Capacitor 上での最終的な非表示判定はクライアント側（AppStorePromoClient）で行う。
 */
export function AppStorePromo({ className }: { className?: string }) {
  if (!appStoreLive()) return null;
  return <AppStorePromoClient className={className} />;
}
