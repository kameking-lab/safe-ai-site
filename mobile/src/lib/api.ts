import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { z } from 'zod';
import { articleSchema, capabilitySchema, aiResultSchema, isoDate, statisticsSchema, type Feature, type Article, type Weather } from './contracts';
import { canExecute, errorMessage } from './policy';
import { inspectAiOutbound } from '@/lib/ai-outbound-safety';

export const SITE = 'https://www.anzen-ai-portal.jp';
const PATHS = ['/api/signage-data', '/api/revisions', '/api/mobile/v1/statistics', '/api/mobile/v1/capabilities', '/api/mobile/v1/ai'] as const;
export class ApiError extends Error {
  constructor(public code: string, public retryAfter?: string, public resetAt?: string, guidance?: string, public reason?: string) {
    super(['SAFETY_BLOCKED','CONSENT_REQUIRED'].includes(code) && guidance ? guidance : errorMessage(code, retryAfter, resetAt));
  }
}
export type Transport = (path: string, body?: unknown, extraHeaders?: Record<string, string>) => Promise<{ status: number; data: unknown; headers: Record<string, string> }>;
export const transport: Transport = async (path, body, extraHeaders = {}) => {
  if (!PATHS.includes(path.split('?')[0] as typeof PATHS[number])) throw new ApiError('INVALID_ENDPOINT');
  const url = `${SITE}${path}`;
  const {sessionToken}=await import('./session');
  // A Keychain failure must not take public feeds offline; send the request anonymously.
  const token=await sessionToken().catch(()=>null);
  const headers = { Accept: 'application/json', Origin:SITE,'X-Anzen-Native':'1', ...(token?{Authorization:`Bearer ${token}`} : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...extraHeaders };
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.request({ url, method: body ? 'POST' : 'GET', headers,
      ...(body ? { data: body } : {}), responseType: 'json', connectTimeout: 15000, readTimeout: 25000, disableRedirects: true });
    if (new URL(response.url).origin !== SITE) throw new ApiError('INVALID_ENDPOINT');
    return response;
  }
  const response = await fetch(url, { method: body ? 'POST' : 'GET', headers,
    ...(body ? { body: JSON.stringify(body) } : {}), credentials: 'include', redirect: 'error', signal: AbortSignal.timeout(25000), cache: 'no-store' });
  return { status: response.status, data: await response.json(), headers: Object.fromEntries(response.headers) };
};
export async function request(path: string, send: Transport = transport, body?: unknown, headers?: Record<string, string>) {
  const response = await send(path, body, headers);
  if (response.status < 200 || response.status >= 300) {
    const parsed = z.object({ error: z.object({ code: z.string(), message: z.string().max(8000).optional(), reason:z.string().optional(), resetAt: isoDate.optional() }) }).safeParse(response.data);
    const retry = Object.entries(response.headers).find(([k]) => k.toLowerCase() === 'retry-after')?.[1];
    throw new ApiError(parsed.success ? parsed.data.error.code : 'UNAVAILABLE', retry && /^\d{1,5}$/.test(retry) ? retry : undefined, parsed.success ? parsed.data.error.resetAt : undefined, parsed.success ? parsed.data.error.message : undefined, parsed.success ? parsed.data.error.reason : undefined);
  }
  return response.data;
}
const signageSchema = z.object({
  fetchedAt: isoDate, degradedSources: z.array(z.string()),
  laborTrend: z.array(z.object({ title: z.string(), link: z.string(), pubDate: isoDate })),
  jmaSourceFetchedAt: isoDate.nullable(), jmaSelectedState: z.enum(['live', 'degraded', 'unavailable']),
  jmaHeadline: z.string().nullable(), jmaReportTime: isoDate.nullable(),
  selectedWarnings: z.array(z.object({ code: z.string(), status: z.string() })), locationLabel: z.string(),
});
export async function loadNews(send = transport): Promise<Article[]> {
  const result = signageSchema.parse(await request('/api/signage-data?locationId=tokyo-shinjuku', send));
  if (result.degradedSources.includes('labor-rss')) throw new ApiError('UNAVAILABLE');
  const articles = await Promise.all(result.laborTrend.map(async n => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(n.link));
    const id = `rss-${Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')}`;
    return articleSchema.parse({ id, title: n.title,
    summary: '報道見出しです。事故の経緯・原因・確定状況は出典の記事をご確認ください。',
    date: new Date(n.pubDate).toISOString(), source: 'GoogleニュースRSS（元記事は出典を参照）',
    url: n.link, kind: 'news', verification: '報道情報。公的な事故調査結果・原因の確定とは異なります。' });
  }));
  return articles.filter((a, i) => articles.findIndex(b => b.id === a.id) === i);
}
const revisionSchema = z.object({ id: z.string(), title: z.string(), summary: z.string(),
  publishedAt: isoDate, enforcement_date: z.string().optional(), source_url: z.string().optional(),
  source: z.object({ url: z.string().optional(), label: z.string().optional() }).optional() });
export async function loadRevisions(send = transport): Promise<Article[]> {
  const data = z.object({ revisions: z.array(revisionSchema).max(5000) }).parse(await request('/api/revisions', send));
  return data.revisions.map(r => articleSchema.parse({ id: r.id, title: r.title, summary: r.summary,
    date: r.publishedAt, effectiveOn: r.enforcement_date, url: r.source_url ?? r.source?.url,
    source: r.source?.label ?? 'e-Gov 法令検索', kind: 'revision',
    verification: '構造データの機械検証済み・内容の人手確認待ち。リンクは現行法令で、個別改正文ではありません。' }));
}
export async function loadWeather(locationId: string, send = transport): Promise<Weather> {
  const r = signageSchema.parse(await request(`/api/signage-data?locationId=${encodeURIComponent(locationId)}`, send));
  return { locationId, label: r.locationLabel, sourceFetchedAt: r.jmaSourceFetchedAt,
    state: r.jmaSelectedState, reportAt: r.jmaReportTime, headline: r.jmaHeadline, warnings: r.selectedWarnings };
}
export async function loadStatistics(send = transport) { return statisticsSchema.parse(await request('/api/mobile/v1/statistics', send)); }
export async function loadCapabilities(send = transport) { return capabilitySchema.parse(await request('/api/mobile/v1/capabilities', send)); }
export async function executeAi(feature: Feature, input: string, requestId: string, send = transport) {
  const safety=inspectAiOutbound({purpose:'mobile-home',texts:[input],consent:true,contextPolicy:'approved-server-corpus'});
  if(!safety.allowed)throw new ApiError(safety.reason==='consent_required'?'CONSENT_REQUIRED':'SAFETY_BLOCKED',undefined,undefined,safety.message,safety.reason);
  // Re-check immediately before every execution. A cached response never grants permission.
  const capability = await loadCapabilities(send).catch(() => { throw new ApiError('SAFETY_UNVERIFIED'); });
  if (!canExecute(capability, feature)) throw new ApiError(capability.features[feature].quota.remaining === 0 ? capability.features[feature].quota.reserved>0?'OPERATION_PENDING':'DAILY_LIMIT_REACHED' : 'SAFETY_UNVERIFIED', undefined, capability.features[feature].quota.resetAt);
  const result = aiResultSchema.parse(await request('/api/mobile/v1/ai', send, { version: 1, feature, input, requestId, privacyConfirmed: true }, { 'X-Anzen-CSRF': capability.csrfToken }));
  if (result.requestId !== requestId || result.feature !== feature) throw new ApiError('SAFETY_UNVERIFIED');
  return result;
}
