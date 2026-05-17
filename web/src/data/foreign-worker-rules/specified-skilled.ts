import type { ResidenceStatusRule } from "@/types/foreign-worker";

/**
 * 特定技能1号 — Specified Skilled Worker (i). Established 2019; covers the
 * 16 specified industrial fields after the 2024 reorganisation. Workers may
 * transfer between employers within the same field, and dispatch is allowed
 * in fishery / agriculture only.
 */
export const SPECIFIED_SKILLED_1: ResidenceStatusRule = {
  id: "specified-skilled-1",
  category: "specified-skill",
  labelJa: "特定技能1号",
  labelEn: "Specified Skilled Worker (i)",
  summary:
    "16の特定産業分野で相当程度の知識・経験を要する業務に従事する在留資格。同一分野内での転職可、家族帯同不可。",
  periodOfStay: "通算5年（在留期間は1年・6月・4月）",
  workScope:
    "特定産業分野（介護・ビルクリーニング・工業製品製造業・建設・造船舶用・自動車整備・航空・宿泊・自動車運送・鉄道・農業・漁業・飲食料品製造・外食・林業・木材産業）の認定業務。",
  unlimitedWorkScope: false,
  transferAllowed: true,
  ssfFields: [
    "care",
    "building-cleaning",
    "industrial-products",
    "construction",
    "shipbuilding",
    "automobile-maintenance",
    "aviation",
    "accommodation",
    "automobile-transport",
    "railway",
    "agriculture",
    "fishery",
    "food-manufacturing",
    "food-service",
    "forestry",
    "wood-industry",
  ],
  relevantSafetyLaws: [
    {
      name: "労働基準法",
      summary:
        "国籍を問わず全規定が適用。雇用契約書は本人が理解できる言語での交付が必要。",
      articles: ["第15条"],
    },
    {
      name: "労働安全衛生法",
      summary:
        "雇入れ時教育・特別教育・就業制限業務の資格確認は実習生と同様に必要。建設分野は建設キャリアアップシステム（CCUS）登録が義務化。",
      articles: ["第59条", "第61条"],
    },
    {
      name: "出入国管理及び難民認定法",
      summary:
        "受入機関は外国人支援計画（住居確保、生活オリエンテーション、相談対応、日本語学習機会、定期面談等）の実施義務がある。",
      articles: ["第2条の5"],
    },
    {
      name: "労働者派遣法",
      summary:
        "派遣は農業・漁業分野に限定。それ以外の分野は直接雇用に限る。",
    },
    {
      name: "雇用対策法（労働施策総合推進法）",
      summary:
        "外国人雇用状況届出（ハローワーク）を雇入れ・離職時に提出。",
      articles: ["第28条"],
    },
  ],
  employerObligations: [
    {
      id: "support-plan",
      title: "1号特定技能外国人支援計画の作成・実施",
      detail:
        "事前ガイダンス、入国時の送迎、住居確保、生活オリエンテーション、公的手続同行、日本語学習機会、相談対応、日本人との交流促進、転職支援、定期面談（3か月に1回以上）、苦情の届出受理を実施する。登録支援機関へ全部委託も可。",
    },
    {
      id: "equal-pay",
      title: "日本人同等以上の報酬",
      detail:
        "同等業務に従事する日本人と同等以上の報酬を確保。賃金規程・等級・支給実績の根拠資料を保持する。",
    },
    {
      id: "language-safety-edu",
      title: "理解可能な言語での安全教育",
      detail:
        "雇入れ時・作業内容変更時の安全衛生教育を、本人が確実に理解できる言語または図示・実技で実施する。",
      law: { name: "労働安全衛生法", articles: ["第59条"], summary: "安全衛生教育" },
    },
    {
      id: "ccus-construction",
      title: "建設分野：CCUS登録・建設特定技能受入計画認定",
      detail:
        "建設分野は国土交通省の受入計画認定とCCUS登録、月給制・職長育成・キャリア形成支援が必須。",
    },
    {
      id: "reporting",
      title: "定期届出・随時届出",
      detail:
        "出入国在留管理庁への四半期報告（受入れ状況・活動状況・支援状況）と雇用契約終了等の随時届出を行う。",
    },
  ],
  workerRights: [
    {
      id: "transfer-job",
      title: "同一分野内での転職の自由",
      detail:
        "業務区分・技能水準が同等であれば、同一分野内で別の受入機関への転職が可能。受入機関に転職を妨害する権利はない。",
    },
    {
      id: "consultation",
      title: "母国語での相談支援",
      detail:
        "受入機関または登録支援機関が母国語で対応可能な相談窓口を提供する義務がある。応答が得られない場合は出入国在留管理庁外国人在留総合インフォメーションセンターへ。",
    },
    {
      id: "social-insurance",
      title: "社会保険・労災保険の適用",
      detail:
        "健康保険・厚生年金保険・雇用保険・労災保険に加入する権利。労災発生時は休業補償・療養補償が国籍に関わらず受給可能。",
    },
    {
      id: "family-prep",
      title: "家族帯同（2号移行時）",
      detail:
        "1号では家族帯同不可だが、2号移行時には配偶者・子の帯同が可能となる。",
    },
  ],
  commonTroubles: [
    {
      id: "support-skip",
      title: "支援計画の形骸化",
      detail:
        "定期面談を実施せず・苦情を受理しない・転職支援を妨害する事案。受入機関適合性の喪失事由。",
      mitigation:
        "登録支援機関への完全委託またはチェックリスト運用で支援10項目の実施を可視化する。",
    },
    {
      id: "category-mismatch",
      title: "業務区分外作業の常態化",
      detail:
        "認定業務区分以外の単純作業（清掃・配送等）に主従事させ、入管法違反となる。",
      mitigation:
        "週次の作業実績を業務区分タグで記録し、支援責任者が逸脱を月次確認。",
    },
    {
      id: "construction-plan-miss",
      title: "建設分野：受入計画と実態の乖離",
      detail:
        "CCUS登録・月給制・職長育成計画が形骸化し、認定取消の対象となる。",
      mitigation:
        "受入計画記載の処遇・育成項目を就業規則・賃金規程に反映し、四半期で実績確認。",
    },
  ],
  sources: [
    { name: "出入国在留管理庁 特定技能制度" },
    { name: "厚生労働省 外国人雇用対策" },
    { name: "国土交通省 建設分野特定技能受入計画認定要領" },
  ],
};

