import type { ResidenceStatusRule } from "@/types/foreign-worker";

/**
 * Status-based visas (永住者・定住者・日本人の配偶者等). These statuses carry
 * no work-scope limit, so the employer rules collapse to "treat as Japanese
 * worker under labour law" with a few additional language/onboarding points.
 */
export const PERMANENT_RESIDENT: ResidenceStatusRule = {
  id: "permanent-resident",
  category: "status-based",
  labelJa: "永住者",
  labelEn: "Permanent Resident",
  summary:
    "在留期間の更新が不要な在留資格。就労内容・業種・職種に制限はない。",
  periodOfStay: "無期限（在留カードのみ7年ごと更新）",
  workScope: "就労内容・業種・職種に制限なし。",
  unlimitedWorkScope: true,
  transferAllowed: true,
  relevantSafetyLaws: [
    {
      name: "労働基準法・労働安全衛生法・最低賃金法",
      summary:
        "国籍を問わず全規定が適用。雇用契約・賃金台帳・労働時間管理は日本人と同一基準。",
    },
    {
      name: "雇用対策法",
      summary:
        "外国人雇用状況届出はハローワーク経由で雇入れ・離職時に必要（特別永住者は届出不要）。",
      articles: ["第28条"],
    },
  ],
  employerObligations: [
    {
      id: "report-mhlw",
      title: "外国人雇用状況届出",
      detail:
        "永住者の雇入れ・離職もハローワークへ届出義務（雇用保険資格取得・喪失届に統合可）。",
    },
    {
      id: "language-onboarding",
      title: "言語面の配慮",
      detail:
        "在留が長くても日本語の専門用語に不慣れな場合がある。安全衛生教育はやさしい日本語＋実技確認を推奨。",
    },
  ],
  workerRights: [
    {
      id: "full-rights",
      title: "労働基準法上の権利の完全な享受",
      detail:
        "賃金、労働時間、休暇、解雇制限、不当労働行為救済等すべて日本人と同等の保護。",
    },
    {
      id: "public-services",
      title: "国民健康保険・年金等の公的サービス",
      detail:
        "国民健康保険・国民年金・介護保険等の被保険者資格を持つ。",
    },
  ],
  commonTroubles: [
    {
      id: "language-presume",
      title: "日本語十分の思い込み",
      detail:
        "永住者は日本語が堪能と決めつけ、安全教育を簡略化し被災に至るケース。",
      mitigation:
        "在留歴に関わらず本人の理解度を実技テストで確認する。",
    },
  ],
  sources: [
    { name: "出入国在留管理庁 永住許可に関するガイドライン" },
  ],
};

export const LONG_TERM_RESIDENT: ResidenceStatusRule = {
  id: "long-term-resident",
  category: "status-based",
  labelJa: "定住者",
  labelEn: "Long-Term Resident",
  summary:
    "日系人、日本人の元配偶者、難民認定者の家族等に与えられる就労制限のない在留資格。",
  periodOfStay: "5年・3年・1年・6月",
  workScope: "就労内容・業種・職種に制限なし。",
  unlimitedWorkScope: true,
  transferAllowed: true,
  relevantSafetyLaws: [
    {
      name: "労働基準法・労働安全衛生法",
      summary: "国籍を問わず全規定が適用。",
    },
    {
      name: "雇用対策法",
      summary: "外国人雇用状況届出が必要。",
      articles: ["第28条"],
    },
  ],
  employerObligations: [
    {
      id: "language-onboarding",
      title: "母語での安全教育選択肢の提示",
      detail:
        "日系ブラジル人・ペルー人等で第一言語が日本語でないケースが多い。ポルトガル語・スペイン語の安全教材を活用する。",
    },
    {
      id: "education-support",
      title: "子の教育機会への配慮",
      detail:
        "義務教育年齢の子について、就学手続き・日本語指導加配の情報提供。",
    },
  ],
  workerRights: [
    {
      id: "full-rights",
      title: "労働法上の権利の完全な享受",
      detail: "日本人と同等の保護。",
    },
  ],
  commonTroubles: [
    {
      id: "language-misalign",
      title: "母語と書類言語の不一致",
      detail:
        "ポルトガル語・スペイン語話者なのに、英語の安全資料のみを提供して理解されないケース。",
      mitigation:
        "本人の主要言語を雇入れ時に確認し、対訳教材を整える。",
    },
  ],
  sources: [{ name: "出入国在留管理庁 在留資格『定住者』" }],
};

