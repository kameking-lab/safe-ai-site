import { allLawArticles } from "@/data/laws";
import { realAccidentCases } from "@/data/mock/real-accident-cases";
import { realAccidentCasesExtra } from "@/data/mock/real-accident-cases-extra";
import { realAccidentCasesExtra2 } from "@/data/mock/real-accident-cases-extra2";
import { realAccidentCasesExtra3 } from "@/data/mock/real-accident-cases-extra3";
import { realAccidentCasesDiverseIndustries } from "@/data/mock/real-accident-cases-diverse-industries";

const _siteCuratedCaseCount =
  realAccidentCases.length +
  realAccidentCasesExtra.length +
  realAccidentCasesExtra2.length +
  realAccidentCasesExtra3.length +
  realAccidentCasesDiverseIndustries.length;

/**
 * サイト全体で表示する KPI 数字を一元管理。
 * ページごとに別々にハードコードすると不整合が生じるため、ここから参照すること。
 */
export const SITE_STATS = {
  /** 厚労省 職場のあんぜんサイト 事故データベース収録件数（2006〜2021・月別 jsonl 集計） */
  accidentDbCount: "504,415",
  /** 厚労省 死亡災害データベース収録件数（2019〜2023・5年分） */
  mhlwDeathsCount: "4,043",
  /** data/accidents-10years.jsonl 統合件数（2015〜2024・死亡災害DB＋curated事例） */
  accidents10yCount: "4,257",
  /** data/law-updates-10years.jsonl 統合件数（2015〜2024・労働安全衛生関連法令改正） */
  lawUpdates10yCount: "31",
  /** 死亡労災件数（令和5年・建設業）厚労省統計 */
  fatalDisastersR5: "1,389",
  /** サイト独自に curated した詳細事故事例の件数（real-accident-cases* 全合算） */
  siteCuratedCaseCount: _siteCuratedCaseCount.toLocaleString(),
  /** 厚労省 化学物質情報データベース 取込件数 */
  chemicalsMhlwCount: "3,984",
  /** /law-search に収録された全条文件数（curated 33法令+） */
  lawArticleCount: allLawArticles.length.toLocaleString(),
  /** RAG 検索（chatbot/法令要約）対応の全条文数（curated + 厚労省PDF抽出フィルタ後） */
  ragArticleCount: allLawArticles.length.toLocaleString(),
  /** 対応教育の種類数（特別教育・法定・労働衛生、要相談含む） */
  specialEdKinds: "12+",
} as const;

/**
 * 各統計値の出典・取得日（YYYY-MM）。サイト上にツールチップ／脚注として表示する。
 * 数字を更新するときは asOf も合わせて更新すること。
 */
export type SiteStatKey = keyof typeof SITE_STATS;

export const SITE_STATS_META: Record<
  SiteStatKey,
  { source: string; sourceUrl?: string; asOf: string }
> = {
  accidentDbCount: {
    source: "厚労省 職場のあんぜんサイト 死傷災害データベース（2006〜2021・月別集計）",
    sourceUrl: "https://anzeninfo.mhlw.go.jp/anzen_pg/SAI_DET.aspx",
    asOf: "2026-01",
  },
  mhlwDeathsCount: {
    source: "厚労省 死亡災害データベース（2019〜2023・5年分）",
    sourceUrl: "https://anzeninfo.mhlw.go.jp/anzen_pg/SHISHO_FND.aspx",
    asOf: "2026-01",
  },
  accidents10yCount: {
    source: "ANZEN AI ETL: data/accidents-10years.jsonl（厚労省死亡災害DB＋curated事例の10年統合）",
    sourceUrl: "https://anzeninfo.mhlw.go.jp/anzen_pg/SHISHO_FND.aspx",
    asOf: "2026-04",
  },
  lawUpdates10yCount: {
    source: "ANZEN AI ETL: data/law-updates-10years.jsonl（e-Gov・厚労省通達の10年統合）",
    sourceUrl: "https://laws.e-gov.go.jp/",
    asOf: "2026-04",
  },
  fatalDisastersR5: {
    source: "厚労省『令和5年労働災害発生状況』建設業計",
    sourceUrl: "https://www.mhlw.go.jp/stf/newpage_38791.html",
    asOf: "2024-05",
  },
  siteCuratedCaseCount: {
    source: "ANZEN AI 編集部による厚労省事例DBから curated した詳細事例集",
    asOf: "2026-04",
  },
  chemicalsMhlwCount: {
    source: "厚労省 職場のあんぜんサイト 化学物質情報",
    sourceUrl: "https://anzeninfo.mhlw.go.jp/anzen/kag/kag_index.html",
    asOf: "2026-04",
  },
  lawArticleCount: {
    source: "e-Gov 法令検索（curated 主要33法令）",
    sourceUrl: "https://laws.e-gov.go.jp/",
    asOf: "2026-04",
  },
  ragArticleCount: {
    source: "ANZEN AI RAG（curated 33法令 + 厚労省PDF抽出フィルタ後インデックス）",
    asOf: "2026-04",
  },
  specialEdKinds: {
    source: "安衛則第36条／酸欠則／粉じん則ほか（要相談含む）",
    asOf: "2026-04",
  },
};
