import { automationConsultationTypes } from "./prefill";
import {
  AUTOMATION_CONSULT_LIMITS as LIMITS,
  AUTOMATION_CONSULT_SOURCE_PAGES,
  automationConsultTimings,
  automationConsultBudgets,
  automationConsultDeliveryPreferences,
  type AutomationConsultSourcePage,
} from "./form-contract";

export type AutomationConsultFormData = {
  consultationType: (typeof automationConsultationTypes)[number];
  name: string;
  email: string;
  organization?: string;
  currentProblem: string;
  desiredSupport: string;
  currentTools?: string;
  timing: (typeof automationConsultTimings)[number];
  budget?: (typeof automationConsultBudgets)[number];
  deliveryPreference?: (typeof automationConsultDeliveryPreferences)[number];
  privacyConsent: true;
  website: string;
  sourcePage: AutomationConsultSourcePage;
};

type Issue = { path: string[] };
type ParseResult =
  | { success: true; data: AutomationConsultFormData }
  | { success: false; error: { issues: Issue[] } };
const SINGLE_LINE_CONTROL = /[\u0000-\u001f\u007f]/;
const MULTILINE_CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
// Locked Zod 4.3.6 default email grammar; server-parity tests guard this boundary.
const EMAIL = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
const FIELDS = new Set([
  "consultationType", "name", "email", "organization", "currentProblem",
  "desiredSupport", "currentTools", "timing", "budget", "deliveryPreference",
  "privacyConsent", "website", "sourcePage",
]);

export function normalizeAutomationConsultMultiline(value: string): string {
  return value.replace(/\r\n?/g, "\n").trim();
}

/** Client-only validation with no server parser, HTTP reader or Zod dependency. */
export function parseAutomationConsultForm(input: unknown): ParseResult {
  const issues: Issue[] = [];
  const reject = (field: string) => { issues.push({ path: [field] }); };
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { success: false, error: { issues: [{ path: [] }] } };
  }
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some(key => !FIELDS.has(key))) issues.push({ path: [] });
  const single = (field: string, min: number, max: number, defaultValue?: string) => {
    const raw = value[field] === undefined ? defaultValue : value[field];
    if (typeof raw !== "string") { reject(field); return ""; }
    const normalized = raw.trim();
    if (normalized.length < min || normalized.length > max || SINGLE_LINE_CONTROL.test(normalized)) reject(field);
    return normalized;
  };
  const multiline = (field: string, min: number, max: number, defaultValue?: string) => {
    const raw = value[field] === undefined ? defaultValue : value[field];
    if (typeof raw !== "string") { reject(field); return ""; }
    const normalized = normalizeAutomationConsultMultiline(raw);
    if (normalized.length < min || normalized.length > max || MULTILINE_CONTROL.test(normalized)) reject(field);
    return normalized;
  };
  const enumValue = <T extends string>(field: string, choices: readonly T[]): T => {
    const raw = value[field];
    if (typeof raw !== "string" || !choices.includes(raw as T)) reject(field);
    return raw as T;
  };
  const blank = (field: string) => value[field] === undefined ||
    (typeof value[field] === "string" && value[field].trim() === "");
  const name = single("name", 0, LIMITS.name, "");
  const emailBeforeNormalization = single("email", 0, LIMITS.email);
  if (!EMAIL.test(emailBeforeNormalization)) reject("email");
  const email = emailBeforeNormalization.toLowerCase();
  const currentProblem = multiline("currentProblem", LIMITS.problemMin, LIMITS.problemMax);
  const desiredSupport = multiline("desiredSupport", 0, LIMITS.supportMax, "");
  const consultationType = enumValue("consultationType", automationConsultationTypes);
  const timing = enumValue("timing", automationConsultTimings);
  const sourcePage = enumValue("sourcePage", AUTOMATION_CONSULT_SOURCE_PAGES);
  if (value.privacyConsent !== true) reject("privacyConsent");
  const website = value.website === undefined ? "" : value.website;
  if (typeof website !== "string" || website.length > 200) reject("website");
  const organization = blank("organization") ? undefined : single("organization", 1, LIMITS.organization);
  const currentTools = blank("currentTools") ? undefined : multiline("currentTools", 1, LIMITS.currentTools);
  const budget = blank("budget") ? undefined : enumValue("budget", automationConsultBudgets);
  const deliveryPreference = blank("deliveryPreference") ? undefined : enumValue("deliveryPreference", automationConsultDeliveryPreferences);
  if (sourcePage === "/services/automation") {
    if (!name) reject("name");
    if (desiredSupport.length < LIMITS.supportMin) reject("desiredSupport");
  }
  if (issues.length) return { success: false, error: { issues } };
  const data: AutomationConsultFormData = {
    consultationType, name, email, currentProblem, desiredSupport, timing,
    privacyConsent: true, website: website as string, sourcePage,
  };
  for (const [field, normalized] of Object.entries({ organization, currentTools, budget, deliveryPreference })) {
    if (normalized !== undefined || Object.hasOwn(value, field)) {
      Object.assign(data, { [field]: normalized });
    }
  }
  return { success: true, data };
}
