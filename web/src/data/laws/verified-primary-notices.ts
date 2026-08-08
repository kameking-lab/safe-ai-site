import type { LawArticle } from "./law-types";

/**
 * 厚生労働省法令等データベースの公式HTMLを2026-08-03 JSTに照合した告示本文。
 * chatbotで資格名まで答えるための最小範囲だけを保持し、URL・取得日・本文hashを固定する。
 */
export const verifiedPrimaryNoticeArticles: readonly LawArticle[] = [
  {
    law: "石綿障害予防規則第三条第四項の規定に基づき厚生労働大臣が定める者",
    lawShort: "厚労省告示276号",
    articleNum: "第1項",
    articleTitle: "作業区分別の事前調査者",
    text: "石綿障害予防規則第三条第四項の規定に基づき厚生労働大臣が定める者は、次の各号に掲げる作業の区分に応じ、それぞれ当該各号に定める者とする。 一　建築物（一戸建ての住宅及び共同住宅の住戸の内部を除く。）の解体又は改修の作業　一般建築物石綿含有建材調査者、特定建築物石綿含有建材調査者又はこれらの者と同等以上の能力を有すると認められる者 二　一戸建て住宅等の解体等の作業　前号に掲げる者又は一戸建て等石綿含有建材調査者 三　船舶（鋼製の船舶に限る。）の解体等の作業　船舶石綿含有資材調査者講習を受講し修了考査に合格した船舶石綿含有資材調査者又はこれと同等以上の知識を有すると認められる者 四　特定工作物告示第一号から第五号まで及び第七号から第十一号までに掲げる工作物の解体等の作業　工作物石綿事前調査者 五　特定工作物告示第六号及び第十二号から第十七号までに掲げる工作物の解体等の作業並びに告示対象外の工作物のうち塗料その他の石綿等が使用されているおそれがある材料の除去等の作業　第一号又は前号に掲げる者",
    keywords: [
      "石綿事前調査者",
      "建築物石綿含有建材調査者",
      "船舶石綿含有資材調査者",
      "工作物石綿事前調査者",
      "厚生労働省告示第276号",
    ],
    sourceKind: "mhlw-official-primary",
    sourceUrl:
      "https://www.mhlw.go.jp/web/t_doc?dataId=74ab7748&dataType=0&pageNo=1",
    sourceFetchedAt: "2026-08-03T05:08:00+09:00",
    sourceHash: "8716b3a70b710436a1ddac30d75d2f623bb81448f04dd6e608456720203fd596",
    verificationStatus: "primary-source-verified",
    humanReviewStatus: "reviewed",
    sourceVersionKind: "current",
  },
] as const;
