export type ExamSubject = "safety-general" | "safety-law" | "health-general" | "health-law";

export interface ExamChoice {
  label: string; // "ア", "イ", "ウ", "エ", "オ"
  text: string;
}

export interface ExamQuestion {
  id: string; // e.g. "2023-sg-001"
  year: number;
  subject: ExamSubject;
  subjectLabel: string;
  questionNumber: number;
  questionText: string;
  choices: ExamChoice[];
  correctAnswer: string; // "ア"|"イ"|"ウ"|"エ"|"オ"
  explanation?: string;
  relatedLaw?: string;
}
