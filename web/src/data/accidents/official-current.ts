/**
 * 厚生労働省「令和8年における労働災害発生状況（令和8年8月速報）」の
 * 全国集計。2026-09-19 に一次資料を照合した固定スナップショット。
 *
 * 注意: 速報月は公表資料の呼称で、発生対象期間・報告締切とは異なる。
 * 画面では三者を混同しないよう個別に表示する。
 */
export const OFFICIAL_ACCIDENT_SNAPSHOT = {
  label: "令和8年8月速報",
  publishedMonth: "2026年8月",
  occurredThrough: "2026-07-31",
  reportAsOf: "2026-08-07",
  verifiedAt: "2026-09-19",
  sourcePageUrl:
    "https://www.mhlw.go.jp/bunya/roudoukijun/anzeneisei11/rousai-hassei/",
  sourcePdfUrl:
    "https://www.mhlw.go.jp/bunya/roudoukijun/anzeneisei11/rousai-hassei/dl/26-08.pdf",
  sourceLabel: "厚生労働省 労働災害発生状況（速報）",
  deaths: {
    total: 301,
    previousYearSamePeriod: 363,
    change: -62,
    changeRate: -17.1,
  },
  injuries: {
    /** 死亡災害を含む、休業4日以上の死傷災害 */
    total: 67_966,
    previousYearSamePeriod: 64_612,
    change: 3_354,
    changeRate: 5.2,
  },
  fatalIndustries: [
    { name: "建設業", total: 96 },
    { name: "第三次産業", total: 85 },
    { name: "製造業", total: 49 },
    { name: "陸上貨物運送事業", total: 39 },
  ],
  fatalAccidentTypes: [
    { name: "墜落・転落", total: 79 },
    { name: "交通事故（道路）", total: 65 },
    { name: "はさまれ・巻き込まれ", total: 46 },
  ],
  injuryAccidentTypes: [
    { name: "転倒", total: 20_010 },
    { name: "動作の反動・無理な動作", total: 10_988 },
    { name: "墜落・転落", total: 10_425 },
    { name: "はさまれ・巻き込まれ", total: 6_524 },
  ],
  notes: [
    "速報値のため、後日の報告追加・訂正により変動します。",
    "死亡者数は死亡災害報告、死傷者数は労働者死傷病報告を基にした別集計です。",
    "新型コロナウイルス感染症のり患による労働災害を除きます。",
  ],
} as const;

export type OfficialAccidentSnapshot = typeof OFFICIAL_ACCIDENT_SNAPSHOT;
