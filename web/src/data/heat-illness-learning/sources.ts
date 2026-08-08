import { HEAT_ILLNESS_2025_LEGAL_SOURCE } from "@/data/heat-illness-rules/legal-source";
import type { HeatLearningSource } from "./types";

export const HEAT_LEARNING_AS_OF = "2026-07-24";

export const HEAT_LEARNING_SOURCE_IDS = {
  ordinance: "egov-osh-rule-article-612-2",
  implementationNotice: "mhlw-notice-0520-6",
  currentGuideline: "mhlw-guideline-0318-1",
  emergencyResponse: "mhlw-heat-emergency-response",
  wbgtDefinitions: "moe-wbgt-definitions",
  officialLearning: "mhlw-heat-learning-2020",
  aedFirstAid: "fdma-first-aid-aed",
} as const;

export const HEAT_LEARNING_SOURCES = [
  {
    id: HEAT_LEARNING_SOURCE_IDS.ordinance,
    registryId: "mhlw-heat-rule-612-2",
    title: `労働安全衛生規則・${HEAT_ILLNESS_2025_LEGAL_SOURCE.article}`,
    issuer: "厚生労働省",
    documentNumber: "昭和47年労働省令第32号",
    url: "https://laws.e-gov.go.jp/law/347M50002000032",
    sourceType: "ministerial-ordinance",
    publishedAt: null,
    effectiveFrom: HEAT_ILLNESS_2025_LEGAL_SOURCE.effectiveFrom,
    retrievedAt: HEAT_LEARNING_AS_OF,
    verifiedAt: null,
    sourceStatus: "url-confirmed-content-review-pending",
    reviewStatus: HEAT_ILLNESS_2025_LEGAL_SOURCE.reviewStatus,
    scope:
      "熱中症による健康障害を生ずるおそれのある作業における、報告体制と悪化防止手順に関する事業者の措置",
    limitation:
      "個別事業場への適用、対象作業の該当性、具体的措置の十分性は、原文・施行通達と現場条件を人が確認する必要があります。",
    supersedes: null,
  },
  {
    id: HEAT_LEARNING_SOURCE_IDS.implementationNotice,
    registryId: "mhlw-heat-notice-0520-6",
    title: "労働安全衛生規則の一部を改正する省令の施行等について",
    issuer: "厚生労働省",
    documentNumber: HEAT_ILLNESS_2025_LEGAL_SOURCE.implementationNotice,
    url: "https://www.mhlw.go.jp/content/11303000/001490911.pdf",
    sourceType: "implementation-notice",
    publishedAt: "2025-05-20",
    effectiveFrom: HEAT_ILLNESS_2025_LEGAL_SOURCE.effectiveFrom,
    retrievedAt: HEAT_LEARNING_AS_OF,
    verifiedAt: null,
    sourceStatus: "url-confirmed-content-review-pending",
    reviewStatus: HEAT_ILLNESS_2025_LEGAL_SOURCE.reviewStatus,
    scope:
      "労働安全衛生規則第612条の2の対象作業、報告体制、悪化防止手順に関する施行上の留意事項",
    limitation:
      "この短時間教材は通達全文を置き換えません。対象作業の該当性は通達本文と個別現場を照合してください。",
    supersedes: null,
  },
  {
    id: HEAT_LEARNING_SOURCE_IDS.currentGuideline,
    registryId: "mhlw-heat-guideline-0318-1",
    title: "職場における熱中症防止対策のためのガイドライン",
    issuer: "厚生労働省",
    documentNumber: "基発0318第1号",
    url: "https://www.mhlw.go.jp/web/t_doc?dataId=00tc9896&dataType=1&pageNo=1",
    sourceType: "guideline-notice",
    publishedAt: "2026-03-18",
    effectiveFrom: null,
    retrievedAt: HEAT_LEARNING_AS_OF,
    verifiedAt: null,
    sourceStatus: "url-confirmed-content-review-pending",
    reviewStatus: "external-legal-review-pending",
    scope:
      "業種・業態や作業場所の制約に応じて選択する、職場の熱中症防止対策の包括的な指針",
    limitation:
      "ガイドラインの推奨を労働安全衛生規則第612条の2の追加義務として表示しません。個別の法的判断には原文確認が必要です。",
    supersedes:
      "基発0420第3号（令和3年4月20日付け。基発0318第1号により2026年3月18日付けで廃止）",
  },
  {
    id: HEAT_LEARNING_SOURCE_IDS.emergencyResponse,
    registryId: "mhlw-heat-emergency-response",
    title: "職場でおこる熱中症・熱中症者への対応",
    issuer: "厚生労働省",
    documentNumber: null,
    url: "https://neccyusho.mhlw.go.jp/heatstroke/",
    sourceType: "official-web-guidance",
    publishedAt: null,
    effectiveFrom: null,
    retrievedAt: HEAT_LEARNING_AS_OF,
    verifiedAt: null,
    sourceStatus: "url-confirmed-content-review-pending",
    reviewStatus: "editorial-review-pending",
    scope:
      "熱中症が疑われる人の意識確認、冷却、水分・塩分補給、救急要請の基本分岐",
    limitation:
      "現場の応急手順を示す公式案内です。医療診断や個別治療を行うものではなく、状態に迷うときは救急・医療へつなげます。",
    supersedes: null,
  },
  {
    id: HEAT_LEARNING_SOURCE_IDS.wbgtDefinitions,
    registryId: "moe-wbgt-details",
    title: "当サイトで提供する暑さ指数（WBGT）について",
    issuer: "環境省",
    documentNumber: null,
    url: "https://www.wbgt.env.go.jp/wbgt_detail.php",
    sourceType: "official-observation-guidance",
    publishedAt: null,
    effectiveFrom: null,
    retrievedAt: HEAT_LEARNING_AS_OF,
    verifiedAt: null,
    sourceStatus: "url-confirmed-content-review-pending",
    reviewStatus: "editorial-review-pending",
    scope:
      "環境省サイトが提供するWBGTの実測値、実況推定値、予測値の算出区分と留意事項",
    limitation:
      "公式サイトの値でも作業地点そのものの実測とは限りません。現場の放射熱、通風、設備、服装、作業強度等を置き換えません。",
    supersedes: null,
  },
  {
    id: HEAT_LEARNING_SOURCE_IDS.officialLearning,
    registryId: "mhlw-heat-learning",
    title: "動画で学ぶ職場における熱中症予防対策（令和2年度版）",
    issuer: "厚生労働省",
    documentNumber: null,
    url: "https://neccyusho.mhlw.go.jp/study/",
    sourceType: "official-learning-resource",
    publishedAt: null,
    effectiveFrom: null,
    retrievedAt: HEAT_LEARNING_AS_OF,
    verifiedAt: null,
    sourceStatus: "url-confirmed-content-review-pending",
    reviewStatus: "editorial-review-pending",
    scope: "熱中症の仕組み、WBGT、作業環境管理、健康管理、緊急時措置の公式学習資料",
    limitation:
      "同ページは令和2年時点の情報を基にした動画を含み、JIS Z 8504の改正に関する注意書きがあります。2026年現行指針も別途確認してください。",
    supersedes: null,
  },
  {
    id: HEAT_LEARNING_SOURCE_IDS.aedFirstAid,
    registryId: "fdma-aed-first-aid",
    title: "一般市民向け応急手当WEB講習・心肺蘇生とAED",
    issuer: "消防庁",
    documentNumber: null,
    url: "https://www.fdma.go.jp/relocation/kyukyukikaku/oukyu/05kobetsu/index.html",
    sourceType: "official-web-guidance",
    publishedAt: null,
    effectiveFrom: null,
    retrievedAt: HEAT_LEARNING_AS_OF,
    verifiedAt: null,
    sourceStatus: "url-confirmed-content-review-pending",
    reviewStatus: "editorial-review-pending",
    scope:
      "反応確認、119番通報とAEDの手配、呼吸確認、胸骨圧迫、AEDの基本操作に関する消防庁の一般市民向け学習資料",
    limitation:
      "熱中症の診断・治療を示す資料ではありません。反応や呼吸に異常がある場合の一次救命処置は、119番の通信指令員、AEDの音声案内、事業場の緊急手順に従います。",
    supersedes: null,
  },
] as const satisfies readonly HeatLearningSource[];

export function getHeatLearningSource(sourceId: string) {
  return HEAT_LEARNING_SOURCES.find((source) => source.id === sourceId);
}
