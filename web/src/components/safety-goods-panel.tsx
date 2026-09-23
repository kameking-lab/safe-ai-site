"use client";

import Image from "next/image";
import { ExternalLink, Search } from "lucide-react";
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
          イラストから安全用品を選ぶ
        </h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">
          まず使う用品を選び、カード内で必要な特徴を確認してください。商品検索へ進む前に、カテゴリの代表イラストと確認項目を表示します。
        </p>
        <ul className="mt-4 flex snap-x gap-4 overflow-x-auto pb-4" aria-label="安全用品カテゴリの画像一覧">
          {PUBLIC_SAFETY_GOODS_CATEGORIES.map((category) => (
            <li key={category.id} id={`goods-${category.id}`} className="w-[17rem] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
              <div className="relative aspect-[4/3] bg-slate-100">
                <Image src={category.image} alt={`${category.name}のカテゴリイラスト`} fill sizes="272px" className="object-contain p-2" />
              </div>
              <div className="p-4">
                <h3 className="text-base font-bold text-slate-950">{category.name}</h3>
                <p className="mt-2 min-h-12 text-xs leading-6 text-slate-600">{category.selectionPrompt}</p>
                <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <summary className="cursor-pointer text-sm font-bold text-emerald-900">特徴と候補を見る</summary>
                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    型式・規格表示・適用範囲・使用期限・点検方法を商品ごとに照合してください。
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <a href={generateAmazonHighRatedSearchUrl(category.searchQuery)} target="_blank" rel="noopener noreferrer sponsored" onClick={() => affiliateClick("amazon", category.id, category.name)} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-amber-700 px-2 text-xs font-bold text-white hover:bg-amber-800">
                      <Search className="h-4 w-4" aria-hidden="true" />Amazon ★4〜
                    </a>
                    <a href={generateRakutenSearchUrl(category.searchQuery)} target="_blank" rel="noopener noreferrer sponsored" onClick={() => affiliateClick("rakuten", category.id, category.name)} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-rose-700 px-2 text-xs font-bold text-white hover:bg-rose-800">
                      <Search className="h-4 w-4" aria-hidden="true" />楽天
                    </a>
                  </div>
                </details>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs font-semibold leading-6 text-slate-600">
          検索結果は推奨や適合証明ではありません。評価・レビュー件数・商品画像・価格は、販売サイトを開いた時点の表示で確認します。安全AIポータル内では未確認の評価値を掲載しません。確認先: <a href={PUBLIC_GOODS_RATING_DISCLOSURE.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{PUBLIC_GOODS_RATING_DISCLOSURE.sourceLabel}</a>
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
