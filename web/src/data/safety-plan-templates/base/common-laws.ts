/**
 * Law and circular references common to most industries.
 *
 * Summaries are paraphrased — full statutory text is not reproduced
 * (CLAUDE.md: 法令本文の逐語転載禁止).
 */

import type { CircularReference, LawReference, ScaleId } from "@/types/safety-plan";

export const commonLawReferences: LawReference[] = [
  {
    name: "労働安全衛生法",
    articles: [
      "第3条（事業者の責務）",
      "第10条（総括安全衛生管理者）",
      "第12条（衛生管理者）",
      "第13条（産業医）",
      "第18条（衛生委員会）",
      "第28条の2（リスクアセスメント）",
      "第59条（安全衛生教育）",
      "第60条（職長等の教育）",
      "第65条（作業環境測定）",
      "第66条（健康診断）",
      "第66条の10（ストレスチェック）",
    ],
    summary:
      "労働災害の防止のための事業者の責務、安全衛生管理体制、リスクアセスメント、教育、健康診断、ストレスチェック等の基本枠組を定める法律。",
  },
  {
    name: "労働安全衛生規則",
    articles: [
      "第7条（衛生管理者の選任）",
      "第11条（衛生管理者の職務・週次巡視）",
      "第13条（産業医の選任）",
      "第15条（産業医の月次巡視）",
      "第23条（衛生委員会等の付議事項）",
      "第35条（雇入れ時等教育）",
      "第44条（定期健康診断）",
      "第612条の2（熱中症の重篤化防止）",
    ],
    summary:
      "労働安全衛生法の委任を受け、選任手続・教育内容・健康診断項目・作業環境・特定業務などの詳細を定める省令。",
  },
  {
    name: "労働基準法",
    articles: [
      "第32条（労働時間）",
      "第36条（時間外労働協定）",
      "第65条（産前産後）",
      "第68条（生理日の措置）",
    ],
    summary:
      "労働時間・休憩・休日・年休等の労働条件の最低基準を定める法律。安全衛生計画では時間外労働の上限と勤務間インターバル運用が論点となる。",
  },
  {
    name: "じん肺法",
    articles: ["第7条〜第10条（じん肺健康診断）"],
    summary:
      "粉じん作業に従事する労働者のじん肺健康診断、管理区分決定、合併症対策等を定める法律。粉じん作業がある事業場で運用する。",
  },
];

export const commonCircularReferences: CircularReference[] = [
  {
    number: "基発0301第1号",
    date: "2024-03-01",
    title: "化学物質管理に係る労働安全衛生規則等の改正に伴う化学物質管理者・保護具着用管理責任者の選任等の運用について",
  },
  {
    number: "基発0401第2号",
    date: "2025-04-01",
    title: "事業場における労働者の健康保持増進のための指針（THP指針）の運用について",
  },
  {
    number: "基発0531第1号",
    date: "2025-05-31",
    title: "職場における熱中症予防対策の徹底について（重篤化防止のための措置義務化）",
  },
  {
    number: "基発0930第3号",
    date: "2024-09-30",
    title: "心理的負担の程度を把握するための検査（ストレスチェック）の実施について",
  },
];

/**
 * Scale-applicability law overlay.
 *
 * Adds articles and summaries that hinge on headcount thresholds: small uses
 * 推進者 framework, medium adds 衛生管理者・産業医・委員会, large adds
 * 総括安全衛生管理者・専属産業医・複数衛生管理者.
 */
const SMALL_SCALE_LAWS: LawReference[] = [
  {
    name: "労働安全衛生法（小規模事業場の体制）",
    articles: [
      "第12条の2（安全衛生推進者・衛生推進者）",
    ],
    summary:
      "常時10〜49人規模では衛生推進者（業種により安全衛生推進者）の選任が必要。氏名を労働者に周知し、安全衛生業務を担当させる。",
  },
  {
    name: "労働安全衛生規則（小規模事業場運用）",
    articles: [
      "第12条の2〜第12条の4（推進者の選任要件・職務）",
      "第23条の2（労働者の意見聴取の機会）",
    ],
    summary:
      "推進者の選任要件・資格・業務範囲、および委員会設置義務がない事業場での意見聴取の機会確保を定める。",
  },
];

const MEDIUM_SCALE_LAWS: LawReference[] = [
  {
    name: "労働安全衛生法（中規模事業場の体制）",
    articles: [
      "第12条（衛生管理者の選任）",
      "第13条（産業医の選任）",
      "第18条（衛生委員会）",
      "第66条の10（ストレスチェック）",
    ],
    summary:
      "常時50人以上で衛生管理者・産業医・衛生委員会・ストレスチェック実施が義務化。選任・実施結果は所轄労基署へ報告。",
  },
];

const LARGE_SCALE_LAWS: LawReference[] = [
  {
    name: "労働安全衛生法（大規模事業場の体制）",
    articles: [
      "第10条（総括安全衛生管理者）",
      "第13条第1項第2号（専属産業医）",
    ],
    summary:
      "業種により常時100/300/1000人以上で総括安全衛生管理者選任。1,000人以上または有害業務500人以上で専属産業医、3,001人以上で2人以上の産業医が必要。",
  },
  {
    name: "労働安全衛生規則（大規模事業場運用）",
    articles: [
      "第7条第1項第4号（衛生管理者の複数選任）",
      "第13条第1項（産業医の専属・複数選任）",
    ],
    summary:
      "労働者数に応じた衛生管理者の複数選任・専任化、産業医の専属・複数選任の要件を定める。",
  },
];

export function getScaleLawReferences(scale: ScaleId): LawReference[] {
  if (scale === "small") return SMALL_SCALE_LAWS;
  if (scale === "medium") return MEDIUM_SCALE_LAWS;
  return LARGE_SCALE_LAWS;
}

const SMALL_SCALE_CIRCULARS: CircularReference[] = [
  {
    number: "基発1018第1号",
    date: "2023-10-18",
    title: "小規模事業場における産業保健活動の推進について（地域産業保健センターの活用）",
  },
];

const MEDIUM_SCALE_CIRCULARS: CircularReference[] = [
  {
    number: "基発0405第2号",
    date: "2024-04-05",
    title: "事業場における労働者の健康保持増進のための指針の運用について（中規模事業場対象）",
  },
];

const LARGE_SCALE_CIRCULARS: CircularReference[] = [
  {
    number: "基発0331第8号",
    date: "2024-03-31",
    title: "労働安全衛生マネジメントシステム（JIS Q 45100）の普及推進について",
  },
];

export function getScaleCircularReferences(scale: ScaleId): CircularReference[] {
  if (scale === "small") return SMALL_SCALE_CIRCULARS;
  if (scale === "medium") return MEDIUM_SCALE_CIRCULARS;
  return LARGE_SCALE_CIRCULARS;
}
