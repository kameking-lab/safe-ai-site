import type { AsbestosRulebook } from "@/types/asbestos";
import { ASBESTOS_FORMS } from "./forms";
import { WORK_PLANS } from "./work-plans";
import { ASBESTOS_QUALIFICATIONS } from "./qualifications";

export { ASBESTOS_FORMS } from "./forms";
export { WORK_PLANS } from "./work-plans";
export { ASBESTOS_QUALIFICATIONS } from "./qualifications";

export const ASBESTOS_RULEBOOK: AsbestosRulebook = {
  forms: ASBESTOS_FORMS,
  workPlans: WORK_PLANS,
  qualifications: ASBESTOS_QUALIFICATIONS,
};
