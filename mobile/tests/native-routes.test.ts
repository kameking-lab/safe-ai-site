import { expect, it } from 'vitest';
import { isOwnerExcludedRoute } from '../scripts/native-routes.mjs';

it.each(['/e-learning/exams', '/e-learning/exams/paper-1', '/exam-quiz', '/exam-quiz/topic', '/ky', '/safety-diary', '/site-records/near-miss'])('excludes the owner-prohibited route %s and descendants', route => {
  expect(isOwnerExcludedRoute(route)).toBe(true);
  expect(isOwnerExcludedRoute(`${route}/index.html`)).toBe(true);
});
it.each(['/e-learning', '/e-learning/exams-guide', '/exam-quizzer', '/training/visual-ky', '/laws', '/'])('retains the other learning and portal route %s', route => {
  expect(isOwnerExcludedRoute(route)).toBe(false);
});
