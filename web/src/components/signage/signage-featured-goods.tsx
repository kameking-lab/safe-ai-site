"use client";

import Link from "next/link";
import { getSignageFeaturedSafetyGoods } from "@/data/mock/safety-goods";
import { withAmazonAssociateTag, withRakutenAffiliateId } from "@/lib/affiliate-links";

export function SignageFeaturedGoods() {
  const items = getSignageFeaturedSafetyGoods(14);

  return (
    <section className="flex max-h-[min(42vh,520px)] min-h-0 flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-900/90 p-2 sm:rounded-2xl sm:p-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-bold tracking-wide text-slate-100 sm:text-sm">おすすめ安全グッズ（最新）</h2>
        <Link
          href="/goods"
          className="rounded-lg border border-amber-500/50 px-2 py-1 text-[10px] font-semibold text-amber-200 hover:bg-amber-950/40"
        >
          一覧・購入はこちら
        </Link>
      </div>
      <p className="mt-0.5 shrink-0 text-[9px] text-slate-400 sm:text-[10px]">
        Amazon / 楽天の検索リンクです。アソシエイトIDは環境変数で差し替え可能（`AFFILIATE.md` 参照）。
      </p>
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-0.5">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-950/70"
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.imageAlt}
                  className="h-24 w-full object-cover sm:h-28"
                  loading="lazy"
                />
              ) : null}
              <div className="flex flex-1 flex-col gap-1 p-2">
                <p className="line-clamp-2 text-[11px] font-bold leading-tight text-slate-50 sm:text-xs">{item.name}</p>
                <p className="text-[9px] text-amber-100/90">{item.price}</p>
                <div className="mt-auto flex flex-wrap gap-1 pt-1">
                  <a
                    href={withAmazonAssociateTag(item.amazonUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded bg-amber-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white hover:bg-amber-500"
                  >
                    Amazon
                  </a>
                  <a
                    href={withRakutenAffiliateId(item.rakutenUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-rose-400/60 px-1.5 py-0.5 text-[9px] font-bold text-rose-100 hover:bg-rose-950/50"
                  >
                    楽天
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {items.length === 0 ? (
          <p className="text-xs text-slate-400">表示できるおすすめ商品がありません。</p>
        ) : null}
      </div>
    </section>
  );
}
