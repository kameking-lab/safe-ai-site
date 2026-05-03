"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  loadProfile,
  getIndustryKeywords,
  INDUSTRY_LABELS,
  type CompanyProfile,
} from "@/lib/company-profile";
import { realLawRevisions } from "@/data/mock/real-law-revisions";
import { realLawRevisionsExtra } from "@/data/mock/real-law-revisions-extra";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import type { AccidentCase, LawRevisionCore } from "@/lib/types/domain";
import { loadEntries as loadDiaryEntries } from "@/lib/safety-diary/store";

function within30Days(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= -3 && diff <= 30;
}

function matchesAny(text: string, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  return keywords.some((kw) => text.includes(kw));
}

function buildMorningScript(args: {
  industry: string;
  topAccident: AccidentCase | null;
  topLaw: LawRevisionCore | null;
  weather: string | null;
}): string {
  const sections: string[] = [];
  sections.push(`おはようございます。本日の${args.industry}現場の安全朝礼を始めます。`);
  if (args.weather) {
    sections.push(`気象状況: ${args.weather}に注意してください。`);
  }
  if (args.topAccident) {
    sections.push(
      `直近の参考事故: ${args.topAccident.workCategory} 「${args.topAccident.title}」。${
        args.topAccident.preventionPoints?.[0] ?? ""
      }`
    );
  }
  if (args.topLaw) {
    sections.push(`30日以内の法改正: ${args.topLaw.title}（${args.topLaw.enforcement_date || args.topLaw.publishedAt}施行）。`);
  }
  sections.push("ヘルメット・保護具の着用、声かけ・指差呼称の徹底をお願いします。以上、本日もご安全に。");
  return sections.join("\n").slice(0, 240);
}

export function TodaySafetyDashboard() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [diaryToday, setDiaryToday] = useState(false);
  const [kyToday, setKyToday] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(loadProfile());
    const today = new Date().toISOString().slice(0, 10);
    try {
      const entries = loadDiaryEntries();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDiaryToday(entries.some((e) => e.required.date === today));
    } catch {}
    try {
      const ky = window.localStorage.getItem("ky-record");
      if (ky) {
        const parsed = JSON.parse(ky) as { workDateYear?: string; workDateMonth?: string; workDateDay?: string };
        const ymd = `${parsed.workDateYear ?? ""}-${(parsed.workDateMonth ?? "").padStart(2, "0")}-${(parsed.workDateDay ?? "").padStart(2, "0")}`;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setKyToday(ymd === today);
      }
    } catch {}

    const onChange = () => setProfile(loadProfile());
    window.addEventListener("company-profile-changed", onChange);
    return () => window.removeEventListener("company-profile-changed", onChange);
  }, []);

  const keywords = useMemo(
    () => (profile ? getIndustryKeywords(profile.industry) : []),
    [profile]
  );

  const top3Accidents = useMemo(() => {
    const all = getAccidentCasesDataset();
    if (!profile) return all.slice(0, 3);
    return all
      .filter((c) => matchesAny(`${c.title} ${c.workCategory} ${c.summary}`, keywords))
      .slice(0, 3);
  }, [profile, keywords]);

  const lawsIn30 = useMemo<LawRevisionCore[]>(() => {
    const merged = [...realLawRevisions, ...realLawRevisionsExtra];
    return merged
      .filter((r) => within30Days(r.enforcement_date || r.publishedAt))
      .filter((r) => matchesAny(`${r.title} ${r.category} ${r.summary}`, keywords))
      .sort((a, b) =>
        (a.enforcement_date || a.publishedAt).localeCompare(b.enforcement_date || b.publishedAt)
      )
      .slice(0, 3);
  }, [keywords]);

  const morningScript = useMemo(
    () =>
      buildMorningScript({
        industry: profile ? INDUSTRY_LABELS[profile.industry] : "現場",
        topAccident: top3Accidents[0] ?? null,
        topLaw: lawsIn30[0] ?? null,
        weather: null,
      }),
    [profile, top3Accidents, lawsIn30]
  );

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(morningScript);
      alert("朝礼スクリプトをコピーしました");
    } catch {
      alert("コピーできませんでした。テキストを選択してご利用ください。");
    }
  };

  const industryLabel = profile ? INDUSTRY_LABELS[profile.industry] : "全業種";

  return (
    <section
      aria-label="本日の安全衛生サマリ"
      className="rounded-2xl border border-sky-200 bg-gradient-to-br from-white to-sky-50/40 p-4 shadow-sm sm:p-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-sky-700">
            本日の安全衛生サマリ
          </p>
          <h2 className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
            業種「{industryLabel}」向けに今日確認したい情報
          </h2>
        </div>
        <Link
          href="/profile"
          className="rounded-full border border-sky-300 bg-white px-3 py-1 text-xs font-bold text-sky-800 hover:bg-sky-50"
        >
          自社設定 →
        </Link>
      </header>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-4">
        {/* 起票アラート */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <p className="text-xs font-bold text-amber-800">📝 本日の起票</p>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true">{kyToday ? "✅" : "⚠️"}</span>
              <span>KY用紙: {kyToday ? "起票済み" : "未作成"}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true">{diaryToday ? "✅" : "⚠️"}</span>
              <span>安全衛生日誌: {diaryToday ? "起票済み" : "未作成"}</span>
            </li>
          </ul>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Link
              href="/ky"
              className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
            >
              KY作成
            </Link>
            <Link
              href={`/safety-diary/new?fromYesterday=1`}
              className="rounded-md border border-emerald-300 bg-white px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50"
            >
              昨日コピーで起票
            </Link>
          </div>
        </div>

        {/* 直近事故Top3 */}
        <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
          <p className="text-xs font-bold text-rose-800">⚠️ 自社業種の直近事故Top3</p>
          <ul className="mt-2 space-y-1.5">
            {top3Accidents.length === 0 ? (
              <li className="text-xs text-slate-500">該当事例なし</li>
            ) : (
              top3Accidents.map((a) => (
                <li key={a.id} className="rounded-md bg-white p-1.5 text-[11px] shadow-sm">
                  <p className="font-semibold text-slate-900">{a.title}</p>
                  <p className="text-slate-500">{a.workCategory}</p>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* 法改正 */}
        <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3">
          <p className="text-xs font-bold text-sky-800">📅 30日以内の法改正</p>
          <ul className="mt-2 space-y-1.5">
            {lawsIn30.length === 0 ? (
              <li className="text-xs text-slate-500">該当する施行予定なし</li>
            ) : (
              lawsIn30.map((r) => (
                <li key={r.id} className="rounded-md bg-white p-1.5 text-[11px] shadow-sm">
                  <p className="text-[10px] text-slate-500">
                    {r.enforcement_date || r.publishedAt}
                  </p>
                  <p className="line-clamp-2 font-semibold text-slate-900">{r.title}</p>
                </li>
              ))
            )}
          </ul>
          <Link
            href="/laws"
            className="mt-1 inline-block text-[11px] font-bold text-emerald-700 hover:underline"
          >
            自社版法改正を見る →
          </Link>
        </div>

        {/* 朝礼スクリプト */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
          <p className="text-xs font-bold text-emerald-800">🗣️ 朝礼スクリプト（200字）</p>
          <p className="mt-2 whitespace-pre-line rounded-md bg-white p-2 text-[11px] leading-5 text-slate-700 shadow-sm">
            {morningScript}
          </p>
          <button
            type="button"
            onClick={handleCopyScript}
            className="mt-2 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
          >
            コピー
          </button>
        </div>
      </div>
    </section>
  );
}
