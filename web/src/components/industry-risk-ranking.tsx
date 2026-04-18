"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { Building2, Hash, ChevronRight } from "lucide-react";
import ranking from "@/data/aggregates-mhlw/industry-ranking.json";
import profiles from "@/data/aggregates-mhlw/industry-profiles.json";
import meta from "@/data/aggregates-mhlw/meta.json";

type Ranking = { name: string; count: number };
type Profile = {
  total: number;
  topTypes: { name: string; count: number }[];
  ageProfile: Record<string, number>;
};

const rankingData = ranking as Ranking[];
const profilesData = profiles as Record<string, Profile>;

const AGE_LABELS: Record<string, string> = {
  "-19": "〜19歳",
  "20-29": "20〜29歳",
  "30-39": "30〜39歳",
  "40-49": "40〜49歳",
  "50-59": "50〜59歳",
  "60-69": "60〜69歳",
  "70+": "70歳〜",
  unknown: "不明",
};

const AGE_ORDER = ["-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70+", "unknown"];

const RANKING_COLORS = [
  "#dc2626", "#ea580c", "#d97706", "#ca8a04", "#65a30d",
  "#16a34a", "#0d9488", "#0891b2", "#0284c7", "#2563eb",
  "#4f46e5", "#7c3aed", "#9333ea", "#c026d3", "#db2777",
  "#e11d48", "#f43f5e", "#f59e0b", "#84cc16", "#10b981",
];

export function IndustryRiskRanking() {
  const top20 = useMemo(() => rankingData.slice(0, 20), []);
  const totalAcrossAll = useMemo(
    () => rankingData.reduce((s, r) => s + r.count, 0),
    []
  );
  const [selected, setSelected] = useState<string>(top20[0]?.name ?? "");

  const selectedProfile = profilesData[selected] as Profile | undefined;
  const ageData = useMemo(() => {
    if (!selectedProfile) return [];
    return AGE_ORDER.filter((k) => selectedProfile.ageProfile[k] !== undefined).map((k) => ({
      name: AGE_LABELS[k] ?? k,
      value: selectedProfile.ageProfile[k] ?? 0,
    }));
  }, [selectedProfile]);

  const selectedShare = selectedProfile
    ? ((selectedProfile.total / totalAcrossAll) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-rose-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white">
            <Building2 className="h-4 w-4" />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-800">
              業種別 危険度ランキング N={meta.accidents.total.toLocaleString()}件
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              休業 4 日以上の労働災害 16 年分（2006〜2021）を業種別に集計。各業種の上位事故型と年齢分布から、業種ごとのリスクプロファイルを把握できます。
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-800">業種別 件数ランキング（TOP 20）</h3>
        <ResponsiveContainer width="100%" height={460}>
          <BarChart data={top20} layout="vertical" margin={{ left: 16, right: 32 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v) => [`${Number(v).toLocaleString()}件`, "件数"]}
              labelStyle={{ fontWeight: 600 }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {top20.map((d, i) => (
                <Cell
                  key={d.name}
                  fill={RANKING_COLORS[i % RANKING_COLORS.length]}
                  cursor="pointer"
                  onClick={() => setSelected(d.name)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-2 text-[11px] text-slate-500">
          バーをクリック、または下のリストから業種を選ぶと、その業種の事故型 TOP3 と年齢プロファイルが表示されます。
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
          <Hash className="h-4 w-4 text-amber-600" />
          あなたの業種の統計を見る
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {top20.map((r, i) => (
            <button
              key={r.name}
              type="button"
              onClick={() => setSelected(r.name)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                selected === r.name
                  ? "border-amber-400 bg-amber-100 text-amber-900"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                {i + 1}
              </span>
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {selectedProfile && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-800">
                {selected} の事故型 TOP 5
              </h3>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                {selectedProfile.total.toLocaleString()}件 / 全体の {selectedShare}%
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {selectedProfile.topTypes.map((t, i) => {
                const pct = ((t.count / selectedProfile.total) * 100).toFixed(1);
                return (
                  <li key={t.name} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-600">
                          <span className="font-mono">{t.count.toLocaleString()}件</span>
                          <span className="text-slate-400">/</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full bg-amber-500"
                            style={{ width: `${Math.min(100, parseFloat(pct))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800">{selected} の年齢分布</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ageData} margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}件`, "件数"]} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
              <ChevronRight className="h-3 w-3 text-slate-400" />
              年齢ピーク帯がその業種の主要被災層です。配置・教育の優先対象として参考にしてください。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
