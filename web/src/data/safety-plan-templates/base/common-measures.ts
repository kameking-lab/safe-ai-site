/**
 * Common safety & health measures applicable to most employers in Japan.
 *
 * Industry templates pull from these helpers and add their own measures on top.
 * References cite article numbers only — full text must not be reproduced
 * verbatim (CLAUDE.md: 法令本文の逐語転載禁止).
 */

import type { SafetyMeasure, ScaleId } from "@/types/safety-plan";

export const commonEducationMeasures: SafetyMeasure[] = [
  {
    category: "education",
    title: "雇入れ時教育",
    description:
      "新規採用者・派遣受入時に、業務内容に応じた危険有害性、機械設備の取扱い、安全装置・保護具、整理整頓、事故時の措置などを教育する。配属前に修了させる。",
    frequency: "雇入れ・配置転換の都度",
    responsible: "人事担当・所属長",
    reference: "安衛法第59条第1項 / 安衛則第35条",
  },
  {
    category: "education",
    title: "作業内容変更時教育",
    description:
      "従事作業の変更、設備・原材料の変更があった場合、変更点に係る危険有害性と防止措置を教育する。",
    frequency: "変更の都度",
    responsible: "所属長",
    reference: "安衛法第59条第2項",
  },
  {
    category: "education",
    title: "管理監督者教育（職長等教育）",
    description:
      "新任職長・班長等の作業指揮者に対し、作業手順の定め方、労働者の適正配置、指導・教育、異常時措置、災害発生時の応急措置を教育する。",
    frequency: "新任時 / 5年毎の再教育",
    responsible: "総括安全衛生管理者 / 衛生管理者",
    reference: "安衛法第60条 / 安衛則第40条",
  },
];

export const commonKyMeasures: SafetyMeasure[] = [
  {
    category: "ky",
    title: "始業前KY（危険予知活動）",
    description:
      "当日の作業内容に基づき、4ラウンド法等で危険要因を洗い出し、対策と行動目標を共有する。所要時間5〜10分。KYボードまたは記録簿に残す。",
    frequency: "毎作業日",
    responsible: "職長 / 作業班長",
  },
  {
    category: "ky",
    title: "ヒヤリハット報告制度",
    description:
      "労働者から提出された事案を月次で集計・分析し、対策を講じる。報告者を非難しない運用を徹底する。",
    frequency: "通年（月次集計）",
    responsible: "安全衛生委員会",
  },
];

export const commonHealthMeasures: SafetyMeasure[] = [
  {
    category: "health-check",
    title: "定期健康診断",
    description:
      "常時使用する労働者に対し1年以内ごとに1回実施。深夜業従事者は6か月以内ごとに1回。結果に基づき就業区分判定と保健指導を実施。",
    frequency: "年1回（深夜業従事者は年2回）",
    responsible: "産業医 / 衛生管理者",
    reference: "安衛法第66条 / 安衛則第44条・第45条",
  },
  {
    category: "health-check",
    title: "ストレスチェック",
    description:
      "常時50人以上の事業場で年1回実施。高ストレス者からの申出があれば医師面接指導を実施する。",
    frequency: "年1回",
    responsible: "ストレスチェック実施者（産業医ほか）",
    reference: "安衛法第66条の10",
  },
  {
    category: "health-check",
    title: "長時間労働者への医師面接指導",
    description:
      "月80時間超の時間外・休日労働があり、かつ申出があった労働者に対し面接指導を実施する。",
    frequency: "申出の都度",
    responsible: "産業医",
    reference: "安衛法第66条の8",
  },
];

export const commonInspectionMeasures: SafetyMeasure[] = [
  {
    category: "inspection",
    title: "衛生管理者の週次巡視",
    description:
      "衛生管理者は少なくとも週1回作業場等を巡視し、設備・作業方法・衛生状態に有害のおそれがあるときは直ちに必要な措置を講ずる。",
    frequency: "週1回",
    responsible: "衛生管理者",
    reference: "安衛則第11条",
  },
  {
    category: "inspection",
    title: "産業医の月次巡視",
    description:
      "産業医は少なくとも月1回（衛生委員会で報告と意見聴取により2か月に1回も可）作業場を巡視する。",
    frequency: "月1回",
    responsible: "産業医",
    reference: "安衛則第15条",
  },
];

export const commonRaMeasures: SafetyMeasure[] = [
  {
    category: "ra",
    title: "化学物質リスクアセスメント",
    description:
      "リスクアセスメント対象物（674物質、令和8年4月時点）の製造・取扱いについて、CREATE-SIMPLE等で見積もり、ばく露低減措置を講ずる。",
    frequency: "新規導入時・作業変更時・年1回見直し",
    responsible: "化学物質管理者",
    reference: "安衛法第57条の3 / 安衛則第34条の2の7",
  },
  {
    category: "ra",
    title: "機械・設備リスクアセスメント",
    description:
      "建設物・設備・原材料・作業方法等を対象に、ISO12100の枠組で危険源同定→リスク見積→低減措置を実施する。",
    frequency: "新規導入時・年1回見直し",
    responsible: "安全管理者 / 設備担当",
    reference: "安衛法第28条の2",
  },
];

