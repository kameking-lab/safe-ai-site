"use client";

import { ExternalLink, Search, ShieldAlert } from "lucide-react";
import {
  generateAmazonAffiliateUrl,
  generateRakutenSearchUrl,
} from "@/lib/affiliate-url";
import { trackEvent } from "@/components/Analytics";
import { PUBLIC_SAFETY_GOODS_CATEGORIES } from "@/data/public-safety-goods-categories";

const OFFICIAL_SELECTION_SOURCES = [
  {
    label: "墜落制止用器具の規格（厚生労働省告示第11号）",
    href: "https://www.mhlw.go.jp/web/t_doc?dataId=74ab6770&dataType=0&pageNo=1",
  },
  {
    label: "騒音障害防止のためのガイドライン（厚生労働省）",
    href: "https://www.mhlw.go.jp/web/t_doc?dataId=00tc7618&dataType=1&pageNo=1",
  },
  {
    label: "皮膚障害等防止用保護具の選定マニュアル 第3版（厚生労働省）",
    href: "https://www.mhlw.go.jp/content/11300000/001670143.pdf",
  },
  {
    label: "化学物質による労働災害防止のための新たな規制（厚生労働省）",
    href: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000099121_00005.html",
  },
] as const;

function affiliateClick(
  platform: "amazon" | "rakuten",
  categoryId: string,
  categoryName: string,
) {
  trackEvent("affiliate_click", {
    platform,
    product_id: `category-${categoryId}`,
    product_name: categoryName,
    page_location: "goods_category_directory",
  });
}

export function SafetyGoodsPanel() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <header>
        <p className="text-sm font-semibold text-emerald-700">購入前の確認入口</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
          安全用品・保護具のカテゴリ検索
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-700">
          作業条件と一次資料を確認した後に、販売サイトで候補を探すための入口です。
          特定商品、型式、規格適合、性能、価格、現場への適合性は当サイトでは確認していません。
        </p>
      </header>

      <section
        className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5"
        aria-labelledby="goods-boundary-title"
      >
        <div className="flex gap-3">
          <ShieldAlert
            className="mt-0.5 h-6 w-6 shrink-0 text-amber-800"
            aria-hidden="true"
          />
          <div>
            <h2
              id="goods-boundary-title"
              className="text-lg font-bold text-amber-950"
            >
              この一覧だけで保護具を選定しないでください
            </h2>
            <p className="mt-2 text-sm leading-7 text-amber-950">
              リスクアセスメント、対象物質・濃度、作業高さ、落下距離、騒音ばく露、
              使用時間、装着者への適合、他装備との干渉、製品ラベル、取扱説明書を確認し、
              必要に応じてメーカー、販売事業者、労働安全衛生の専門家へ確認してください。
              購入リンクは検索結果へのアフィリエイトリンクであり、推奨・適合証明ではありません。
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="official-selection-sources">
        <h2
          id="official-selection-sources"
          className="text-xl font-bold text-slate-950"
        >
          選定前に確認する公式一次資料
        </h2>
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {OFFICIAL_SELECTION_SOURCES.map((source) => (
            <li key={source.href}>
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:border-emerald-500 hover:text-emerald-800"
              >
                <span>{source.label}</span>
                <ExternalLink
                  className="h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs leading-6 text-slate-600">
          確認日: 2026年7月24日。資料は対象作業・製品ごとに異なります。リンク先の改訂状況も確認してください。
        </p>
      </section>

      <section aria-labelledby="goods-categories-title">
        <h2
          id="goods-categories-title"
          className="text-xl font-bold text-slate-950"
        >
          カテゴリから販売サイトを検索
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          旧商品データは型式と仕様を一次資料で照合できていないため公開停止しました。
          以下は特定SKUを示さないカテゴリ検索だけです。
        </p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PUBLIC_SAFETY_GOODS_CATEGORIES.map((category) => (
            <li
              key={category.id}
              className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden="true">
                  {category.icon}
                </span>
                <h3 className="text-base font-bold text-slate-950">
                  {category.name}
                </h3>
              </div>
              <p className="mt-3 text-xs leading-6 text-slate-600">
                検索結果の型式、適用範囲、規格表示、使用期限、点検方法を商品ごとに確認してください。
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <a
                  href={generateAmazonAffiliateUrl(category.searchQuery)}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  onClick={() =>
                    affiliateClick("amazon", category.id, category.name)
                  }
                  className="inline-flex min-h-12 items-center justify-center gap-1 rounded-lg bg-amber-700 px-3 py-2 text-center text-sm font-bold text-white hover:bg-amber-800"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Amazon
                </a>
                <a
                  href={generateRakutenSearchUrl(category.searchQuery)}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  onClick={() =>
                    affiliateClick("rakuten", category.id, category.name)
                  }
                  className="inline-flex min-h-12 items-center justify-center gap-1 rounded-lg bg-rose-700 px-3 py-2 text-center text-sm font-bold text-white hover:bg-rose-800"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  楽天
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="rounded-xl bg-slate-100 p-4 text-xs leading-6 text-slate-700">
        本ページはアフィリエイトリンクを含みます。リンク先で購入された場合、当サイトに紹介料が支払われることがあります。
        紹介料の有無は、製品の安全性・適合性・掲載順の評価根拠には使用していません。
      </p>
    </div>
  );
}
