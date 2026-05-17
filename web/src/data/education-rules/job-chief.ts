/**
 * 職長教育データベース
 * Legal basis: 労働安全衛生法第60条・安衛則第40条
 * 製造業等特定業種で新たに職長等になる者への安全衛生教育
 */

import type { EducationCert } from "@/types/education-cert";

export const JOB_CHIEF_EDUCATION: EducationCert[] = [
  {
    id: "jc-standard",
    name: "職長・安全衛生責任者教育",
    certType: "job_chief",
    targetWork: "製造業等（建設業・製造業・電気業・ガス業・自動車整備業・機械修理業）において新たに職長等になる者",
    relatedLaw: "安衛法第60条・安衛則第40条",
    duration: "12時間以上（学科12h）",
    frequency: "概ね5年ごとに能力向上教育を受けることが推奨される",
    workCategories: ["construction", "manufacturing", "electrical", "general"],
    keywords: ["職長", "安全衛生責任者", "班長", "職長教育", "リーダー", "工事現場"],
    notes: "対象業種: 建設・製造・電気・ガス・熱供給・水道・通信・各種商品小売（一部）・家具製造・自動車整備・機械修理など",
  },
  {
    id: "jc-construction",
    name: "建設業向け職長・安全衛生責任者教育",
    certType: "job_chief",
    targetWork: "建設工事現場において職長・安全衛生責任者の職に就く者",
    relatedLaw: "安衛法第60条・安衛則第40条・建設業労働災害防止規程",
    duration: "14時間以上（学科12h＋実技2h、建設業向け拡充版）",
    frequency: "概ね5年ごとに能力向上教育（職長等のためのリスクアセスメント等教育）",
    workCategories: ["construction"],
    keywords: ["職長", "安全衛生責任者", "現場監督補助", "班長", "建設現場"],
    notes: "建設業では元方事業者から協力会社職長に対しても教育指示が求められる（安衛法第29条の2）",
  },
  {
    id: "jc-upgrade",
    name: "職長等のためのリスクアセスメント等に関する教育（能力向上）",
    certType: "job_chief",
    targetWork: "既に職長・安全衛生責任者教育を修了した者への能力向上教育",
    relatedLaw: "安衛法第19条の2・安衛則第40条",
    duration: "7時間以上",
    frequency: "職長教育修了後概ね5年ごと",
    workCategories: ["construction", "manufacturing", "electrical", "general"],
    keywords: ["職長能力向上", "リスクアセスメント", "職長再教育", "スキルアップ"],
    notes: "化学物質リスクアセスメントの実施義務化（令和5年4月）に伴い内容が拡充",
  },
  {
    id: "jc-supervisor",
    name: "安全管理者選任時研修",
    certType: "job_chief",
    targetWork: "安全管理者として新たに選任された者（常時50人以上の事業場）",
    relatedLaw: "安衛法第11条・安衛則第5条",
    duration: "9時間以上（学科9h）",
    workCategories: ["manufacturing", "construction", "general"],
    keywords: ["安全管理者", "安全管理", "選任研修"],
    notes: "安全管理者は一定の学歴・経験要件または試験合格が必要（安衛則第5条）",
  },
  {
    id: "jc-health-supervisor",
    name: "衛生管理者選任時研修",
    certType: "job_chief",
    targetWork: "衛生管理者として新たに選任された者（常時50人以上の事業場）",
    relatedLaw: "安衛法第12条・安衛則第10条",
    duration: "9時間以上（学科9h）",
    workCategories: ["general"],
    keywords: ["衛生管理者", "衛生管理", "選任研修"],
    notes: "衛生管理者免許（第一種・第二種）または医師・歯科医師免許等が必要",
  },
  {
    id: "jc-safety-officer",
    name: "安全衛生推進者・衛生推進者養成講習",
    certType: "job_chief",
    targetWork: "常時10人以上50人未満の事業場の安全衛生推進者または衛生推進者",
    relatedLaw: "安衛法第12条の2・安衛則第12条の2",
    duration: "11時間以上",
    workCategories: ["general"],
    keywords: ["安全衛生推進者", "衛生推進者", "小規模事業場"],
    notes: "安全管理者・衛生管理者の選任義務がない小規模事業場での推進者向け",
  },
];
