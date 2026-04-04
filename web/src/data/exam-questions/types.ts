export type ExamCategory =
  | "safety-consultant"   // 労働安全コンサルタント
  | "health-manager-1"    // 衛生管理者（第一種）
  | "health-manager-2"    // 衛生管理者（第二種）
  | "health-consultant"   // 労働衛生コンサルタント
  | "boiler-1"            // ボイラー技士（一級）
  | "crane-operator";     // クレーン運転士

export type ExamSubject =
  // 労働安全コンサルタント
  | "safety-general"
  | "safety-law"
  // 衛生管理者（第一種）
  | "hm1-general"
  | "hm1-law-harmful"
  | "hm1-law-other"
  | "hm1-physiology"
  // 衛生管理者（第二種）
  | "hm2-general"
  | "hm2-law"
  | "hm2-physiology"
  // 労働衛生コンサルタント
  | "hc-general"
  | "hc-law"
  // ボイラー技士（一級）
  | "b1-structure"
  | "b1-operation"
  | "b1-fuel"
  | "b1-law"
  // クレーン運転士
  | "crane-knowledge"
  | "crane-engine"
  | "crane-law"
  | "crane-mechanics";

export interface ExamChoice {
  label: string; // "ア", "イ", "ウ", "エ", "オ"
  text: string;
}

export interface ExamQuestion {
  id: string; // e.g. "2023-sg-001"
  year: number;
  category: ExamCategory;
  subject: ExamSubject;
  subjectLabel: string;
  questionNumber: number;
  questionText: string;
  choices: ExamChoice[];
  correctAnswer: string; // "ア"|"イ"|"ウ"|"エ"|"オ"
  explanation?: string;
  relatedLaw?: string;
}

export const CATEGORY_LABELS: Record<ExamCategory, string> = {
  "safety-consultant": "労働安全コンサルタント",
  "health-manager-1": "衛生管理者（第一種）",
  "health-manager-2": "衛生管理者（第二種）",
  "health-consultant": "労働衛生コンサルタント",
  "boiler-1": "ボイラー技士（一級）",
  "crane-operator": "クレーン運転士",
};

export const CATEGORY_SUBJECTS: Record<ExamCategory, ExamSubject[]> = {
  "safety-consultant": ["safety-general", "safety-law"],
  "health-manager-1": ["hm1-general", "hm1-law-harmful", "hm1-law-other", "hm1-physiology"],
  "health-manager-2": ["hm2-general", "hm2-law", "hm2-physiology"],
  "health-consultant": ["hc-general", "hc-law"],
  "boiler-1": ["b1-structure", "b1-operation", "b1-fuel", "b1-law"],
  "crane-operator": ["crane-knowledge", "crane-engine", "crane-law", "crane-mechanics"],
};
