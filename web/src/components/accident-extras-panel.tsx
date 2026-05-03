"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { searchMhlwSimilar, MHLW_DEATHS_TOTAL, type ScoredMhlwCase } from "@/lib/mhlw-similar-cases";
import { loadProfile, INDUSTRY_LABELS, type CompanyProfile } from "@/lib/company-profile";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";

const INDUSTRIES_FOR_PROFILE: Record<string, string[]> = {
  construction: ["建設", "足場", "高所", "型枠"],
  manufacturing: ["製造", "プレス", "機械", "溶接"],
  healthcare: ["医療", "介護"],
  transport: ["運輸", "トラック", "荷役"],
  it: ["情報", "サーバー"],
  forestry: ["林業", "伐木"],
  logistics: ["倉庫", "ピッキング"],
  other: [],
};

function buildProfileQuery(profile: CompanyProfile): string {
  const parts: string[] = [];
  parts.push(...(INDUSTRIES_FOR_PROFILE[profile.industry] ?? []));
  parts.push(...profile.machines.slice(0, 3));
  parts.push(...profile.chemicals.slice(0, 3));
  parts.push(...profile.workKeywords.slice(0, 3));
  return parts.filter(Boolean).join(" ");
}

function CrossTab() {
  const all = useMemo(() => getAccidentCasesDataset(), []);
  // 業種 × 事故型 のクロス集計
  const matrix = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    const types = new Set<string>();
    const cats = new Set<string>();
    for (const c of all) {
      cats.add(c.workCategory);
      const t = c.type ?? "未分類";
      types.add(t);
      const row = map.get(c.workCategory) ?? new Map();
      row.set(t, (row.get(t) ?? 0) + 1);
      map.set(c.workCategory, row);
    }
    return {
      categories: Array.from(cats).sort(),
      types: Array.from(types).sort(),
      counts: map,
    };
  }, [all]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900">業種 × 事故型 クロス集計（収録事例ベース）</h3>
      <p className="mt-1 text-[11px] text-slate-500">
        サイト収録の{all.length}件を業種と事故型の2軸で集計。クリックで該当条件のフィルタへ。
      </p>
      <div className="mt-3 overflow-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              <th className="border-b border-slate-200 bg-slate-50 px-2 py-1 text-left">業種＼事故型</th>
              {matrix.types.map((t) => (
                <th key={t} className="border-b border-slate-200 bg-slate-50 px-2 py-1 text-center">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.categories.map((cat) => (
              <tr key={cat}>
                <th className="border-b border-slate-100 px-2 py-1 text-left font-semibold text-slate-700">
                  {cat}
                </th>
                {matrix.types.map((t) => {
                  const n = matrix.counts.get(cat)?.get(t) ?? 0;
                  return (
                    <td
                      key={t}
                      className={`border-b border-slate-100 px-2 py-1 text-center ${
                        n > 0 ? "bg-amber-50/60 font-bold text-amber-800" : "text-slate-300"
                      }`}
                    >
                      {n || "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProfileRecommend({ profile }: { profile: CompanyProfile | null }) {
  const query = profile ? buildProfileQuery(profile) : "";
  const cases = useMemo(() => (query ? searchMhlwSimilar(query, 5) : []), [query]);

  if (!profile?.wizardCompleted) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
        <h3 className="text-sm font-bold text-emerald-900">📌 自社類似事故Top5（プロファイル連動）</h3>
        <p className="mt-1 text-[11px] text-emerald-800">
          自社プロファイルを設定するとTop5が表示されます。
        </p>
        <Link
          href="/profile"
          className="mt-2 inline-block rounded-full border border-emerald-400 bg-white px-3 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
        >
          /profile を開く →
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-rose-900">
          📌 自社類似事故 Top{cases.length}（プロファイル: {INDUSTRY_LABELS[profile.industry]}）
        </h3>
        <Link
          href="/profile"
          className="rounded-full border border-rose-300 bg-white px-3 py-1 text-[11px] font-bold text-rose-800 hover:bg-rose-100"
        >
          自社設定 →
        </Link>
      </div>
      <p className="mt-1 text-[11px] text-rose-800">
        厚労省 死亡災害DB {MHLW_DEATHS_TOTAL.toLocaleString()}件から、業種・主要機械・化学物質キーワードで重み付け検索した実例。
      </p>
      {cases.length === 0 ? (
        <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
          該当事例なし。プロファイルにより詳しい主要機械・化学物質を追加してください。
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {cases.map((c, i) => (
            <li key={c.id} className="rounded-lg border border-rose-100 bg-white p-3 text-xs shadow-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                {c.type && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                    {c.type}
                  </span>
                )}
                {c.industry && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                    {c.industry}
                  </span>
                )}
                <span className="text-[10px] text-slate-400">
                  {c.year}{c.month ? `-${String(c.month).padStart(2, "0")}` : ""}
                </span>
              </div>
              <p className="mt-1.5 text-slate-700 leading-relaxed">{c.description}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function AccidentExtrasPanel() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(loadProfile());
    const onChange = () => setProfile(loadProfile());
    window.addEventListener("company-profile-changed", onChange);
    return () => window.removeEventListener("company-profile-changed", onChange);
  }, []);

  return (
    <div className="space-y-4">
      <ProfileRecommend profile={profile} />
      <CrossTab />
    </div>
  );
}
