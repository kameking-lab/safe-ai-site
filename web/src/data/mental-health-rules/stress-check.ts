import type {
  StressCheckProcedureStep,
  StressCheckRequirement,
} from "@/types/mental-health";

/**
 * Stress-check program requirements.
 *
 * Each entry corresponds to one of the 11 baseline items that an employer
 * subject to the stress-check obligation (50+ regular employees) must satisfy
 * to comply with 労働安全衛生法 第66条の10 and the implementing rules in
 * 労働安全衛生規則 第52条の9〜21.
 *
 * `appliesTo` distinguishes mandatory items from the sub-50 effort-duty track:
 * the latter excludes the labour-standards inspection-office reporting and
 * relaxes the group-analysis recommendation, but retains the privacy safeguards
 * and the high-stress interview pathway.
 *
 * The text is the author's plain-language operational summary. Quoting law
 * verbatim is avoided to keep the dataset workable as authoring evolves.
 */
export const STRESS_CHECK_REQUIREMENTS: StressCheckRequirement[] = [
  {
    id: "policy-document",
    label: "実施方針の策定と周知",
    description:
      "事業者は衛生委員会の調査審議を経て、実施方針（実施時期・対象者・実施者・実施事務従事者・結果取扱方法等）を文書化し、労働者へ周知する。",
    ruleArticles: ["安衛則 第52条の9"],
    appliesTo: ["mandatory", "effort-duty"],
    baseline: true,
  },
  {
    id: "designate-implementer",
    label: "実施者の指名",
    description:
      "医師・保健師・厚生労働大臣が定める研修を修了した歯科医師・看護師・精神保健福祉士・公認心理師から実施者を指名する。実施者は企画立案と結果評価を担う。",
    ruleArticles: ["安衛則 第52条の10"],
    appliesTo: ["mandatory", "effort-duty"],
    baseline: true,
  },
  {
    id: "annual-frequency",
    label: "年1回以上の実施",
    description:
      "常時使用する労働者に対し、1年以内ごとに1回ストレスチェックを実施する。受検は労働者の任意（罰則による強制不可）。",
    ruleArticles: ["安衛則 第52条の9"],
    appliesTo: ["mandatory"],
    baseline: true,
  },
  {
    id: "questionnaire-domains",
    label: "調査票の3領域構成",
    description:
      "厚労省推奨の『職業性ストレス簡易調査票』(57項目)など、(1)仕事の負担・(2)心身のストレス反応・(3)周囲のサポート の3領域を必ず含む調査票を使用する。",
    ruleArticles: ["安衛則 第52条の9 第二項"],
    appliesTo: ["mandatory", "effort-duty"],
    baseline: true,
  },
  {
    id: "high-stress-criteria",
    label: "高ストレス者の判定基準",
    description:
      "実施者が事業場ごとに『高ストレス』判定の基準を定める。標準的には『心身のストレス反応の合計点が高い者』『仕事の負担＋サポートの合計点が高い者』を含める。",
    ruleArticles: ["安衛則 第52条の11"],
    appliesTo: ["mandatory", "effort-duty"],
    baseline: true,
  },
  {
    id: "result-notification",
    label: "本人への結果通知",
    description:
      "ストレスチェック結果は、実施者から本人へ遅滞なく直接通知する。事業者経由は不可。通知書には個人結果と高ストレス者判定の有無・面接指導の対象である旨を含める。",
    ruleArticles: ["安衛則 第52条の12"],
    appliesTo: ["mandatory", "effort-duty"],
    baseline: true,
  },
  {
    id: "interview-offer",
    label: "面接指導の申出窓口設置",
    description:
      "高ストレス者が医師面接を希望する場合の申出窓口（人事・健康管理部門）を周知。申出は受検後おおむね1ヶ月以内を目安に受け付ける。",
    ruleArticles: ["安衛則 第52条の15"],
    appliesTo: ["mandatory", "effort-duty"],
    baseline: true,
  },
  {
    id: "physician-interview",
    label: "医師による面接指導",
    description:
      "申出があった日からおおむね1ヶ月以内に医師（産業医が望ましい）による面接指導を実施。50人未満は地域産業保健センター（さんぽセンター）を活用できる。",
    ruleArticles: ["安衛則 第52条の16"],
    appliesTo: ["mandatory", "effort-duty"],
    baseline: true,
  },
  {
    id: "post-interview-measures",
    label: "事後措置の検討と実施",
    description:
      "面接指導後、医師から意見を聴取し、必要に応じて就業上の措置（労働時間短縮・配置転換・深夜業の制限等）を講じる。措置は本人と協議のうえ決定する。",
    ruleArticles: ["安衛則 第52条の17・第52条の18"],
    appliesTo: ["mandatory", "effort-duty"],
    baseline: true,
  },
  {
    id: "group-analysis",
    label: "集団分析と職場環境改善",
    description:
      "部署・課単位（おおむね10人以上）で集団分析を実施し、職場環境改善に活用する。10人未満は本人特定リスクがあるため、本人同意か上位組織との合算で行う。",
    ruleArticles: ["安衛則 第52条の14"],
    appliesTo: ["mandatory"],
    baseline: false,
  },
  {
    id: "privacy-safeguards",
    label: "プライバシー保護と不利益取扱禁止",
    description:
      "個人結果は本人同意なしに事業者へ提供不可。受検しないこと・面接指導申出をしたこと・結果を理由とする不利益取扱（解雇・降格・契約更新拒否等）を禁止。",
    ruleArticles: ["安衛法 第66条の10 第三項", "安衛則 第52条の21"],
    appliesTo: ["mandatory", "effort-duty"],
    baseline: true,
  },
  {
    id: "record-retention",
    label: "記録の作成と5年保存",
    description:
      "ストレスチェック結果・面接指導記録・事後措置の内容を記載した書類を作成し、5年間保存する。記録は実施事務従事者以外がアクセスできない管理体制とする。",
    ruleArticles: ["安衛則 第52条の13・第52条の18"],
    appliesTo: ["mandatory", "effort-duty"],
    baseline: true,
  },
  {
    id: "lsi-report",
    label: "労働基準監督署への報告",
    description:
      "毎年、ストレスチェック実施報告書（様式第6号の2）を所轄労働基準監督署長へ提出。検査の実施有無・受検者数・面接指導実施件数等を記載。",
    ruleArticles: ["安衛則 第52条の21の2"],
    appliesTo: ["mandatory"],
    baseline: true,
  },
];

