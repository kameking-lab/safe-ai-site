import type {
  SearchGoldCase,
} from "./search-quality-gold-2026-07-24";

export type SearchHoldoutDomain =
  | "law"
  | "qualification"
  | "education"
  | "accident"
  | "chemical"
  | "ky";

export type SearchHoldoutCase = Omit<
  SearchGoldCase,
  "reviewedAt" | "domain"
> & {
  domain: SearchHoldoutDomain;
  reviewedAt: "2026-07-31";
  officialLanding: string;
  officialBasis: string;
};

/**
 * Search implementation and the 2026-07-24 gold set were not consulted to
 * choose the questions or official destinations. The cases were frozen before
 * the 2026-07-31 ranking change from official titles, article numbers, CAS
 * identifiers and field vocabulary. Relevant IDs are stable local projections
 * of those independently selected destinations.
 */
export const SEARCH_QUALITY_HOLDOUT_2026_07_31: readonly SearchHoldoutCase[] = [
  {
    id: "holdout-law-01",
    domain: "law",
    query: "労働安全衛生法 第14条 作業主任者",
    intent: "作業主任者選任の一次条文へ到達する",
    relevantIds: [
      "law-労働安全衛生法|第14条",
      "plain-347AC0000000057-第14条",
    ],
    primaryRequiredIds: ["law-労働安全衛生法|第14条"],
    dangerousIfMissing: true,
    officialLanding:
      "https://elaws.e-gov.go.jp/document?lawid=347AC0000000057",
    officialBasis: "労働安全衛生法（昭和47年法律第57号）第14条",
    reviewedAt: "2026-07-31",
  },
  {
    id: "holdout-law-02",
    domain: "law",
    query: "酸欠則 第12条 特別教育",
    intent: "酸素欠乏危険作業の特別教育を定める一次条文へ到達する",
    relevantIds: [
      "law-酸素欠乏症等防止規則|第12条",
      "education-special-se-36-26-shokucho-sanso",
    ],
    primaryRequiredIds: ["law-酸素欠乏症等防止規則|第12条"],
    dangerousIfMissing: true,
    officialLanding:
      "https://www.mhlw.go.jp/web/t_doc?dataId=74105000&dataType=0&pageNo=1",
    officialBasis: "酸素欠乏症等防止規則第12条",
    reviewedAt: "2026-07-31",
  },
  {
    id: "holdout-accident-01",
    domain: "accident",
    query: "事故の型 墜落 転落",
    intent: "厚労省事故型分類と墜落・転落の事故検索導線へ到達する",
    relevantIds: [
      "page-/accidents",
      "page-/accident-news",
      "hazard-slide-fall",
      "article-fall-prevention-checklist-construction",
    ],
    primaryRequiredIds: ["page-/accidents"],
    dangerousIfMissing: true,
    officialLanding:
      "https://anzeninfo.mhlw.go.jp/yougo/yougo20_1.html",
    officialBasis: "職場のあんぜんサイト「事故の型」",
    reviewedAt: "2026-07-31",
  },
  {
    id: "holdout-accident-02",
    domain: "accident",
    query: "フォークリフト 無資格 事故",
    intent: "公式事故検索と就業制限の確認導線へ到達する",
    relevantIds: [
      "page-/accidents",
      "law-労働安全衛生法|第61条",
      "law-労働安全衛生法施行令|第20条",
      "education-skill-st-forklift",
    ],
    primaryRequiredIds: [
      "page-/accidents",
      "law-労働安全衛生法|第61条",
    ],
    dangerousIfMissing: true,
    officialLanding:
      "https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_FND.aspx",
    officialBasis: "職場のあんぜんサイト「労働災害事例」",
    reviewedAt: "2026-07-31",
  },
  {
    id: "holdout-chemical-01",
    domain: "chemical",
    query: "ベンゼン CAS 71-43-2 SDS",
    intent: "名称とCASが一致するSDS・物質詳細へ到達する",
    relevantIds: ["chem-mock-cs-001"],
    primaryRequiredIds: ["chem-mock-cs-001"],
    dangerousIfMissing: true,
    officialLanding:
      "https://anzeninfo.mhlw.go.jp/anzen/gmsds/71-43-2.html",
    officialBasis: "職場のあんぜんサイト「ベンゼン」CAS 71-43-2",
    reviewedAt: "2026-07-31",
  },
  {
    id: "holdout-chemical-02",
    domain: "chemical",
    query: "キシレン 1330－20－7",
    intent: "全角記号を含むCAS表記から該当物質へ到達する",
    relevantIds: ["chem-mock-cs-003"],
    primaryRequiredIds: ["chem-mock-cs-003"],
    dangerousIfMissing: true,
    officialLanding:
      "https://anzeninfo.mhlw.go.jp/anzen/gmsds/1330-20-7.html",
    officialBasis: "職場のあんぜんサイト「キシレン」CAS 1330-20-7",
    reviewedAt: "2026-07-31",
  },
  {
    id: "holdout-qualification-01",
    domain: "qualification",
    query: "フォークリフト 最大荷重1トン以上 技能講習",
    intent: "1トン以上の就業制限と技能講習区分へ到達する",
    relevantIds: [
      "education-skill-st-forklift",
      "law-労働安全衛生法|第61条",
      "law-労働安全衛生法施行令|第20条",
      "page-/education-certification/finder",
    ],
    primaryRequiredIds: [
      "education-skill-st-forklift",
      "law-労働安全衛生法|第61条",
    ],
    dangerousIfMissing: true,
    officialLanding:
      "https://www.mhlw.go.jp/web/t_doc?dataId=00tb9284&dataType=1&pageNo=1",
    officialBasis:
      "陸上貨物運送事業における荷役作業の安全対策ガイドライン",
    reviewedAt: "2026-07-31",
  },
  {
    id: "holdout-qualification-02",
    domain: "qualification",
    query: "フォークリフト 最大荷重１トン未満 特別教育",
    intent: "1トン未満の特別教育区分へ到達する",
    relevantIds: [
      "education-special-se-36-5-forklift",
      "law-労働安全衛生規則|第36条",
      "page-/education-certification/finder",
    ],
    primaryRequiredIds: ["education-special-se-36-5-forklift"],
    dangerousIfMissing: true,
    officialLanding:
      "https://www.mhlw.go.jp/web/t_doc?dataId=74085000&dataType=0&pageNo=1",
    officialBasis: "安全衛生特別教育規程第7条",
    reviewedAt: "2026-07-31",
  },
  {
    id: "holdout-education-01",
    domain: "education",
    query: "酸素欠乏危険作業 特別教育 4時間",
    intent: "法定区分と必要時間の一次資料・教育案内へ到達する",
    relevantIds: [
      "education-special-se-36-26-shokucho-sanso",
      "law-酸素欠乏症等防止規則|第12条",
      "page-/education-certification/finder",
    ],
    primaryRequiredIds: [
      "education-special-se-36-26-shokucho-sanso",
      "law-酸素欠乏症等防止規則|第12条",
    ],
    dangerousIfMissing: true,
    officialLanding:
      "https://www.mhlw.go.jp/web/t_doc?dataId=74106000&dataType=0&pageNo=1",
    officialBasis: "酸素欠乏危険作業特別教育規程",
    reviewedAt: "2026-07-31",
  },
  {
    id: "holdout-education-02",
    domain: "education",
    query: "アーク溶接 特別教育 安衛則36条",
    intent: "アーク溶接特別教育の区分と根拠条文へ到達する",
    relevantIds: [
      "education-special-se-36-3-arch",
      "law-労働安全衛生規則|第36条",
      "plain-347M50002000032-第36条",
    ],
    primaryRequiredIds: [
      "education-special-se-36-3-arch",
      "law-労働安全衛生規則|第36条",
    ],
    dangerousIfMissing: true,
    officialLanding:
      "https://www.mhlw.go.jp/web/t_doc?dataId=74085000&dataType=0&pageNo=1",
    officialBasis: "安全衛生特別教育規程",
    reviewedAt: "2026-07-31",
  },
  {
    id: "holdout-ky-01",
    domain: "ky",
    query: "危険予知訓練 KYT 4ラウンド",
    intent: "公式手順確認と実践用KYT導線へ到達する",
    relevantIds: [
      "page-/training/visual-ky",
      "page-/ky-examples",
      "page-/ky/paper",
    ],
    primaryRequiredIds: ["page-/training/visual-ky"],
    dangerousIfMissing: true,
    officialLanding:
      "https://anzeninfo.mhlw.go.jp/yougo/yougo40_1.html",
    officialBasis: "職場のあんぜんサイト「危険予知訓練（KYT）」",
    reviewedAt: "2026-07-31",
  },
  {
    id: "holdout-ky-02",
    domain: "ky",
    query: "KYT 1R 2R 3R 4R 指差し呼称",
    intent: "KYT基礎4ラウンドの実践導線へ到達する",
    relevantIds: [
      "page-/training/visual-ky",
      "page-/ky-examples",
      "page-/ky/paper",
    ],
    primaryRequiredIds: ["page-/training/visual-ky"],
    dangerousIfMissing: true,
    officialLanding:
      "https://www.jisha.or.jp/info/field/zerosai/kyt/file04.html",
    officialBasis: "中央労働災害防止協会「危険予知訓練（KYT）の進め方」",
    reviewedAt: "2026-07-31",
  },
  {
    id: "holdout-zero-01",
    domain: "law",
    query: "労働安全衛生法 第零条の零",
    intent: "存在しない条番号を推測で既存条文へ対応しない",
    relevantIds: [],
    zeroExpected: true,
    officialLanding: "https://elaws.e-gov.go.jp/",
    officialBasis: "存在しない条番号の負例",
    reviewedAt: "2026-07-31",
  },
] as const satisfies readonly SearchHoldoutCase[];
