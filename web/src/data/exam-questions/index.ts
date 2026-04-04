import type { ExamQuestion, ExamSubject } from "./types";
import { questions as q2023sg } from "./2023-safety-general";
import { questions as q2023sl } from "./2023-safety-law";
import { questions as q2024sg } from "./2024-safety-general";
import { questions as q2024sl } from "./2024-safety-law";
import { questions as q2025sg } from "./2025-safety-general";
import { questions as q2025sl } from "./2025-safety-law";

export type { ExamQuestion, ExamSubject };

export const ALL_QUESTIONS: ExamQuestion[] = [
  ...q2023sg,
  ...q2023sl,
  ...q2024sg,
  ...q2024sl,
  ...q2025sg,
  ...q2025sl,
];

export const AVAILABLE_YEARS = [2023, 2024, 2025] as const;

export const SUBJECT_LABELS: Record<ExamSubject, string> = {
  "safety-general": "産業安全一般",
  "safety-law": "産業安全関係法令",
  "health-general": "労働衛生一般",
  "health-law": "労働衛生関係法令",
};

export function filterQuestions(opts: {
  subject?: ExamSubject | "all";
  year?: number | "all";
  shuffle?: boolean;
}): ExamQuestion[] {
  let result = ALL_QUESTIONS;
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
