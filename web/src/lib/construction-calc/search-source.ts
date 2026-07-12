/**
 * 横断検索（/search・⌘K）への建設計算コーナーの収載源（registry 駆動の射影）。
 *
 * これまで横断検索は各計算機を 0 件ヒットで、発見手段は /construction-calc ハブの回遊のみだった
 * （「あだ巻き」「朝顔」「側圧」「安全ネット」等の現場語で計算機に直接着けない発見性の穴）。
 * ここで registry を単一ソースに各計算機を検索エントリへ射影し、part-B の分野ページ方式
 * （site-pages-search-source と同型）で feature カテゴリに収載する。
 *
 * - title = 「計算｜<shortTitle>」。**先頭に「計算｜」を付すのは検索ランキング上の意味**を持つ:
 *   計算機名（「作業床・開口部チェック」等）を title 前方一致(高得点)ではなく部分一致(低得点)へ
 *   落とし、条文の権威（例「足場 作業床」→安衛則563条が上位3位）を calc が奪う退行を防ぐ
 *   （FAQ の「Q. 」前置と同型の既知手法）。現場語での発見は keywords/部分一致で十分に効く。
 * - subtitle = 「建設計算（束）｜要約」
 * - keywords = calc.keywords（現場語 alias を含む）＋束のラベル/別名＋"建設計算"/"計算"
 *   ＝ registry の keywords を持たせておけば部隊の新機も宣言なしで自動収載される。
 * - url = /construction-calc/<slug>（[slug] の generateStaticParams が registry 全 slug を
 *   解決＝収載集合＝解決集合で必ず着地する。幽霊URL 0）。
 *
 * pure TS（React/IO なし）。search-index.ts の buildSearchIndex から dynamic import で読む。
 */

import { CONSTRUCTION_CALCULATORS } from "./registry";
import { CALC_CATEGORY_META, resolveCalcCategory } from "./categories";

export type CalcSearchEntry = {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  keywords: string[];
};

export function getCalcSearchEntries(): CalcSearchEntry[] {
  return CONSTRUCTION_CALCULATORS.map((c) => {
    const cat = CALC_CATEGORY_META[resolveCalcCategory(c)];
    return {
      id: `calc-${c.slug}`,
      title: `計算｜${c.shortTitle}`,
      subtitle: `建設計算（${cat.label}）｜${c.summary}`,
      url: `/construction-calc/${c.slug}`,
      keywords: Array.from(
        new Set([...c.keywords, "建設計算", "計算", cat.label, ...cat.aliases].filter(Boolean)),
      ),
    };
  });
}
