import type { ExamQuestion, ExamSubject, ExamCategory } from "./types";
import { CATEGORY_LABELS, CATEGORY_SUBJECTS } from "./types";
import { questions as q2023sg } from "./2023-safety-general";
import { questions as q2023sl } from "./2023-safety-law";
import { questions as q2024sg } from "./2024-safety-general";
import { questions as q2024sl } from "./2024-safety-law";
import { questions as q2025sg } from "./2025-safety-general";
import { questions as q2025sl } from "./2025-safety-law";
import { questions as qHm1 } from "./health-manager-1";
import { questions as qHm2 } from "./health-manager-2";
import { questions as qHc } from "./health-consultant";
import { questions as qB1 } from "./boiler-1";
import { questions as qCrane } from "./crane-operator";

export type { ExamQuestion, ExamSubject, ExamCategory };
export { CATEGORY_LABELS, CATEGORY_SUBJECTS };

export const ALL_QUESTIONS: ExamQuestion[] = [
  ...q2023sg,
  ...q2023sl,
  ...q2024sg,
  ...q2024sl,
  ...q2025sg,
  ...q2025sl,
  ...qHm1,
  ...qHm2,
  ...qHc,
  ...qB1,
  ...qCrane,
];

export const AVAILABLE_YEARS = [2023, 2024, 2025] as const;

export const SUBJECT_LABELS: Record<ExamSubject, string> = {
  // 労働安全コンサルタント
  "safety-general": "産業安全一般",
  "safety-law": "産業安全関係法令",
  // 衛生管理者（第一種）
  "hm1-general": "労働衛生（有害業務含む）",
  "hm1-law-harmful": "関係法令（有害業務）",
  "hm1-law-other": "関係法令（有害業務以外）",
  "hm1-physiology": "労働生理",
  // 衛生管理者（第二種）
  "hm2-general": "労働衛生（有害業務を除く）",
  "hm2-law": "関係法令（有害業務を除く）",
  "hm2-physiology": "労働生理",
  // 労働衛生コンサルタント
  "hc-general": "労働衛生一般",
  "hc-law": "労働衛生関係法令",
  // ボイラー技士（一級）
  "b1-structure": "ボイラーの構造に関する知識",
  "b1-operation": "ボイラーの取扱いに関する知識",
  "b1-fuel": "燃料及び燃焼に関する知識",
  "b1-law": "関係法令",
  // クレーン運転士
  "crane-knowledge": "クレーンに関する知識",
  "crane-engine": "原動機及び電気に関する知識",
  "crane-law": "関係法令",
  "crane-mechanics": "クレーンの運転のために必要な力学に関する知識",
};

export function filterQuestions(opts: {
  category?: ExamCategory | "all";
  subject?: ExamSubject | "all";
  year?: number | "all";
  shuffle?: boolean;
}): ExamQuestion[] {
  let result = ALL_QUESTIONS;
  if (opts.category && opts.category !== "all") {
    result = result.filter((q) => q.category === opts.category);
  }
  if (opts.subject && opts.subject !== "all") {
    result = result.filter((q) => q.subject === opts.subject);
  }
  if (opts.year && opts.year !== "all") {
    result = result.filter((q) => q.year === opts.year);
  }
  if (opts.shuffle) {
    result = [...result].sort(() => Math.random() - 0.5);
  }
  return result;
}
