"use client";

import Link from "next/link";
import { MessageSquarePlus, Users, ChevronRight } from "lucide-react";
import { COMMUNITY_CASES_SEED } from "@/data/mock/community-cases";
import { UGC_CATEGORY_LABELS, type UgcCategory } from "@/lib/ugc-types";

const CATEGORY_BADGE: Record<UgcCategory, string> = {
  hiyari: "bg-rose-50 text-rose-700 border-rose-200",
  question: "bg-sky-50 text-sky-700 border-sky-200",
  tips: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

/**
 * トップページに表示する「現場の声」セクション。
 * 直近3件を表示し、投稿CTAを併設。
 */
export function CommunityVoiceSection() {
  const latest = COMMUNITY_CASES_SEED.filter((c) => c.status === "approved")
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  if (latest.length === 0) return null;

  return (
    <section
      id="section-community-voice"
      aria-labelledby="community-voice-title"
      className="px-4 pt-4 pb-2 lg:px-8"
    >
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            <h2
              id="community-voice-title"
              className="text-base font-bold text-slate-900 sm:text-lg"
            >
              現場の声（UGC）
            </h2>
          </div>
          <Link
            href="/community-cases"
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-700 hover:underline"
          >
            一覧 <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          全国の現場担当者から集まったヒヤリハット・質問・Tips。労働安全コンサルタント監修コメント付き。
        </p>

        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {latest.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm"
            >
              <Link href={`/community-cases/${c.id}`} className="block">
                <span
                  className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${CATEGORY_BADGE[c.category]}`}
                >
                  #{UGC_CATEGORY_LABELS[c.category]}
                </span>
                <p className="mt-2 text-sm font-bold leading-snug text-slate-900 line-clamp-2">
                  {c.title}
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-600">{c.body}</p>
                <p className="mt-2 text-[10px] text-slate-400">{c.authorAlias}</p>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            あなたの現場の小さな気付きが、誰かの命を守るかもしれません。
          </p>
          <Link
            href="/community-cases/submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
            事例を共有する
          </Link>
        </div>
      </div>
    </section>
  );
}
