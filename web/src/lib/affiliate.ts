/**
 * 後方互換ラッパー。実装は affiliate-url.ts に集約。
 */

import {
  generateAmazonSearchUrl,
  generateRakutenSearchUrl,
  getAmazonTag,
  getRakutenAffiliateId,
} from "./affiliate-url";

export const AMAZON_TAG = getAmazonTag();
export const RAKUTEN_ID = getRakutenAffiliateId();

export function amazonSearchUrl(query: string): string {
  return generateAmazonSearchUrl(query);
}

export function rakutenSearchUrl(query: string): string {
  return generateRakutenSearchUrl(query);
}
