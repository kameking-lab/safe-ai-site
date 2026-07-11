"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HazardGlyphBadge } from "@/components/accidents/accident-type-pictogram";
import { pickHazardOfTheDay, type HazardDailyDigest } from "@/data/hazard-slides/daily-digest";

/**
 * 「本日の型」日替わりダイジェスト（朝礼サイネージ・サイネージ組込み用）。
 *
 * - 日付シードで型が毎日替わる（SignageAccidentEducation と同じ作法）。
 * - `?slide=<slug>` で当日の型を固定できる（教育テーマ週間などの運用向け）。
 * - SSR/静的プリレンダとの hydration 不一致を避けるため、日付依存の選択は
 *   マウント後 effect でのみ行う（O13 の教訓と同型）。
 */
export function HazardOfTheDay({ variant = "card" }: { variant?: "card" | "signage" }) {
  const [digest, setDigest] = useState<HazardDailyDigest | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // 日付・URL依存の選択はSSR/静的HTMLに焼き込めない（O13のhydration mismatch教訓）ため
    // マウント後のクライアント専用初期化として意図的にここで行う。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDigest(pickHazardOfTheDay(new Date(), params.get("slide")));
  }, []);

  if (!digest) {
    // 高さだけ確保（CLS抑止）。日付確定後に内容が入る。
    return <section aria-label="本日の型" className="min-h-[120px] rounded-3xl bg-white/60" />;
  }

  if (variant === "signage") {
    return (
      <section
        aria-label="本日の型"
        className="rounded-3xl bg-white/95 p-4 text-slate-900 shadow-2xl sm:p-6 print:border print:border-slate-300 print:shadow-none"
      >
        <p className="text-[clamp(0.9rem,1.4vw,1.5rem)] font-bold text-amber-700">本日の型（災害の型別教育）</p>
        <div className="mt-2 flex items-center gap-3">
          <HazardGlyphBadge glyph={digest.glyph} label={digest.label} size="lg" />
          <p className="font-bold leading-tight text-[clamp(1.6rem,3.4vw,4rem)]">{digest.label}</p>
        </div>
        <ul className="mt-3 space-y-1.5">
          {digest.checkPoints.map((c) => (
            <li key={c} className="flex items-start gap-2 leading-snug text-[clamp(1rem,1.8vw,2rem)]">
              <span aria-hidden="true" className="mt-1 inline-block h-3 w-3 shrink-0 rounded-sm border-2 border-emerald-600" />
              {c}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[clamp(0.85rem,1.2vw,1.3rem)] text-slate-500 print:hidden">
          問いかけ: {digest.quizQuestion}
        </p>
      </section>
    );
  }

  return (
    <section aria-label="本日の型" className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
      <div className="flex items-center gap-2">
        <HazardGlyphBadge glyph={digest.glyph} label={digest.label} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-amber-700">本日の型</p>
          <p className="truncate text-sm font-bold text-slate-900">{digest.label}</p>
        </div>
        <Link
          href={digest.href}
          className="inline-flex min-h-[44px] items-center rounded-xl border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-800 hover:border-amber-500"
        >
          スライドを開く
        </Link>
      </div>
      <ul className="mt-2 space-y-1">
        {digest.checkPoints.slice(0, 2).map((c) => (
          <li key={c} className="flex items-start gap-1.5 text-xs leading-snug text-slate-700">
            <span aria-hidden="true" className="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-sm border-2 border-emerald-600" />
            {c}
          </li>
        ))}
      </ul>
    </section>
  );
}
