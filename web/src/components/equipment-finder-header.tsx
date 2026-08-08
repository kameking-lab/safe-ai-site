"use client";

import { useLanguage } from "@/contexts/language-context";
import Image from "next/image";
import { Mascot } from "@/components/mascot";

export function EquipmentFinderHeader() {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <header className="mb-5">
      <div className="flex items-start justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl">
          <Image
            src="/icons/icon-ppe.webp"
            alt=""
            width={28}
            height={28}
            aria-hidden
            style={{ width: 28, height: 28 }}
          />
          {isEn ? "PPE catalog status" : "保護具カタログの公開状態"}
        </h1>
        <Mascot variant="ppe-check" size="md" alt="" className="shrink-0" />
      </div>
      <p className="mt-2 text-sm text-slate-600">
        {isEn
          ? "Product-level search is unavailable while primary-source verification is incomplete."
          : "商品名・メーカー・規格適合・価格等の一次資料確認が完了するまで、商品単位の検索と推薦を停止しています。"}
      </p>
      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
        <strong>{isEn ? "Publication boundary:" : "公開境界:"}</strong>{" "}
        {isEn
          ? "Unverified products, ratings, compliance claims, prices, and purchase links are not displayed."
          : "未検証の商品、評価、規格適合表示、価格、購入リンクは表示しません。"}
      </div>
    </header>
  );
}
