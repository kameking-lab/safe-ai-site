"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
type Item = {
    slug: string;
    title: string;
    purpose: string;
    category: string;
};
export function ConstructionCalculatorDirectory({ items }: {
    items: Item[];
}) {
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("すべて");
    const categories = ["すべて", ...new Set(items.map(i => i.category))];
    const visible = useMemo(() => items.filter(i => (category === "すべて" || i.category === category) && (!query.trim() || (i.title + " " + i.purpose).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))), [items, query, category]);
    return <div>
 <label className="mt-4 flex min-h-12 items-center gap-2 rounded-xl border-2 border-slate-400 bg-white px-3 dark:bg-slate-900"><Search className="h-5 w-5" aria-hidden="true"/><span className="sr-only">計算ツールを検索</span><input type="search" placeholder="何を求めたい？ 例：枚数、鉄筋、勾配" value={query} onChange={e => setQuery(e.target.value)} className="min-h-12 w-full bg-transparent text-base outline-none"/></label>
 <div className="mt-3 flex flex-wrap gap-2" aria-label="計算のカテゴリ">{categories.map(c => <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={"min-h-11 rounded-full border-2 px-3 text-sm font-bold " + (category === c ? "border-emerald-800 bg-emerald-800 text-white" : "border-slate-300 bg-white text-slate-800 dark:bg-slate-900 dark:text-white")}>{c}</button>)}</div>
 <p aria-live="polite" className="mt-3 text-sm font-bold">{visible.length}件</p>
 <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visible.map(i => <article key={i.slug} data-calculator-status="published" className="rounded-xl border-2 border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">{i.category}</p><h3 className="mt-1 text-lg font-black">{i.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{i.purpose}</p><Link href={"/tools/construction-calculators/" + i.slug} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-3 font-bold text-white">数字を入れる<ArrowRight className="h-4 w-4" aria-hidden="true"/></Link></article>)}</div>
 {!visible.length ? <p className="mt-3 rounded-xl bg-slate-100 p-4 dark:bg-slate-800">該当する計算がありません。別の言葉で検索してください。</p> : null}
 </div>;
}
