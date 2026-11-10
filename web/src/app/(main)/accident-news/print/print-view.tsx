"use client";
import { useState } from "react";
import { useNativeQuery } from "@/lib/use-native-query";
import Link from "next/link";
import {
  filterSeriousCases,
  getGeneralMeasures,
  SERIOUS_CASES_META,
} from "@/lib/accident-news/serious-cases";
import { PrintButton } from "./print-button";

function condLabel(s: { industry: string; type: string; year: string; q: string }): string {
  const parts: string[] = [];
  if (s.industry) parts.push(`業種:${s.industry}`);
  if (s.type) parts.push(`事故型:${s.type}`);
  if (s.year) parts.push(`年:${s.year}`);
  if (s.q) parts.push(`キーワード:${s.q}`);
  return parts.length ? parts.join(" / ") : "全件（新しい順）";
}

export function AccidentNewsPrintView({initialQuery,initialTimestamp}:{initialQuery:Record<string,string|string[]|undefined>;initialTimestamp:string}){
  const [timestamp,setTimestamp]=useState(initialTimestamp);
  const query=useNativeQuery(()=>setTimestamp(new Date().toISOString()));
  const pick = (k: string) => query ? query.get(k) ?? "" : (typeof initialQuery[k] === "string" ? initialQuery[k] as string : "");
  const selected = { industry: pick("industry"), type: pick("type"), year: pick("year"), q: pick("q") };
  const limit = Math.max(1, Math.min(Number(pick("limit")) || 40, 100));
  const cases = filterSeriousCases({
    industry: selected.industry || undefined,
    type: selected.type || undefined,
    year: selected.year ? Number(selected.year) : undefined,
    q: selected.q || undefined,
    limit,
  });
  const today = new Date(timestamp);
  const dateStr = new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',dateStyle:'long'}).format(today);

  return (
    <div className="mx-auto max-w-[820px] bg-white px-6 py-6 text-slate-900 print:px-0 print:py-0">
      {/* 操作バー（印刷時は隠す） */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href={`/accident-news${(() => {
            const p = new URLSearchParams();
            if (selected.industry) p.set("industry", selected.industry);
            if (selected.type) p.set("type", selected.type);
            if (selected.year) p.set("year", selected.year);
            if (selected.q) p.set("q", selected.q);
            const qs = p.toString();
            return qs ? `?${qs}` : "";
          })()}`}
          className="text-sm font-semibold text-emerald-700 hover:underline"
        >
          ← 一覧に戻る
        </Link>
        <PrintButton />
      </div>

      {/* 資料ヘッダ */}
      <header className="border-b-2 border-slate-800 pb-2">
        <h1 className="text-xl font-bold">重大災害事例（説明資料）</h1>
        <p className="mt-0.5 text-xs text-slate-600">
          絞り込み: {condLabel(selected)}　／　{cases.length}件　／　作成日: {dateStr}
        </p>
      </header>

      {/* 事例リスト */}
      <ol className="mt-3 space-y-2">
        {cases.map((c, i) => (
          <li key={c.id} className="break-inside-avoid rounded border border-slate-300 p-2.5 text-[13px]">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-bold">{i + 1}.</span>
              {c.type && <span className="font-bold text-rose-700">{c.type}</span>}
              {c.industry && <span className="font-semibold text-sky-800">{c.industry}</span>}
              <span className="text-slate-500">
                {c.year}年{c.month ? `${c.month}月` : ""}
              </span>
              {c.workplaceSize && <span className="text-slate-500">規模:{c.workplaceSize}</span>}
            </div>
            <p className="mt-1 leading-snug">{c.description}</p>
            <div className="mt-1 text-[12px] text-slate-600">
              {c.cause && <span>起因物分類: {c.cause}　</span>}
              {c.type && c.sameTypeTotal > 0 && (
                <span className="font-semibold text-rose-700">同種事故 収録{c.sameTypeTotal}件</span>
              )}
            </div>
            <p className="mt-1 text-[12px] text-emerald-900">
              一般的な対策の考え方（参考）: {getGeneralMeasures(c.type)}
            </p>
          </li>
        ))}
      </ol>
      {cases.length === 0 && (
        <p className="mt-4 text-center text-sm text-slate-500">該当する事例がありません。</p>
      )}

      {/* 出典・免責フッタ */}
      <footer className="mt-4 border-t border-slate-300 pt-2 text-[11px] leading-relaxed text-slate-500">
        出典: {SERIOUS_CASES_META.sourceLabel}（{SERIOUS_CASES_META.sourceUrl}）。
        対象: {SERIOUS_CASES_META.yearRange}。生成日時: {SERIOUS_CASES_META.generatedAt ?? "不明"}。
        出典はデータセット単位で、ローカルIDから公式Excelの個別行へは逆引きできません。
        本資料は公表事実の引用であり、会社名・発注者名・被災者氏名は含みません。
        「起因物分類」は直接原因・背景要因・管理要因ではなく、それらを本データから推測していません。
        「対策の考え方」は事故型に対する一般原則の参考であり、個別の対策判断は該当法令・公式情報の確認および労働安全コンサルタント等の専門家へご相談ください。
      </footer>
    </div>
  );
}
