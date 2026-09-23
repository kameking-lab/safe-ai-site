"use client";

import Image from "next/image";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { ArrowLeft, ExternalLink, Search } from "lucide-react";
import {
  generateAmazonHighRatedSearchUrl,
  generateRakutenSearchUrl,
} from "@/lib/affiliate-url";
import { trackEvent } from "@/components/Analytics";
import {
  PUBLIC_GOODS_RATING_DISCLOSURE,
  PUBLIC_SAFETY_GOODS_CATEGORIES,
} from "@/data/public-safety-goods-categories";
import { FeatureMascotCompanion } from "@/components/feature-mascot-companion";
import { NetisSafetyGuide } from "@/components/netis-safety-guide";
import { SafetyGoodsWizard } from "@/components/safety-goods-wizard";
import { GoodsProductCarousel } from "@/components/goods-product-carousel";

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

const GOODS_CATEGORY_EVENT = "goods-category-change";

function subscribeCategory(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener(GOODS_CATEGORY_EVENT, listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener(GOODS_CATEGORY_EVENT, listener);
  };
}

function currentCategory() {
  const id = new URLSearchParams(window.location.search).get("category");
  return PUBLIC_SAFETY_GOODS_CATEGORIES.some((category) => category.id === id) ? id : null;
}

export function SafetyGoodsPanel() {
  const selectedCategoryId = useSyncExternalStore(subscribeCategory, currentCategory, () => null);
  const selectedCategory = PUBLIC_SAFETY_GOODS_CATEGORIES.find((category) => category.id === selectedCategoryId);
  const lastCategory = useRef<string | null>(null);

  useEffect(() => {
    const targetId = selectedCategoryId ? "goods-product-panel" : lastCategory.current ? `goods-choice-${lastCategory.current}` : null;
    if (selectedCategoryId) lastCategory.current = selectedCategoryId;
    if (!targetId) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(targetId);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "start", behavior: "instant" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedCategoryId]);

  function selectCategory(categoryId: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("category", categoryId);
    window.history.pushState({ goodsCategoryFromDirectory: true }, "", url);
    window.dispatchEvent(new Event(GOODS_CATEGORY_EVENT));
  }

  function returnToCategories() {
    if (window.history.state?.goodsCategoryFromDirectory) {
      window.history.back();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("category");
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event(GOODS_CATEGORY_EVENT));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <header>
        <p className="text-sm font-semibold text-emerald-700">作業から選べる購入入口</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
          安全用品・保護具を、迷わず選ぶ
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-700">
          「何から見ればいい？」を、危険・作業・現場条件の順に整理。
          そのまま購入候補と公式資料へ進めます。
        </p>
        <FeatureMascotCompanion
          variant="ppe-check"
          eyebrow="装備点検チワワ"
          title="作業に合う道具を、いっしょに絞ろう。"
          message="まずは危険と作業を選べばOK。次に見るポイントまで案内します。"
          tone="cream"
          compact
          className="mt-4 max-w-3xl"
        />
      </header>

      <section aria-labelledby="goods-categories-title">
        <h2 id="goods-categories-title" className="text-xl font-bold text-slate-950">
          用品カテゴリから実商品を探す
        </h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">
          用品を選んで、必要な特徴と商品候補を確認します。カテゴリの画像はイラストです。
        </p>
        <ul hidden={Boolean(selectedCategory)} className={selectedCategory ? "hidden" : "mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5"} aria-label="安全用品カテゴリの画像一覧">
          {PUBLIC_SAFETY_GOODS_CATEGORIES.map((category) => (
            <li key={category.id} id={`goods-${category.id}`}>
              <button id={`goods-choice-${category.id}`} type="button" onClick={() => selectCategory(category.id)} className="group flex h-full w-full scroll-mt-24 flex-col items-center rounded-2xl border border-slate-300 bg-white p-3 text-center shadow-sm hover:border-emerald-600 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
                <span className="relative block h-24 w-full sm:h-28">
                  <Image src={category.image} alt="" fill sizes="(max-width: 640px) 150px, 180px" className="object-contain" />
                </span>
                <span className="mt-2 text-sm font-bold leading-6 text-slate-950">{category.name}</span>
              </button>
            </li>
          ))}
        </ul>
        {selectedCategory ? (
          <div id="goods-product-panel" tabIndex={-1} aria-label={`${selectedCategory.name}の商品候補`} className="mt-4 scroll-mt-24 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
            <button type="button" onClick={returnToCategories} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:bg-slate-50">
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />用品一覧に戻る
            </button>
            <p className="mt-3 rounded-xl bg-slate-100 p-3 text-sm font-semibold leading-6 text-slate-800">選ぶポイント：{selectedCategory.selectionPrompt}</p>
            <GoodsProductCarousel key={selectedCategory.id} categoryId={selectedCategory.id} categoryName={selectedCategory.name} />
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-bold text-slate-800">販売サイトでほかの候補も探す</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={generateAmazonHighRatedSearchUrl(selectedCategory.searchQuery)} target="_blank" rel="noopener noreferrer sponsored" onClick={() => affiliateClick("amazon", selectedCategory.id, selectedCategory.name)} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-amber-700 px-3 text-sm font-bold text-white hover:bg-amber-800">
                  <Search className="h-4 w-4" aria-hidden="true" />Amazonで探す
                </a>
                <a href={generateRakutenSearchUrl(selectedCategory.searchQuery)} target="_blank" rel="noopener noreferrer sponsored" onClick={() => affiliateClick("rakuten", selectedCategory.id, selectedCategory.name)} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-rose-700 px-3 text-sm font-bold text-white hover:bg-rose-800">
                  <Search className="h-4 w-4" aria-hidden="true" />楽天で探す
                </a>
              </div>
            </div>
          </div>
        ) : null}
        <p className="mt-2 text-xs font-semibold leading-6 text-slate-600">
          検索結果は推奨や適合証明ではありません。APIで取得できた評価のみサイト内に表示します。最新の評価・価格・在庫と安全規格の適合は、販売ページと一次資料で確認してください。商品データ: <a href={PUBLIC_GOODS_RATING_DISCLOSURE.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{PUBLIC_GOODS_RATING_DISCLOSURE.sourceLabel}</a>
        </p>
      </section>

      <SafetyGoodsWizard />

      <NetisSafetyGuide compact />

      <details className="group rounded-2xl border border-slate-200 bg-slate-50 p-5" aria-labelledby="official-selection-sources">
        <summary className="cursor-pointer list-none text-lg font-bold text-slate-950 marker:hidden">
          <span className="inline-flex items-center gap-2">公式資料を見ながら、もう一度確認する <span aria-hidden="true" className="text-emerald-700 group-open:rotate-90">›</span></span>
        </summary>
        <h2
          id="official-selection-sources"
          className="sr-only"
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
      </details>

      <p className="rounded-xl bg-slate-100 p-4 text-xs leading-6 text-slate-700">
        本ページはアフィリエイトリンクを含みます。リンク先で購入された場合、当サイトに紹介料が支払われることがあります。
        紹介料の有無は、製品の安全性・適合性・掲載順の評価根拠には使用していません。
      </p>
    </div>
  );
}
