import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquarePlus, Tag } from "lucide-react";
import { ogImageUrl } from "@/lib/og-url";
import { COMMUNITY_CASES_SEED } from "@/data/mock/community-cases";
import { UGC_CATEGORY_LABELS, UGC_INDUSTRY_OPTIONS } from "@/lib/ugc-types";
import { CommunityCasesClient } from "./CommunityCasesClient";

const TITLE = "現場の声・事例集（UGC）";
const DESCRIPTION =
  "全国の現場担当者から集まったヒヤリハット・質問・Tipsを匿名で共有。労働安全コンサルタントの監修コメント付き。";

export const metadata: Metadata = {
  title: `${TITLE}｜ANZEN AI`,
  description: DESCRIPTION,
  alternates: { canonical: "/community-cases" },
  openGraph: {
    title: `${TITLE}｜ANZEN AI`,
    description: DESCRIPTION,
    images: [{ url: ogImageUrl(TITLE, DESCRIPTION), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(TITLE, DESCRIPTION)],
  },
};

export default function CommunityCasesPage() {
  // 公開済みのみ初期表示
  const initial = COMMUNITY_CASES_SEED.filter((c) => c.status === "approved");

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <header className="mb-6">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
          <Tag className="h-3.5 w-3.5" />
          現場の声（UGC）
        </p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">{TITLE}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">{DESCRIPTION}</p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {Object.entries(UGC_CATEGORY_LABELS).map(([k, v]) => (
            <span
              key={k}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600"
            >
              #{v}
            </span>
          ))}
        </div>

        <div className="mt-5">
          <Link
            href="/community-cases/submit"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
            事例を共有する
          </Link>
        </div>
      </header>

      <CommunityCasesClient initial={initial} industries={UGC_INDUSTRY_OPTIONS} />
    </main>
  );
}
