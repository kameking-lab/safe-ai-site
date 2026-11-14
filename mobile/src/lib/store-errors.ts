/** Store diagnostics stay in the error object; the screen shows the next action. */
export class StoreError extends Error {
  constructor(code: string, readonly detail = '') { super(code); this.name = 'StoreError'; }
}
const MESSAGES: Record<string, string> = {
  '3': '端末の購入制限を確認してください。',
  '10': '通信環境を確認してもう一度お試しください。',
  '15': '少し待ってからもう一度お試しください。',
  '35': '通信環境を確認してもう一度お試しください。',
  STORE_PRODUCT_TIMEOUT: '少し待ってからもう一度お試しください。',
  STORE_NOT_OPENED: 'もう一度お試しください。',
};
export function describeStoreError(error: unknown): string {
  const e = error as { code?: unknown; message?: unknown } | null;
  const code = error instanceof StoreError ? error.message : String(e?.code ?? '');
  return MESSAGES[code] ?? '少し待ってからもう一度お試しください。';
}
