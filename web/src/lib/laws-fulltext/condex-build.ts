/**
 * condex（条番号インデックス）のビルダー。**server / ビルド専用**。
 *
 * 設計正本: docs/corpus-fulltext-architecture-2026-07-12.md §2-4・§5-2。
 *
 * committed 全文 JSON（laws-fulltext）を「条番号＋見出し＋スラグのみ」の軽量索引へ射影する。
 * 生成物はチェックインせず、API（/api/law-fulltext-condex）が実行時（＝ビルド時に静的化）に
 * この関数で作って配信する＝クライアントバンドルに全文を載せない・生成物コミットなし。
 *
 * 射影元は {@link getAllFulltextNaviEntries}（FT-D2 の全文ギャップ集合＝実際に生成される
 * 全文条ページと同集合）。したがって condex ⊆ 生成ページで、着地先が幽霊 URL になり得ない。
 * curated 収録済み条・slug 占有条は元から除外されている（dual-exclusion）。
 *
 * 【クライアントバンドル不可侵】本モジュールは fulltext-navi.ts（server-only・dynamic import）
 * 経由でのみ全文 JSON を読む。Route Handler / ビルドスクリプトからのみ import すること
 * （`server-only` パッケージは本リポジトリ未導入のため、規約＝doc とレビューで担保する＝
 *  loader.ts / fulltext-navi.ts と同方針）。
 */
import { getAllFulltextNaviEntries } from "@/lib/law-navi/fulltext-navi";
import type { CondexLaw, CondexPayload } from "@/lib/laws-fulltext/condex";

/** 全文ギャップ集合を condex（法令単位・条番号＋見出しのみ）へ射影する。 */
export async function buildCondex(): Promise<CondexPayload> {
  const entries = await getAllFulltextNaviEntries();
  const byLaw = new Map<string, CondexLaw>();
  for (const e of entries) {
    let law = byLaw.get(e.egovLawId);
    if (!law) {
      law = {
        egovLawId: e.egovLawId,
        lawShort: e.article.lawShort,
        fullName: e.article.law,
        revisionId: e.revisionId,
        articles: [],
      };
      byLaw.set(e.egovLawId, law);
    }
    law.articles.push({
      articleNum: e.article.articleNum,
      artSlug: e.artSlug,
      // 見出しは全文原文の caption をそのまま（"（食堂及び炊事場）"）。無い条は ""。
      caption: e.fulltextArticle.caption,
      isDeleted: e.isDeleted,
    });
  }
  return { laws: [...byLaw.values()] };
}
