import type { ResidenceStatusRule } from "@/types/foreign-worker";

/**
 * 技術・人文知識・国際業務 — the workhorse white-collar visa. Authorises
 * activities that require academic background or practical experience in
 * engineering / humanities / international services. Often confused with
 * 単純労働 — Immigration scrutinises whether the employee's actual work
 * matches the declared scope.
 */
export const ENGINEER_HUMANITIES_INTL: ResidenceStatusRule = {
  id: "engineer-humanities-intl",
  category: "professional",
  labelJa: "技術・人文知識・国際業務",
  labelEn: "Engineer / Specialist in Humanities / International Services",
  summary:
    "学歴・実務経験を基礎とする専門的・技術的分野の業務に従事する在留資格。単純労働への従事は不可。",
  periodOfStay: "5年・3年・1年・3月",
  workScope:
    "理学・工学・自然科学・法律・経済・社会・人文諸科学に基づく業務、または外国文化・思想・感受性を要する業務（通訳・デザイン・語学教育・海外取引等）。",
  unlimitedWorkScope: false,
  transferAllowed: true,
  relevantSafetyLaws: [
    {
      name: "労働基準法",
      summary: "国籍を問わず適用。デスクワーク中心でも長時間労働・サービス残業に注意。",
    },
    {
      name: "労働安全衛生法",
      summary:
        "情報機器作業ガイドライン（旧VDT）に基づく作業環境管理、ストレスチェック（労働者50人以上事業場）が適用。",
      articles: ["第66条の10"],
    },
    {
      name: "出入国管理及び難民認定法",
      summary:
        "実際の業務が在留資格の活動範囲を超えた場合は資格外活動。雇用契約書の業務内容と実態の一致が重要。",
    },
    {
      name: "労働施策総合推進法",
      summary:
        "パワーハラスメント防止措置義務（事業主が中小も含め全規模対象）。多文化・多言語職場での認識違いに留意。",
    },
  ],
  employerObligations: [
    {
      id: "scope-match",
      title: "在留資格と実際の業務の一致",
      detail:
        "工場ラインの単純作業や接客中心の業務に従事させると資格外活動・在留資格不一致となる。配属変更時は申請内容との整合性を確認。",
    },
    {
      id: "stress-check",
      title: "ストレスチェック・産業医面接",
      detail:
        "50人以上事業場では年1回のストレスチェック実施義務。母国語版質問紙の準備または通訳併用を推奨。",
    },
    {
      id: "harassment-prevention",
      title: "ハラスメント防止措置",
      detail:
        "言語・文化背景の違いによる誤解を含めパワハラ・セクハラの相談窓口を整備。複数言語対応が望ましい。",
    },
    {
      id: "long-hours-control",
      title: "長時間労働の抑制",
      detail:
        "上限規制（月45時間・年360時間、特別条項月100時間未満・年720時間）を国籍を問わず適用。客観的記録での労働時間把握が必須。",
    },
  ],
  workerRights: [
    {
      id: "free-job-change",
      title: "転職・離職の自由",
      detail:
        "同様の活動範囲であれば転職可能。離職後14日以内に出入国在留管理庁へ届出（契約機関に関する届出）が必要。",
    },
    {
      id: "family",
      title: "家族帯同（家族滞在）",
      detail:
        "配偶者・子の家族滞在ビザでの帯同が可能。子は教育を受ける権利。",
    },
    {
      id: "industrial-physician",
      title: "産業医面接指導",
      detail:
        "長時間労働（月80時間超）・高ストレス判定の場合、産業医面接指導を申し出る権利。",
      law: { name: "労働安全衛生法", articles: ["第66条の8"], summary: "面接指導" },
    },
  ],
  commonTroubles: [
    {
      id: "scope-deviation",
      title: "単純労働化",
      detail:
        "本来の専門業務に加え、長期的に倉庫業務・清掃・接客のみを担当させると、更新時に不許可となる。",
      mitigation:
        "業務記録・成果物・所属チームを定期保存し、更新時に活動実態を立証できるようにする。",
    },
    {
      id: "overwork",
      title: "見えにくい長時間労働",
      detail:
        "テレワーク・裁量労働制と組み合わさり、深夜・休日のメール対応が常態化する。",
      mitigation:
        "勤怠システムにPCログ・入退館記録を統合し、客観時間で管理。",
    },
  ],
  sources: [
    { name: "出入国在留管理庁 在留資格『技術・人文知識・国際業務』" },
    { name: "厚生労働省 ストレスチェック制度実施マニュアル" },
  ],
};

