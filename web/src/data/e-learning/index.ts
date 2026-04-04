import type { ELearningQuestion } from "./types";
import { questions as part1 } from "./e-learning-questions-part1";
import { questions as part2 } from "./e-learning-questions-part2";

export type { ELearningQuestion };
export { ELEARNING_CATEGORIES } from "./types";

export const ALL_ELEARNING_QUESTIONS: ELearningQuestion[] = [
  ...part1,
  ...part2,
];
