import { billing, isVerifiedPro } from './billing';
import { ensureSession } from './session';
import { describeStoreError,StoreError } from './store-errors';
import { StaleMemberResponseError } from './member-generation';

/**
 * 「月額980円で続ける」をアプリで押したときの流れ。途中に確認画面も登録も挟まない（App Store 5.1.1(v)）。
 * 未ログイン → 個人情報のないゲストとしてそのまま App Store の購入シートを開く。
 * ログイン済み → すぐ購入シート。購入後はサーバーで権利を確定し、元の画面のまま Pro になる。
 * あとからログインすると、ゲストの購入はその会員へ引き継がれ、ほかの端末やウェブでも使える。
 */
export type ProPurchaseResult = { state: 'pro' | 'pending' | 'error'; message: string };
const PENDING_TEXT: Record<string, string> = {
  STORE_CANCELLED: '',
  PRO_SALES_PAUSED: '今月のPro新規受付は終了しました。来月1日に再開します。',
  STORE_DEFERRED: 'App Storeの承認をお待ちください。',
  STORE_UNKNOWN: '購入状況を確認中です。',
  STORE_NOT_OPENED: 'もう一度お試しください。',
  ALREADY_SUBSCRIBED: 'すでに Pro です。',
  PURCHASE_PENDING: '購入状況を確認中です。',
  PURCHASE_REVIEW_REQUIRED: '購入状況を確認中です。',
  ENTITLEMENT_SYNC_PENDING: '少し待ってからもう一度お試しください。',
  BILLING_RECONCILE_UNAVAILABLE: '少し待ってからもう一度お試しください。',
  UNAUTHORIZED: 'もう一度お試しください。',
};
const SESSION_FAILED = '購入を始められませんでした。通信を確認して、もう一度お試しください。';
let running = false;

export async function startProPurchase(): Promise<ProPurchaseResult> {
  if (running) return { state: 'pending', message: '' };
  running = true;
  try {
    try { await ensureSession(); } catch { return { state: 'error', message: SESSION_FAILED }; }
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

/** 「購入を復元」もログインなしで行える。セッションがなければゲストを作ってから復元する。 */
export async function restoreProPurchases() {
  await ensureSession();
  return billing.restore(await billing.config());
}
