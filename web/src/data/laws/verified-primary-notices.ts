import type { LawArticle } from "./law-types";
import { verifiedPrimaryElectricalArticles } from "./verified-primary-electrical";

/**
 * 公式一次資料の取得本文。取得日と、その後の本文再照合日は別に保持する。
 * chatbotで資格名まで答えるための最小範囲だけを保持し、URL・取得日・本文hashを固定する。
 */
export const verifiedPrimaryNoticeArticles: readonly LawArticle[] = [
  {
    law: "職場における熱中症防止のためのガイドライン",
    lawShort: "熱中症ガイドライン",
    articleNum: "第2・第3",
    articleTitle: "熱中症リスクの評価とリスクに応じた措置",
    text: "第2 熱中症リスクの評価　2 湿球黒球温度の値（WBGT値）の把握　JIS B 7922等に適合したWBGT指数計で実測。3 熱中症リスクの評価・検討　WBGT基準値を超える場合はWBGT値の低減等の熱中症予防対策を実施。第3 熱中症リスクに応じた措置　2 作業環境管理　WBGT値の低減、休憩場所の整備等。3 作業管理　作業時間の短縮等（作業の休止時間や休憩時間の確保）、暑熱順化（計画的に暑熱順化期間を設ける）、水分及び塩分の摂取（作業前後の摂取と作業中の定期的な摂取）、作業中の巡視。",
    keywords: [
      "熱中症",
      "WBGT",
      "休憩",
      "水分",
      "塩分",
      "暑熱順化",
      "作業時間",
      "基発0318第1号",
    ],
    sourceKind: "mhlw-official-primary",
    sourceUrl: "https://www.mhlw.go.jp/content/11303000/001676307.pdf",
    sourceFetchedAt: "2026-08-09T21:24:00+09:00",
    sourceHash: "798c840620bec6c1aeb73b06f8594728e671e643f1e95d7ab9db5809870d1c78",
    verificationStatus: "primary-source-verified",
    humanReviewStatus: "reviewed",
    sourceVersionKind: "current",
  },
  {
    law: "石綿障害予防規則第三条第四項の規定に基づき厚生労働大臣が定める者",
    lawShort: "厚労省告示276号",
    articleNum: "第1項",
    articleTitle: "作業区分別の事前調査者",
    text: "１　石綿障害予防規則(平成十七年厚生労働省令第二十一号)第三条第四項の規定に基づき厚生労働大臣が定める者は、次の各号に掲げる作業の区分に応じ、それぞれ当該各号に定める者とする。 一　建築物(建築物石綿含有建材調査者講習等登録規程(平成三十年／厚生労働省／国土交通省／環境省／告示第一号。以下「登録規程」という。)第二条第四項に規定する一戸建ての住宅及び共同住宅の住戸の内部(次号において「一戸建て住宅等」という。)を除く。)の解体又は改修(封じ込め又は囲い込みを含む。)の作業(以下「解体等の作業」という。)　同条第二項に規定する一般建築物石綿含有建材調査者、同条第三項に規定する特定建築物石綿含有建材調査者又はこれらの者と同等以上の能力を有すると認められる者 二　一戸建て住宅等の解体等の作業　前号に掲げる者又は登録規程第二条第四項に規定する一戸建て等石綿含有建材調査者 三　船舶(鋼製の船舶に限る。以下同じ。)の解体等の作業　船舶における石綿含有資材の使用実態の調査(以下「船舶石綿含有資材調査」という。)を行う者で、船舶石綿含有資材調査者講習を受講し、次項第三号の修了考査に合格した者又はこれと同等以上の知識を有すると認められる者(同項において「船舶石綿含有資材調査者」という。) 四　石綿障害予防規則第三条第四項ただし書の規定に基づき厚生労働大臣が定める工作物(令和二年厚生労働省告示第二百七十八号。次号において「特定工作物告示」という。)第一号から第五号まで及び第七号から第十一号までに掲げる工作物の解体等の作業　登録規程第二条第五項に規定する工作物石綿事前調査者 五　特定工作物告示第六号及び第十二号から第十七号までに掲げる工作物の解体等の作業並びに特定工作物告示に規定するもの以外の工作物の解体等の作業のうち塗料その他の石綿等が使用されているおそれがある材料の除去等の作業　第一号又は前号に掲げる者",
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
    sourceHash: "9065a3045d509e015df8e42a0838ea11ad0c1fa174f98ec643d65403c0327c2e",
    verificationStatus: "primary-source-verified",
    humanReviewStatus: "not-reviewed",
    sourceVersionKind: "current",
  },
  ...verifiedPrimaryElectricalArticles,
] as const;
