import type { Capability, AiResult } from '../src/lib/contracts';
export function capability(now = Date.now()): Capability {
  return { version: 1, expiresAt: new Date(now + 240000).toISOString(), plan: 'free', session: 'anonymous', csrfToken: 'x'.repeat(32),
    safety: { originalEvidence: true, dangerousAssertionsBlocked: true, sharedMonthlyBudgetYen: 50000, serverSideEnforced: true },
    features: {
      law_chat: { available: true, quota: { limit: 3, used: 0, reserved: 0, remaining: 3, resetAt: new Date(now + 3600000).toISOString() } },
      chemical_ra: { available: true, quota: { limit: 1, used: 0, reserved: 0, remaining: 1, resetAt: new Date(now + 3600000).toISOString() } },
    } };
}
export function aiResult(requestId: string, feature: 'law_chat' | 'chemical_ra' = 'law_chat'): AiResult {
  return { version: 2, requestId, feature, status: 'completed', answer: '適用条件を原文で確認してください。',
    conditions: ['作業条件と施行日を確認'], evidence: [{ title: '検証用法令', original: 'これはローカル試験用の原文です。', url: 'https://laws.e-gov.go.jp/law/test', asOf: new Date().toISOString(), verification: 'ローカル試験用' }],
    safety: { reviewed: true, dangerousAssertionsBlocked: true },
    usage: { limit: feature === 'law_chat' ? 3 : 1, used: 1, reserved: 0, remaining: feature === 'law_chat' ? 2 : 0, resetAt: new Date(Date.now() + 3600000).toISOString() }, charged: true };
}
