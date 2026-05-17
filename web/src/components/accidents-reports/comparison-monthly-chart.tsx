"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ComparisonMonthlyPoint } from "@/lib/accident-comparison";
import type { IndustrySlug } from "@/lib/industry-slugs";

/**
 * Tailwind-aligned chart colours. Keyed by industry slug so the same hue
 * follows an industry across every panel on the page (chart, KPI card,
 * matrix swatch, highlight chip).
 */
export const INDUSTRY_CHART_COLOR: Record<IndustrySlug, string> = {
  construction: "#d97706", // amber-600
  manufacturing: "#2563eb", // blue-600
  transport: "#059669", // emerald-600
  healthcare: "#e11d48", // rose-600
  service: "#7c3aed", // violet-600
};

export function ComparisonMonthlyChart({
  points,
  slugs,
  labels,
}: {
  points: ComparisonMonthlyPoint[];
  slugs: IndustrySlug[];
  labels: Record<IndustrySlug, string>;
}) {
  if (points.length === 0 || slugs.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        月次データが不足しているため業種比較を描画できません。
      </p>
    );
  }

  return (
    <div className="h-[280px] w-full sm:h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="monthLabel" fontSize={11} tick={{ fill: "#475569" }} />
          <YAxis allowDecimals={false} fontSize={11} tick={{ fill: "#475569" }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
            formatter={(value, name) => [`${Number(value ?? 0)}件`, String(name)]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {slugs.map((slug) => (
            <Line
              key={slug}
              type="monotone"
              dataKey={slug}
              name={labels[slug] ?? slug}
              stroke={INDUSTRY_CHART_COLOR[slug]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
