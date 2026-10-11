import type { LawArticle } from "./law-types";
import { verifiedLawArticles } from "./verified-corpus";

/**
 * 安衛則第563条（作業床）の、わく組足場の細目まで含む公式本文。
 *
 * - 取込済み e-Gov snapshot（`laws-fulltext/347M50002000032.json`）は Subitem2
 *   を平文化しないため、第1項第3号イの「（１）交さ筋かい…」「（２）手すりわく」
 *   が欠落している。snapshot と生成コーパスは hash 固定のため書き換えない。
 * - 欠落分は e-Gov 法令API v2 `law_data/347M50002000032`
 *   （law_revision_id `347M50002000032_20261001_508M60000100116`）を
 *   2026-10-11 に取得し、Article Num="563" の Subitem2 Sentence を逐語で写した。
 *   同取得の Article 563 XML 断片の SHA-256 は
 *   `17d1fe63281644463bbedb52b8673e69fb27b83e8fea26c4500a87c770224fd1`。
 * - 旧キュレーション本文（ashiba-sagyo-kisoku.ts）の編集的追記・旧数値は使わない。
 * - 下の補完は、snapshot の revision と挿入位置の原文が一致する場合だけ有効。
 *   一致しなければ undefined（fail closed）とし、わく組足場の細目回答を出さない。
 */
export const FRAME_SCAFFOLD_SOURCE_REVISION_ID = "20261001_508M60000100116";

const FRAME_SCAFFOLD_SUBITEM_ANCHOR =
  "イ　わく組足場（妻面に係る部分を除く。ロにおいて同じ。）　次のいずれかの設備　";
const FRAME_SCAFFOLD_SUBITEM_FOLLOWER = "ロ　わく組足場以外の足場　手すり等及び中桟等";

/** e-Gov XML の Subitem2（（１）（２））の逐語本文。 */
export const FRAME_SCAFFOLD_OFFICIAL_SUBITEMS =
  "（１）　交さ筋かい及び高さ十五センチメートル以上四十センチメートル以下の桟若しくは高さ十五センチメートル以上の幅木又はこれらと同等以上の機能を有する設備　（２）　手すりわく　";

export const FRAME_SCAFFOLD_OFFICIAL_TEXT_SHA256 =
  "c21124a0c3c657f29cf1a2c00942a326824a861d9c64209c10925d586a3c48dc";

export function buildFrameScaffoldPrimaryArticle(
  corpusArticle: LawArticle | undefined,
): LawArticle | undefined {
  if (
    !corpusArticle ||
    corpusArticle.lawShort !== "安衛則" ||
    corpusArticle.articleNum !== "第563条" ||
    corpusArticle.sourceLawId !== "347M50002000032" ||
    corpusArticle.sourceRevisionId !== FRAME_SCAFFOLD_SOURCE_REVISION_ID ||
    corpusArticle.text.split(FRAME_SCAFFOLD_SUBITEM_ANCHOR).length !== 2 ||
    !corpusArticle.text.includes(
      `${FRAME_SCAFFOLD_SUBITEM_ANCHOR}${FRAME_SCAFFOLD_SUBITEM_FOLLOWER}`,
    )
  ) {
    return undefined;
  }
  return {
    ...corpusArticle,
    text: corpusArticle.text.replace(
      FRAME_SCAFFOLD_SUBITEM_ANCHOR,
      `${FRAME_SCAFFOLD_SUBITEM_ANCHOR}${FRAME_SCAFFOLD_OFFICIAL_SUBITEMS}`,
    ),
    sourceKind: "government-official-primary",
    sourceUrl: "https://laws.e-gov.go.jp/law/347M50002000032",
    sourceFetchedAt: "2026-10-11",
    sourceHash: FRAME_SCAFFOLD_OFFICIAL_TEXT_SHA256,
    contentHash: undefined,
    verificationStatus: "primary-source-verified",
    humanReviewStatus: "not-reviewed",
    sourceVersionKind: "current",
  };
}

/** わく組足場の細目を問う回答だけに注入する。通常検索の索引には入れない。 */
export const verifiedFrameScaffoldArticle = buildFrameScaffoldPrimaryArticle(
  verifiedLawArticles.find(
    (article) =>
      article.lawShort === "安衛則" && article.articleNum === "第563条",
  ),
);
