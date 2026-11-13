/**
 * App Store / RevenueCat の失敗を、実機の画面でそのまま原因が分かる1文にする。
 * 「商品情報を取得できません」だけでは、契約・商品設定・部品の組み込み・通信のどれか分からなかった。
 */
export class StoreError extends Error {
  constructor(code: string, readonly detail = '') { super(code); this.name = 'StoreError'; }
}
const SDK: Record<string, string> = {
  UNIMPLEMENTED: 'アプリに課金部品（RevenueCat）が組み込まれていません。新しいビルドが必要です',
  '0': 'App Store で原因不明のエラーが起きました',
  '2': 'App Store 側の問題で処理できませんでした。時間をおいてお試しください',
  '3': 'この端末では購入が許可されていません（スクリーンタイムの制限など）',
  '5': 'この商品は現在 App Store で購入できません（商品の審査・販売状態を確認）',
  '10': '通信できませんでした。電波の良い所でお試しください',
  '11': '課金の公開キーがこのアプリ用ではありません（RevenueCat の設定）',
  '15': '前の購入処理がまだ終わっていません',
  '16': 'RevenueCat のサーバーで失敗しました。時間をおいてお試しください',
  '23': 'App Store Connect から商品を取得できません（有料Appの契約・商品の状態・Bundle IDを確認）',
  '32': 'App Store の応答がありません。時間をおいてお試しください',
  '35': 'オフラインのため商品を取得できません',
};
const APP: Record<string, string> = {
  STORE_PRODUCT_TIMEOUT: 'App Storeの商品情報の取得に時間がかかっています。もう一度お試しください',
  STORE_NOT_OPENED: '購入の準備を完了できませんでした。もう一度お試しください',
  BILLING_NOT_CONFIGURED: 'App Store の販売設定がサーバーでそろっていません',
  PRODUCT_MISMATCH: 'App Store の商品が設定（月額980円・1か月）と一致しないため販売を止めています',
  NO_PACKAGES: 'RevenueCat の商品一覧が空です（Offering に月額商品がありません）',
};
/** 失敗を「理由［コード］」の形にする。detail（RevenueCat の英文など）は括弧で添える。 */
export function describeStoreError(error: unknown): string {
  if (error instanceof StoreError) {
    const base = APP[error.message] ?? SDK[error.message] ?? '購入の準備に失敗しました';
    if(error.message==='STORE_NOT_OPENED')return `${base}。会員情報を再読み込みしてお試しください。`;
    return `${base}［${error.message}］${error.detail ? `（${error.detail}）` : ''}`;
  }
  const e = (error ?? {}) as { code?: unknown; message?: unknown; underlyingErrorMessage?: unknown };
  const code = e.code === undefined || e.code === null ? '' : String(e.code);
  const raw = typeof e.message === 'string' ? e.message : '';
  const key = code || (/not implemented/i.test(raw) ? 'UNIMPLEMENTED' : '');
  const base = SDK[key] ?? (/not implemented/i.test(raw) ? SDK.UNIMPLEMENTED : 'App Store の商品情報を取得できません');
  const under = typeof e.underlyingErrorMessage === 'string' && e.underlyingErrorMessage ? e.underlyingErrorMessage : raw;
  return `${base}${key ? `［${key}］` : ''}${under ? `（${under.slice(0, 160)}）` : ''}`;
}
