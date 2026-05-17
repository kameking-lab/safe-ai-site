export { SPECIAL_EDUCATION } from "./special-education";
export { SKILL_TRAINING } from "./skill-training";
export { JOB_CHIEF_EDUCATION } from "./job-chief";
export { LICENSES } from "./licenses";

import { SPECIAL_EDUCATION } from "./special-education";
import { SKILL_TRAINING } from "./skill-training";
import { JOB_CHIEF_EDUCATION } from "./job-chief";
import { LICENSES } from "./licenses";
import type { EducationCert } from "@/types/education-cert";

export const ALL_CERTS: EducationCert[] = [
  ...SPECIAL_EDUCATION,
  ...SKILL_TRAINING,
  ...JOB_CHIEF_EDUCATION,
  ...LICENSES,
];
