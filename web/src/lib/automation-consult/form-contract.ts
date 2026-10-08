export const AUTOMATION_CONSULT_SOURCE_PAGES = ["/services/automation", "/"] as const;
export type AutomationConsultSourcePage = (typeof AUTOMATION_CONSULT_SOURCE_PAGES)[number];
export const AUTOMATION_CONSULT_LIMITS = {
  name: 100, email: 254, organization: 160, problemMin: 10, problemMax: 2_000,
  supportMin: 2, supportMax: 2_000, currentTools: 500,
} as const;

export const automationConsultTimings = [
  "asap",
  "within-1-month",
  "within-3-months",
  "undecided",
] as const;

export const automationConsultBudgets = [
  "under-50000",
  "50000-100000",
  "100000-300000",
  "300000-500000",
  "over-500000",
  "undecided",
] as const;

export const automationConsultDeliveryPreferences = [
  "online",
  "onsite",
  "either",
  "undecided",
] as const;
