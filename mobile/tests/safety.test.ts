import { describe, expect, it, vi } from 'vitest';
import { capability } from './fixtures';
import { aiResult } from './fixtures';
import { capabilitySchema, aiResultSchema } from '../src/lib/contracts';
import { executeAi, loadNews, request, transport } from '../src/lib/api';
import { canExecute, PLAN_LIMITS, quotaLow, errorMessage, weatherFresh } from '../src/lib/policy';
import { safeExternalUrl } from '../src/lib/native';
import { Capacitor } from '@capacitor/core';
const id = 'a92c8879-453a-41c0-b51e-ed99dc286477';
describe('server-enforced safety boundary', () => {
  it('preserves privacy guidance from a safety response',async()=>{
    for(const [code,message,reason] of [['SAFETY_BLOCKED','個人情報を匿名化してください。','sensitive_data'],['CONSENT_REQUIRED','送信への同意を確認してください。','consent_required']]){
      await expect(request('/api/mobile/v1/ai',async()=>({status:422,data:{error:{code,message,reason}},headers:{}}))).rejects.toMatchObject({code,message,reason});
    }
  });
  it('blocks private input before even fetching capabilities',async()=>{
    const send=vi.fn(async()=>({status:503,data:{},headers:{}}));
    await expect(executeAi('law_chat','連絡先はtaro@example.comです',id,send)).rejects.toThrow(/個人|匿名/);
    expect(send).not.toHaveBeenCalled();
  });
  it('pins free and future Pro independently from safety limits', () => {
    expect(PLAN_LIMITS.free).toEqual({ law_chat: 3, chemical_ra: 1, weatherLocations: 1, notifications: false });
    expect(PLAN_LIMITS.pro).toEqual({ law_chat: 50, chemical_ra: 10, weatherLocations: 10, notifications: true });
  });
  it.each(['originalEvidence', 'dangerousAssertionsBlocked', 'serverSideEnforced'] as const)('requires %s', flag => {
    const c = capability(); expect(capabilitySchema.safeParse({ ...c, safety: { ...c.safety, [flag]: false } }).success).toBe(false);
  });
  it('rejects increased monthly budget, expired proof and local Pro escalation', () => {
    const c = capability(); expect(capabilitySchema.safeParse({ ...c, safety: { ...c.safety, sharedMonthlyBudgetYen: 50001 } }).success).toBe(false);
    expect(canExecute({ ...c, expiresAt: new Date(Date.now() - 1).toISOString() }, 'law_chat')).toBe(false);
    expect(canExecute({ ...c, plan: 'pro' }, 'law_chat')).toBe(false);
    c.features.law_chat.quota.limit = 50; expect(canExecute(c, 'law_chat')).toBe(false);
  });
  it('never calls paid execution when server contract is absent', async () => {
    const send = vi.fn(async () => ({ status: 404, data: {}, headers: {} }));
    await expect(executeAi('law_chat', 'question', id, send)).rejects.toThrow('安全装置');
    expect(send).toHaveBeenCalledTimes(1); expect(send.mock.calls[0]).toBeDefined();
  });
  it('lets native law chat ask the server when the quota display contract is unexpected, and keeps server limits',async()=>{
    const native=vi.spyOn(Capacitor,'isNativePlatform').mockReturnValue(true);
    try{
      const send=vi.fn(async(path:string)=>path.includes('capabilities')?{status:200,data:{unexpected:true},headers:{}}:{status:429,data:{error:{code:'DAILY_LIMIT_REACHED'}},headers:{}});
      await expect(executeAi('law_chat','question',id,send)).rejects.toThrow('本日の上限');
      expect(send).toHaveBeenCalledTimes(2);expect(send.mock.calls[1][0]).toBe('/api/mobile/v1/ai');
      const denied=vi.fn(async()=>({status:401,data:{error:{code:'UNAUTHORIZED'}},headers:{}}));
      await expect(executeAi('law_chat','question',id,denied)).rejects.toMatchObject({code:'UNAUTHORIZED'});
      expect(denied).toHaveBeenCalledTimes(1);
    }finally{native.mockRestore();}
  });
  it('refuses execution with exhausted or reserved last quota', async () => {
    const c = capability(); c.features.law_chat.quota = { ...c.features.law_chat.quota, used: 2, reserved: 1, remaining: 0 };
    const send = vi.fn(async () => ({ status: 200, data: c, headers: {} }));
    await expect(executeAi('law_chat', 'question', id, send)).rejects.toThrow('処理中'); expect(send).toHaveBeenCalledTimes(1);
  });
  it('passes idempotency and consent, validates original evidence and identity', async () => {
    const send = vi.fn(async (path: string) => ({ status: 200, data: path.includes('capabilities') ? capability() : aiResult(id), headers: {} }));
    const result = await executeAi('law_chat', 'question', id, send);
    expect(result.evidence[0].original).toContain('原文');
    expect(send).toHaveBeenNthCalledWith(2, '/api/mobile/v1/ai', { version: 2, feature: 'law_chat', input: 'question', requestId: id, privacyConfirmed: true }, { 'X-Anzen-CSRF': 'x'.repeat(32) });
    const mismatch = async (path: string) => ({ status: 200, data: path.includes('capabilities') ? capability() : aiResult(crypto.randomUUID()), headers: {} });
    await expect(executeAi('law_chat', 'question', id, mismatch)).rejects.toThrow('安全装置');
  });
  it('rejects missing evidence and charging for RA unavailable/fallback', () => {
    const r = aiResult(id); expect(aiResultSchema.safeParse({ ...r, evidence: [] }).success).toBe(false);
    expect(aiResultSchema.safeParse({ ...r, status: 'unavailable', charged: true }).success).toBe(false);
    expect(aiResultSchema.safeParse({ ...r, status: 'fallback', charged: false, evidence: [] }).success).toBe(true);
  });
  it('rejects the old result contract and shows actionable update guidance', async () => {
    expect(aiResultSchema.safeParse({ ...aiResult(id), version: 1 }).success).toBe(false);
    const send = vi.fn(async (path: string) => path.includes('capabilities')
      ? { status: 200, data: capability(), headers: {} }
      : { status: 426, data: { error: { code: 'CLIENT_UPDATE_REQUIRED' } }, headers: {} });
    await expect(executeAi('law_chat', 'question', id, send)).rejects.toThrow('最新版に更新');
  });
  it('keeps burst, daily, monthly and unavailable errors distinct', async () => {
    await expect(request('/api/mobile/v1/ai', async () => ({ status: 429, data: { error: { code: 'BURST_LIMITED' } }, headers: { 'Retry-After': '45' } }))).rejects.toThrow('45秒');
    expect(errorMessage('AI_BUDGET_STOPPED')).not.toContain('0時');
    expect(errorMessage('FEATURE_UNAVAILABLE')).toContain('消費しません');
    expect(quotaLow(1, 3)).toBe(false); expect(quotaLow(10, 50)).toBe(true); expect(quotaLow(2, 10)).toBe(true);
  });
  it('restricts all API calls to known site paths and safe external protocols', async () => {
    await expect(transport('https://evil.example/')).rejects.toThrow();
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl('http://example.com')).toBeNull();
    expect(safeExternalUrl('https://user:password@example.com')).toBeNull();
  });
  it('never treats old, future, invalid or missing weather as current', () => {
    const now = Date.now(); expect(weatherFresh(new Date(now - 900001).toISOString(), now)).toBe(false);
    expect(weatherFresh(new Date(now + 61000).toISOString(), now)).toBe(false);
    expect(weatherFresh(null, now)).toBe(false); expect(weatherFresh('broken', now)).toBe(false);
    expect(weatherFresh(new Date(now).toISOString(), now)).toBe(true);
  });
  it('does not erase cached news when RSS is degraded; supports long stable article IDs', async () => {
    const data = { fetchedAt: new Date().toISOString(), degradedSources: ['labor-rss'], laborTrend: [], jmaSourceFetchedAt: null, jmaSelectedState: 'unavailable', jmaHeadline: null, jmaReportTime: null, selectedWarnings: [], locationLabel: '東京' };
    await expect(loadNews(async () => ({ status: 200, data, headers: {} }))).rejects.toThrow();
    const link = `https://news.google.com/rss/articles/${'a'.repeat(1000)}`;
    const item = { title: '試験記事', link, pubDate: new Date().toISOString() };
    const result = await loadNews(async () => ({ status: 200, data: { ...data, degradedSources: [], laborTrend: [item, item] }, headers: {} }));
    expect(result).toHaveLength(1); expect(result[0].id).toHaveLength(68);
  });
});

it('accepts unreviewed AI results while preserving warnings for display',()=>{
 const result=aiResultSchema.parse({...aiResult(crypto.randomUUID()),safety:{reviewed:false,dangerousAssertionsBlocked:false},confidence:'low',requiresHumanReview:true,scopeWarnings:['unverified citation'],effectiveDateStatus:{asOf:null,status:'unknown',label:'unverified'}});
 expect(result.safety.reviewed).toBe(false);expect(result.scopeWarnings).toEqual(['unverified citation']);expect(result.requiresHumanReview).toBe(true);
});
