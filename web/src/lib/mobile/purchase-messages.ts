/** Only fixed codes cross the billing identity boundary. */
export const identityPurchaseMessages: Record<string, string> = {
  DUPLICATE_SUBSCRIPTION_GOOGLE: 'このメールアドレスの別のアカウント（Google）で購入済みです。そちらでログインしてください。',
  DUPLICATE_SUBSCRIPTION_APPLE: 'このメールアドレスの別のアカウント（Apple）で購入済みです。そちらでログインしてください。',
  DUPLICATE_SUBSCRIPTION_GOOGLE_APPLE: 'このメールアドレスの別のアカウント（Google / Apple）で購入済みです。そちらでログインしてください。',
  BILLING_EMAIL_UNVERIFIED: '購入状況を確認するため、同じ方法（Google / Apple）でもう一度ログインしてください。',
  BILLING_IDENTITY_UNAVAILABLE: '購入状況を確認できません。時間をおいてもう一度お試しください。',
};
export function identityPurchaseFailure(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  if (!Object.hasOwn(identityPurchaseMessages, code)) return null;
  return { code, message: identityPurchaseMessages[code], status: code.startsWith('DUPLICATE_') ? 409 : 503 };
}
