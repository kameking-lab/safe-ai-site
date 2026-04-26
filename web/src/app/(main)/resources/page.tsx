import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Library } from "lucide-react";
import { ResourcesClient } from "@/components/resources-client";
import { mhlwNotices } from "@/data/mhlw-notices";
import { mhlwLeaflets } from "@/data/mhlw-leaflets";

const TITLE = "厚労省一次資料DB（通達・告示・指針・リーフレット）";
const DESCRIPTION =
  "厚生労働省・安全衛生情報センターが公開している労働安全衛生関係の通達・告示・指針・リーフレット計1,158件を分類・検索できる一次資料データベース。各エントリは原文ページへ直リンクで一次ソースを担保。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: `${TITLE}｜ANZEN AI`,
    description: DESCRIPTION,
  },
};

export default function ResourcesPage() {
  const counts = {
    notice: mhlwNotices.filter((n) => n.docType === "通達").length,
    kokuji: mhlwNotices.filter((n) => n.docType === "告示").length,
    shishin: mhlwNotices.filter((n) => n.docType === "指針").length,
    leaflet: mhlwLeaflets.length,
  };
  const total = counts.notice + counts.kokuji + counts.shishin + counts.leaflet;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-4">
        <Link
          href="/laws"
          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          法令ハブに戻る
        </Link>
      </div>

      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">
          <Library className="h-4 w-4" aria-hidden="true" />
          厚労省一次資料DB
        </div>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          通達・告示・指針・リーフレット {total.toLocaleString()}件
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700 sm:text-base">
          厚生労働省と中央労働災害防止協会（安全衛生情報センター）が公開する労働安全衛生関係の
          一次資料を網羅収集。各レコードは原文ページへの直リンクを含み、AI 生成・要約は一切行っていません。
          法的拘束力（告示・通達・参考）の区分も付しています。
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <Stat label="通達" value={counts.notice} color="bg-blue-50 text-blue-900 border-blue-200" />
          <Stat label="告示" value={counts.kokuji} color="bg-amber-50 text-amber-900 border-amber-200" />
          <Stat label="指針" value={counts.shishin} color="bg-emerald-50 text-emerald-900 border-emerald-200" />
          <Stat label="リーフレット" value={counts.leaflet} color="bg-rose-50 text-rose-900 border-rose-200" />
        </div>
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          ⚠️ 本ページの全エントリは一次ソース（厚労省／安全衛生情報センター）からの自動収集です。
          実務適用前に必ず原文を確認してください。
        </div>
      </header>

      <ResourcesClient notices={mhlwNotices} leaflets={mhlwLeaflets} />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`flex items-baseline justify-between rounded-lg border px-3 py-2 ${color}`}>
      <span className="font-semibold">{label}</span>
      <span className="font-mono text-lg font-bold">{value.toLocaleString()}</span>
    </div>
  );
}
