/**
 * 相互結線（law → calc）: 条文ページから「関連する建設計算」への逆写像。
 *
 * calc → law は各計算機の basis.lawNaviPath（curated 限定）で既に張られている。ここでは
 * その逆＝law-navi の条文ページ（curated / fulltext いずれも）に、その条文を根拠とする
 * 計算機への深リンクを出すための索引を **registry 駆動**で作る。
 *
 * 供給源（マージ）:
 *   1. calc.relatedArticles（新機がファイル内で宣言。例: safety-net-check → 安衛則518条・519条）
 *   2. RELATED_ARTICLES_BY_SLUG（既存機は部隊所有ファイル不可侵のためここで中央管理）
 * → 部隊の新機は relatedArticles を書けば自動で逆リンクに載る（ハブ/条文側の改修不要）。
 *
 * 参照条文は (lawShort, articleNum) で持ち、law-navi の permalink（findEntryByShort）と
 * 同じ表記に一致させる。存在しない条を指しても条文ページ側で引かれないだけで無害だが、
 * 正確を期し、governing（その計算機を実際に規律する）条のみを載せる。
 * pure TS（React/IO なし）。条文ページ（server component）から import して使う。
 */

import type { CalcArticleRef, ConstructionCalculator } from "./schema";
import { CONSTRUCTION_CALCULATORS } from "./registry";

/**
 * 既存機（部隊所有ファイル・不可侵）の governing 条文。計算機ファイルに relatedArticles を
 * 書き足す代わりにここで中央管理する。条は law-navi にページが実在するもののみ（幽霊リンク0）。
 */
export const RELATED_ARTICLES_BY_SLUG: Readonly<Record<string, CalcArticleRef[]>> = {
  "sling-wire-load": [{ lawShort: "クレーン則", articleNum: "第213条" }],
  // 安衛則518条2項・519条2項（作業床の設置が困難な場合の防網代替措置）→ 安全ネット基準チェック。
  // 部隊4の安全ネット実装（safety-net-check.ts の basis）が根拠とする一次条文に一致させる。
  // ※ 第539条は「保護帽の着用」で防網とは無関係（e-Gov 全文で確認）。旧マップの539条は誤りのため訂正。
  // 部隊4の安全ネット実装は relatedArticles を持たない（relatedSlugs 方式）ため、
  // law→calc の逆リンクはここ中央管理で張る。
  "safety-net-check": [
    { lawShort: "安衛則", articleNum: "第518条" },
    { lawShort: "安衛則", articleNum: "第519条" },
  ],
  "scaffold-tankan-check": [
    { lawShort: "安衛則", articleNum: "第571条" },
    { lawShort: "安衛則", articleNum: "第570条" },
  ],
  "excavation-slope": [
    { lawShort: "安衛則", articleNum: "第356条" },
    { lawShort: "安衛則", articleNum: "第357条" },
  ],
  "earth-pressure-shoring": [{ lawShort: "安衛則", articleNum: "第368条" }],
};

/** 計算機の参照条文（宣言優先→中央管理）。 */
function refsForCalculator(calc: ConstructionCalculator): CalcArticleRef[] {
  return calc.relatedArticles ?? RELATED_ARTICLES_BY_SLUG[calc.slug] ?? [];
}

const key = (lawShort: string, articleNum: string): string => `${lawShort}|${articleNum}`;

/** `${lawShort}|${articleNum}` → その条を根拠とする計算機（registry 収録順を保持）。 */
const INDEX: ReadonlyMap<string, ConstructionCalculator[]> = (() => {
  const map = new Map<string, ConstructionCalculator[]>();
  for (const calc of CONSTRUCTION_CALCULATORS) {
    for (const ref of refsForCalculator(calc)) {
      const k = key(ref.lawShort, ref.articleNum);
      const list = map.get(k);
      if (list) {
        if (!list.some((c) => c.slug === calc.slug)) list.push(calc);
      } else {
        map.set(k, [calc]);
      }
    }
  }
  return map;
})();

/** 条文（略称＋条番号）を根拠とする計算機を返す。無ければ空配列。 */
export function relatedCalculatorsForArticle(
  lawShort: string,
  articleNum: string,
): ConstructionCalculator[] {
  return INDEX.get(key(lawShort, articleNum)) ?? [];
}
