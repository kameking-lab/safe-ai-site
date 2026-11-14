import { Preferences } from '@capacitor/preferences';
import { billing, isVerifiedPro } from './billing';
import { sessionToken, startLogin } from './session';
import { describeStoreError,StoreError } from './store-errors';
import { StaleMemberResponseError } from './member-generation';

/**
 * 「月額980円で続ける」をアプリで押したときの流れ。途中に確認画面を挟まない。
 * 未ログイン → ログイン（Apple/Google）→ アプリに戻った時点で App Store の購入シートを自動で開く。
 * ログイン済み → すぐ購入シート。購入後はサーバーで権利を確定し、元の画面のまま Pro になる。
 */
const PENDING_KEY = 'anzen.pro-after-login';
const PENDING_TTL = 10 * 60_000;
export type ProPurchaseResult = { state: 'pro' | 'login' | 'pending' | 'error'; message: string };
const PENDING_TEXT: Record<string, string> = {
  STORE_CANCELLED: '',
  PRO_SALES_PAUSED: '今月のPro新規受付は終了しました。来月1日に再開します。',
  STORE_DEFERRED: 'App Store で承認待ちです（承認後に自動で反映されます）。',
  STORE_UNKNOWN: '「会員・Pro」で購入を復元してください。',
  STORE_NOT_OPENED: '購入の準備を完了できませんでした。もう一度お試しください。',
  ALREADY_SUBSCRIBED: 'すでに Pro です。',
  PURCHASE_PENDING: '「会員・Pro」で購入を復元してください。',
  PURCHASE_REVIEW_REQUIRED: '「会員・Pro」で購入を復元してください。',
  ENTITLEMENT_SYNC_PENDING: '少し待ってからもう一度お試しください。',
  BILLING_RECONCILE_UNAVAILABLE: '少し待ってからもう一度お試しください。',
  UNAUTHORIZED: 'ログインが切れました。もう一度お試しください。',
};
let running = false;

export async function startProPurchase(): Promise<ProPurchaseResult> {
  if (running) return { state: 'pending', message: '' };
  running = true;
  try {
    const token = await sessionToken().catch(() => null);
    if (!token) {
      await Preferences.set({ key: PENDING_KEY, value: String(Date.now()) });
      await startLogin();
      return { state: 'login', message: 'ログインすると、そのまま購入画面が開きます。' };
    }
    const configStarted = performance.now();
    const config = await billing.config();
    performance.measure?.('anzen.purchase.config',{start:configStarted,end:performance.now()});
    const member = await billing.purchase(config);
    window.dispatchEvent(new Event('anzen-usage-changed'));
    if (isVerifiedPro(member)) return { state: 'pro', message: 'Pro になりました。そのまま続けて使えます。' };
    return { state: 'pending', message: PENDING_TEXT.STORE_UNKNOWN };
  } catch (error) {
    if(error instanceof StaleMemberResponseError)return {state:'pending',message:''};
    const code = error instanceof Error ? error.message : '';
    if(error instanceof StoreError)return {state:'error',message:describeStoreError(error)};
    if (code in PENDING_TEXT) return { state: code === 'ALREADY_SUBSCRIBED' ? 'pro' : 'pending', message: PENDING_TEXT[code] };
    return { state: 'error', message: describeStoreError(error) };
  } finally {
    running = false;
  }
}

/** ログイン完了直後に呼ぶ。購入ボタンから始めたログインなら、続けて購入シートを開く。 */
export async function resumeProPurchaseAfterLogin(): Promise<ProPurchaseResult | null> {
  const value = (await Preferences.get({ key: PENDING_KEY }).catch(() => ({ value: null }))).value;
  if (!value) return null;
  const age = Date.now() - Number(value);
  if (!Number.isFinite(age) || age < 0 || age > PENDING_TTL) {
    await Preferences.remove({ key: PENDING_KEY }).catch(() => {});
    return null;
  }
  if (!(await sessionToken().catch(() => null))) return null;
  await Preferences.remove({ key: PENDING_KEY }).catch(() => {});
  return startProPurchase();
}
