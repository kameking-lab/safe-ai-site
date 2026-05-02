import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { safetyGoodsCategories, safetyGoodsItems, type SafetyGoodsItem } from "@/data/mock/safety-goods";
import { relatedSafetyGoodsByText } from "@/lib/related-content";

/**
 * 「この場面で必要な保護具」セクション。通達／事故／化学物質ページなど
 * 文脈ページの下部に置き、本文に沿った保護具を 3〜4 点提示する。
 *
 * - アフィリエイトリンク（Amazon / 楽天）は safety-goods.ts で
 *   appendAmazonTag / generateRakutenAffiliateUrl 済み
 * - context（タイトル/タグ/本文）からトークン一致でレコメンド
 * - フォールバック用に fallbackCategoryIds を渡せる
 */
interface ContextualPpePicksProps {
  /** 文脈テキスト（タイトル + 本文 + タグなど） */
  context: string;
  /** 該当が無いときに掘る既定カテゴリ（fall-protection / respiratory など） */
  fallbackCategoryIds?: string[];
  /** 表示件数 */
  limit?: number;
  /** カードのヘッダ文言を上書き */
  heading?: string;
  description?: string;
}

function pickFallback(categoryIds: string[], limit: number): SafetyGoodsItem[] {
  if (categoryIds.length === 0) return [];
  const matched = safetyGoodsItems.filter((g) => categoryIds.includes(g.categoryId));
  return matched.slice(0, limit);
}

export function ContextualPpePicks({
  context,
  fallbackCategoryIds = [],
  limit = 4,
  heading = "🛡 この場面で必要な保護具",
  description = "本ページの内容に関連する保護具をピックアップ。Amazon / 楽天のアフィリエイトリンク（発生報酬は研究プロジェクト運営費に充当）。",
}: ContextualPpePicksProps) {
  const matched = relatedSafetyGoodsByText(context, { limit });
  const items = matched.length > 0 ? matched : pickFallback(fallbackCategoryIds, limit);
  if (items.length === 0) return null;

  return (
    <section
      className="mt-6 rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm"
      aria-label={heading}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-amber-900 sm:text-base">{heading}</h3>
          <p className="mt-1 text-[11px] leading-5 text-slate-600">{description}</p>
        </div>
        <Link
          href="/equipment-finder"
          className="shrink-0 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
        >
          AI診断 →
        </Link>
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const cat = safetyGoodsCategories.find((c) => c.id === item.categoryId);
          return (
            <li
              key={item.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-base" aria-hidden="true">
                  {cat?.icon ?? "🛡"}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {cat?.name ?? "保護具"}
                </span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs font-bold text-slate-900">{item.name}</p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-600">
                {item.description}
              </p>
              <p className="mt-2 text-xs font-bold text-emerald-700">{item.price}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <a
                  href={item.amazonUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-600"
                >
                  Amazon
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
                <a
                  href={item.rakutenUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="inline-flex items-center gap-1 rounded-md bg-rose-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-600"
                >
                  楽天
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[10px] leading-5 text-slate-500">
        ※ 商品リンクは Amazon アソシエイト / もしもアフィリエイト経由で生成。発生報酬は事故DB拡充・AI推論コスト・法令データ更新に充てます。
      </p>
    </section>
  );
}