/**
 * 特定技能2号 — Specified Skilled Worker (ii). After the 2023 expansion,
 * available in 11 of the 16 specified fields (excluded: care, automobile
 * transport adjustments etc.). Allows family accompaniment and unlimited
 * renewal.
 */
export const SPECIFIED_SKILLED_2: ResidenceStatusRule = {
  id: "specified-skilled-2",
  category: "specified-skill",
  labelJa: "特定技能2号",
  labelEn: "Specified Skilled Worker (ii)",
  summary:
    "熟練した技能を要する業務に従事する在留資格。在留期間更新の上限なし、家族帯同可。",
  periodOfStay: "上限なし（在留期間は3年・1年・6月）",
  workScope:
    "特定産業分野のうち2号対象分野（介護を除く11分野）の熟練技能業務。班長・職長等の現場管理を含む。",
  unlimitedWorkScope: false,
  transferAllowed: true,
  ssfFields: [
    "building-cleaning",
    "industrial-products",
    "construction",
    "shipbuilding",
    "automobile-maintenance",
    "aviation",
    "accommodation",
    "automobile-transport",
    "railway",
    "agriculture",
    "fishery",
    "food-manufacturing",
    "food-service",
    "forestry",
    "wood-industry",
  ],
  relevantSafetyLaws: [
    {
      name: "労働安全衛生法",
      summary:
        "班長・職長業務に従事する場合は職長等教育（安衛則第40条）が必要。CCUS（建設）のレベル3以上が職長要件。",
      articles: ["第60条"],
    },
    {
      name: "出入国管理及び難民認定法",
      summary:
        "1号と異なり支援計画の作成・実施義務はない。代わりに在留期間更新時の活動実績・収入要件の継続審査がある。",
    },
    {
      name: "労働基準法",
      summary: "国籍を問わず全規定が適用。",
    },
  ],
  employerObligations: [
    {
      id: "shokucho-edu",
      title: "職長・班長教育の実施",
      detail:
        "現場管理・指揮監督を担う2号特定技能外国人には安衛法第60条の職長等教育（特定業種は危険有害業務作業主任者教育を含む）を実施する。",
    },
    {
      id: "career-development",
      title: "キャリア形成支援",
      detail:
        "在留期間更新には継続的な収入確保が前提となる。賃金昇給・等級昇格・技能検定上位級受検等の機会を整備する。",
    },
    {
      id: "family-support",
      title: "家族帯同に伴う生活支援",
      detail:
        "配偶者・子の入国時生活オリエンテーション、子の就学手続き同行を必須ではないが推奨。",
    },
  ],
  workerRights: [
    {
      id: "renewal-unlimited",
      title: "在留期間更新の上限なし",
      detail:
        "活動・収入要件を満たせば永住要件年数の起算対象にもなる。",
    },
    {
      id: "family",
      title: "配偶者・子の帯同",
      detail:
        "家族滞在の在留資格で配偶者・子を帯同できる。子は公立小中学校に就学する権利を有する。",
    },
  ],
  commonTroubles: [
    {
      id: "shokucho-edu-skip",
      title: "職長教育未実施のまま現場リーダー任命",
      detail:
        "言語の壁を理由に職長教育を省略し、被災時に安全配慮義務違反となる事例。",
      mitigation:
        "やさしい日本語＋母国語の職長等教育コースを活用し、修了証を労務記録に保存。",
    },
  ],
  sources: [
    { name: "出入国在留管理庁 特定技能2号" },
    { name: "厚生労働省 外国人雇用対策" },
  ],
};
