import type { Capability, Feature } from './contracts';
import product from '@/lib/mobile/product-policy.json';

// Product limits are separate from abuse limits and the server's cost ledger.
export const PLAN_LIMITS = product.limits;
export interface EntitlementProvider {
  getPlan(): Promise<'free' | 'pro'>;
}
export const v1Entitlements: EntitlementProvider = { async getPlan() { const {billing}=await import('./billing');const member=await billing.entitlement();if(member.syncState!=='verified')throw new Error('ENTITLEMENT_SYNC_PENDING');return member.plan; } };
export function canExecute(c: Capability | null, feature: Feature, now = Date.now()) {
  return !!c && (c.plan === 'free' || (c.plan==='pro' && c.session==='member')) && Date.parse(c.expiresAt) > now &&
    Date.parse(c.expiresAt) <= now + 5 * 60_000 &&
    c.features[feature].available &&
    c.features[feature].quota.limit === PLAN_LIMITS[c.plan][feature] &&
    c.features[feature].quota.remaining > 0 && Date.parse(c.features[feature].quota.resetAt) > now;
}
export function quotaLow(remaining: number, limit: number) { return remaining / limit <= 0.2; }
export function errorMessage(code: string, retryAfter?: string, resetAt?: string) {
  const messages: Record<string, string> = {
    DAILY_LIMIT_REACHED: `本日の上限に達しました。日本時間の次の0時に回復します${resetAt ? `（${formatDate(resetAt)}）` : ''}。`,
    OPERATION_PENDING: '処理中です。同じ操作の結果を確認してください。',
    OPERATION_RELEASED: '前の操作は完了していません。もう一度送信すると新しい操作として確認します。',
    BURST_LIMITED: `短時間の利用が集中しています。${retryAfter ? `${retryAfter}秒後に` : '時間をおいて'}再度お試しください。`,
    ABUSE_RATE_LIMITED: `現在混雑しています。${retryAfter ? `${retryAfter}秒後に` : '時間をおいて'}再度お試しください。`,
    AI_BUDGET_FREE_PAUSED: 'AIは月間原価上限に備えて一時停止しています。無料情報は引き続き閲覧できます。',
    AI_BUDGET_STOPPED: '月間原価上限のためAIを停止しています。無料情報は引き続き閲覧できます。',
    FEATURE_UNAVAILABLE: 'この評価機能は現在利用できません。回数は消費しません。',
    SAFETY_UNVERIFIED: 'サイト側の回数制限・安全装置を確認できないため、AIの送信を停止しています。',
    OFFLINE: 'オフラインです。AIは通信が必要です。保存した情報は閲覧できます。',
  };
  return messages[code] ?? '取得できませんでした。保存済み情報を表示しています。時間をおいて再度お試しください。';
}
export function formatDate(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return '未取得';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.replaceAll('-', '/');
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
export function weatherFresh(sourceAt: string | null, now = Date.now()) {
  if (!sourceAt) return false;
  const age = now - Date.parse(sourceAt);
  return Number.isFinite(age) && age >= -60_000 && age <= 15 * 60_000;
}
