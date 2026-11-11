"use client";

import { useSyncExternalStore } from "react";
import { shouldShowAppStorePromo } from "@/lib/app-store";
import { AppStorePromoView } from "./app-store-promo-view";

const subscribe = () => () => {};
// サーバー描画とハイドレーション直後は「未判定 = 出さない」。アプリ内で一瞬でも見えないようにする。
const getServerSnapshot = () => false;
const getBrowserSnapshot = () => shouldShowAppStorePromo();

export function AppStorePromoClient({ className }: { className?: string }) {
  const browser = useSyncExternalStore(subscribe, getBrowserSnapshot, getServerSnapshot);
  return browser ? <AppStorePromoView className={className} /> : null;
}
