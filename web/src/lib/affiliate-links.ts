/**
 * 後方互換ラッパー。実装は affiliate-url.ts に集約。
 */

import { appendAmazonTag, generateRakutenAffiliateUrl } from "./affiliate-url";

export function withAmazonAssociateTag(url: string): string {
  return appendAmazonTag(url);
}

export function withRakutenAffiliateId(url: string): string {
  return generateRakutenAffiliateUrl(url);
}