export const SPOUSE_OF_JAPANESE: ResidenceStatusRule = {
  id: "spouse-of-japanese",
  category: "status-based",
  labelJa: "日本人の配偶者等",
  labelEn: "Spouse or Child of Japanese National",
  summary:
    "日本人の配偶者・特別養子・実子に与えられる就労制限のない在留資格。",
  periodOfStay: "5年・3年・1年・6月",
  workScope: "就労内容・業種・職種に制限なし。",
  unlimitedWorkScope: true,
  transferAllowed: true,
  relevantSafetyLaws: [
    {
      name: "労働基準法・労働安全衛生法",
      summary: "国籍を問わず全規定が適用。",
    },
    {
      name: "雇用対策法",
      summary:
        "外国人雇用状況届出を雇入れ・離職時にハローワークへ提出（個別の在留資格に依らず必要）。",
      articles: ["第28条"],
    },
  ],
  employerObligations: [
    {
      id: "no-special",
      title: "特別な手続きなし",
      detail:
        "在留資格固有の追加義務はない。標準的な外国人雇用状況届出のみで足りる。",
    },
  ],
  workerRights: [
    {
      id: "full-rights",
      title: "労働法上の権利の完全な享受",
      detail: "日本人と同等の保護。",
    },
  ],
  commonTroubles: [
    {
      id: "divorce-status",
      title: "離婚・離別後の在留資格喪失リスク",
      detail:
        "婚姻関係解消後6か月以上経過すると在留資格取消の対象となる。",
      mitigation:
        "本人の生活変化を理由とした待遇変更は安易に行わず、入管手続きの相談先を案内。",
    },
  ],
  sources: [{ name: "出入国在留管理庁 在留資格『日本人の配偶者等』" }],
};

export const DESIGNATED_ACTIVITIES_EMPLOYMENT: ResidenceStatusRule = {
  id: "designated-activities-employment",
  category: "designated",
  labelJa: "特定活動（就労可）",
  labelEn: "Designated Activities (employment permitted)",
  summary:
    "個別の活動を法務大臣が指定する在留資格。EPA介護福祉士候補者、ワーキングホリデー、本邦大学卒業者就労等を含む。",
  periodOfStay: "活動内容により異なる（最大5年）",
  workScope:
    "指定書（パスポートに添付）に明記された活動の範囲内。事業所変更・業務範囲拡大には変更申請が必要なケースが多い。",
  unlimitedWorkScope: false,
  transferAllowed: false,
  relevantSafetyLaws: [
    {
      name: "労働基準法・労働安全衛生法",
      summary: "国籍を問わず適用。",
    },
    {
      name: "出入国管理及び難民認定法",
      summary:
        "活動内容と業務の整合性を継続的に確認。指定書の写しを労務記録に保管。",
    },
  ],
  employerObligations: [
    {
      id: "scope-check",
      title: "指定書の活動範囲確認",
      detail:
        "雇入れ時にパスポート添付の指定書を確認し、業務内容が記載活動範囲内であることを確認する。",
    },
    {
      id: "epa-care-support",
      title: "EPA介護福祉士候補者：学習支援",
      detail:
        "国家試験合格までの研修・学習時間を確保し、就労時間に算入する。",
    },
  ],
  workerRights: [
    {
      id: "training-time",
      title: "EPA：学習時間の確保",
      detail: "学習・研修時間は労働時間として扱われる。",
    },
    {
      id: "wh-overtime",
      title: "ワーキングホリデー：時間外労働の制限",
      detail:
        "週28時間制限のある活動類型もある。指定書の条件を必ず確認。",
    },
  ],
  commonTroubles: [
    {
      id: "designation-violation",
      title: "指定書範囲外作業への従事",
      detail:
        "EPA介護福祉士候補者を介護以外の業務に従事させると入管法違反となる。",
      mitigation:
        "指定書記載の活動を作業区分タグとして勤怠管理に組み込む。",
    },
  ],
  sources: [
    { name: "出入国在留管理庁 在留資格『特定活動』" },
    { name: "厚生労働省 EPA介護福祉士候補者の受入れ" },
  ],
};
