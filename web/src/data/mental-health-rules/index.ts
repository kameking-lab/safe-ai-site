/**
 * Mental-health management rule barrel.
 *
 * Consolidates the stress-check program, small-business simplified track,
 * high-stress interview flow, and harassment-prevention linkage datasets
 * behind a single import path for pages and the flow engine.
 */

export {
  STRESS_CHECK_REQUIREMENTS,
  getMandatoryRequirements,
  getEffortDutyRequirements,
} from "./stress-check";

export {
  SMALL_BUSINESS_STEPS,
  SMALL_BUSINESS_ALTERNATIVES,
} from "./small-business";

export {
  INTERVIEW_FLOW_STEPS,
  PHYSICIAN_OPINION_TEMPLATE,
  JOB_CLASS_OVERLAY,
} from "./interview-flow";

export { HARASSMENT_LINKAGES, getLinkageByType } from "./harassment-linkage";
