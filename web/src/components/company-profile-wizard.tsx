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

const SKIP_KEY = "company-profile-wizard-skipped-v1";

export function CompanyProfileWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    const p = loadProfile();
    if (p.wizardCompleted) return;
    if (typeof window !== "undefined" && window.localStorage.getItem(SKIP_KEY) === "1") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(p);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, []);

  if (!open || !profile) return null;

  const handleSkip = () => {
    try {
      window.localStorage.setItem(SKIP_KEY, "1");
    } catch {}
    setOpen(false);
  };

  const handleFinish = () => {
    saveProfile({ ...profile, wizardCompleted: true });
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-wizard-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 id="profile-wizard-title" className="text-base font-bold text-slate-900">
            自社プロファイルを設定（{step + 1}/3）
          </h2>
          <button
            type="button"
            onClick={handleSkip}
            className="rounded px-2 text-xs text-slate-500 hover:bg-slate-100"
          >
            スキップ
          </button>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          各機能の初期表示を最適化します。後から /profile でいつでも変更できます。
        </p>

        {step === 0 && (
          <div className="mt-4 space-y-3">
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
                onChange={(e) =>
                  setProfile({ ...profile, size: e.target.value as CompanySize })
                }
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
        )}

        {step === 1 && (
          <div className="mt-4 space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700">取扱化学物質（任意・後で追加可）</span>
              <textarea
                rows={2}
                value={profile.chemicals.join("、")}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    chemicals: e.target.value
                      .split(/[,、\n]/g)
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="例: トルエン、メタノール"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700">主要機械（任意）</span>
              <textarea
                rows={2}
                value={profile.machines.join("、")}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    machines: e.target.value
                      .split(/[,、\n]/g)
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="例: バックホウ、フォークリフト"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="mt-4 space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700">主要現場・部署（任意）</span>
              <textarea
                rows={2}
                value={profile.sites.join("、")}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    sites: e.target.value
                      .split(/[,、\n]/g)
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="例: 〇〇現場、〇〇工場"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
              入力した内容はこの端末（localStorage）に保存され、外部送信はされません。
            </p>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleSkip}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            あとで設定
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                戻る
              </button>
            )}
            {step < 2 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-emerald-700"
              >
                次へ
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-emerald-700"
              >
                完了
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
