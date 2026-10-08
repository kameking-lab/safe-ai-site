export const AUTOMATION_CONSULT_SOURCE_PAGES = ["/services/automation", "/"] as const;
export type AutomationConsultSourcePage = (typeof AUTOMATION_CONSULT_SOURCE_PAGES)[number];
export const AUTOMATION_CONSULT_LIMITS = {
  name: 100, email: 254, organization: 160, problemMin: 10, problemMax: 2_000,
  supportMin: 2, supportMax: 2_000, currentTools: 500,
} as const;
