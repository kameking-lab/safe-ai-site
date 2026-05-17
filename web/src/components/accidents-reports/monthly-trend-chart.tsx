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
import type { MonthlyByYear } from "@/lib/accident-analysis";

const SERIES_COLORS = ["#0ea5e9", "#f97316", "#a855f7", "#10b981", "#ef4444"];

export function MonthlyTrendChart({
  rows,
  years,
}: {
  rows: MonthlyByYear[];
  years: number[];
}) {
  if (rows.length === 0 || years.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        年次データが不足しているため月次比較を描画できません。
      </p>
    );
  }

  return (
    <div className="h-[280px] w-full sm:h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="monthLabel" fontSize={11} tick={{ fill: "#475569" }} />
          <YAxis allowDecimals={false} fontSize={11} tick={{ fill: "#475569" }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
            formatter={(value) => `${Number(value ?? 0)}件`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {years.map((year, idx) => (
            <Line
              key={year}
              type="monotone"
              dataKey={String(year)}
              name={`${year}年`}
              stroke={SERIES_COLORS[idx % SERIES_COLORS.length]}
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
