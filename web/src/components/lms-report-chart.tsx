"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

const BY_INDUSTRY = [
  { name: "建設業", 完了率: 68, 受講率: 82 },
  { name: "製造業", 完了率: 74, 受講率: 88 },
  { name: "医療福祉", 完了率: 81, 受講率: 91 },
  { name: "運輸", 完了率: 62, 受講率: 77 },
  { name: "小売", 完了率: 55, 受講率: 70 },
  { name: "食品", 完了率: 70, 受講率: 85 },
];

const BY_ATTRIBUTE = [
  { name: "一般", 完了率: 72 },
  { name: "女性", 完了率: 78 },
  { name: "高齢者", 完了率: 64 },
  { name: "外国人", 完了率: 58 },
  { name: "非正規", 完了率: 49 },
  { name: "若年", 完了率: 81 },
];

const MONTHLY_TREND = [
  { month: "10月", 修了者: 8 },
  { month: "11月", 修了者: 14 },
  { month: "12月", 修了者: 11 },
  { month: "1月", 修了者: 19 },
  { month: "2月", 修了者: 23 },
  { month: "3月", 修了者: 31 },
  { month: "4月", 修了者: 17 },
];

export default function LmsReportChart() {
  return (
    <div className="space-y-6">
      {/* 業種別完了率・受講率 */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-bold text-slate-800">業種別 完了率・受講率（%）</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={BY_INDUSTRY} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
            <Tooltip />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="完了率" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="受講率" fill="#60a5fa" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 属性別完了率 */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-bold text-slate-800">属性別 完了率（%）</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={BY_ATTRIBUTE} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={44} />
            <Tooltip />
            <Bar dataKey="完了率" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 月次修了者推移 */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-bold text-slate-800">月次 修了者数推移</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={MONTHLY_TREND} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="修了者" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