/**
 * 技能 — Skilled Labor. Used for foreign chefs (Chinese, French, Italian
 * etc.), sommeliers, sports trainers, aircraft pilots, jewellery artisans
 * and similar high-skill specialists with industry experience.
 */
export const SKILLED_LABOR: ResidenceStatusRule = {
  id: "skilled-labor",
  category: "professional",
  labelJa: "技能（外国料理調理師・スポーツ指導者等）",
  labelEn: "Skilled Labor",
  summary:
    "産業上の特殊な分野に属する熟練した技能を要する業務に従事する在留資格。外国料理調理師・スポーツ指導者・パイロット等が代表例。",
  periodOfStay: "5年・3年・1年・3月",
  workScope:
    "外国料理調理（10年以上の実務経験）、外国スポーツ指導（同種実務3年以上等）、パイロット、ソムリエ、宝石加工、動物調教等の認定業務。",
  unlimitedWorkScope: false,
  transferAllowed: true,
  relevantSafetyLaws: [
    {
      name: "労働基準法",
      summary: "国籍を問わず適用。飲食業は深夜業・長時間労働になりがちで管理を要する。",
    },
    {
      name: "労働安全衛生法",
      summary:
        "厨房での熱中症・火傷・腰痛、調理機械（スライサー・ミキサー）災害防止に留意。",
    },
    {
      name: "食品衛生法",
      summary:
        "調理師免許の要否は店舗形態による。HACCPに沿った衛生管理を国籍に関わらず適用。",
    },
  ],
  employerObligations: [
    {
      id: "kitchen-safety",
      title: "厨房作業の安全衛生",
      detail:
        "やけど・切り傷・熱中症・腰痛に対応する保護具（耐熱グローブ・滑り止め靴）と作業マニュアルを多言語で整備。",
    },
    {
      id: "long-shift-control",
      title: "長時間労働・深夜業の抑制",
      detail:
        "ピーク時の固定残業に依存せず、客観記録で労働時間を管理。月80時間超は産業医面接の対象。",
    },
    {
      id: "training-record",
      title: "実務経験要件の記録保管",
      detail:
        "技能の在留資格は実務経験年数が要件のため、職務内容・在職証明・修了証等の写しを在留期間更新まで保管する。",
    },
  ],
  workerRights: [
    {
      id: "checkup",
      title: "深夜業従事者の特定業務健診",
      detail:
        "深夜業を含む業務は6か月以内ごとの特定業務従事者健診の対象。",
      law: { name: "労働安全衛生規則", articles: ["第45条"], summary: "特定業務従事者の健康診断" },
    },
    {
      id: "family",
      title: "家族滞在の在留資格",
      detail: "配偶者・子の家族滞在ビザでの帯同が可能。",
    },
  ],
  commonTroubles: [
    {
      id: "kitchen-burn",
      title: "厨房での火傷・転倒災害",
      detail:
        "床面の油・水で滑り、調理油や熱湯による火傷が発生する。",
      mitigation:
        "床滑り止め塗装と耐熱グローブ・滑り止め厨房靴の支給、こまめな床清掃ルーチンを徹底。",
    },
  ],
  sources: [
    { name: "出入国在留管理庁 在留資格『技能』" },
  ],
};
