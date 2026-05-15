"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";

export function LmsWaitlistBanner() {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-emerald-50 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-violet-700">
          {isEn ? "LMS β — launching fall 2026" : "LMS β — 2026年秋公開予定"}
        </p>
        <h2 className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
          {isEn
            ? "Waitlist open (early invite, no setup fee)"
            : "ウェイティングリスト受付中（先行招待・初期費用無料）"}
        </h2>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          {isEn
            ? "Business-plan customers and β partners get priority. Screens on this page are mockups for reference only."
            : "ビジネスプラン契約者またはβ協力企業を優先招待します。本ページの画面は現状モックで、製品仕様の参考表示です。"}
        </p>
        <ul className="mt-2 grid gap-1 text-[11px] leading-5 text-slate-600 sm:grid-cols-2">
          <li>
            {isEn
              ? "✓ Unified multi-site / multi-dept progress"
              : "✓ 多拠点・部署の進捗一元管理"}
          </li>
          <li>{isEn ? "✓ Auto PDF completion certificates" : "✓ 修了証PDF自動発行"}</li>
          <li>
            {isEn
              ? "✓ SCORM / video import (planned)"
              : "✓ SCORM／動画教材取込（予定）"}
          </li>
          <li>
            {isEn
              ? "✓ OSH Act Article 60 / 59 compliant"
              : "✓ 安衛法60条・59条対応"}
          </li>
        </ul>
      </div>
      <Link
        href="/contact?category=lms-waitlist"
        className="mt-4 inline-flex shrink-0 items-center gap-1 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow hover:bg-violet-700 sm:mt-0"
      >
        {isEn ? "Join β waitlist →" : "β先行登録 →"}
      </Link>
    </div>
  );
}
