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
    </header>
  );
}