/**
 * The annual stress-check procedure as an ordered roadmap.
 *
 * Every baseline requirement in {@link STRESS_CHECK_REQUIREMENTS} is fulfilled
 * by at least one step here, so a first-time workplace can follow the steps in
 * order without dropping an obligation. Timing notes are MHLW実施マニュアルの
 * 目安であり、確定スケジュールは衛生委員会で決定する。
 */
export const STRESS_CHECK_PROCEDURE: StressCheckProcedureStep[] = [
  {
    phase: "準備期",
    title: "実施方針の策定と衛生委員会での審議",
    detail:
      "実施時期・対象者・実施者・実施事務従事者・結果の取扱方法（プライバシー保護を含む）を文書化し、衛生委員会で調査審議のうえ労働者へ周知する。",
    timing: "実施の2〜3ヶ月前",
    relatedRequirementIds: ["policy-document", "privacy-safeguards"],
  },
  {
    phase: "準備期",
    title: "実施者の指名と調査票の準備",
    detail:
      "医師・保健師等から実施者・実施事務従事者を指名し、3領域（仕事の負担・心身のストレス反応・周囲のサポート）を含む調査票（57項目簡易調査票等）を用意する。",
    timing: "実施の1〜2ヶ月前",
    relatedRequirementIds: ["designate-implementer", "questionnaire-domains"],
  },
  {
    phase: "準備期",
    title: "高ストレス者の判定基準の設定と受検案内",
    detail:
      "実施者が事業場ごとの高ストレス判定基準を定める。受検は任意である旨・申出窓口・不利益取扱の禁止を添えて労働者へ受検を案内する。",
    timing: "実施の2〜4週間前",
    relatedRequirementIds: ["high-stress-criteria"],
  },
  {
    phase: "実施期",
    title: "ストレスチェックの実施",
    detail:
      "常時使用する労働者に対し1年以内ごとに1回実施する。受検は労働者の任意で、受検しないことを理由とした不利益取扱は禁止。",
    timing: "年度内の実施月",
    relatedRequirementIds: ["annual-frequency"],
  },
  {
    phase: "実施期",
    title: "実施者から本人への結果通知",
    detail:
      "実施者が本人へ結果を遅滞なく直接通知する（事業者経由は不可）。高ストレス者には面接指導の対象である旨を併せて通知する。",
    timing: "実施後 遅滞なく",
    relatedRequirementIds: ["result-notification"],
  },
  {
    phase: "事後対応期",
    title: "面接指導の申出受付と医師面接の実施",
    detail:
      "高ストレス者からの面接申出を窓口で受け付け、申出があった日からおおむね1ヶ月以内に医師による面接指導を実施する。50人未満は地域産業保健センターを活用できる。",
    timing: "結果通知後〜申出から1ヶ月以内",
    relatedRequirementIds: ["interview-offer", "physician-interview"],
  },
  {
    phase: "事後対応期",
    title: "医師意見に基づく事後措置の検討・実施",
    detail:
      "面接指導後、医師から意見を聴取し、必要に応じて労働時間短縮・配置転換・深夜業の制限等の就業上の措置を本人と協議のうえ講じる。",
    timing: "面接後 遅滞なく",
    relatedRequirementIds: ["post-interview-measures"],
  },
  {
    phase: "報告・保存期",
    title: "集団分析と職場環境改善（推奨）",
    detail:
      "部署・課単位（おおむね10人以上）で集団分析を行い、職場環境改善に活用する。10人未満は本人特定リスクがあるため本人同意か上位組織との合算で行う。",
    timing: "結果確定後",
    relatedRequirementIds: ["group-analysis"],
  },
  {
    phase: "報告・保存期",
    title: "労働基準監督署への実施報告",
    detail:
      "実施報告書（様式第6号の2）を所轄労働基準監督署長へ提出する。受検者数・面接指導実施件数等を記載。義務事業場は毎年提出が必要。",
    timing: "実施後 毎年",
    relatedRequirementIds: ["lsi-report"],
    mandatoryOnly: true,
  },
  {
    phase: "報告・保存期",
    title: "記録の作成と5年間保存",
    detail:
      "結果・面接指導記録・事後措置の内容を書類化し、実施事務従事者以外がアクセスできない管理体制で5年間保存する。",
    timing: "継続（5年間）",
    relatedRequirementIds: ["record-retention"],
  },
];

export function getMandatoryRequirements(): StressCheckRequirement[] {
  return STRESS_CHECK_REQUIREMENTS.filter((r) => r.appliesTo.includes("mandatory"));
}

export function getEffortDutyRequirements(): StressCheckRequirement[] {
  return STRESS_CHECK_REQUIREMENTS.filter((r) =>
    r.appliesTo.includes("effort-duty"),
  );
}
