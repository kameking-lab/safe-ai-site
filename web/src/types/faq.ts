export type FAQCategory =
  | "law-system"
  | "management"
  | "chemical"
  | "health-education";

export const FAQ_CATEGORY_LABELS: Record<FAQCategory, string> = {
  "law-system": "法令・制度",
  management: "安全衛生管理体制",
  chemical: "化学物質・有害物",
  "health-education": "健康管理・教育",
};

export const FAQ_CATEGORY_DESCRIPTIONS: Record<FAQCategory, string> = {
  "law-system":
    "労働安全衛生法・各種省令の義務・届出・猶予期間など制度面の疑問を解説",
  management:
    "安全管理者・衛生管理者の選任要件、委員会設置・運営など管理体制の疑問を解説",
  chemical:
    "SDS交付・GHSラベル・リスクアセスメント対象物質・作業環境測定など化学物質管理の疑問を解説",
  "health-education":
    "健康診断の種類・実施義務・特別教育の要件・オンライン可否など健康管理と教育の疑問を解説",
};

export const FAQ_CATEGORY_SLUGS: Record<FAQCategory, string> = {
  "law-system": "law-system",
  management: "management",
  chemical: "chemical",
  "health-education": "health-education",
};

export const FAQ_SLUG_TO_CATEGORY: Record<string, FAQCategory> = {
  "law-system": "law-system",
  management: "management",
  chemical: "chemical",
  "health-education": "health-education",
};

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: FAQCategory;
  relatedLaws?: string[];
  relatedPages?: Array<{ href: string; label: string }>;
  tags?: string[];
  source?: string;
}
