"use client";

import { useEffect, useState } from "react";
import {
  COMPANY_SIZES,
  INDUSTRY_LABELS,
  PROFILE_INDUSTRIES,
  SIZE_LABELS,
  loadProfile,
  saveProfile,
  type CompanyProfile,
  type CompanySize,
  type ProfileIndustry,
} from "@/lib/company-profile";

function csvToArray(s: string): string[] {
  return s
    .split(/[,、\n]/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function CompanyProfileForm({ onSaved }: { onSaved?: (p: CompanyProfile) => void }) {
  const [profile, setProfile] = useState<CompanyProfile>(() => ({
    companyName: "",
    industry: "construction",
    size: "10-50",
    chemicals: [],
    machines: [],
    sites: [],
    workKeywords: [],
    wizardCompleted: false,
    updatedAt: new Date().toISOString(),
  }));
  const [chemicalsInput, setChemicalsInput] = useState("");
  const [machinesInput, setMachinesInput] = useState("");
  const [sitesInput, setSitesInput] = useState("");
  const [workInput, setWorkInput] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const p = loadProfile();
    // localStorage はクライアント専用のため useEffect で読み込む必要がある
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(p);
     
    setChemicalsInput(p.chemicals.join("、"));
     
    setMachinesInput(p.machines.join("、"));
     
    setSitesInput(p.sites.join("、"));
     
    setWorkInput(p.workKeywords.join("、"));
  }, []);

  const handleSave = () => {
    const next: CompanyProfile = {
      ...profile,
      chemicals: csvToArray(chemicalsInput),
      machines: csvToArray(machinesInput),
      sites: csvToArray(sitesInput),
      workKeywords: csvToArray(workInput),
      wizardCompleted: true,
    };
    saveProfile(next);
    setProfile(next);
    setSavedAt(new Date().toLocaleTimeString("ja-JP"));
    onSaved?.(next);
  };

  return (
    <div className="space-y-4">
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-slate-700">会社名（任意）</span>
        <input
          type="text"
          value={profile.companyName}
          onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="例: 〇〇建設株式会社"
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-700">業種</span>
          <select
            value={profile.industry}
            onChange={(e) =>
              setProfile({ ...profile, industry: e.target.value as ProfileIndustry })
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {PROFILE_INDUSTRIES.map((id) => (
              <option key={id} value={id}>
                {INDUSTRY_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-700">規模</span>
          <select
            value={profile.size}
            onChange={(e) => setProfile({ ...profile, size: e.target.value as CompanySize })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {COMPANY_SIZES.map((s) => (
              <option key={s} value={s}>
                {SIZE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-slate-700">取扱化学物質（カンマ・読点・改行区切り）</span>
        <textarea
          value={chemicalsInput}
          onChange={(e) => setChemicalsInput(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="例: トルエン、メタノール、塩酸"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-slate-700">主要機械（カンマ・読点・改行区切り）</span>
        <textarea
          value={machinesInput}
          onChange={(e) => setMachinesInput(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="例: バックホウ、クレーン、フォークリフト、プレス機"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-slate-700">主要現場・部署</span>
        <textarea
          value={sitesInput}
          onChange={(e) => setSitesInput(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="例: 〇〇現場、〇〇工場"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-slate-700">主要作業キーワード（マッチング精度向上用）</span>
        <textarea
          value={workInput}
          onChange={(e) => setWorkInput(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="例: 高所作業、玉掛け、有機溶剤、塗装"
        />
      </label>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-500">
          {savedAt ? `保存しました（${savedAt}）` : "ローカル（端末内）に保存されます"}
        </span>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-emerald-700"
        >
          プロファイルを保存
        </button>
      </div>
    </div>
  );
}
