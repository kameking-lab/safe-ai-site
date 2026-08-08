"use client";

import { AlertTriangle } from "lucide-react";

/**
 * 既存の遅延importや古い参照が残っても商品データを描画しないための二重境界。
 * 公開ページ本体もこのコンポーネントを現在は読み込まない。
 */
export function EquipmentFinderClient() {
  return (
    <div
      className="rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm leading-7 text-amber-950"
      role="status"
    >
      <p className="flex items-center gap-2 font-bold">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        未検証の商品カタログは隔離されています
      </p>
      <p className="mt-1">
        一次資料を追跡できる商品レコードが整うまで、商品名、価格、規格適合、
        評価、購入リンクを表示しません。
      </p>
    </div>
  );
}
