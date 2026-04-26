export type PlanId = "free" | "standard" | "pro" | "business" | "custom";
export type FeatureValue = boolean | string;

export interface MatrixFeature {
  labelJa: string;
  labelEn: string;
  values: Record<PlanId, FeatureValue>;
}

export interface FeatureCategory {
  labelJa: string;
  labelEn: string;
  features: MatrixFeature[];
}

export const PLAN_IDS: PlanId[] = ["free", "standard", "pro", "business", "custom"];

export const PLAN_LABELS: Record<PlanId, { ja: string; en: string }> = {
  free: { ja: "フリー", en: "Free" },
  standard: { ja: "スタンダード", en: "Standard" },
  pro: { ja: "プロ", en: "Pro" },
  business: { ja: "ビジネス", en: "Business" },
  custom: { ja: "受託", en: "Custom" },
};

export const PLAN_MONTHLY_PRICE: Record<PlanId, number | null> = {
  free: 0,
  standard: 980,
  pro: 2980,
  business: 29800,
  custom: null,
};

// 年払い時の月額換算（17%オフ、10円単位で切り捨て）
export const PLAN_ANNUAL_MONTHLY: Record<PlanId, number | null> = {
  free: 0,
  standard: Math.floor((980 * 0.83) / 10) * 10,   // ¥810
  pro: Math.floor((2980 * 0.83) / 10) * 10,        // ¥2,470
  business: Math.floor((29800 * 0.83) / 10) * 10,  // ¥24,730
  custom: null,
};

export const PLAN_IS_POPULAR: Record<PlanId, boolean> = {
  free: false,
  standard: false,
  pro: true,
  business: false,
  custom: false,
};

export const FEATURE_MATRIX: FeatureCategory[] = [
  {
    labelJa: "基本機能",
    labelEn: "Core",
    features: [
      {
        labelJa: "事故DB検索（全件）",
        labelEn: "Accident DB search (all)",
        values: { free: true, standard: true, pro: true, business: true, custom: true },
      },
      {
        labelJa: "AIチャット・リスク予測",
        labelEn: "AI chat & risk prediction",
        values: { free: "月30回", standard: "無制限", pro: "無制限", business: "無制限", custom: "要相談" },
      },
      {
        labelJa: "法改正AI要約",
        labelEn: "Law update AI summary",
        values: { free: "月30回", standard: "無制限", pro: "無制限", business: "無制限", custom: "要相談" },
      },
      {
        labelJa: "気象リスク通知",
        labelEn: "Weather risk alert",
        values: { free: "1地域", standard: true, pro: true, business: true, custom: true },
      },
    ],
  },
  {
    labelJa: "コンテンツ",
    labelEn: "Content",
    features: [
      {
        labelJa: "KY用紙（基本モード）",
        labelEn: "KY form (basic mode)",
        values: { free: true, standard: true, pro: true, business: true, custom: true },
      },
      {
        labelJa: "特別教育 過去問クイズ",
        labelEn: "Special education quizzes",
        values: { free: "一部", standard: "全種", pro: "全種", business: "全種", custom: "全種" },
      },
      {
        labelJa: "化学物質リスクアセスメント",
        labelEn: "Chemical risk assessment",
        values: { free: false, standard: false, pro: true, business: true, custom: true },
      },
      {
        labelJa: "安全書類テンプレート",
        labelEn: "Safety doc templates",
        values: { free: true, standard: true, pro: true, business: true, custom: true },
      },
    ],
  },
  {
    labelJa: "出力",
    labelEn: "Output",
    features: [
      {
        labelJa: "KY用紙 詳細モード・PDF出力",
        labelEn: "KY form detail + PDF export",
        values: { free: false, standard: true, pro: true, business: true, custom: true },
      },
      {
        labelJa: "サイネージ表示",
        labelEn: "Signage display",
        values: { free: false, standard: "1拠点", pro: "3拠点", business: "無制限", custom: "無制限" },
      },
      {
        labelJa: "LMS（学習進捗・修了証）",
        labelEn: "LMS (progress + certificate)",
        values: { free: false, standard: false, pro: true, business: true, custom: true },
      },
    ],
  },
  {
    labelJa: "サポート",
    labelEn: "Support",
    features: [
      {
        labelJa: "メールサポート",
        labelEn: "Email support",
        values: { free: false, standard: true, pro: true, business: true, custom: true },
      },
      {
        labelJa: "電話・チャットサポート",
        labelEn: "Phone & chat support",
        values: { free: false, standard: false, pro: true, business: true, custom: true },
      },
      {
        labelJa: "請求書払い",
        labelEn: "Invoice payment",
        values: { free: false, standard: false, pro: true, business: true, custom: true },
      },
      {
        labelJa: "初期導入サポート",
        labelEn: "Onboarding support",
        values: { free: false, standard: false, pro: false, business: "1回", custom: "都度" },
      },
    ],
  },
  {
    labelJa: "組織機能",
    labelEn: "Team",
    features: [
      {
        labelJa: "利用アカウント数",
        labelEn: "User accounts",
        values: { free: "1名", standard: "1名", pro: "10名", business: "100名", custom: "無制限" },
      },
      {
        labelJa: "KYテンプレート共有",
        labelEn: "KY template sharing",
        values: { free: false, standard: false, pro: true, business: true, custom: true },
      },
      {
        labelJa: "業種別カスタムルール",
        labelEn: "Industry-specific rules",
        values: { free: false, standard: false, pro: false, business: true, custom: true },
      },
      {
        labelJa: "SSO対応",
        labelEn: "SSO",
        values: { free: false, standard: false, pro: false, business: "Google", custom: "SAML/OIDC" },
      },
    ],
  },
];
