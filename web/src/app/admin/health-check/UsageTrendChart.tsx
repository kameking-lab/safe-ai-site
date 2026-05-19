"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HOBBY_LIMITS, type QuotaKey, type UsageTrendPoint } from "@/lib/vercel-monitoring";

const SERIES_COLORS: Record<QuotaKey, string> = {
  bandwidth: "#0ea5e9",
  functionInvocations: "#a855f7",
  buildExecutionMinutes: "#f97316",
  edgeRequests: "#ef4444",
  isrWrites: "#10b981",
  imageOptimization: "#facc15",
  fastOriginTransfer: "#6366f1",
};

interface Props {
  trend: UsageTrendPoint[];
  /** Show usage as percentage of Hobby limit so all metrics share one Y axis. */
  series: QuotaKey[];
}

export function UsageTrendChart({ trend, series }: Props) {
  if (trend.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        トレンドデータが不足しているため描画できません。
      </p>
    );
  }

  const data = trend.map((point) => {
    const row: Record<string, string | number> = { date: point.date.slice(5) };
    for (const key of series) {
      const value = point.values[key] ?? 0;
      const limit = HOBBY_LIMITS[key].hobbyLimit;
      if (!limit) continue;
      const dailyAllowance = limit / 30;
      row[key] = dailyAllowance > 0 ? (value / dailyAllowance) * 100 : 0;
    }
    return row;
  });

  return (
    <div className="h-[320px] w-full sm:h-[360px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" fontSize={11} tick={{ fill: "#475569" }} />
          <YAxis
            fontSize={11}
            tick={{ fill: "#475569" }}
            label={{
              value: "日次%（日割上限基準）",
              angle: -90,
              position: "insideLeft",
              fontSize: 11,
              fill: "#64748b",
            }}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
            formatter={(value, name) => {
              const key = name as QuotaKey;
              const label = HOBBY_LIMITS[key]?.label ?? String(name);
              const v = typeof value === "number" ? value : Number(value ?? 0);
              return [`${v.toFixed(1)}%`, label];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(name) => HOBBY_LIMITS[name as QuotaKey]?.label ?? String(name)}
          />
          {series.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={SERIES_COLORS[key]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
