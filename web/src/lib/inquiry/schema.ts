import { z } from "zod";

// Preserve the production CSP by disabling Zod's Function-based parser JIT.
z.config({ jitless: true });
import { readLimitedJson } from "@/lib/http/read-limited-json";

export const INQUIRY_MAX_BODY_BYTES = 12 * 1024;

export const inquiryCategories = [
  "question",
  "improvement",
  "data-error",
  "feature-request",
  "other",
] as const;

const SINGLE_LINE_CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const MULTILINE_CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

const optionalSingleLine = (max: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z
      .string()
      .trim()
      .min(1)
      .max(max)
      .refine((value) => !SINGLE_LINE_CONTROL_CHARACTERS.test(value), {
        message: "control_characters_not_allowed",
      })
      .optional(),
  );

export const inquirySchema = z
  .object({
    name: optionalSingleLine(100),
    email: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? undefined : value,
      z
        .string()
        .trim()
        .max(254)
        .email()
        .refine((value) => !SINGLE_LINE_CONTROL_CHARACTERS.test(value), {
          message: "control_characters_not_allowed",
        })
        .transform((value) => value.toLowerCase())
        .optional(),
    ),
    industry: optionalSingleLine(100),
    category: z.enum(inquiryCategories),
    subject: z
      .string()
      .trim()
      .min(3)
      .max(160)
      .refine((value) => !SINGLE_LINE_CONTROL_CHARACTERS.test(value), {
        message: "control_characters_not_allowed",
      }),
    message: z
      .string()
      .transform((value) => value.replace(/\r\n?/g, "\n").trim())
      .pipe(
        z
          .string()
          .min(5)
          .max(4_000)
          .refine((value) => !MULTILINE_CONTROL_CHARACTERS.test(value), {
            message: "control_characters_not_allowed",
          }),
      ),
    privacyConsent: z.literal(true),
    website: z.string().max(200).optional().default(""),
  })
  .strict();

export type InquiryInput = z.infer<typeof inquirySchema>;

export function readInquiryJson(request: Request) {
  return readLimitedJson(request, INQUIRY_MAX_BODY_BYTES);
}
