"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

type Translatable = string | { ja: string; en: string };

interface ContextualPpePicksProps {
  context: string;
  fallbackCategoryIds?: string[];
  limit?: number;
  heading?: Translatable;
  description?: Translatable;
}

/**
 * 未検証SKUを文脈語だけで推薦していた旧関連表示は停止した。
 * 作業条件を確定し、一次資料を確認するカテゴリ入口だけを案内する。
 */
export function ContextualPpePicks({
  context,
  fallbackCategoryIds,
  limit,
  heading,
  description,
}: ContextualPpePicksProps) {
  const { language } = useLanguage();
  const isEn = language === "en";
  void context;
  void fallbackCategoryIds;
  void limit;
  void heading;
  void description;

  return (
    <section
      className="mt-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5"
      aria-label={
        isEn
          ? "Check conditions before choosing PPE"
          : "保護具を選ぶ前の確認"
      }
    >
      <div className="flex items-start gap-3">
        <ShieldAlert
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-800"
          aria-hidden="true"
        />
        <div>
          <h3 className="font-bold text-amber-950">
            {isEn
              ? "Do not choose PPE from a related-item recommendation"
              : "関連表示だけで保護具を選定しないでください"}
          </h3>
          <p className="mt-1 text-xs leading-6 text-amber-950">
            {isEn
              ? "The previous unverified product recommendations are unavailable. Confirm the hazard, task conditions, applicable rules, product label, fit, and compatibility first."
              : "未検証の商品候補表示は停止しました。危険源、作業条件、適用法令、製品ラベル、装着者への適合、他装備との干渉を先に確認してください。"}
          </p>
          <Link
            href="/goods"
            className="mt-3 inline-flex min-h-12 items-center justify-center rounded-lg border border-amber-500 bg-white px-4 py-2 text-sm font-bold text-amber-950 hover:bg-amber-100"
          >
            {isEn
              ? "Open the pre-purchase checklist"
              : "購入前確認とカテゴリ検索を開く"}
          </Link>
        </div>
      </div>
    </section>
  );
}
