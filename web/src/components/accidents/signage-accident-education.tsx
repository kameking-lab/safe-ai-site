"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
// C-1: 事故データセット（生約340KB）の静的 import を廃止。サイネージ表示後の
// dynamic import で取得する（本コンポーネントは /signage 系で client 表示専用。
// 静的同梱だと /signage へ Link する全ページのプリフェッチにも同データが乗る）。
import { pickEducationAccidents, type EducationCase } from "@/lib/accidents/education-pick";

/**
 * P2-2 朝礼サイネージ「本日の安全啓発（過去の労災）」セクション。
 * 過去の労働災害事例を重大度優先＋多様性で日替わりローテーション表示（実データのみ）。
 * 朝礼の安全意識啓発に活用。見出しは6言語、事例本文は日本語。
 */
const HEADING: Record<string, string> = {
  ja: "本日の安全啓発（過去の労災事例）",
  en: "Today's Safety Reminder (past accidents)",
  vi: "Nhắc nhở an toàn hôm nay (tai nạn trước đây)",
  zh: "今日安全提醒（过去劳灾案例）",
  tl: "Paalala sa Kaligtasan Ngayon (nakaraang aksidente)",
  id: "Pengingat Keselamatan Hari Ini (kecelakaan lampau)",
};
const PREVENT: Record<string, string> = {
  ja: "対策", en: "Control", vi: "Biện pháp", zh: "对策", tl: "Hakbang", id: "Tindakan",
};

export function SignageAccidentEducation({ lang = "ja", category }: { lang?: string; category?: string }) {
  const [cases, setCases] = useState<EducationCase[]>([]);
  useEffect(() => {
    let active = true;
    void import("@/data/mock/accident-cases").then((mod) => {
      if (!active) return;
      const now = new Date();
      const seed = now.getFullYear() * 366 + now.getMonth() * 31 + now.getDate(); // 日替わり
      setCases(pickEducationAccidents(mod.accidentCasesMock, { category, count: 3, seed }));
    });
    return () => {
      active = false;
    };
  }, [category]);

  if (cases.length === 0) return null;
  const heading = HEADING[lang] ?? HEADING.ja;
  const prevent = PREVENT[lang] ?? PREVENT.ja;

  return (
    <section className="mt-6 rounded-3xl bg-white/95 p-6 text-slate-900 shadow-2xl sm:p-8 print:shadow-none print:border print:border-slate-300">
      <p className="text-lg font-bold text-rose-700 sm:text-xl">
        <AlertTriangle className="mr-1.5 inline h-5 w-5 align-[-3px]" aria-hidden="true" />
        {heading}
      </p>
      <ul className="mt-3 space-y-3">
        {cases.map((c) => (
          <li key={c.id} className="rounded-2xl border-l-8 border-rose-400 bg-rose-50 p-4">
            <p className="text-xl font-bold leading-snug sm:text-2xl">
              {c.title}
              <span className="ml-2 align-middle text-sm font-normal text-slate-500">
                [{c.workCategory}／{c.type}／{c.severity}]
              </span>
            </p>
            {c.preventionPoint && (
              <p className="mt-1 text-base text-emerald-800 sm:text-lg">→ {prevent}: {c.preventionPoint}</p>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-400">※ 過去の労働災害事例（参考）。出典は事故DB各事例を参照。</p>
    </section>
  );
}
