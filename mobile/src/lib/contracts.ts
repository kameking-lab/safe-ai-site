import { z } from 'zod';

export const isoDate = z.string().refine(v => Number.isFinite(Date.parse(v)), 'invalid date');
export const httpsUrl = z.string().url().refine(v => {
  const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password;
});
export const articleSchema = z.object({
  id: z.string().min(1).max(240), title: z.string().min(1).max(2000),
  summary: z.string().max(20000), date: isoDate, url: httpsUrl,
  source: z.string().min(1), kind: z.enum(['news', 'official', 'revision']),
  effectiveOn: z.string().optional(), verification: z.string(),
});
export type Article = z.infer<typeof articleSchema>;
export const statisticsSchema = z.object({
  source: z.string(), sourceUrl: httpsUrl, sourceUpdatedAt: isoDate,
  note: z.string(),
  years: z.array(z.object({ year: z.number().int().min(2000).max(2100),
    count: z.number().int().nonnegative(), types: z.record(z.string(), z.number().int().nonnegative()) })).max(50),
});
export type Statistics = z.infer<typeof statisticsSchema>;
export const weatherSchema = z.object({
  locationId: z.string(), label: z.string(),
  sourceFetchedAt: isoDate.nullable(), reportAt: isoDate.nullable(),
  state: z.enum(['live', 'degraded', 'unavailable']), headline: z.string().nullable(),
  warnings: z.array(z.object({ code: z.string(), status: z.string() })).max(100),
});
export type Weather = z.infer<typeof weatherSchema>;
export const envelope = <T extends z.ZodType>(data: T) => z.object({
  schema: z.literal(1), receivedAt: isoDate, origin: z.enum(['bundle', 'site']), data,
});
export type Snapshot<T> = { schema: 1; receivedAt: string; origin: 'bundle' | 'site'; data: T };
export const quotaSchema = z.object({
  limit: z.number().int().positive(), used: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(), remaining: z.number().int().nonnegative(), resetAt: isoDate,
}).refine(q => q.remaining === Math.max(0, q.limit - q.used - q.reserved), 'inconsistent quota');
export const capabilitySchema = z.object({
  version: z.literal(1), expiresAt: isoDate,
  plan: z.enum(['free', 'pro']), session: z.enum(['anonymous','member']), csrfToken: z.string().min(32).max(256),
  safety: z.object({ originalEvidence: z.literal(true), dangerousAssertionsBlocked: z.literal(true),
    sharedMonthlyBudgetYen: z.literal(50000), serverSideEnforced: z.literal(true) }),
  features: z.object({
    law_chat: z.object({ available: z.boolean(), quota: quotaSchema }),
    chemical_ra: z.object({ available: z.boolean(), quota: quotaSchema }),
  }),
});
export type Capability = z.infer<typeof capabilitySchema>;
export type Feature = 'law_chat' | 'chemical_ra';
export const evidenceSchema = z.object({
  title: z.string().min(1), original: z.string().min(1), url: httpsUrl,
  asOf: isoDate, verification: z.string().min(1),
});
export const aiResultSchema = z.object({
  version: z.literal(1), requestId: z.string().uuid(), feature: z.enum(['law_chat', 'chemical_ra']),
  status: z.enum(['completed', 'fallback', 'blocked', 'unavailable']),
  answer: z.string().max(40000), conditions: z.array(z.string()), evidence: z.array(evidenceSchema),
  safety: z.object({ reviewed: z.literal(true), dangerousAssertionsBlocked: z.literal(true) }),
  usage: quotaSchema, charged: z.boolean(),
}).refine(r => r.status !== 'completed' || r.evidence.length > 0, 'missing original evidence')
  .refine(r => r.status === 'completed' || !r.charged, 'non-result charged');
export type AiResult = z.infer<typeof aiResultSchema>;
