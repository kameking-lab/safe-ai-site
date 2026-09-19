import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, ExternalLink } from "lucide-react";
import { OFFICIAL_ACCIDENT_SNAPSHOT as snapshot } from "@/data/accidents/official-current";

function Change({ value, rate }: { value: number; rate: number }) {
  const up = value > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${
        up ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
      }`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      前年同期比 {value > 0 ? "+" : ""}{value.toLocaleString("ja-JP")}人（{rate > 0 ? "+" : ""}{rate}%）
    </span>
  );
}

function Ranking({
  title,
  rows,
}: {
  title: string;
  rows: readonly { name: string; total: number }[];
}) {
  const max = Math.max(...rows.map((row) => row.total));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      <ol className="mt-3 space-y-3">
        {rows.map((row, index) => (
          <li key={row.name}>
            <div className="flex items-end justify-between gap-3 text-xs">
              <span className="font-bold text-slate-700">{index + 1}. {row.name}</span>
              <span className="font-black tabular-nums text-slate-950">{row.total.toLocaleString("ja-JP")}人</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400"
                style={{ width: `${Math.max(8, (row.total / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function OfficialAccidentFlash() {
  return (
    <section aria-labelledby="official-flash-title" className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 p-5 text-white sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-[.16em] text-rose-300">厚生労働省・全国速報</p>
            <h2 id="official-flash-title" className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              {snapshot.label}を、現場の重点確認へ
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">
              2026年1月1日〜7月31日に発生し、8月7日までに報告された全国累計です。
              「8月中の事故件数」ではありません。
            </p>
          </div>
          <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-black">
            一次資料確認 2026-09-19
          </span>
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
            <dt className="text-xs font-bold text-slate-300">死亡者数（速報・累計）</dt>
            <dd className="mt-1 text-4xl font-black tabular-nums">{snapshot.deaths.total.toLocaleString("ja-JP")}<span className="ml-1 text-lg">人</span></dd>
            <Change value={snapshot.deaths.change} rate={snapshot.deaths.changeRate} />
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
            <dt className="text-xs font-bold text-slate-300">死亡・休業4日以上の死傷者数（速報・累計）</dt>
            <dd className="mt-1 text-4xl font-black tabular-nums">{snapshot.injuries.total.toLocaleString("ja-JP")}<span className="ml-1 text-lg">人</span></dd>
            <Change value={snapshot.injuries.change} rate={snapshot.injuries.changeRate} />
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <a href={snapshot.sourcePdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-slate-950">
            8月速報PDFで検算 <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
          <a href={snapshot.sourcePageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/40 px-4 text-sm font-black text-white">
            厚労省の最新月を確認 <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="grid gap-3 p-4 lg:grid-cols-3 sm:p-5">
        <Ranking title="死亡者数が多い業種" rows={snapshot.fatalIndustries} />
        <Ranking title="死亡災害が多い事故の型" rows={snapshot.fatalAccidentTypes} />
        <Ranking title="死傷災害が多い事故の型" rows={snapshot.injuryAccidentTypes} />
      </div>

      <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-5">
        <p className="text-sm font-black text-slate-950">今日の重点</p>
        <p className="mt-1 text-sm leading-6 text-slate-700">
          死亡災害は「建設業」「墜落・転落」、死傷災害は「転倒」の確認を優先。件数の増減だけで安全を判断せず、現場条件に合わせてKYへ落とし込んでください。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/ky/paper" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-black text-white">
            KY用紙に反映 <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/accidents-analytics" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-800">
            事故統計を分析 <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <ul className="mt-4 space-y-1 text-[11px] leading-5 text-slate-500">
          {snapshot.notes.map((note) => <li key={note}>※ {note}</li>)}
        </ul>
      </div>
    </section>
  );
}