export const commonDrillMeasures: SafetyMeasure[] = [
  {
    category: "drill",
    title: "消防訓練（避難・通報・初期消火）",
    description:
      "消防計画に基づき避難訓練・通報訓練・初期消火訓練を実施し、結果を消防署へ報告する（特定防火対象物は半年に1回以上）。",
    frequency: "年1〜2回",
    responsible: "防火管理者",
    reference: "消防法第8条 / 消防法施行規則第3条",
  },
  {
    category: "drill",
    title: "救命講習（普通救命講習）",
    description:
      "心肺蘇生・AED使用法・止血法等を消防本部の協力で実施。3年に1回の再講習が推奨される。",
    frequency: "3年に1回",
    responsible: "衛生管理者",
  },
];

export const commonCommitteeMeasures: SafetyMeasure[] = [
  {
    category: "committee",
    title: "安全衛生委員会の運営",
    description:
      "委員会を毎月1回以上開催し、議事録を3年間保存する。委員は労使同数・労働者側は過半数労働者代表が指名。",
    frequency: "月1回",
    responsible: "事業者 / 議長",
    reference: "安衛法第17〜19条 / 安衛則第23条",
  },
];

export const smallScaleAdditions: SafetyMeasure[] = [
  {
    category: "committee",
    title: "安全衛生推進者（または衛生推進者）の選任",
    description:
      "10〜49人規模では安全衛生推進者（業種により衛生推進者）を選任し、安全衛生業務の担当者として明示する。氏名を労働者に周知する。",
    frequency: "選任時 / 異動時",
    responsible: "事業者",
    reference: "安衛法第12条の2 / 安衛則第12条の2〜第12条の4",
  },
  {
    category: "committee",
    title: "安全衛生に関する関係者の意見聴取",
    description:
      "委員会の設置義務がない事業場では、安全衛生に関する事項について関係労働者の意見を聴く機会を設ける。",
    frequency: "月1回相当",
    responsible: "事業者 / 推進者",
    reference: "安衛則第23条の2",
  },
];

export const mediumScaleAdditions: SafetyMeasure[] = [
  {
    category: "committee",
    title: "衛生管理者の選任",
    description:
      "常時使用する労働者数50人〜200人で衛生管理者1人以上。免許または資格者から選任し、14日以内に所轄労基署へ報告する。",
    frequency: "選任時 / 退職時の14日以内",
    responsible: "事業者",
    reference: "安衛法第12条 / 安衛則第7条",
  },
  {
    category: "committee",
    title: "産業医の選任",
    description:
      "常時使用する労働者数50人以上で産業医1人以上。1,000人以上または有害業務500人以上で専属産業医。",
    frequency: "選任時",
    responsible: "事業者",
    reference: "安衛法第13条 / 安衛則第13条",
  },
];

export const largeScaleAdditions: SafetyMeasure[] = [
  {
    category: "committee",
    title: "総括安全衛生管理者の選任",
    description:
      "業種により常時使用する労働者数100/300/1000人以上で総括安全衛生管理者を選任。事業の実施を統括管理する者から選任する。",
    frequency: "選任時 / 異動時の14日以内",
    responsible: "事業者",
    reference: "安衛法第10条 / 安衛令第2条",
  },
  {
    category: "committee",
    title: "衛生管理者の複数選任",
    description:
      "労働者数に応じて衛生管理者を増員（201〜500人で2人、501〜1,000人で3人、1,001〜2,000人で4人、2,001〜3,000人で5人、3,001人以上で6人）。1,001人以上では1人を専任とする。",
    frequency: "選任時 / 異動時",
    responsible: "事業者",
    reference: "安衛則第7条第1項第4号",
  },
  {
    category: "committee",
    title: "産業医の複数選任・専属化",
    description:
      "3,001人以上で2人以上の産業医。1,000人以上（または有害業務500人以上）で専属産業医。",
    frequency: "選任時",
    responsible: "事業者",
    reference: "安衛則第13条",
  },
];

export function getScaleAdditions(scale: ScaleId): SafetyMeasure[] {
  if (scale === "small") return smallScaleAdditions;
  if (scale === "medium") return mediumScaleAdditions;
  return largeScaleAdditions;
}

/** Combined base measures that nearly every industry needs. */
export const baseSafetyMeasures: SafetyMeasure[] = [
  ...commonEducationMeasures,
  ...commonKyMeasures,
  ...commonHealthMeasures,
  ...commonInspectionMeasures,
  ...commonRaMeasures,
  ...commonDrillMeasures,
  ...commonCommitteeMeasures,
];
