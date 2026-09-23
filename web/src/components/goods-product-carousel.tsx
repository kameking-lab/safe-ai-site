"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { trackEvent } from "@/components/Analytics";
import { MIN_GOODS_RATING, MIN_GOODS_REVIEWS, type RatedGoodsProduct } from "@/lib/goods/rakuten-products";

type ProductResponse = {
  status: "ready" | "not_configured" | "unavailable" | "no_qualified_items";
  items: RatedGoodsProduct[];
  checkedAt: string | null;
};

export function GoodsProductCarousel({ categoryId, categoryName }: { categoryId: string; categoryName: string }) {
  const [result, setResult] = useState<ProductResponse | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/goods-products?category=${encodeURIComponent(categoryId)}`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<ProductResponse> : Promise.reject(new Error("Product search failed")))
      .then((data) => setResult(data))
      .catch(() => { if (!controller.signal.aborted) setResult({ status: "unavailable", items: [], checkedAt: null }); });
    return () => controller.abort();
  }, [categoryId]);

  return (
    <section aria-label={`${categoryName}の実商品写真`} className="mt-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 sm:p-5">
      <h3 className="text-lg font-black text-emerald-950">{categoryName}の実商品写真と高評価候補</h3>
      <p className="mt-1 text-xs leading-6 text-emerald-950">
        楽天市場の購入者評価が★{MIN_GOODS_RATING}以上・{MIN_GOODS_REVIEWS}件以上の在庫あり商品だけを表示します。評価は安全規格への適合を示しません。
      </p>
      {!result ? <p role="status" className="mt-4 text-sm text-slate-700">商品写真と評価を確認中…</p> : null}
      {result?.status === "ready" ? (
        <>
          <ul className="mt-4 flex snap-x gap-3 overflow-x-auto pb-3" aria-label="実商品写真を左右にスライド">
            {result.items.map((item) => (
              <li key={item.id} className="w-48 shrink-0 snap-start rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex h-36 items-center justify-center bg-white">
                  <Image src={item.imageUrl} alt={`${item.name}の商品写真（楽天市場掲載）`} width={128} height={128} unoptimized className="h-32 w-32 object-contain" />
                </div>
                <p className="mt-2 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-slate-950">{item.name}</p>
                <p className="mt-2 text-sm font-black text-amber-800" aria-label={`購入者評価5点満点中${item.rating}、レビュー${item.reviewCount}件`}>
                  ★{item.rating.toFixed(1)} <span className="text-xs font-semibold text-slate-600">({item.reviewCount}件)</span>
                </p>
                <a href={item.affiliateUrl} target="_blank" rel="noopener noreferrer sponsored" onClick={() => trackEvent("affiliate_click", { platform: "rakuten", product_id: item.id, product_name: item.name, page_location: "goods_real_product_carousel" })} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-lg bg-emerald-800 px-2 text-xs font-bold text-white">
                  写真と仕様を販売店で確認 <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-600">確認: {result.checkedAt ? new Date(result.checkedAt).toLocaleString("ja-JP") : "未確認"}。最新の仕様・価格・在庫は販売店で確認してください。</p>
        </>
      ) : null}
      {result?.status === "not_configured" ? <p role="status" className="mt-4 rounded-xl bg-white p-3 text-sm text-slate-700">実商品写真・星評価は現在取得できません。商品データの接続が未設定です。販売サイトで写真と最新評価をご確認ください。</p> : null}
      {result?.status === "unavailable" ? <p role="status" className="mt-4 rounded-xl bg-white p-3 text-sm text-slate-700">商品データへ接続できませんでした。写真・評価は未確認です。販売サイトでご確認ください。</p> : null}
      {result?.status === "no_qualified_items" ? <p role="status" className="mt-4 rounded-xl bg-white p-3 text-sm text-slate-700">このカテゴリでは、実画像・評価・レビュー件数の条件を満たす商品を確認できませんでした。条件を緩めて「おすすめ」と表示することはしません。</p> : null}
      {result?.status === "ready" || result?.status === "no_qualified_items" ? (
        <p className="mt-3 text-xs text-slate-600">
          商品写真・評価の出典: 楽天市場商品検索API。掲載順は広告料ではなくレビュー件数順です。<br />
          <a href="https://developers.rakuten.com/" target="_blank">Supported by Rakuten Developers</a>
        </p>
      ) : null}
    </section>
  );
}
