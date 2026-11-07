import { OFFICIAL_ACCIDENT_SNAPSHOT as snapshot } from "@/data/accidents/official-current";
import {
  filterSeriousCases,
  getGeneralMeasures,
  getSeriousCaseSource,
  SERIOUS_CASES_META,
} from "@/lib/accident-news/serious-cases";

function ymd(value: string | undefined): string {
  return value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? "確認日不明";
}

function shortSummary(value: string, max = 96): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length <= max ? compact : `${compact.slice(0, max - 1)}…`;
}

export type HomeAccidentPreview = ReturnType<
  typeof buildHomeAccidentPreview
>;

export function buildHomeAccidentPreview() {
  const cases = filterSeriousCases({ limit: 3, year: 2023 }).map((record) => ({
    id: record.id,
    occurrence: `${record.year}-${String(record.month ?? 1).padStart(2, "0")}`,
    industry: record.industry ?? "業種未確認",
    accidentType: record.type ?? "事故型未確認",
    title: `${record.industryMedium ?? record.industry ?? "業種未確認"}の${record.type ?? "死亡災害"}`,
    summary: shortSummary(record.description),
    measure: shortSummary(getGeneralMeasures(record.type), 72),
    sourceLabel: getSeriousCaseSource(record).label,
    sourceUrl: getSeriousCaseSource(record).url,
    status: "official / dataset-only",
  }));
  return {
    featured: {
      checkedAt: snapshot.verifiedAt,
      period: `${Number(snapshot.occurredThrough.slice(0, 4))}年1月1日〜${Number(snapshot.occurredThrough.slice(5, 7))}月${Number(snapshot.occurredThrough.slice(8, 10))}日発生・${snapshot.label}`,
      deaths: snapshot.deaths.total,
      injuries: snapshot.injuries.total,
      topFatalIndustries: snapshot.fatalIndustries.slice(0, 3),
      topInjuryIndustries: snapshot.injuryIndustries.slice(0, 3),
      sourceLabel: snapshot.sourceLabel,
      sourceUrl: snapshot.sourcePdfUrl,
      status: "official / preliminary / aggregate",
      synthetic: false,
    },
    cases,
    detailedRange: SERIOUS_CASES_META.yearRange,
    detailedGeneratedAt: ymd(SERIOUS_CASES_META.generatedAt ?? undefined),
  };
}

export const HOME_FEATURED_LAW_REFORM = {
  id: "mhlw-ordinance-86-2026",
  title:
    "産業医が辞任・解任・退任したときの労働基準監督署への報告",
  officialTitle:
    "労働安全衛生規則の一部を改正する省令（令和8年厚生労働省令第86号）",
  promulgatedAt: "2026-04-28",
  effectiveAt: "2026-08-01",
  target:
    "産業医の選任義務がある事業場の事業者",
  change:
    "産業医が辞任・解任・退任した場合、所轄労働基準監督署長への報告が必要になります。",
  action:
    "報告担当・電子申請経路・社内の退任連絡手順を確認する。",
  sourceUrl:
    "https://www.mhlw.go.jp/web/t_doc?dataId=00td0095&dataType=1&pageNo=1",
  sourceLabel: "厚生労働省 法令等データベース",
  checkedAt: "2026-07-31",
  status: "施行中",
  sourceState: "一次資料確認済み",
} as const;

export const HOME_ADDITIONAL_LAW_REFORMS = [
  {
    id: "new-chemical-electronic-2026",
    title: "新規化学物質関係5手続の電子申請原則化",
    effectiveAt: "2026-07-01",
    target: "新規化学物質を製造・輸入する事業者等",
    action: "対象手続と電子申請アカウント・社内担当を確認",
    status: "施行済み",
    sourceUrl:
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/anzen/anzeneisei06/01h_00003.html",
  },
  {
    id: "health-check-ordinance-89-2026",
    title: "一般健康診断の検査項目・様式の見直し",
    effectiveAt: "2027-04-01",
    target: "一般健康診断を実施する事業者等",
    action: "健診機関との契約項目と社内様式の改定時期を確認",
    status: "将来施行",
    sourceUrl:
      "https://www.mhlw.go.jp/web/t_doc?dataId=00td0096&dataType=1&pageNo=1",
  },
] as const;
