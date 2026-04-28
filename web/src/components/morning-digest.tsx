"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { mhlwNotices, type MhlwNotice } from "@/data/mhlw-notices";
import { realLawRevisions } from "@/data/mock/real-law-revisions";
import { realLawRevisionsExtra } from "@/data/mock/real-law-revisions-extra";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import type { AccidentCase, LawRevisionCore } from "@/lib/types/domain";

type IndustryKey = "all" | "construction" | "manufacturing" | "healthcare" | "transport" | "it";

const INDUSTRY_TABS: { key: IndustryKey; label: string; keywords: string[] }[] = [
  { key: "all", label: "すべて", keywords: [] },
  { key: "construction", label: "建設", keywords: ["建設", "足場", "高所", "墜落", "クレーン"] },
  { key: "manufacturing", label: "製造", keywords: ["製造", "機械", "プレス", "化学物質", "粉じん"] },
  { key: "healthcare", label: "医療福祉", keywords: ["医療", "介護", "福祉", "感染", "腰痛"] },
  { key: "transport", label: "運輸", keywords: ["運輸", "トラック", "陸上貨物", "倉庫", "荷役"] },
  { key: "it", label: "IT", keywords: ["IT", "ソフトウェア", "テレワーク", "VDT", "情報通信"] },
];

function bindingBadge(level: MhlwNotice["bindingLevel"]) {
  switch (level) {
    case "binding":
      return { label: "拘束力あり", color: "bg-rose-100 text-rose-800" };
    case "indirect":
      return { label: "間接拘束", color: "bg-amber-100 text-amber-800" };
    default:
      return { label: "参考", color: "bg-slate-100 text-slate-700" };
  }
}

function matchesIndustry(text: string, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  return keywords.some((kw) => text.includes(kw));
}

function dateSeedIndex(length: number): number {
  if (length === 0) return 0;
  // 日替わりインデックス。SSR/CSR で値が一致するよう UTC 日付ベースで算出。
  const d = new Date();
  const seed = d.getUTCFullYear() * 366 + d.getUTCMonth() * 31 + d.getUTCDate();
  return seed % length;
}

function within30Days(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= -3 && diff <= 30;
}

export function MorningDigest() {
  const [industry, setIndustry] = useState<IndustryKey>("all");

  const tab = INDUSTRY_TABS.find((t) => t.key === industry) ?? INDUSTRY_TABS[0];

  const top3Notices = useMemo<MhlwNotice[]>(() => {
    const filtered = mhlwNotices
      .filter((n) => matchesIndustry(`${n.title} ${n.category}`, tab.keywords))
      .filter((n) => Boolean(n.issuedDate));
    filtered.sort((a, b) => (b.issuedDate ?? "").localeCompare(a.issuedDate ?? ""));
    return filtered.slice(0, 3);
  }, [tab]);

  const featuredAccident = useMemo<AccidentCase | null>(() => {
    const all = getAccidentCasesDataset().filter((c) =>
      matchesIndustry(`${c.title} ${c.workCategory} ${c.summary}`, tab.keywords)
    );
    if (all.length === 0) return null;
    return all[dateSeedIndex(all.length)] ?? all[0] ?? null;
  }, [tab]);

  const calendar30 = useMemo<LawRevisionCore[]>(() => {
    const merged: LawRevisionCore[] = [...realLawRevisions, ...realLawRevisionsExtra];
    return merged
      .filter((r) => within30Days(r.enforcement_date || r.publishedAt))
      .filter((r) => matchesIndustry(`${r.title} ${r.category} ${r.summary}`, tab.keywords))
      .sort((a, b) =>
        (a.enforcement_date || a.publishedAt).localeCompare(b.enforcement_date || b.publishedAt)
      )
      .slice(0, 5);
  }, [tab]);

  return (
    <section
      aria-label="今朝のダイジェスト"
      className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
            朝のダイジェスト
          </p>
          <h2 className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
            今朝、現場で押さえるべき安全情報
          </h2>
        </div>
        <Link
          href="/feedback"
          className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
        >
          改善提案を送る →
        </Link>
      </header>

      {/* 業種タブ */}
      <div className="mt-3 flex flex-wrap gap-1" role="tablist" aria-label="業種フィルタ">
        {INDUSTRY_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={industry === t.key}
            onClick={() => setIndustry(t.key)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              industry === t.key
                ? "border-emerald-500 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 通達アラート */}
        <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
          <p className="text-xs font-bold text-rose-800">📣 通達アラート（最新3件）</p>
          <ul className="mt-2 space-y-2">
            {top3Notices.length === 0 ? (
              <li className="text-xs text-slate-500">該当する通達はありません。</li>
            ) : (
              top3Notices.map((n) => {
                const badge = bindingBadge(n.bindingLevel);
                return (
                  <li key={n.id} className="rounded-md bg-white p-2 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                      {n.noticeNumber ? (
                        <span className="text-[10px] text-slate-500">{n.noticeNumber}</span>
                      ) : null}
                    </div>
                    <Link
                      href={`/circulars/${n.id}`}
                      className="mt-1 line-clamp-2 block text-xs font-semibold text-slate-900 hover:text-emerald-700"
                    >
                      {n.title}
                    </Link>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {n.issuedDateRaw ?? n.issuedDate}
                    </p>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        {/* 事故事例ピックアップ */}
        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
          <p className="text-xs font-bold text-amber-800">⚠️ 今日の事故事例</p>
          {featuredAccident ? (
            <div className="mt-2 rounded-md bg-white p-2 shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                  {featuredAccident.workCategory}
                </span>
                <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                  {featuredAccident.severity}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-900">{featuredAccident.title}</p>
              <p className="mt-1 line-clamp-3 text-[11px] leading-5 text-slate-600">
                {featuredAccident.summary}
              </p>
              {featuredAccident.preventionPoints?.[0] ? (
                <p className="mt-1.5 text-[11px] text-emerald-800">
                  ✅ {featuredAccident.preventionPoints[0]}
                </p>
              ) : null}
              <Link
                href="/accidents"
                className="mt-2 inline-block text-[11px] font-bold text-emerald-700 hover:underline"
              >
                事故DBで類似事例を見る →
              </Link>
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-500">該当事例はありません。</p>
          )}
        </div>

        {/* 法改正カレンダー */}
        <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3">
          <p className="text-xs font-bold text-sky-800">📅 30日以内の法改正</p>
          <ul className="mt-2 space-y-2">
            {calendar30.length === 0 ? (
              <li className="text-xs text-slate-500">直近30日に施行予定はありません。</li>
            ) : (
              calendar30.map((r) => (
                <li key={r.id} className="rounded-md bg-white p-2 shadow-sm">
                  <p className="text-[10px] text-slate-500">
                    {r.enforcement_date || r.publishedAt} 施行
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-slate-900">
                    {r.title}
                  </p>
                </li>
              ))
            )}
          </ul>
          <Link
            href="/laws"
            className="mt-2 inline-block text-[11px] font-bold text-emerald-700 hover:underline"
          >
            法改正一覧を開く →
          </Link>
        </div>
      </div>
    </section>
  );
}
