import type { RatedGoodsProduct } from "./rakuten-products";

export type ProductStatus = "not_configured" | "unavailable" | "no_qualified_items" | "ready" | "selection_required";
export type FailureReason = "credentials_missing" | "authorization_failed" | "rate_limited" | "upstream_error" | "timeout" | null;
export type ProductResult = { status: ProductStatus; items: RatedGoodsProduct[]; checkedAt: string | null; reason: FailureReason };

export function unavailable(reason: Exclude<FailureReason, null>): ProductResult {
  return { status: "unavailable", items: [], checkedAt: null, reason };
}
