export interface ExamChoice {
  label: string; // "ア", "イ", "ウ", "エ", "オ"
  text: string;
}

export interface ExamQuestion {
  id: string;
  year: number;
  certificationId?: string; // e.g. "anzen-consultant", "boiler-1st"
  subject: string;          // subject ID within the certification
  subjectLabel: string;
  questionNumber: number;
  questionText: string;
  choices: ExamChoice[];
  correctAnswer: string; // "ア"|"イ"|"ウ"|"エ"|"オ"
  explanation?: string;
  relatedLaw?: string;
}

// Kept for backward compatibility with legacy subject filtering
export type ExamSubject = string;

export interface ExamCertSubject {
  id: string;
  label: string;
}

export interface ExamCertification {
  id: string;
  name: string;
  shortName: string;
  category: "consultant" | "boiler" | "crane" | "special" | "radiation" | "environment" | "health";
  subjects: ExamCertSubject[];
}
