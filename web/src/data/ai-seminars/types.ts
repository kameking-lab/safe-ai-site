import type {
  TrainingCourse,
  TrainingSlide,
} from "../safety-seminars/types";

export type {
  TrainingClaim,
  TrainingCourse,
  TrainingSlide,
  TrainingSource,
} from "../safety-seminars/types";

export type AiTrainingExercise = {
  id: string;
  number: number;
  title: string;
  scenario: string;
  task: string;
  revealLabel: string;
  modelAnswer: string[];
  explanation: string;
  claimIds: string[];
};

export type AiTrainingCourse = TrainingCourse & {
  exercises: AiTrainingExercise[];
};

export type AiQuizQuestion = {
  id: string;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  claimIds: string[];
};

export type AiQuiz = {
  title: string;
  questions: AiQuizQuestion[];
};

export type AiPromptElement = {
  id: "goal" | "context" | "output" | "boundary";
  label: string;
  prompt: string;
  questions: string[];
};

export type AiPromptTemplate = {
  id: string;
  title: string;
  version: string;
  asOf: string;
  description: string;
  elements: AiPromptElement[];
  verification: {
    evidenceRequest: string;
    unresolvedRequest: string;
    humanCheckpoint: string;
  };
  copyTemplate: string;
  safeUseNotes: string[];
  claimIds: string[];
};

// JSON正本を利用する画面・生成処理が同じ型へ収束できるようにする。
export type AiChatWorkSlide = TrainingSlide;
export type AiChatWorkTraining = AiTrainingCourse;
