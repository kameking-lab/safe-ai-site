/**
 * KY全面再設計 Phase 6: 朝礼サイネージ別端末共有の6桁コード。
 * 作成端末で発行し、別端末は /ky/morning?code=XXXXXX で読み取る（24h有効）。
 */
export const SIGNAGE_CODE_TTL_MS = 24 * 60 * 60 * 1000;

/** 000000〜999999 の6桁コードを生成（rand 差し替えでテスト可能）。 */
export function generateSignageCode(rand: () => number = Math.random): string {
  const n = Math.floor(rand() * 1_000_000);
  return String(Math.min(999_999, Math.max(0, n))).padStart(6, "0");
}

/** 6桁数字のコードか。 */
export function isValidSignageCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}
