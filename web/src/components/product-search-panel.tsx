"use client";

import { useState } from "react";
import Link from "next/link";
import type { SdsProduct } from "@/lib/sds-fetcher";
import { TransientChemicalLink } from "@/components/home-safety-cockpit/transient-chemical-link";

type SearchHit = SdsProduct;

export function ProductSearchPanel() {
  const [productName, setProductName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searchSource, setSearchSource] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    setError(null);
    setSearchHits([]);
    setHasSearched(false);
    if (!productName.trim()) {
      setError("製品名を入力してください。");
      return;
    }
    setSearching(true);
    try {
      const response = await fetch("/api/sds/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productName.trim(),
          manufacturer: manufacturer.trim() || undefined,
        }),
      });
      const json = (await response.json()) as {
        hits?: SearchHit[];
        source?: string;
        error?: { message?: string };
      };
      if (!response.ok) {
        setError(json.error?.message ?? "検索に失敗しました。");
        return;
      }
      setSearchHits(json.hits ?? []);
      setSearchSource(json.source ?? "");
      setHasSearched(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "検索に失敗しました。");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="text-xl font-bold text-slate-900 lg:text-2xl">SDS製品検索</h1>
        <p className="text-sm text-slate-600">
          内蔵データから製品と含有成分を検索し、製品固有のSDS確認を支援します。
        </p>
        <div role="note" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
          含有率・取扱量・換気・作業時間だけから、ばく露濃度やリスクレベルを自動推定することはできません。
          最新SDS、実測値、厚生労働省の公式CREATE-SIMPLEを使い、化学物質管理者または専門家が確認してください。
          <a
            href="https://anzeninfo.mhlw.go.jp/user/anzen/kag/ankgc07_3.htm"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 font-bold underline underline-offset-2"
          >
            公式CREATE-SIMPLE
          </a>
        </div>
      </header>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">製品検索</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="block text-xs font-medium text-slate-700">製品名／型番</span>
            <input
              type="search"
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              maxLength={120}
              placeholder="例: 製品名、型番"
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-700">メーカー名（任意）</span>
            <input
              type="search"
              value={manufacturer}
              onChange={(event) => setManufacturer(event.target.value)}
              maxLength={120}
              placeholder="例: メーカー名"
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void handleSearch()}
          disabled={searching}
          className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {searching ? "検索中…" : "SDS DBを検索"}
        </button>

        {error && (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        {hasSearched && searchHits.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p>該当する製品が内蔵データに見つかりませんでした。メーカー公式サイトの最新SDSを確認してください。</p>
            <Link href="/chemical-database" className="mt-2 inline-flex min-h-11 items-center font-bold underline underline-offset-2">
              成分名を化学物質検索DBで確認
            </Link>
          </div>
        )}

        {searchHits.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              {searchHits.length}件ヒット（出典: {searchSource === "nite-chrip" ? "NITE-CHRIP" : "内蔵DB"}）
            </p>
            <ul className="space-y-2">
              {searchHits.map((hit) => (
                <li key={hit.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">{hit.productName}</p>
                  <p className="text-xs text-slate-500">{hit.manufacturer}・{hit.category}</p>
                  <p className="mt-1 text-xs text-slate-600">用途: {hit.use}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    含有成分: {hit.components.map((component) => `${component.name}（${component.contentLabel ?? `${component.contentPct}%`}）`).join(" / ")}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">SDS改訂日: {hit.sdsRevised}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {hit.sdsUrl && (
                      <a href={hit.sdsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg border border-emerald-300 bg-white px-3 text-xs font-bold text-emerald-800">
                        製品SDSを確認
                      </a>
                    )}
                    {hit.components[0]?.name && (
                      <TransientChemicalLink
                        query={hit.components[0].name}
                        className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800"
                      >
                        収録済み成分情報を確認
                      </TransientChemicalLink>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
