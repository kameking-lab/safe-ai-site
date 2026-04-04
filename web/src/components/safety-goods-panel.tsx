"use client";

import { useMemo, useState } from "react";
import { InputWithVoice } from "@/components/voice-input-field";
import {
  safetyGoodsCategories,
  safetyGoodsItems,
  type SafetyGoodsCategory,
  type SafetyGoodsItem,
} from "@/data/mock/safety-goods";
import { withAmazonAssociateTag, withRakutenAffiliateId } from "@/lib/affiliate-links";

function GoodsCard({ item }: { item: SafetyGoodsItem }) {
  const amazonHref = withAmazonAssociateTag(item.amazonUrl);
  const rakutenHref = withRakutenAffiliateId(item.rakutenUrl);
  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="flex h-36 items-center justify-center rounded-t-xl bg-slate-100 text-3xl">
        {safetyGoodsCategories.find((c) => c.id === item.categoryId)?.icon ?? "📦"}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800"
            >
              {tag}
            </span>
          ))}
        </div>
        <h3 className="mt-2 text-sm font-bold leading-snug text-slate-900">{item.name}</h3>
        <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-600">{item.description}</p>
        <p className="mt-2 text-sm font-bold text-emerald-700">{item.price}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            href={amazonHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-amber-500 py-2 text-center text-xs font-bold text-white hover:bg-amber-600"
          >
            Amazonで見る
          </a>
          <a
            href={rakutenHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-rose-500 py-2 text-center text-xs font-bold text-white hover:bg-rose-600"
          >
            楽天で見る
          </a>
        </div>
      </div>
    </article>
  );
}

function CategoryCard({
  cat,
  count,
  isActive,
  onClick,
}: {
  cat: SafetyGoodsCategory;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
        isActive
          ? "border-emerald-500 bg-emerald-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span className="text-2xl">{cat.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">{cat.name}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{count}件</p>
      </div>
    </button>
  );
}

export function SafetyGoodsPanel() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    let items = safetyGoodsItems;
    if (selectedCategoryId) {
      items = items.filter((item) => item.categoryId === selectedCategoryId);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return items;
  }, [selectedCategoryId, query]);

  const selectedCategory = selectedCategoryId
    ? safetyGoodsCategories.find((c) => c.id === selectedCategoryId)
    : null;

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 lg:text-2xl">安全グッズ</h1>
        <p className="mt-1 text-sm text-slate-600">
          現場で必要な安全グッズを分野別にまとめました。各商品のリンクから購入できます。
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="w-full shrink-0 lg:w-64">
          <p className="mb-2 text-xs font-semibold text-slate-700">カテゴリ</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <button
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                !selectedCategoryId
                  ? "border-emerald-500 bg-emerald-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className="text-2xl">📦</span>
              <div>
                <p className="text-sm font-bold text-slate-900">すべて</p>
                <p className="text-[11px] text-slate-500">{safetyGoodsItems.length}件</p>
              </div>
            </button>
            {safetyGoodsCategories.map((cat) => {
              const count = safetyGoodsItems.filter((item) => item.categoryId === cat.id).length;
              return (
                <CategoryCard
                  key={cat.id}
                  cat={cat}
                  count={count}
                  isActive={selectedCategoryId === cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                />
              );
            })}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {selectedCategory && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <p className="text-lg font-bold text-slate-900">
                {selectedCategory.icon} {selectedCategory.name}
              </p>
              <p className="mt-1 text-sm text-slate-700">{selectedCategory.description}</p>
            </div>
          )}

          <div className="mb-4">
            <InputWithVoice
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="商品名・タグで検索..."
              className="w-full"
            />
          </div>

          {filteredItems.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
              該当する商品がありません。
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <GoodsCard key={item.id} item={item} />
              ))}
            </div>
          )}

          <p className="mt-6 text-[11px] leading-relaxed text-slate-400">
            ※ 本ページのリンクはアフィリエイトプログラムを利用しています。リンク先で商品を購入すると、当サイトに紹介料が支払われます。商品価格への影響はありません。
          </p>
        </div>
      </div>
    </div>
  );
}
