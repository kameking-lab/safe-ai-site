import { z } from "zod";

// Preserve the production CSP by disabling Zod's Function-based parser JIT.
z.config({ jitless: true });
import { readLimitedJson } from "@/lib/http/read-limited-json";
import { automationConsultationTypes } from "./prefill";

export { automationConsultationTypes } from "./prefill";

export const AUTOMATION_CONSULT_MAX_BODY_BYTES = 16 * 1024;

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

const SINGLE_LINE_CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const MULTILINE_CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

function singleLine(options: { min: number; max: number }) {
  return z
    .string()
    .trim()
    .min(options.min)
    .max(options.max)
    .refine((value) => !SINGLE_LINE_CONTROL_CHARACTERS.test(value), {
      message: "control_characters_not_allowed",
    });
}

function multiline(options: { min: number; max: number }) {
  return z
    .string()
    .transform((value) => value.replace(/\r\n?/g, "\n").trim())
    .pipe(
      z
        .string()
        .min(options.min)
        .max(options.max)
        .refine((value) => !MULTILINE_CONTROL_CHARACTERS.test(value), {
          message: "control_characters_not_allowed",
        })
    );
}

function optionalWhenBlank<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    schema.optional()
  );
}

export const automationConsultSchema = z
  .object({
    consultationType: z.enum(automationConsultationTypes),
    name: singleLine({ min: 1, max: 100 }),
    email: z
      .string()
      .trim()
      .max(254)
      .email()
      .refine((value) => !SINGLE_LINE_CONTROL_CHARACTERS.test(value), {
        message: "control_characters_not_allowed",
      })
      .transform((value) => value.toLowerCase()),
    organization: optionalWhenBlank(singleLine({ min: 1, max: 160 })),
    currentProblem: multiline({ min: 10, max: 2_000 }),
    desiredSupport: multiline({ min: 2, max: 2_000 }),
    currentTools: optionalWhenBlank(multiline({ min: 1, max: 500 })),
    timing: z.enum(automationConsultTimings),
    budget: optionalWhenBlank(z.enum(automationConsultBudgets)),
    deliveryPreference: optionalWhenBlank(z.enum(automationConsultDeliveryPreferences)),
    privacyConsent: z.literal(true),
    website: z.string().max(200).optional().default(""),
    sourcePage: z.literal("/services/automation"),
  })
  .strict();

export type AutomationConsultInput = z.infer<typeof automationConsultSchema>;

export type AutomationConsultFieldErrors = Partial<
  Record<keyof AutomationConsultInput, string[]>
>;

export async function readAutomationConsultJson(
  request: Request
): Promise<
  | { ok: true; value: unknown }
  | { ok: false; reason: "payload_too_large" | "invalid_json" }
> {
  return readLimitedJson(request, AUTOMATION_CONSULT_MAX_BODY_BYTES);
}

export function flattenAutomationConsultErrors(
  error: z.ZodError
): AutomationConsultFieldErrors {
  const fields: AutomationConsultFieldErrors = {};
  for (const issue of error.issues) {
    const firstPath = issue.path[0];
    if (typeof firstPath !== "string") continue;
    const field = firstPath as keyof AutomationConsultInput;
    fields[field] = [...(fields[field] ?? []), issue.message];
  }
  return fields;
}
