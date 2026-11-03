/** 厚生労働省 令和8年9月速報。2026-10-11にPDFのp.2・3・9・10を照合。
 * 速報月・発生対象期間・報告締切を分けて表示する。
 */
export const OFFICIAL_ACCIDENT_SNAPSHOT = {
  label: "令和8年9月速報",
  publishedMonth: "2026年9月",
  occurredThrough: "2026-08-31",
  reportAsOf: "2026-09-07",
  verifiedAt: "2026-10-11",
  sourcePageUrl: "https://www.mhlw.go.jp/bunya/roudoukijun/anzeneisei11/rousai-hassei/",
  sourcePdfUrl: "https://www.mhlw.go.jp/bunya/roudoukijun/anzeneisei11/rousai-hassei/dl/26-09.pdf",
  sourceLabel: "厚生労働省 労働災害発生状況（速報）",
  deaths: { total: 365, previousYearSamePeriod: 420, change: -55, changeRate: -13.1 },
  injuries: { total: 79_954, previousYearSamePeriod: 75_763, change: 4_191, changeRate: 5.5 },
  fatalIndustries: [
    { name: "建設業", total: 116 }, { name: "第三次産業", total: 103 },
    { name: "製造業", total: 62 }, { name: "陸上貨物運送事業", total: 43 },
  ],
  fatalAccidentTypes: [
    { name: "墜落・転落", total: 93 }, { name: "交通事故（道路）", total: 78 },
    { name: "はさまれ・巻き込まれ", total: 56 },
  ],
  injuryIndustries: [
    { name: "第三次産業", total: 42_423 }, { name: "製造業", total: 15_788 },
    { name: "陸上貨物運送事業", total: 9_621 },
  ],
  injuryAccidentTypes: [
    { name: "転倒", total: 23_154 }, { name: "動作の反動・無理な動作", total: 13_044 },
    { name: "墜落・転落", total: 12_057 }, { name: "はさまれ・巻き込まれ", total: 7_573 },
  ],
  notes: [
    "速報値のため、後日の報告追加・訂正により変動します。",
    "死亡者数は死亡災害報告、死傷者数は労働者死傷病報告による別集計です。",
    "新型コロナウイルス感染症による労働災害を除きます。",
  ],
} as const;
export type OfficialAccidentSnapshot = typeof OFFICIAL_ACCIDENT_SNAPSHOT;
