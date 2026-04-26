"use client";

import { useState } from "react";
import { Check, Minus, Star } from "lucide-react";
import {
  PLAN_IDS,
  PLAN_LABELS,
  PLAN_MONTHLY_PRICE,
  PLAN_ANNUAL_MONTHLY,
  PLAN_IS_POPULAR,
  FEATURE_MATRIX,
  type PlanId,
  type FeatureValue,
} from "@/data/plan-features";
import { useTranslation } from "@/contexts/language-context";

type BillingCycle = "monthly" | "annual";

const PLAN_COLORS: Record<PlanId, { header: string; badge: string; border: string }> = {
  free: { header: "bg-slate-50", badge: "bg-slate-100 text-slate-700", border: "border-slate-200" },
  standard: { header: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-700", border: "border-emerald-200" },
  pro: { header: "bg-amber-50", badge: "bg-amber-100 text-amber-700", border: "border-amber-300" },
  business: { header: "bg-violet-50", badge: "bg-violet-100 text-violet-700", border: "border-violet-200" },
  custom: { header: "bg-blue-50", badge: "bg-blue-100 text-blue-700", border: "border-blue-200" },
};

function PriceDisplay({ planId, cycle, isEn }: { planId: PlanId; cycle: BillingCycle; isEn: boolean }) {
  const monthly = PLAN_MONTHLY_PRICE[planId];
  const annualMonthly = PLAN_ANNUAL_MONTHLY[planId];

  if (monthly === null) {
    return <span className="text-sm font-bold text-slate-700">{isEn ? "Custom" : "個別見積"}</span>;
  }
  if (monthly === 0) {
    return <span className="text-lg font-bold text-slate-800">¥0</span>;
  }

  const displayed = cycle === "annual" && annualMonthly !== null ? annualMonthly : monthly;

  return (
    <div className="flex flex-col items-center">
      <span className="text-lg font-bold text-slate-800">¥{displayed.toLocaleString()}</span>
      <span className="text-[10px] text-slate-500">{isEn ? "/mo" : "/月"}</span>
      {cycle === "annual" && (
        <span className="mt-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
          {isEn ? "annual" : "年払い"}
        </span>
      )}
    </div>
  );
}

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true) {
    return (
      <td className="px-3 py-2.5 text-center">
        <Check className="mx-auto h-4 w-4 text-emerald-500" aria-label="対応" />
      </td>
    );
  }
  if (value === false) {
    return (
      <td className="px-3 py-2.5 text-center">
        <Minus className="mx-auto h-3.5 w-3.5 text-slate-300" aria-label="非対応" />
      </td>
    );
  }
  return (
    <td className="px-3 py-2.5 text-center">
      <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 whitespace-nowrap">
        {value}
      </span>
    </td>
  );
}

export function PricingMatrix() {
  const { language } = useTranslation();
  const isEn = language === "en";
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <section className="mt-12">
      {/* Section heading */}
      <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <h2 className="text-base font-bold text-slate-800">
          {isEn ? "Plan Comparison" : "プラン機能比較"}
        </h2>

        {/* Billing toggle */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              cycle === "monthly"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {isEn ? "Monthly" : "月払い"}
          </button>
          <button
            type="button"
            onClick={() => setCycle("annual")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
              cycle === "annual"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {isEn ? "Annual" : "年払い"}
            <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] text-white">
              {isEn ? "-17%" : "17%オフ"}
            </span>
          </button>
        </div>
      </div>

      {/* Table wrapper — overflow-x for narrow screens */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          {/* Sticky header */}
          <thead>
            <tr>
              {/* Feature label column */}
              <th className="sticky left-0 top-0 z-20 min-w-[160px] bg-white px-4 py-3 text-left text-xs font-semibold text-slate-500">
                {isEn ? "Feature" : "機能"}
              </th>

              {PLAN_IDS.map((planId) => {
                const colors = PLAN_COLORS[planId];
                const isPopular = PLAN_IS_POPULAR[planId];
                return (
                  <th
                    key={planId}
                    className={`sticky top-0 z-10 min-w-[100px] px-3 py-3 text-center ${colors.header}`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {isPopular && (
                        <span className="flex items-center gap-0.5 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold text-white">
                          <Star className="h-2.5 w-2.5" />
                          {isEn ? "Popular" : "人気"}
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${colors.badge}`}>
                        {isEn ? PLAN_LABELS[planId].en : PLAN_LABELS[planId].ja}
                      </span>
                      <PriceDisplay planId={planId} cycle={cycle} isEn={isEn} />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {FEATURE_MATRIX.map((category, catIdx) => (
              <>
                {/* Category header row */}
                <tr key={`cat-${catIdx}`} className="bg-slate-50">
                  <td
                    colSpan={PLAN_IDS.length + 1}
                    className="sticky left-0 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500"
                  >
                    {isEn ? category.labelEn : category.labelJa}
                  </td>
                </tr>

                {/* Feature rows */}
                {category.features.map((feature, featIdx) => (
                  <tr
                    key={`feat-${catIdx}-${featIdx}`}
                    className="border-t border-slate-100 transition-colors hover:bg-slate-50/60"
                  >
                    <td className="sticky left-0 z-[1] bg-white px-4 py-2.5 text-xs text-slate-700 group-hover:bg-slate-50/60">
                      {isEn ? feature.labelEn : feature.labelJa}
                    </td>
                    {PLAN_IDS.map((planId) => (
                      <FeatureCell key={planId} value={feature.values[planId]} />
                    ))}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-center text-[11px] text-slate-400">
        {isEn
          ? "Annual billing: 17% off monthly price, charged in full at the start of the period."
          : "年払いは月額比17%オフ・期首一括払い。表示価格は税込。"}
      </p>
    </section>
  );
}
