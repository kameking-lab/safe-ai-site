import type { InterviewFlowStep, JobClass } from "@/types/mental-health";

/**
 * Standard high-stress worker interview flow.
 *
 * Sequence: stress-check result notification → worker self-decision → request
 * for physician interview → physician opinion → employer post-interview
 * measures → follow-up review.
 *
 * Deadline days are measured from the previous step's completion. The 30-day
 * ceiling on physician interview after a worker's request reflects the
 * "おおむね1ヶ月以内" guidance from MHLW's implementation manual.
 */
export const INTERVIEW_FLOW_STEPS: InterviewFlowStep[] = [
  {
    no: 1,
    title: "結果通知の受領",
    body: "実施者から本人へ直接、ストレスチェック結果が通知される。高ストレスと判定された場合は、医師面接申出の対象である旨と申出方法を併せて受領する。",
    deadlineDays: null,
    owner: "implementer",
  },
  {
    no: 2,
    title: "本人による面接申出",
    body: "高ストレスと判定された労働者は、希望に応じて事業者へ面接指導を申し出る。申出様式は厚労省サンプルがある。申出は実施から概ね1ヶ月以内が目安。",
    deadlineDays: 30,
    owner: "worker",
  },
  {
    no: 3,
    title: "事業者による医師面接の調整",
    body: "申出を受けた事業者は、本人の同意のもとで結果情報を医師に提供。産業医（嘱託・選任）または50人未満ならさんぽセンター登録医師と面接日程を調整する。",
    deadlineDays: 14,
    owner: "employer",
  },
  {
    no: 4,
    title: "医師による面接指導の実施",
    body: "医師は本人の心身状態・勤務状況・職場環境を聴取。必要に応じて主治医情報を本人同意のうえ参照。面接時間はおおむね30〜60分が目安。",
    deadlineDays: 30,
    owner: "industrial-physician",
  },
  {
    no: 5,
    title: "医師意見書の作成・提出",
    body: "医師は就業上の措置の必要性と内容（労働時間短縮・配置転換・深夜業制限・通院配慮 等）について意見を文書化し、事業者へ提出する。",
    deadlineDays: 14,
    owner: "industrial-physician",
  },
  {
    no: 6,
    title: "事後措置の検討・決定",
    body: "事業者は医師意見をふまえ、必要な就業上の措置を本人と協議のうえ決定。措置の開始日・期間・終了条件を文書化する。",
    deadlineDays: 14,
    owner: "employer",
  },
  {
    no: 7,
    title: "措置の実施と職場周知",
    body: "決定した措置を実施。直属上司・所属長へは措置内容のみ（病状・診断は伝えない）を伝達し、業務分担調整を依頼する。",
    deadlineDays: 7,
    owner: "employer",
  },
  {
    no: 8,
    title: "経過観察と見直し",
    body: "措置開始後おおむね3ヶ月で本人・医師・人事の三者で経過確認。措置の延長・縮小・解除を判断し、結果を記録（5年保存）。",
    deadlineDays: 90,
    owner: "employer",
  },
];

/**
 * Recipient template for the physician opinion form (医師意見書).
 *
 * The fields mirror MHLW reference form 様式集「面接指導結果報告書及び事後措置に
 * 係る意見書」 — simplified to operational categories so HR can adapt to their
 * own form layout. No medical content is templated; the physician fills the
 * clinical sections themselves.
 */
export const PHYSICIAN_OPINION_TEMPLATE = {
  recipient: "○○株式会社 代表取締役 御中（写：人事部・産業医）",
  workerFields: [
    "氏名・所属・職種",
    "面接指導実施日",
    "勤続年数",
    "直近1ヶ月の時間外労働時間（自己申告および勤怠記録）",
  ],
  fitnessAssessment: [
    "現時点での就業可否（就業可・条件付き就業可・就業不可）",
    "条件付き就業可の場合、主な制限事項と理由",
    "勤務継続可能性の見通し",
  ],
  recommendedMeasures: [
    "時間外労働の制限（上限時間）",
    "深夜業・休日労働の禁止／制限",
    "出張・運転業務の可否",
    "配置転換の必要性（短期／中長期）",
    "在宅勤務・短時間勤務の活用可否",
    "通院日・休暇取得への配慮",
  ],
  observationPoints: [
    "再悪化を疑わせる兆候として職場が察知すべき項目",
    "服薬・治療継続にあたっての職場側の配慮事項",
    "緊急時の連絡先と対応手順",
  ],
  reviewSchedule:
    "次回の意見書更新は概ね○ヶ月後を予定。状況変化があった場合は随時連絡。",
} as const;

/**
 * Job-class-specific overlay for post-interview measures. Used by the flow
 * engine to tailor work-restriction recommendations.
 */
export const JOB_CLASS_OVERLAY: Record<JobClass, string[]> = {
  office: [
    "VDT作業時間の上限を設定し、連続作業1時間ごとに10〜15分の休止を確保",
    "繁忙期のメール・チャット業務量を再配分",
  ],
  field: [
    "高所作業・玉掛け・足場組立等の有資格作業からの一時的除外",
    "屋外暴露時間と熱中症リスク作業の縮減",
  ],
  driving: [
    "意識消失リスクを伴う症状・服薬の場合は運転業務の可否を慎重判定",
    "長距離・夜間運転を一時的に他者へ振替",
  ],
  "shift-work": [
    "深夜・準夜勤シフトを一時的に除外し、日勤主体へ変更",
    "連続勤務日数の上限設定と勤務間インターバルの確保",
  ],
  healthcare: [
    "夜勤・当直・隔離室対応の一時的除外",
    "看取り・終末期ケアの精神的負荷の高い業務の分散",
  ],
  service: [
    "カスタマーハラスメント対応マニュアルに沿った接客中断・上長交代の運用",
    "クレーム対応窓口・営業時間外対応からの一時的除外",
  ],
};
