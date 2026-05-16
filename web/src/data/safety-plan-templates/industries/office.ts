/**
 * 事務系（情報通信・金融・士業・コンサル等） / Office-based industries.
 *
 * Leading concerns: メンタルヘルス（長時間労働・ハラスメント）、VDT作業による眼精疲労・腰痛、
 * テレワーク環境、勤務間インターバル、健康診断事後措置。
 */

import type {
  CircularReference,
  LawReference,
  MonthIndex,
  MonthlyEvent,
  SafetyGoal,
  SafetyMeasure,
} from "@/types/safety-plan";

export const officeIndustryGoals: SafetyGoal[] = [
  {
    category: "mental-health",
    title: "メンタル不調による休業の削減",
    description:
      "長時間労働・ハラスメント・テレワーク孤立を起因とするメンタル不調による休業を削減する。ラインケア研修、相談窓口、復職プログラムを整備する。",
    target: "メンタル休業者数 前年比 30% 減",
    kpi: "休業者数 / 復職率 / 相談窓口利用件数",
  },
  {
    category: "health-promotion",
    title: "VDT作業者の眼精疲労・肩こり・腰痛対策",
    description:
      "「情報機器作業における労働衛生管理のためのガイドライン」に基づき、作業環境・連続作業時間・健康管理を整備する。",
    target: "VDT健康相談 100% 受診（希望者）",
    kpi: "VDT健康相談件数 / 改善対応件数",
  },
  {
    category: "compliance",
    title: "長時間労働の削減と勤務間インターバル",
    description:
      "36協定の特別条項適用を最小化し、勤務間インターバル11時間以上を運用する。",
    target: "月80時間超え 0件 / インターバル違反 0件",
    kpi: "時間外労働時間 / インターバル運用状況",
  },
];

export const officeIndustryMeasures: SafetyMeasure[] = [
  {
    category: "industry-specific",
    title: "情報機器作業（VDT）の健康管理",
    description:
      "連続作業時間1時間以内・作業休止時間10〜15分の運用、画面照度・採光・椅子高の調整、VDT健康診断（希望者・対象者）を実施。",
    frequency: "通年 / 健診は年1回",
    responsible: "衛生管理者 / 産業医",
    reference: "情報機器作業ガイドライン（基発0712第3号）",
  },
  {
    category: "industry-specific",
    title: "テレワーク勤務者の安全衛生管理",
    description:
      "テレワーク作業環境チェックリストの提供、勤務時間管理、長時間労働防止、メンタル相談窓口、年1回のオフィス出社による健診を運用。",
    frequency: "通年 / チェックは半期に1回",
    responsible: "総務 / 衛生管理者",
    reference: "テレワークの適切な導入及び実施の推進のためのガイドライン",
  },
  {
    category: "industry-specific",
    title: "ラインケア・セルフケア研修",
    description:
      "管理職向けラインケア研修（部下の早期発見・声かけ・つなぎ方）と全社員向けセルフケア研修を年1回以上実施する。",
    frequency: "年1回",
    responsible: "人事 / 産業医",
    reference: "労働者の心の健康の保持増進のための指針",
  },
  {
    category: "industry-specific",
    title: "ハラスメント防止と相談窓口",
    description:
      "パワハラ・セクハラ・マタハラ・カスハラの防止方針表明、研修、相談窓口（社内・社外2系統）、調査と対応プロセスを整備する。",
    frequency: "通年 / 研修は年1回",
    responsible: "人事 / コンプライアンス",
    reference: "労働施策総合推進法第30条の2 / 男女雇用機会均等法第11条",
  },
  {
    category: "industry-specific",
    title: "長時間労働対策・勤務間インターバル",
    description:
      "36協定の遵守、月45時間・年360時間の原則順守、月80時間超の医師面接指導、勤務間インターバル11時間以上の運用を行う。",
    frequency: "通年",
    responsible: "労務担当 / 産業医",
    reference: "労基法第36条 / 安衛法第66条の8",
  },
];

export const officeMonthlyExtras: Partial<Record<MonthIndex, MonthlyEvent[]>> = {
  4: [
    {
      title: "新入社員 ラインケア・セルフケア研修",
      category: "education",
      description:
        "新入社員にセルフケア（ストレス対処・相談窓口）研修、配属先管理職にラインケア研修を実施。",
      required: false,
    },
  ],
  5: [
    {
      title: "VDT健康診断（希望者）",
      category: "health-check",
      description:
        "情報機器作業者の希望者に対し眼科健診・上肢障害健診を案内し受診を促す。",
      required: false,
    },
  ],
  11: [
    {
      title: "過労死等防止啓発月間 強化",
      category: "industry-specific",
      description:
        "長時間労働者リストの精査、勤務間インターバル運用状況の点検、産業医面談の促進。",
      required: true,
    },
  ],
};

export const officeLawReferences: LawReference[] = [
  {
    name: "労働安全衛生法",
    articles: [
      "第66条の8（医師面接指導）",
      "第66条の10（ストレスチェック）",
      "第69条（健康保持増進のための措置）",
    ],
    summary:
      "事務系職場で論点となりやすい長時間労働者の面接指導、ストレスチェック、健康保持増進措置を定める。",
  },
  {
    name: "労働基準法",
    articles: ["第32条（労働時間）", "第36条（時間外労働協定）"],
    summary:
      "労働時間の原則と上限規制、36協定の枠組を定める。",
  },
  {
    name: "労働施策総合推進法",
    articles: ["第30条の2（パワーハラスメント防止措置）"],
    summary:
      "事業主に対し、パワハラ防止のための雇用管理上必要な措置を義務付ける。",
  },
  {
    name: "男女雇用機会均等法",
    articles: ["第11条（セクシュアルハラスメント防止）"],
    summary:
      "セクハラ防止のための雇用管理上必要な措置を義務付ける。",
  },
];

export const officeCircularReferences: CircularReference[] = [
  {
    number: "基発0712第3号",
    date: "2019-07-12",
    title: "情報機器作業における労働衛生管理のためのガイドラインについて",
  },
  {
    number: "雇均発1101第1号",
    date: "2022-11-01",
    title: "テレワークの適切な導入及び実施の推進のためのガイドラインの周知について",
  },
];

export const officeBasicPolicy = `当社は「心身の不調を早く把握し、孤立を生まない」を方針とし、メンタル不調による休業の削減、VDT作業による健康被害ゼロ、ハラスメントゼロを目指す。ラインケア・セルフケアの定着、テレワークを含む労務管理、長時間労働の抑制と勤務間インターバルの運用を通じて、社員が長く健康に働ける職場を実現する。`;
